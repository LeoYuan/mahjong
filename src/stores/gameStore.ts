import { create } from 'zustand';
import type {
  Tile,
  Player,
  GameState,
  GamePhase,
  PendingAction,
  Meld,
  Suit,
  GameRecord,
} from '../types';
import {
  dealTiles,
  dealLuckyTiles,
  canPeng,
  canMingGang,
  canAnGang,
  canHu,
  canBuGang,
  getTingTiles,
  sortTiles,
  aiDiscard,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  aiShouldPeng,
  aiShouldGang,
  calcHuScore,
} from '../utils/mahjong';

interface GameStore {
  // 游戏状态
  phase: GamePhase;
  players: Player[];
  gameState: GameState;
  currentUserIndex: number; // 当前玩家是第几位

  // 选中的牌
  selectedTileId: string | null;

  // 听牌提示
  tingTiles: Tile[];

  // 行动倒计时
  actionTimeout: number;

  // 游戏结果
  gameResults: { playerIndex: number; score: number }[] | null;

  // 手气模式
  luckyMode: boolean;

  // 战绩记录
  gameRecords: GameRecord[];
  roundNumber: number; // 当前是第几局（未重置分数前）

  // Actions
  initGame: () => void;
  startGame: () => void;
  startLuckyGame: () => void;
  selectQueYi: (suit: Suit) => void;
  selectTile: (tileId: string | null) => void;
  discardTile: (tileId: string, isAI?: boolean) => void;
  pengTile: () => void;
  gangTile: (type: 'ming' | 'an' | 'bu') => void;
  huTile: () => void;
  passAction: () => void;
  resetGame: () => void;
  resetScores: () => void;
  clearRecords: () => void; // 清除战绩

  // 内部方法（需要暴露给setTimeout回调）
  nextTurn: (nextPlayerIndex: number, players: Player[]) => void;
  processAITurn: () => void;
  processAIHu: (playerIndex: number) => void;
  processAIGang: (playerIndex: number) => void;
  processAIPeng: (playerIndex: number) => void;
}

const DEFAULT_SCORE = 1000;
const SCORE_STORAGE_KEY = 'mahjong-scores';
const RECORDS_STORAGE_KEY = 'mahjong-records';

function loadSavedScores(): number[] {
  try {
    const saved = localStorage.getItem(SCORE_STORAGE_KEY);
    if (saved) {
      const scores = JSON.parse(saved);
      if (Array.isArray(scores) && scores.length === 4) return scores;
    }
  } catch { /* ignore */ }
  return [DEFAULT_SCORE, DEFAULT_SCORE, DEFAULT_SCORE, DEFAULT_SCORE];
}

function saveScores(players: Player[]) {
  try {
    localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(players.map(p => Math.round(p.score))));
  } catch { /* ignore */ }
}

function loadGameRecords(): GameRecord[] {
  try {
    const saved = localStorage.getItem(RECORDS_STORAGE_KEY);
    if (saved) {
      const records = JSON.parse(saved);
      if (Array.isArray(records)) return records;
    }
  } catch { /* ignore */ }
  return [];
}

function saveGameRecord(record: GameRecord) {
  try {
    const records = loadGameRecords();
    records.push(record);
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch { /* ignore */ }
}

function clearGameRecords() {
  try {
    localStorage.removeItem(RECORDS_STORAGE_KEY);
  } catch { /* ignore */ }
}

function makeInitialPlayers(scores?: number[]): Player[] {
  const s = scores || loadSavedScores();
  return [
    { id: 'p0', name: '我', hand: [], discards: [], melds: [], isDealer: true, score: s[0], hasHu: false, isHu: false },
    { id: 'p1', name: '老张', hand: [], discards: [], melds: [], isDealer: false, score: s[1], hasHu: false, isHu: false },
    { id: 'p2', name: '老杨', hand: [], discards: [], melds: [], isDealer: false, score: s[2], hasHu: false, isHu: false },
    { id: 'p3', name: '老熊', hand: [], discards: [], melds: [], isDealer: false, score: s[3], hasHu: false, isHu: false },
  ];
}

const initialPlayers = makeInitialPlayers();

// 防止 setTimeout 竞态：每次状态变更递增，旧 timer 检测到 ID 不匹配则跳过
let aiTurnId = 0;

const initialGameState: GameState = {
  wall: [],
  currentPlayerIndex: 0,
  lastDiscardedTile: null,
  lastDiscardPlayerIndex: -1,
  turnPhase: 'draw',
  huPlayers: [],
  actions: [],
  turnCount: 0,
  lastActionIsGang: false,
  gangScoreRecords: [],
  passedGangThisTurn: false,
};

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'waiting',
  players: JSON.parse(JSON.stringify(initialPlayers)),
  gameState: { ...initialGameState },
  currentUserIndex: 0,
  selectedTileId: null,
  tingTiles: [],
  actionTimeout: 0,
  gameResults: null,
  luckyMode: false,
  gameRecords: loadGameRecords(),
  roundNumber: loadGameRecords().length + 1,

  initGame: () => {
    set({
      phase: 'waiting',
      players: makeInitialPlayers(),
      gameState: { ...initialGameState },
      selectedTileId: null,
      tingTiles: [],
      actionTimeout: 0,
      gameResults: null,
      luckyMode: false,
    });
  },

  startGame: () => {
    const { wall, hands } = dealTiles();
    const players = get().players.map((p, i) => ({
      ...p,
      hand: sortTiles(hands[i]),
      discards: [],
      melds: [],
      hasHu: false,
      isHu: false,
      queYiSuit: undefined as Suit | undefined,
    }));

    set({
      phase: 'queyi',
      players,
      gameState: {
        wall,
        currentPlayerIndex: 0,
        lastDiscardedTile: null,
        lastDiscardPlayerIndex: -1,
        turnPhase: 'draw',
        huPlayers: [],
        actions: [],
        turnCount: 0,
        lastActionIsGang: false,
        gangScoreRecords: [],
      },
      tingTiles: [],
    });
  },

  startLuckyGame: () => {
    const { wall, hands, luckyQueYi } = dealLuckyTiles();

    // winTile 在牌墙末尾，把它埋到 3~5 轮后摸到的位置
    // 每轮4人各摸1张=4张，3轮后=倒数第12张位置附近
    const winTile = wall.pop()!;
    const insertPos = Math.max(0, wall.length - Math.floor(Math.random() * 4 + 10));
    wall.splice(insertPos, 0, winTile);

    // 庄家还需要多一张牌（庄家14张），从牌墙正常摸
    hands[0].push(wall.pop()!);

    const players = get().players.map((p, i) => ({
      ...p,
      hand: sortTiles(hands[i]),
      discards: [],
      melds: [],
      hasHu: false,
      isHu: false,
      huType: undefined as 'zimo' | 'dianpao' | undefined,
      huPatterns: undefined as string[] | undefined,
      huScore: undefined as number | undefined,
      queYiSuit: i === 0 ? luckyQueYi : undefined as Suit | undefined,
    }));

    // AI 自动定缺
    for (let i = 1; i < 4; i++) {
      const hand = players[i].hand;
      const suitCount: Record<Suit, number> = { tong: 0, tiao: 0, wan: 0 };
      for (const tile of hand) suitCount[tile.suit]++;
      const minSuit = (['tong', 'tiao', 'wan'] as Suit[]).reduce((min, s) =>
        suitCount[s] < suitCount[min] ? s : min
      );
      players[i].queYiSuit = minSuit;
    }

    const tingTiles = getTingTiles(players[0].hand);

    set({
      phase: 'playing',
      players,
      luckyMode: true,
      gameState: {
        wall,
        currentPlayerIndex: 0,
        lastDiscardedTile: null,
        lastDiscardPlayerIndex: -1,
        turnPhase: 'play',
        huPlayers: [],
        actions: [],
        turnCount: 0,
        lastActionIsGang: false,
        gangScoreRecords: [],
        passedGangThisTurn: false,
      },
      tingTiles,
    });
  },

  selectQueYi: (suit: Suit) => {
    const { players, gameState, currentUserIndex } = get();

    // 设置当前玩家的定缺
    const newPlayers = [...players];
    newPlayers[currentUserIndex] = {
      ...newPlayers[currentUserIndex],
      queYiSuit: suit,
    };

    // AI 自动选择定缺（选择数量最少的那一门，但必须 >= 3 张）
    for (let i = 0; i < 4; i++) {
      if (i === currentUserIndex) continue;
      if (!newPlayers[i].queYiSuit) {
        const hand = newPlayers[i].hand;
        const suitCount: Record<Suit, number> = { tong: 0, tiao: 0, wan: 0 };
        for (const tile of hand) {
          suitCount[tile.suit]++;
        }
        // 筛选出数量 >= 3 的花色
        const validSuits = (['tong', 'tiao', 'wan'] as Suit[]).filter(s => suitCount[s] >= 3);
        if (validSuits.length > 0) {
          // 选择数量最少的花色定缺
          const minSuit = validSuits.reduce((min, s) => suitCount[s] < suitCount[min] ? s : min);
          newPlayers[i].queYiSuit = minSuit;
        } else {
          // 如果没有 >= 3 张的花色，选择最少的那门（兜底）
          const minSuit = (['tong', 'tiao', 'wan'] as Suit[]).reduce((min, s) =>
            suitCount[s] < suitCount[min] ? s : min
          );
          newPlayers[i].queYiSuit = minSuit;
        }
      }
    }

    // 检查是否所有玩家都定缺了
    const allQueYi = newPlayers.every(p => p.queYiSuit !== undefined);

    if (allQueYi) {
      // 进入游戏阶段，庄家开始打牌
      const tingTiles = getTingTiles(newPlayers[0].hand);
      set({
        phase: 'playing',
        players: newPlayers,
        gameState: {
          ...gameState,
          turnPhase: 'play',
          passedGangThisTurn: false,
        },
        tingTiles,
      });
    } else {
      set({ players: newPlayers });
    }
  },

  selectTile: (tileId: string | null) => {
    set({ selectedTileId: tileId });
  },

  discardTile: (tileId: string, isAI = false) => {
    const { players, gameState, currentUserIndex } = get();

    // 检查是否是当前玩家的回合（玩家需要检查，AI不需要）
    if (!isAI && gameState.currentPlayerIndex !== currentUserIndex) return;
    if (gameState.turnPhase !== 'play') return;

    const player = players[gameState.currentPlayerIndex];
    const tileIndex = player.hand.findIndex(t => t.id === tileId);
    if (tileIndex === -1) return;

    const discardedTile = player.hand[tileIndex];
    const newHand = [...player.hand.slice(0, tileIndex), ...player.hand.slice(tileIndex + 1)];
    const newDiscards = [...player.discards, discardedTile];

    // 更新玩家状态
    const newPlayers = [...players];
    newPlayers[gameState.currentPlayerIndex] = {
      ...player,
      hand: newHand,
      discards: newDiscards,
    };

    // 检查其他玩家是否可以碰/杠/胡
    const actions: PendingAction[] = [];
    for (let i = 0; i < 4; i++) {
      if (i === gameState.currentPlayerIndex) continue;
      if (newPlayers[i].isHu) continue;

      const otherPlayer = newPlayers[i];
      const otherHand = otherPlayer.hand;
      // 定缺花色的牌不能碰/杠（胡牌不受此限制，canHu 内部已检查缺一门）
      const isQueYiSuit = otherPlayer.queYiSuit === discardedTile.suit;
      if (canHu(otherHand, discardedTile)) {
        actions.push({ playerIndex: i, type: 'hu', targetTile: discardedTile, priority: 3 });
      }
      if (!isQueYiSuit && canMingGang(otherHand, discardedTile)) {
        actions.push({ playerIndex: i, type: 'gang', targetTile: discardedTile, priority: 2 });
      } else if (!isQueYiSuit && canPeng(otherHand, discardedTile)) {
        actions.push({ playerIndex: i, type: 'peng', targetTile: discardedTile, priority: 1 });
      }
    }

    if (actions.length > 0) {
      // 有玩家可以操作，等待响应
      // 按优先级排序
      actions.sort((a, b) => b.priority - a.priority);

      set({
        players: newPlayers,
        gameState: {
          ...gameState,
          lastDiscardedTile: discardedTile,
          lastDiscardPlayerIndex: gameState.currentPlayerIndex,
          turnPhase: 'wait_action',
          actions,
          turnCount: gameState.turnCount + 1,
          lastActionIsGang: false,
          passedGangThisTurn: false,
        },
        selectedTileId: null,
      });

      // 如果有人类玩家的操作，等待人类操作（碰/过），不调度 AI
      const hasHumanAction = actions.some(a => a.playerIndex === currentUserIndex);
      if (!hasHumanAction) {
        // 只有 AI 操作，按优先级调度
        const huAction = actions.find(a => a.type === 'hu');
        if (huAction) {
          const id = ++aiTurnId;
          setTimeout(() => {
            if (id !== aiTurnId) return;
            get().processAIHu(huAction.playerIndex);
          }, 1000);
        } else {
          const gangAction = actions.find(a => a.type === 'gang');
          if (gangAction) {
            const id = ++aiTurnId;
            setTimeout(() => {
              if (id !== aiTurnId) return;
              get().processAIGang(gangAction.playerIndex);
            }, 1000);
          } else {
            const pengAction = actions.find(a => a.type === 'peng');
            if (pengAction) {
              const id = ++aiTurnId;
              setTimeout(() => {
                if (id !== aiTurnId) return;
                get().processAIPeng(pengAction.playerIndex);
              }, 1000);
            }
          }
        }
      }
    } else {
      // 无人操作，记录最后出牌者，然后轮到下一位
      set({
        players: newPlayers,
        gameState: {
          ...gameState,
          lastDiscardedTile: discardedTile,
          lastDiscardPlayerIndex: gameState.currentPlayerIndex,
          turnPhase: 'play',
          turnCount: gameState.turnCount + 1,
          lastActionIsGang: false,
        },
        selectedTileId: null,
      });
      const nextPlayerIndex = getNextPlayer(gameState.currentPlayerIndex, newPlayers);
      get().nextTurn(nextPlayerIndex, newPlayers);
    }
  },

  pengTile: () => {
    const { players, gameState, currentUserIndex } = get();

    // 优先找人类玩家的碰操作，其次找任意玩家的（AI调用时）
    const action = gameState.actions.find(a => a.type === 'peng' && a.playerIndex === currentUserIndex)
      || gameState.actions.find(a => a.type === 'peng');
    if (!action) return;
    const actingPlayer = action.playerIndex;
    if (!action) return;

    const player = players[actingPlayer];
    const targetTile = action.targetTile;

    // 从手牌中移除两张相同的牌
    const sameTiles = player.hand.filter(t => t.suit === targetTile.suit && t.value === targetTile.value).slice(0, 2);
    const newHand = player.hand.filter(t => !sameTiles.includes(t));

    // 添加碰
    const meld: Meld = {
      type: 'peng',
      tiles: [...sameTiles, targetTile],
      fromPlayerId: players[gameState.lastDiscardPlayerIndex].id,
    };

    const newPlayers = [...players];
    newPlayers[actingPlayer] = {
      ...player,
      hand: newHand,
      melds: [...player.melds, meld],
    };

    // 从弃牌区移除
    const discardPlayer = newPlayers[gameState.lastDiscardPlayerIndex];
    newPlayers[gameState.lastDiscardPlayerIndex] = {
      ...discardPlayer,
      discards: discardPlayer.discards.slice(0, -1),
    };

    set({
      players: newPlayers,
      gameState: {
        ...gameState,
        currentPlayerIndex: actingPlayer,
        turnPhase: 'play',
        actions: [],
        lastDiscardedTile: null,
        passedGangThisTurn: false,
      },
    });

    // 更新听牌（只对人类玩家）
    if (actingPlayer === currentUserIndex) {
      const tingTiles = getTingTiles(newHand);
      set({ tingTiles });
    } else {
      // AI 碰完后自动出牌
      const id = ++aiTurnId;
      setTimeout(() => {
        if (id === aiTurnId) get().processAITurn();
      }, 1000);
    }
  },

  gangTile: (type: 'ming' | 'an' | 'bu') => {
    const { players, gameState, currentUserIndex, luckyMode } = get();
    const GANG_SCORE = 10; // 明杠/暗杠收分
    const BUGANG_SCORE = 5; // 补杠收分
    const gangRecords = [...gameState.gangScoreRecords];

    let actingPlayer: number;

    if (type === 'ming') {
      const action = gameState.actions.find(a => a.type === 'gang' && a.playerIndex === currentUserIndex)
        || gameState.actions.find(a => a.type === 'gang');
      if (!action) return;
      actingPlayer = action.playerIndex;

      const player = players[actingPlayer];
      const targetTile = action.targetTile;
      const sameTiles = player.hand.filter(t => t.suit === targetTile.suit && t.value === targetTile.value).slice(0, 3);
      const newHand = player.hand.filter(t => !sameTiles.includes(t));

      const meld: Meld = {
        type: 'minggang',
        tiles: [...sameTiles, targetTile],
        fromPlayerId: players[gameState.lastDiscardPlayerIndex].id,
      };

      const newPlayers = [...players];
      newPlayers[actingPlayer] = {
        ...player,
        hand: newHand,
        melds: [...player.melds, meld],
      };

      // 从弃牌区移除
      const discardPlayer = newPlayers[gameState.lastDiscardPlayerIndex];
      newPlayers[gameState.lastDiscardPlayerIndex] = {
        ...discardPlayer,
        discards: discardPlayer.discards.slice(0, -1),
      };

      // 明杠收分：点杠者一人付 10（手气模式不收分）
      if (!luckyMode) {
        const payer = gameState.lastDiscardPlayerIndex;
        newPlayers[actingPlayer] = { ...newPlayers[actingPlayer], score: newPlayers[actingPlayer].score + GANG_SCORE };
        newPlayers[payer] = { ...newPlayers[payer], score: newPlayers[payer].score - GANG_SCORE };
        gangRecords.push({ from: payer, to: actingPlayer, amount: GANG_SCORE });
      }

      // 摸一张牌
      const wall = [...gameState.wall];
      const newTile = wall.pop();
      if (newTile) {
        newPlayers[actingPlayer] = { ...newPlayers[actingPlayer], hand: sortTiles([...newPlayers[actingPlayer].hand, newTile]) };
      }

      set({
        players: newPlayers,
        gameState: {
          ...gameState,
          wall,
          currentPlayerIndex: actingPlayer,
          turnPhase: 'play',
          actions: [],
          lastDiscardedTile: null,
          lastActionIsGang: true,
          gangScoreRecords: gangRecords,
          passedGangThisTurn: false,
        },
      });
    } else if (type === 'an') {
      // 暗杠 — 当前出牌的玩家
      actingPlayer = gameState.currentPlayerIndex;
      const player = players[actingPlayer];
      const gangTile = canAnGang(player.hand);
      if (!gangTile) return;

      const sameTiles = player.hand.filter(t => t.suit === gangTile.suit && t.value === gangTile.value);
      const newHand = player.hand.filter(t => !sameTiles.includes(t));

      const meld: Meld = {
        type: 'angang',
        tiles: sameTiles,
      };

      const newPlayers = [...players];
      newPlayers[actingPlayer] = {
        ...player,
        hand: newHand,
        melds: [...player.melds, meld],
      };

      // 暗杠收分：其余未胡各家付 10（手气模式不收分）
      if (!luckyMode) {
        for (let i = 0; i < 4; i++) {
          if (i === actingPlayer || newPlayers[i].isHu) continue;
          newPlayers[i] = { ...newPlayers[i], score: newPlayers[i].score - GANG_SCORE };
          newPlayers[actingPlayer] = { ...newPlayers[actingPlayer], score: newPlayers[actingPlayer].score + GANG_SCORE };
          gangRecords.push({ from: i, to: actingPlayer, amount: GANG_SCORE });
        }
      }

      // 摸一张牌
      const wall = [...gameState.wall];
      const newTile = wall.pop();
      if (newTile) {
        newPlayers[actingPlayer] = { ...newPlayers[actingPlayer], hand: sortTiles([...newPlayers[actingPlayer].hand, newTile]) };
      }

      set({
        players: newPlayers,
        gameState: {
          ...gameState,
          wall,
          turnPhase: 'play',
          actions: [],
          lastActionIsGang: true,
          gangScoreRecords: gangRecords,
          passedGangThisTurn: false,
        },
      });
    } else {
      // 补杠（加杠）— 当前出牌的玩家
      actingPlayer = gameState.currentPlayerIndex;
      const player = players[actingPlayer];
      const buGangTile = canBuGang(player.hand, player.melds);
      if (!buGangTile) return;

      // 找到匹配的碰 meld，升级为补杠
      const newMelds = player.melds.map(m => {
        if (m.type === 'peng' && m.tiles[0].suit === buGangTile.suit && m.tiles[0].value === buGangTile.value) {
          return { ...m, type: 'bugang' as const, tiles: [...m.tiles, buGangTile] };
        }
        return m;
      });

      const newHand = player.hand.filter(t => t.id !== buGangTile.id);

      const newPlayers = [...players];
      newPlayers[actingPlayer] = {
        ...player,
        hand: newHand,
        melds: newMelds,
      };

      // 补杠收分：其余未胡各家付 5（手气模式不收分）
      if (!luckyMode) {
        for (let i = 0; i < 4; i++) {
          if (i === actingPlayer || newPlayers[i].isHu) continue;
          newPlayers[i] = { ...newPlayers[i], score: newPlayers[i].score - BUGANG_SCORE };
          newPlayers[actingPlayer] = { ...newPlayers[actingPlayer], score: newPlayers[actingPlayer].score + BUGANG_SCORE };
          gangRecords.push({ from: i, to: actingPlayer, amount: BUGANG_SCORE });
        }
      }

      // 摸一张牌
      const wall = [...gameState.wall];
      const newTile = wall.pop();
      if (newTile) {
        newPlayers[actingPlayer] = { ...newPlayers[actingPlayer], hand: sortTiles([...newPlayers[actingPlayer].hand, newTile]) };
      }

      set({
        players: newPlayers,
        gameState: {
          ...gameState,
          wall,
          turnPhase: 'play',
          actions: [],
          lastActionIsGang: true,
          gangScoreRecords: gangRecords,
          passedGangThisTurn: false,
        },
      });
    }

    // 更新听牌（只对人类玩家）或触发 AI 出牌
    if (actingPlayer === currentUserIndex) {
      const tingTiles = getTingTiles(get().players[actingPlayer].hand);
      set({ tingTiles });
    } else {
      const id = ++aiTurnId;
      setTimeout(() => {
        if (id === aiTurnId) get().processAITurn();
      }, 1000);
    }
  },

  huTile: () => {
    const { players, gameState, currentUserIndex } = get();

    // 优先找人类玩家的胡操作，其次找任意玩家的（AI调用时）
    const action = gameState.actions.find(a => a.type === 'hu' && a.playerIndex === currentUserIndex)
      || gameState.actions.find(a => a.type === 'hu');
    const actingPlayer = action ? action.playerIndex : gameState.currentPlayerIndex;
    if (!action && !canHu(players[actingPlayer].hand)) return;

    const player = players[actingPlayer];
    // 有 targetTile 说明是别人打的牌（点炮），没有则是自摸
    const huType = action?.targetTile ? 'dianpao' : 'zimo';
    const isZimo = huType === 'zimo';

    // 计算番型得分
    const huResult = calcHuScore(player.hand, player.melds, {
      isZimo,
      isTianHu: isZimo && player.isDealer && gameState.turnCount === 0,
      isDiHu: isZimo && !player.isDealer && gameState.turnCount === 0,
      isGangShangHua: isZimo && gameState.lastActionIsGang,
      isGangShangPao: !isZimo && gameState.lastActionIsGang,
    });

    const totalScore = huResult.totalScore;
    const isLucky = get().luckyMode;

    const newPlayers = [...players];
    newPlayers[actingPlayer] = {
      ...player,
      isHu: true,
      hasHu: true,
      huType,
      huPatterns: huResult.patterns,
      huScore: totalScore,
      score: player.score + (isLucky ? 0 : totalScore * (isZimo ? 3 : 1)),
    };

    if (!isLucky) {
      // 如果是点炮，放炮者付全部
      if (!isZimo && action) {
        const fromPlayer = newPlayers[gameState.lastDiscardPlayerIndex];
        newPlayers[gameState.lastDiscardPlayerIndex] = {
          ...fromPlayer,
          score: fromPlayer.score - totalScore,
        };
      } else if (isZimo) {
        // 自摸：每家各付 totalScore
        const payingPlayers = [];
        for (let i = 0; i < 4; i++) {
          if (i !== actingPlayer && !newPlayers[i].isHu) {
            payingPlayers.push(i);
          }
        }
        for (const i of payingPlayers) {
          newPlayers[i] = {
            ...newPlayers[i],
            score: newPlayers[i].score - totalScore,
          };
        }
        // 修正赢家得分：实际收入 = 付费人数 × totalScore
        newPlayers[actingPlayer] = {
          ...newPlayers[actingPlayer],
          score: player.score + payingPlayers.length * totalScore,
        };
      }
    }

    const newHuPlayers = [...gameState.huPlayers, actingPlayer];

    // 检查是否结束（三家胡牌或只剩一家未胡）
    const unhuPlayers = newPlayers.filter((p, i) => !p.isHu && !newHuPlayers.includes(i));
    const isGameEnd = isLucky || newHuPlayers.length >= 3 || unhuPlayers.length <= 1;

    if (isGameEnd) {
      if (!isLucky) saveScores(newPlayers);

      // 记录战绩
      const { roundNumber, luckyMode, gameRecords } = get();
      const previousScores = get().players.map(p => p.score);
      const record: GameRecord = {
        roundNumber,
        timestamp: Date.now(),
        players: newPlayers.map((p, i) => ({
          playerIndex: i,
          name: p.name,
          isHu: p.isHu,
          huType: p.huType,
          huPatterns: p.huPatterns,
          scoreChange: Math.round(p.score - previousScores[i]),
          finalScore: Math.round(p.score),
        })),
        isLuckyMode: luckyMode,
      };
      saveGameRecord(record);

      set({
        players: newPlayers,
        phase: 'finished',
        gameResults: newPlayers.map((p, i) => ({ playerIndex: i, score: p.score })),
        gameRecords: [...gameRecords, record],
        roundNumber: roundNumber + 1,
      });
    } else {
      // 继续游戏，轮到下一位未胡的玩家
      const nextPlayerIndex = getNextPlayer(actingPlayer, newPlayers, newHuPlayers);

      // 更新胡牌玩家列表，然后调用 nextTurn 走正常摸牌流程
      set({
        players: newPlayers,
        gameState: {
          ...gameState,
          huPlayers: newHuPlayers,
          actions: [],
        },
      });

      get().nextTurn(nextPlayerIndex, newPlayers);
    }
  },

  passAction: () => {
    ++aiTurnId; // 使任何 pending AI timer 失效
    const { gameState, currentUserIndex } = get();

    console.log('[passAction] Start:', {
      turnPhase: gameState.turnPhase,
      currentUserIndex,
      actions: gameState.actions,
    });

    // wait_action 阶段：检查当前玩家是否有待处理操作
    if (gameState.turnPhase === 'wait_action') {
      const myActions = gameState.actions.filter(a => a.playerIndex === currentUserIndex);
      console.log('[passAction] wait_action, myActions:', myActions);
      if (myActions.length === 0) {
        console.log('[passAction] No myActions, returning');
        return; // 当前玩家没有操作，无需处理
      }
    }

    // 移除当前玩家的操作
    const newActions = gameState.actions.filter(a => a.playerIndex !== currentUserIndex);
    console.log('[passAction] newActions:', newActions);

    // play 阶段过掉自摸/暗杠/补杠：清除 actions，标记已跳过杠，继续出牌
    if (gameState.turnPhase === 'play') {
      console.log('[passAction] play phase, clearing actions');
      set({
        gameState: {
          ...gameState,
          actions: [], // 清除所有 actions，确保按钮消失
          passedGangThisTurn: true,
        },
      });
      return;
    }

    if (newActions.length === 0) {
      // 无人操作，先清除 actions 让按钮消失，再轮到下一位
      console.log('[passAction] No more actions, clearing actions and calling nextTurn');
      set({
        gameState: {
          ...gameState,
          actions: [],
        },
      });
      const nextPlayerIndex = getNextPlayer(gameState.currentPlayerIndex, get().players);
      get().nextTurn(nextPlayerIndex, get().players);
    } else {
      // 先立即更新状态，移除当前玩家的操作，让按钮消失
      console.log('[passAction] Setting new actions:', newActions);
      // 使用函数式set确保基于最新状态
      set((state) => {
        const filtered = state.gameState.actions.filter(a => a.playerIndex !== state.currentUserIndex);
        console.log('[passAction] Inside set, filtered actions:', filtered);
        return {
          gameState: {
            ...state.gameState,
            actions: filtered,
          },
        };
      });

      // 处理剩余的 AI 操作（按优先级：胡 > 杠 > 碰）
      const huAction = newActions.find(a => a.type === 'hu');
      if (huAction) {
        const id = ++aiTurnId;
        setTimeout(() => { if (id === aiTurnId) get().processAIHu(huAction.playerIndex); }, 500);
      } else {
        const gangAction = newActions.find(a => a.type === 'gang');
        if (gangAction) {
          const id = ++aiTurnId;
          setTimeout(() => { if (id === aiTurnId) get().processAIGang(gangAction.playerIndex); }, 500);
        } else {
          const pengAction = newActions.find(a => a.type === 'peng');
          if (pengAction) {
            const id = ++aiTurnId;
            setTimeout(() => { if (id === aiTurnId) get().processAIPeng(pengAction.playerIndex); }, 500);
          } else {
            // 剩余操作都不需要处理，继续下一轮
            const nextPlayerIndex = getNextPlayer(gameState.currentPlayerIndex, get().players);
            get().nextTurn(nextPlayerIndex, get().players);
          }
        }
      }
    }
  },

  resetGame: () => {
    get().initGame();
  },

  resetScores: () => {
    try { localStorage.removeItem(SCORE_STORAGE_KEY); } catch { /* ignore */ }
    clearGameRecords();
    const defaultScores = [DEFAULT_SCORE, DEFAULT_SCORE, DEFAULT_SCORE, DEFAULT_SCORE];
    set({
      players: makeInitialPlayers(defaultScores),
      gameRecords: [],
      roundNumber: 1,
    });
  },

  clearRecords: () => {
    clearGameRecords();
    set({
      gameRecords: [],
      roundNumber: 1,
    });
  },

  // 内部方法
  nextTurn: (nextPlayerIndex: number, players: Player[]) => {
    const { gameState, currentUserIndex } = get();

    // 摸牌
    const wall = [...gameState.wall];
    const newTile = wall.pop();
    if (!newTile) {
      // 流局 — 退杠分 + 查花猪 + 查大叫
      const newPlayers = [...players];
      const PENALTY_BASE = 5; // 基础罚分

      // 退还本局所有杠牌收分
      for (const record of gameState.gangScoreRecords) {
        newPlayers[record.to] = { ...newPlayers[record.to], score: newPlayers[record.to].score - record.amount };
        newPlayers[record.from] = { ...newPlayers[record.from], score: newPlayers[record.from].score + record.amount };
      }

      // 查花猪：手牌中还有定缺花色的牌
      const huaZhuIndices: number[] = [];
      for (let i = 0; i < 4; i++) {
        if (newPlayers[i].isHu) continue;
        const p = newPlayers[i];
        if (p.queYiSuit && p.hand.some(t => t.suit === p.queYiSuit)) {
          huaZhuIndices.push(i);
        }
      }

      // 查大叫：未胡且未花猪的玩家，检查是否听牌
      const tingIndices: number[] = [];
      const noTingIndices: number[] = [];
      for (let i = 0; i < 4; i++) {
        if (newPlayers[i].isHu || huaZhuIndices.includes(i)) continue;
        const tingTiles = getTingTiles(newPlayers[i].hand);
        if (tingTiles.length > 0) {
          tingIndices.push(i);
        } else {
          noTingIndices.push(i);
        }
      }

      // 花猪赔给所有非花猪玩家（含已胡）每人 PENALTY_BASE * 16
      const huaZhuPenalty = PENALTY_BASE * 16;
      for (const hz of huaZhuIndices) {
        const receivers = [0, 1, 2, 3].filter(i => !huaZhuIndices.includes(i));
        for (const r of receivers) {
          newPlayers[hz] = { ...newPlayers[hz], score: newPlayers[hz].score - huaZhuPenalty };
          newPlayers[r] = { ...newPlayers[r], score: newPlayers[r].score + huaZhuPenalty };
        }
      }

      // 查大叫：未听牌的非花猪玩家赔给听牌玩家
      // 赔付金额 = 听牌玩家最大可能胡的分数
      for (const nt of noTingIndices) {
        for (const ti of tingIndices) {
          newPlayers[nt] = { ...newPlayers[nt], score: newPlayers[nt].score - PENALTY_BASE };
          newPlayers[ti] = { ...newPlayers[ti], score: newPlayers[ti].score + PENALTY_BASE };
        }
      }

      saveScores(newPlayers);
      set({
        players: newPlayers,
        phase: 'finished',
        gameResults: newPlayers.map((p, i) => ({ playerIndex: i, score: p.score })),
      });
      return;
    }

    const newPlayers = [...players];
    newPlayers[nextPlayerIndex] = {
      ...newPlayers[nextPlayerIndex],
      hand: sortTiles([...newPlayers[nextPlayerIndex].hand, newTile]),
    };

    // 检查自摸
    if (canHu(newPlayers[nextPlayerIndex].hand)) {
      if (nextPlayerIndex === currentUserIndex) {
        // 玩家可以自摸
        set({
          players: newPlayers,
          gameState: {
            ...gameState,
            wall,
            currentPlayerIndex: nextPlayerIndex,
            lastDiscardedTile: null,
            turnPhase: 'play',
            actions: [{ playerIndex: nextPlayerIndex, type: 'hu', priority: 3 }],
            passedGangThisTurn: false,
          },
          tingTiles: [],
        });
      } else {
        // AI 自摸
        set({
          players: newPlayers,
          gameState: {
            ...gameState,
            wall,
            currentPlayerIndex: nextPlayerIndex,
            lastDiscardedTile: null,
            turnPhase: 'play',
            passedGangThisTurn: false,
          },
        });
        const id = ++aiTurnId;
        setTimeout(() => {
          if (id !== aiTurnId) return;
          get().processAIHu(nextPlayerIndex);
        }, 1000);
      }
      return;
    }

    set({
      players: newPlayers,
      gameState: {
        ...gameState,
        wall,
        currentPlayerIndex: nextPlayerIndex,
        lastDiscardedTile: null,
        turnPhase: 'play',
        passedGangThisTurn: false,
      },
    });

    // 如果是AI，自动执行
    if (nextPlayerIndex !== currentUserIndex) {
      const id = ++aiTurnId;
      setTimeout(() => {
        if (id === aiTurnId) get().processAITurn();
      }, 1500);
    } else {
      // 更新玩家的听牌提示
      const tingTiles = getTingTiles(newPlayers[currentUserIndex].hand);
      set({ tingTiles });
    }
  },

  processAITurn: () => {
    const { players, gameState, currentUserIndex } = get();
    if (gameState.turnPhase !== 'play') return;
    const aiIndex = gameState.currentPlayerIndex;
    if (aiIndex === currentUserIndex) return;
    if (players[aiIndex].isHu) return;

    const aiPlayer = players[aiIndex];

    // 检查暗杠（杠后 gangTile 会 setTimeout 回到 processAITurn）
    const gangTileResult = canAnGang(aiPlayer.hand);
    if (gangTileResult) {
      get().gangTile('an');
      return;
    }

    // 检查补杠
    const buGangTile = canBuGang(aiPlayer.hand, aiPlayer.melds);
    if (buGangTile) {
      get().gangTile('bu');
      return;
    }

    // AI 打牌
    const tileToDiscard = aiDiscard(aiPlayer.hand, aiPlayer.queYiSuit);
    get().discardTile(tileToDiscard.id, true);
  },

  processAIHu: (_playerIndex: number) => {
    ++aiTurnId;
    get().huTile();
  },

  processAIGang: (_playerIndex: number) => {
    ++aiTurnId;
    get().gangTile('ming');
  },

  processAIPeng: (_playerIndex: number) => {
    ++aiTurnId;
    get().pengTile();
  },
}));

// 获取下一位未胡的玩家
function getNextPlayer(currentIndex: number, players: Player[], huPlayers: number[] = []): number {
  let nextIndex = (currentIndex + 1) % 4;
  let attempts = 0;
  while ((players[nextIndex]?.isHu || huPlayers.includes(nextIndex)) && attempts < 4) {
    nextIndex = (nextIndex + 1) % 4;
    attempts++;
  }
  return nextIndex;
}
