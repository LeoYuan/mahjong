/**
 * 全自动游戏模拟测试
 *
 * 直接在内存中模拟 4 家出牌，绕过 setTimeout，
 * 验证完整的游戏逻辑能从开始跑到结束而不卡死。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '../gameStore';
import type { Suit } from '../../types';
import {
  canPeng,
  canMingGang,
  canAnGang,
  canHu,
  aiDiscard,
} from '../../utils/mahjong';

// 用 fake timers 拦截所有 setTimeout，手动 flush
beforeEach(() => {
  vi.useFakeTimers();
  useGameStore.getState().initGame();
});

afterEach(() => {
  vi.useRealTimers();
});

/** 立即执行所有 pending setTimeout */
function flushTimers() {
  vi.runAllTimers();
}

/** 从 startGame 到 playing 状态 */
function startAndQueYi() {
  const store = useGameStore.getState();
  store.startGame();

  // 为玩家 0 选定缺
  const hand = useGameStore.getState().players[0].hand;
  const suitCount: Record<Suit, number> = { tong: 0, tiao: 0, wan: 0 };
  for (const tile of hand) suitCount[tile.suit]++;
  const validSuit = (['tong', 'tiao', 'wan'] as Suit[]).find(s => suitCount[s] >= 3)!;
  useGameStore.getState().selectQueYi(validSuit);

  expect(useGameStore.getState().phase).toBe('playing');
}

/**
 * 模拟一个回合：当前玩家出牌 + 处理所有响应 + 轮到下一家
 * 返回 false 表示游戏结束
 */
function simulateOneTurn(): boolean {
  // 多次 flush 确保所有 pending timer 都执行完
  for (let attempt = 0; attempt < 5; attempt++) {
    flushTimers();
    const s = useGameStore.getState();
    if (s.phase === 'finished') return false;
    if (s.gameState.turnPhase === 'play') break;

    // wait_action: 人类玩家需要手动 pass
    if (s.gameState.turnPhase === 'wait_action') {
      const humanActions = s.gameState.actions.filter(a => a.playerIndex === s.currentUserIndex);
      if (humanActions.length > 0) {
        useGameStore.getState().passAction();
      }
      flushTimers();
    }
  }

  const playState = useGameStore.getState();
  if (playState.phase === 'finished') return false;
  if (playState.gameState.turnPhase !== 'play') return false;

  const curPlayer = playState.players[playState.gameState.currentPlayerIndex];
  if (curPlayer.hand.length === 0) return false;

  // 出牌
  const tileToDiscard = aiDiscard(curPlayer.hand, curPlayer.queYiSuit);
  useGameStore.getState().discardTile(tileToDiscard.id, true);
  flushTimers();

  return useGameStore.getState().phase !== 'finished';
}

describe('全自动游戏模拟', () => {
  it('完整游戏能从开始跑到结束（流局或三家胡牌）', () => {
    startAndQueYi();

    let turns = 0;
    const maxTurns = 200; // 安全上限

    while (turns < maxTurns) {
      const canContinue = simulateOneTurn();
      if (!canContinue) break;
      turns++;
    }

    const finalState = useGameStore.getState();

    // 游戏应该正常结束
    expect(finalState.phase).toBe('finished');
    expect(turns).toBeLessThan(maxTurns); // 不应该到安全上限
    console.log(`游戏在 ${turns} 轮后结束`);
    console.log(`牌墙剩余: ${finalState.gameState.wall.length}`);
    console.log(`胡牌玩家: ${finalState.gameState.huPlayers}`);
    console.log(`分数: ${finalState.players.map(p => `${p.name}=${p.score}`).join(', ')}`);
  });

  it('模拟 10 局游戏都能正常结束', () => {
    for (let game = 0; game < 10; game++) {
      useGameStore.getState().initGame();
      startAndQueYi();

      let turns = 0;
      while (turns < 200) {
        const canContinue = simulateOneTurn();
        if (!canContinue) break;
        turns++;
      }

      const finalState = useGameStore.getState();
      if (finalState.phase !== 'finished') {
        console.log(`Game ${game} stuck at turn ${turns}`);
        console.log(`  phase: ${finalState.phase}`);
        console.log(`  turnPhase: ${finalState.gameState.turnPhase}`);
        console.log(`  currentPlayer: ${finalState.gameState.currentPlayerIndex}`);
        console.log(`  wall: ${finalState.gameState.wall.length}`);
        console.log(`  actions: ${JSON.stringify(finalState.gameState.actions)}`);
        console.log(`  lastDiscard: ${JSON.stringify(finalState.gameState.lastDiscardedTile)}`);
        for (let i = 0; i < 4; i++) {
          const p = finalState.players[i];
          console.log(`  player ${i}: hand=${p.hand.length}, isHu=${p.isHu}, melds=${p.melds.length}`);
        }
      }
      expect(finalState.phase).toBe('finished');

      // 验证数据一致性
      for (const player of finalState.players) {
        // 手牌 + 弃牌 + melds 中的牌 应该合理
        expect(player.hand.length).toBeGreaterThanOrEqual(0);
        expect(player.hand.length).toBeLessThanOrEqual(14);
        for (const meld of player.melds) {
          expect(meld.tiles.length).toBeGreaterThanOrEqual(3);
          expect(meld.tiles.length).toBeLessThanOrEqual(4);
        }
      }
    }
  });

  it('每轮出牌后 currentPlayerIndex 在 0-3 之间', () => {
    startAndQueYi();

    let turns = 0;
    while (turns < 100) {
      const state = useGameStore.getState();
      if (state.phase === 'finished') break;

      const idx = state.gameState.currentPlayerIndex;
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(3);

      const canContinue = simulateOneTurn();
      if (!canContinue) break;
      turns++;
    }
  });

  it('牌墙数量单调递减', () => {
    startAndQueYi();

    let lastWallSize = useGameStore.getState().gameState.wall.length;
    let turns = 0;

    while (turns < 200) {
      const canContinue = simulateOneTurn();
      if (!canContinue) break;

      const wallSize = useGameStore.getState().gameState.wall.length;
      expect(wallSize).toBeLessThanOrEqual(lastWallSize);
      lastWallSize = wallSize;
      turns++;
    }
  });

  it('已胡牌的玩家不再参与出牌', () => {
    startAndQueYi();

    let turns = 0;
    while (turns < 200) {
      const state = useGameStore.getState();
      if (state.phase === 'finished') break;

      // 当前玩家不应该是已胡牌的
      const currentIdx = state.gameState.currentPlayerIndex;
      const currentPlayer = state.players[currentIdx];
      if (state.gameState.turnPhase === 'play') {
        expect(currentPlayer.isHu).toBe(false);
      }

      const canContinue = simulateOneTurn();
      if (!canContinue) break;
      turns++;
    }
  });

  it('所有玩家的手牌+弃牌+melds 牌数不超过初始发牌数', () => {
    startAndQueYi();

    let turns = 0;
    while (turns < 200) {
      const canContinue = simulateOneTurn();
      if (!canContinue) break;

      const state = useGameStore.getState();
      for (const player of state.players) {
        const totalTiles = player.hand.length +
          player.discards.length +
          player.melds.reduce((sum, m) => sum + m.tiles.length, 0);
        // 初始发牌 14 张 + 摸牌 + 杠后摸牌，不应超过合理范围
        expect(totalTiles).toBeLessThanOrEqual(40);
      }
      turns++;
    }
  });

  it('碰/杠操作后 melds 数据正确', () => {
    startAndQueYi();

    let turns = 0;
    while (turns < 200) {
      const canContinue = simulateOneTurn();
      if (!canContinue) break;

      const state = useGameStore.getState();
      for (const player of state.players) {
        for (const meld of player.melds) {
          if (meld.type === 'peng') {
            expect(meld.tiles).toHaveLength(3);
            // 碰的三张牌花色和值应该相同
            const suit = meld.tiles[0].suit;
            const value = meld.tiles[0].value;
            for (const t of meld.tiles) {
              expect(t.suit).toBe(suit);
              expect(t.value).toBe(value);
            }
          } else if (meld.type === 'minggang' || meld.type === 'angang') {
            expect(meld.tiles).toHaveLength(4);
            const suit = meld.tiles[0].suit;
            const value = meld.tiles[0].value;
            for (const t of meld.tiles) {
              expect(t.suit).toBe(suit);
              expect(t.value).toBe(value);
            }
          }
        }
      }
      turns++;
    }
  });

  it('每位玩家手牌数量始终符合规则（出牌阶段 hand%3==2）', () => {
    for (let game = 0; game < 50; game++) {
      useGameStore.getState().initGame();
      startAndQueYi();

      let turns = 0;
      while (turns < 200) {
        const state = useGameStore.getState();
        if (state.phase === 'finished') break;

        if (state.gameState.turnPhase === 'play') {
          const cur = state.players[state.gameState.currentPlayerIndex];
          if (!cur.isHu && cur.hand.length > 0) {
            const handMod = cur.hand.length % 3;
            if (handMod !== 2) {
              console.log(`Game ${game}, Turn ${turns}: Player ${state.gameState.currentPlayerIndex} hand=${cur.hand.length} melds=${cur.melds.length} (${cur.melds.map(m => m.type).join(',')})`);
            }
            expect(handMod).toBe(2);
          }
        }

        const canContinue = simulateOneTurn();
        if (!canContinue) break;
        turns++;
      }
    }
  });
});
