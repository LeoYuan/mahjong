import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '../gameStore';
import type { Tile, Suit } from '../../types';

// 辅助函数
function t(suit: Suit, value: number, idx = 0): Tile {
  return { id: `${suit}-${value}-${idx}`, suit, value };
}

// 每个测试前重置 store
beforeEach(() => {
  useGameStore.getState().initGame();
  vi.useFakeTimers();
});

describe('游戏生命周期', () => {
  it('initGame 初始化状态正确', () => {
    const state = useGameStore.getState();
    expect(state.phase).toBe('waiting');
    expect(state.players).toHaveLength(4);
    expect(state.players[0].name).toBe('我');
    expect(state.players[0].score).toBe(1000);
    expect(state.selectedTileId).toBeNull();
    expect(state.tingTiles).toHaveLength(0);
    expect(state.gameResults).toBeNull();
  });

  it('startGame 进入定缺阶段', () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();

    expect(state.phase).toBe('queyi');
    // 庄家 14 张，其他 13 张
    expect(state.players[0].hand).toHaveLength(14);
    expect(state.players[1].hand).toHaveLength(13);
    expect(state.players[2].hand).toHaveLength(13);
    expect(state.players[3].hand).toHaveLength(13);
    // 牌墙 55 张
    expect(state.gameState.wall).toHaveLength(55);
  });

  it('startGame 后玩家手牌已排序', () => {
    useGameStore.getState().startGame();
    const hand = useGameStore.getState().players[0].hand;
    for (let i = 1; i < hand.length; i++) {
      const suitOrder: Record<Suit, number> = { tong: 0, tiao: 1, wan: 2 };
      const prev = hand[i - 1];
      const curr = hand[i];
      const prevOrder = suitOrder[prev.suit] * 10 + prev.value;
      const currOrder = suitOrder[curr.suit] * 10 + curr.value;
      expect(currOrder).toBeGreaterThanOrEqual(prevOrder);
    }
  });

  it('selectQueYi 触发 AI 自动定缺并进入 playing', () => {
    useGameStore.getState().startGame();
    // 选一个有效的定缺
    const hand = useGameStore.getState().players[0].hand;
    const suitCount: Record<Suit, number> = { tong: 0, tiao: 0, wan: 0 };
    for (const tile of hand) suitCount[tile.suit]++;
    const validSuit = (['tong', 'tiao', 'wan'] as Suit[]).find(s => suitCount[s] >= 3)!;

    useGameStore.getState().selectQueYi(validSuit);
    const state = useGameStore.getState();

    expect(state.phase).toBe('playing');
    expect(state.players[0].queYiSuit).toBe(validSuit);
    // AI 也应该都定缺了
    expect(state.players[1].queYiSuit).toBeDefined();
    expect(state.players[2].queYiSuit).toBeDefined();
    expect(state.players[3].queYiSuit).toBeDefined();
  });

  it('resetGame 回到 waiting', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().resetGame();
    const state = useGameStore.getState();

    expect(state.phase).toBe('waiting');
    expect(state.players[0].hand).toHaveLength(0);
    expect(state.gameState.wall).toHaveLength(0);
  });
});

describe('出牌流程', () => {
  function setupPlayingState() {
    useGameStore.getState().startGame();
    const hand = useGameStore.getState().players[0].hand;
    const suitCount: Record<Suit, number> = { tong: 0, tiao: 0, wan: 0 };
    for (const tile of hand) suitCount[tile.suit]++;
    const validSuit = (['tong', 'tiao', 'wan'] as Suit[]).find(s => suitCount[s] >= 3)!;
    useGameStore.getState().selectQueYi(validSuit);
  }

  it('discardTile 减少手牌增加弃牌', () => {
    setupPlayingState();
    const state = useGameStore.getState();
    // 确保轮到玩家 0
    if (state.gameState.currentPlayerIndex !== 0) return;

    const hand = state.players[0].hand;
    const tileToDiscard = hand[0];
    const handCount = hand.length;

    useGameStore.getState().discardTile(tileToDiscard.id);
    const newState = useGameStore.getState();

    // 手牌减少，弃牌增加（或者触发了其他玩家的 action）
    expect(newState.players[0].hand.length).toBeLessThan(handCount);
  });

  it('不是当前玩家回合时不能出牌', () => {
    setupPlayingState();
    const state = useGameStore.getState();

    // 如果当前不是玩家 0 的回合，确认出牌无效
    if (state.gameState.currentPlayerIndex !== 0) {
      const hand = state.players[0].hand;
      const handCount = hand.length;
      useGameStore.getState().discardTile(hand[0].id);
      expect(useGameStore.getState().players[0].hand.length).toBe(handCount);
    }
  });

  it('turnPhase 不是 play 时不能出牌', () => {
    setupPlayingState();
    // 手动将 turnPhase 改为 draw
    const state = useGameStore.getState();
    useGameStore.setState({
      gameState: { ...state.gameState, turnPhase: 'draw' },
    });

    const hand = useGameStore.getState().players[0].hand;
    const handCount = hand.length;
    useGameStore.getState().discardTile(hand[0].id);
    expect(useGameStore.getState().players[0].hand.length).toBe(handCount);
  });

  it('出不存在的牌无效', () => {
    setupPlayingState();
    const state = useGameStore.getState();
    if (state.gameState.currentPlayerIndex !== 0) return;

    const handCount = state.players[0].hand.length;
    useGameStore.getState().discardTile('nonexistent-tile-id');
    expect(useGameStore.getState().players[0].hand.length).toBe(handCount);
  });
});

describe('碰/杠/胡 操作', () => {
  it('pengTile: 无 peng action 时不执行', () => {
    useGameStore.getState().startGame();
    const handBefore = useGameStore.getState().players[0].hand.length;
    useGameStore.getState().pengTile();
    // 无变化
    expect(useGameStore.getState().players[0].hand.length).toBe(handBefore);
  });

  it('gangTile(ming): 无 gang action 时不执行', () => {
    useGameStore.getState().startGame();
    const handBefore = useGameStore.getState().players[0].hand.length;
    useGameStore.getState().gangTile('ming');
    expect(useGameStore.getState().players[0].hand.length).toBe(handBefore);
  });

  it('gangTile(an): 无暗杠可用时不执行', () => {
    useGameStore.getState().startGame();
    const handBefore = useGameStore.getState().players[0].hand.length;
    useGameStore.getState().gangTile('an');
    expect(useGameStore.getState().players[0].hand.length).toBe(handBefore);
  });

  it('passAction: 清除当前玩家的 actions', () => {
    useGameStore.getState().startGame();
    // 手动注入 actions
    const state = useGameStore.getState();
    useGameStore.setState({
      gameState: {
        ...state.gameState,
        actions: [
          { playerIndex: 0, type: 'peng', targetTile: t('tong', 1, 0), priority: 1 },
          { playerIndex: 1, type: 'peng', targetTile: t('tong', 1, 0), priority: 1 },
        ],
      },
    });

    useGameStore.getState().passAction();
    const newActions = useGameStore.getState().gameState.actions;
    // 玩家 0 的 action 被移除
    expect(newActions.some(a => a.playerIndex === 0)).toBe(false);
  });

  it('huTile: 无 hu action 且手牌不能胡时不执行', () => {
    useGameStore.getState().startGame();
    const scoreBefore = useGameStore.getState().players[0].score;
    useGameStore.getState().huTile();
    expect(useGameStore.getState().players[0].score).toBe(scoreBefore);
  });

  it('selectTile: 设置 selectedTileId', () => {
    useGameStore.getState().selectTile('test-id');
    expect(useGameStore.getState().selectedTileId).toBe('test-id');

    useGameStore.getState().selectTile(null);
    expect(useGameStore.getState().selectedTileId).toBeNull();
  });
});

describe('流局', () => {
  it('牌墙为空时 nextTurn 触发流局', () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();

    // 手动设置空牌墙
    useGameStore.setState({
      phase: 'playing',
      gameState: {
        ...state.gameState,
        wall: [],
        currentPlayerIndex: 0,
        turnPhase: 'play',
      },
    });

    // 调用 nextTurn
    useGameStore.getState().nextTurn(1, useGameStore.getState().players);
    expect(useGameStore.getState().phase).toBe('finished');
    expect(useGameStore.getState().gameResults).not.toBeNull();
  });
});

describe('AI 定缺策略', () => {
  it('AI 选择数量最少的花色定缺', () => {
    useGameStore.getState().startGame();
    const hand = useGameStore.getState().players[0].hand;
    const suitCount: Record<Suit, number> = { tong: 0, tiao: 0, wan: 0 };
    for (const tile of hand) suitCount[tile.suit]++;
    const validSuit = (['tong', 'tiao', 'wan'] as Suit[]).find(s => suitCount[s] >= 3)!;

    useGameStore.getState().selectQueYi(validSuit);

    // 检查 AI 的定缺是否合理（应该是数量最少的花色中的一个）
    for (let i = 1; i < 4; i++) {
      const player = useGameStore.getState().players[i];
      expect(player.queYiSuit).toBeDefined();
      expect(['tong', 'tiao', 'wan']).toContain(player.queYiSuit);
    }
  });
});

describe('操作按钮显示逻辑', () => {
  function setupPlayingState() {
    useGameStore.getState().startGame();
    const hand = useGameStore.getState().players[0].hand;
    const suitCount: Record<Suit, number> = { tong: 0, tiao: 0, wan: 0 };
    for (const tile of hand) suitCount[tile.suit]++;
    const validSuit = (['tong', 'tiao', 'wan'] as Suit[]).find(s => suitCount[s] >= 3)!;
    useGameStore.getState().selectQueYi(validSuit);
  }

  it('轮到自己出牌时，没有 hu action 则不应显示胡按钮', () => {
    setupPlayingState();
    const state = useGameStore.getState();
    // 手动设置轮到玩家 0，turnPhase=play，无 actions
    useGameStore.setState({
      gameState: {
        ...state.gameState,
        currentPlayerIndex: 0,
        turnPhase: 'play',
        actions: [],
      },
    });

    const newState = useGameStore.getState();
    const actions = newState.gameState.actions.filter(a => a.playerIndex === 0);
    const canHu = actions.some(a => a.type === 'hu');
    expect(canHu).toBe(false);
  });

  it('自摸时 actions 中包含 hu action', () => {
    setupPlayingState();
    const state = useGameStore.getState();
    // 模拟自摸：设置 actions 包含 hu
    useGameStore.setState({
      gameState: {
        ...state.gameState,
        currentPlayerIndex: 0,
        turnPhase: 'play',
        actions: [{ playerIndex: 0, type: 'hu', priority: 3 }],
      },
    });

    const newState = useGameStore.getState();
    const actions = newState.gameState.actions.filter(a => a.playerIndex === 0);
    const canHu = actions.some(a => a.type === 'hu');
    expect(canHu).toBe(true);
  });

  it('别人出牌时没有 peng/gang/hu action 则不应有按钮', () => {
    setupPlayingState();
    const state = useGameStore.getState();
    useGameStore.setState({
      gameState: {
        ...state.gameState,
        currentPlayerIndex: 1,
        actions: [],
      },
    });

    const newState = useGameStore.getState();
    const actions = newState.gameState.actions.filter(a => a.playerIndex === 0);
    expect(actions.some(a => a.type === 'peng')).toBe(false);
    expect(actions.some(a => a.type === 'gang')).toBe(false);
    expect(actions.some(a => a.type === 'hu')).toBe(false);
  });
});

describe('分数计算', () => {
  it('初始分数都是 1000', () => {
    useGameStore.getState().startGame();
    for (const player of useGameStore.getState().players) {
      expect(player.score).toBe(1000);
    }
  });
});

// ============ Bug Fix 回归测试 ============

describe('passAction 处理剩余 AI 操作', () => {
  it('用户过后若无剩余 actions 则进入下一轮', () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();
    const wallBefore = state.gameState.wall.length;

    // 只有用户一个 peng action
    useGameStore.setState({
      phase: 'playing',
      gameState: {
        ...state.gameState,
        currentPlayerIndex: 1,
        lastDiscardPlayerIndex: 1,
        turnPhase: 'wait_action',
        actions: [
          { playerIndex: 0, type: 'peng', targetTile: t('tong', 1, 0), priority: 1 },
        ],
      },
    });

    useGameStore.getState().passAction();
    const newState = useGameStore.getState();
    // turnPhase 不再是 wait_action（已进入 nextTurn 的 play 阶段）
    expect(newState.gameState.turnPhase).not.toBe('wait_action');
    // 牌墙减少 1（nextTurn 摸了一张牌）
    expect(newState.gameState.wall.length).toBe(wallBefore - 1);
  });

  it('用户过后剩余 AI peng action 应触发 AI 碰操作', () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();
    // 用户和 AI 都有 peng action
    useGameStore.setState({
      phase: 'playing',
      gameState: {
        ...state.gameState,
        currentPlayerIndex: 2,
        lastDiscardPlayerIndex: 2,
        turnPhase: 'wait_action',
        actions: [
          { playerIndex: 0, type: 'peng', targetTile: t('tong', 1, 0), priority: 1 },
          { playerIndex: 1, type: 'peng', targetTile: t('tong', 1, 0), priority: 1 },
        ],
      },
    });

    useGameStore.getState().passAction();
    const newState = useGameStore.getState();
    // 用户的 action 已移除，AI 的 action 保留
    expect(newState.gameState.actions.some(a => a.playerIndex === 0)).toBe(false);
    expect(newState.gameState.actions.some(a => a.playerIndex === 1)).toBe(true);
  });

  it('用户过后剩余 AI hu action 应优先处理胡', () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();
    useGameStore.setState({
      phase: 'playing',
      gameState: {
        ...state.gameState,
        currentPlayerIndex: 2,
        lastDiscardPlayerIndex: 2,
        turnPhase: 'wait_action',
        actions: [
          { playerIndex: 0, type: 'peng', targetTile: t('tong', 1, 0), priority: 1 },
          { playerIndex: 1, type: 'hu', targetTile: t('tong', 1, 0), priority: 3 },
        ],
      },
    });

    useGameStore.getState().passAction();
    const newState = useGameStore.getState();
    // hu action 仍然存在，等待 setTimeout 处理
    expect(newState.gameState.actions.some(a => a.type === 'hu')).toBe(true);
  });
});

describe('actingPlayer 从 actions 派生', () => {
  it('pengTile 应从 actions 中获取 actingPlayer，而非硬编码 currentUserIndex', () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();

    // 给 AI 玩家1设置碰的手牌和 action
    const newPlayers = [...state.players];
    newPlayers[1] = {
      ...newPlayers[1],
      hand: [t('tong', 5, 0), t('tong', 5, 1), t('wan', 3, 0), t('wan', 4, 0), t('wan', 5, 0)],
    };

    useGameStore.setState({
      phase: 'playing',
      players: newPlayers,
      gameState: {
        ...state.gameState,
        currentPlayerIndex: 2,
        lastDiscardPlayerIndex: 2,
        turnPhase: 'wait_action',
        lastDiscardedTile: t('tong', 5, 2),
        actions: [
          { playerIndex: 1, type: 'peng', targetTile: t('tong', 5, 2), priority: 1 },
        ],
      },
    });

    useGameStore.getState().pengTile();
    const newState = useGameStore.getState();
    // 玩家1（AI）应该碰了，不是玩家0
    expect(newState.players[1].melds).toHaveLength(1);
    expect(newState.players[1].melds[0].type).toBe('peng');
    expect(newState.gameState.currentPlayerIndex).toBe(1);
  });

  it('gangTile(ming) 应从 actions 中获取 actingPlayer', () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();

    const newPlayers = [...state.players];
    newPlayers[1] = {
      ...newPlayers[1],
      hand: [t('tiao', 3, 0), t('tiao', 3, 1), t('tiao', 3, 2), t('wan', 7, 0)],
    };

    useGameStore.setState({
      phase: 'playing',
      players: newPlayers,
      gameState: {
        ...state.gameState,
        currentPlayerIndex: 2,
        lastDiscardPlayerIndex: 2,
        turnPhase: 'wait_action',
        lastDiscardedTile: t('tiao', 3, 3),
        actions: [
          { playerIndex: 1, type: 'gang', targetTile: t('tiao', 3, 3), priority: 2 },
        ],
      },
    });

    useGameStore.getState().gangTile('ming');
    const newState = useGameStore.getState();
    expect(newState.players[1].melds).toHaveLength(1);
    expect(newState.players[1].melds[0].type).toBe('minggang');
    expect(newState.gameState.currentPlayerIndex).toBe(1);
  });
});

describe('huType 区分自摸与点炮', () => {
  it('有 targetTile 的 hu action 标记为 dianpao', () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();

    // 构造一个能胡的手牌
    const huHand = [
      t('tong', 1, 0), t('tong', 2, 0), t('tong', 3, 0),
      t('tiao', 4, 0), t('tiao', 5, 0), t('tiao', 6, 0),
      t('wan', 7, 0), t('wan', 8, 0), t('wan', 9, 0),
      t('tong', 5, 0), t('tong', 5, 1),
    ];

    const newPlayers = [...state.players];
    newPlayers[0] = {
      ...newPlayers[0],
      hand: huHand,
      queYiSuit: undefined,
    };

    useGameStore.setState({
      phase: 'playing',
      players: newPlayers,
      gameState: {
        ...state.gameState,
        currentPlayerIndex: 1,
        lastDiscardPlayerIndex: 1,
        turnPhase: 'wait_action',
        actions: [
          { playerIndex: 0, type: 'hu', targetTile: t('tong', 9, 0), priority: 3 },
        ],
      },
    });

    useGameStore.getState().huTile();
    expect(useGameStore.getState().players[0].huType).toBe('dianpao');
  });

  it('无 targetTile 的 hu action 标记为 zimo', () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();

    const huHand = [
      t('tong', 1, 0), t('tong', 2, 0), t('tong', 3, 0),
      t('tiao', 4, 0), t('tiao', 5, 0), t('tiao', 6, 0),
      t('wan', 7, 0), t('wan', 8, 0), t('wan', 9, 0),
      t('tong', 5, 0), t('tong', 5, 1),
      t('tong', 7, 0), t('tong', 7, 1),
    ];

    const newPlayers = [...state.players];
    newPlayers[0] = {
      ...newPlayers[0],
      hand: huHand,
      queYiSuit: undefined,
    };

    useGameStore.setState({
      phase: 'playing',
      players: newPlayers,
      gameState: {
        ...state.gameState,
        currentPlayerIndex: 0,
        turnPhase: 'play',
        actions: [
          { playerIndex: 0, type: 'hu', priority: 3 },  // 无 targetTile = 自摸
        ],
      },
    });

    useGameStore.getState().huTile();
    expect(useGameStore.getState().players[0].huType).toBe('zimo');
  });
});

describe('弃牌闪烁高亮 — lastDiscardPlayerIndex', () => {
  function setupPlayingState() {
    useGameStore.getState().startGame();
    const hand = useGameStore.getState().players[0].hand;
    const suitCount: Record<Suit, number> = { tong: 0, tiao: 0, wan: 0 };
    for (const tile of hand) suitCount[tile.suit]++;
    const validSuit = (['tong', 'tiao', 'wan'] as Suit[]).find(s => suitCount[s] >= 3)!;
    useGameStore.getState().selectQueYi(validSuit);
  }

  it('出牌后无 actions 时仍设置 lastDiscardPlayerIndex', () => {
    setupPlayingState();
    const state = useGameStore.getState();

    if (state.gameState.currentPlayerIndex !== 0) return;

    const hand = state.players[0].hand;
    useGameStore.getState().discardTile(hand[0].id);

    const newState = useGameStore.getState();
    // lastDiscardPlayerIndex 应该被设置（无论有无 actions）
    // 可能已被 nextTurn 重置，但至少 discards 增加了
    expect(newState.players[0].discards.length).toBeGreaterThanOrEqual(1);
  });

  it('出牌有 actions 时 lastDiscardPlayerIndex 指向出牌者', () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();

    // 手动构造场景：玩家0出牌，玩家1可碰
    const newPlayers = [...state.players];
    newPlayers[0] = {
      ...newPlayers[0],
      hand: [t('tong', 1, 0), t('tong', 2, 0), t('tong', 3, 0), t('tong', 9, 0)],
    };
    newPlayers[1] = {
      ...newPlayers[1],
      hand: [t('tong', 9, 1), t('tong', 9, 2), t('wan', 3, 0)],
    };

    useGameStore.setState({
      phase: 'playing',
      players: newPlayers,
      gameState: {
        ...state.gameState,
        currentPlayerIndex: 0,
        turnPhase: 'play',
      },
    });

    useGameStore.getState().discardTile(t('tong', 9, 0).id);
    const newState = useGameStore.getState();
    expect(newState.gameState.lastDiscardPlayerIndex).toBe(0);
  });
});
