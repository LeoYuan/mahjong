import { describe, it, expect } from 'vitest';
import {
  generateAllTiles,
  shuffle,
  dealTiles,
  dealLuckyTiles,
  hasQueYiMen,
  getMissingSuit,
  canPeng,
  canMingGang,
  canAnGang,
  canBuGang,
  canHu,
  sortTiles,
  getTingTiles,
  getTileDisplay,
  getTileColorClass,
  aiDiscard,
  aiShouldPeng,
  aiShouldGang,
  isSevenPairs,
  isQingYiSe,
  isPengPengHu,
  isJinGouDiao,
  isLongQiDui,
  calcHuScore,
} from '../mahjong';
import type { Tile, Suit, Meld } from '../../types';

describe('generateAllTiles', () => {
  it('should generate 108 tiles', () => {
    const tiles = generateAllTiles();
    expect(tiles).toHaveLength(108);
  });

  it('should generate correct structure', () => {
    const tiles = generateAllTiles();
    const tile = tiles[0];
    expect(tile).toHaveProperty('id');
    expect(tile).toHaveProperty('suit');
    expect(tile).toHaveProperty('value');
  });

  it('should have 4 copies of each tile type', () => {
    const tiles = generateAllTiles();
    const suits: Suit[] = ['tong', 'tiao', 'wan'];

    for (const suit of suits) {
      for (let value = 1; value <= 9; value++) {
        const count = tiles.filter(t => t.suit === suit && t.value === value).length;
        expect(count).toBe(4);
      }
    }
  });

  it('should only have valid suits', () => {
    const tiles = generateAllTiles();
    const validSuits: Suit[] = ['tong', 'tiao', 'wan'];
    for (const tile of tiles) {
      expect(validSuits).toContain(tile.suit);
    }
  });

  it('should only have values 1-9', () => {
    const tiles = generateAllTiles();
    for (const tile of tiles) {
      expect(tile.value).toBeGreaterThanOrEqual(1);
      expect(tile.value).toBeLessThanOrEqual(9);
    }
  });
});

describe('shuffle', () => {
  it('should return array of same length', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffle(arr);
    expect(shuffled).toHaveLength(arr.length);
  });

  it('should contain same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffle(arr);
    expect(shuffled.sort()).toEqual(arr.sort());
  });

  it('should not modify original array', () => {
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];
    shuffle(arr);
    expect(arr).toEqual(original);
  });

  it('should handle empty array', () => {
    const arr: number[] = [];
    const shuffled = shuffle(arr);
    expect(shuffled).toEqual([]);
  });

  it('should handle single element', () => {
    const arr = [1];
    const shuffled = shuffle(arr);
    expect(shuffled).toEqual([1]);
  });
});

describe('dealTiles', () => {
  it('should return wall and hands', () => {
    const result = dealTiles();
    expect(result).toHaveProperty('wall');
    expect(result).toHaveProperty('hands');
  });

  it('should have 4 hands', () => {
    const { hands } = dealTiles();
    expect(hands).toHaveLength(4);
  });

  it('should deal 13 cards to each player', () => {
    const { hands } = dealTiles();
    // First player (dealer) has 14, others have 13
    expect(hands[0]).toHaveLength(14);
    expect(hands[1]).toHaveLength(13);
    expect(hands[2]).toHaveLength(13);
    expect(hands[3]).toHaveLength(13);
  });

  it('should have 83 cards in wall', () => {
    const { wall } = dealTiles();
    expect(wall).toHaveLength(55); // 108 - 14 - 13*3 = 55 (after removing dealt tiles)
  });

  it('should not have duplicate cards between hands and wall', () => {
    const { wall, hands } = dealTiles();
    const allDealt = [...hands.flat(), ...wall];
    const ids = allDealt.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('hasQueYiMen', () => {
  it('should return true for 2 suits', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 1 },
      { id: '2', suit: 'tong', value: 2 },
      { id: '3', suit: 'tiao', value: 1 },
    ];
    expect(hasQueYiMen(hand)).toBe(true);
  });

  it('should return true for 1 suit', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 1 },
      { id: '2', suit: 'tong', value: 2 },
    ];
    expect(hasQueYiMen(hand)).toBe(true);
  });

  it('should return false for 3 suits', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 1 },
      { id: '2', suit: 'tiao', value: 1 },
      { id: '3', suit: 'wan', value: 1 },
    ];
    expect(hasQueYiMen(hand)).toBe(false);
  });

  it('should return true for empty hand', () => {
    expect(hasQueYiMen([])).toBe(true);
  });
});

describe('getMissingSuit', () => {
  it('should return the missing suit when having 2 suits', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 1 },
      { id: '2', suit: 'tiao', value: 1 },
    ];
    expect(getMissingSuit(hand)).toBe('wan');
  });

  it('should return null when having all 3 suits', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 1 },
      { id: '2', suit: 'tiao', value: 1 },
      { id: '3', suit: 'wan', value: 1 },
    ];
    expect(getMissingSuit(hand)).toBeNull();
  });

  it('should return one of missing suits when having 1 suit', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 1 },
    ];
    const missing = getMissingSuit(hand);
    expect(['tiao', 'wan']).toContain(missing);
  });
});

describe('canPeng', () => {
  it('should return true when having 2 same tiles', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 5 },
      { id: '2', suit: 'tong', value: 5 },
    ];
    const target: Tile = { id: '3', suit: 'tong', value: 5 };
    expect(canPeng(hand, target)).toBe(true);
  });

  it('should return false when having only 1 same tile', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 5 },
      { id: '2', suit: 'tiao', value: 5 },
    ];
    const target: Tile = { id: '3', suit: 'tong', value: 5 };
    expect(canPeng(hand, target)).toBe(false);
  });

  it('should return false when no same tile', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tiao', value: 5 },
      { id: '2', suit: 'wan', value: 5 },
    ];
    const target: Tile = { id: '3', suit: 'tong', value: 5 };
    expect(canPeng(hand, target)).toBe(false);
  });

  it('should return true when having 3 same tiles', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 5 },
      { id: '2', suit: 'tong', value: 5 },
      { id: '3', suit: 'tong', value: 5 },
    ];
    const target: Tile = { id: '4', suit: 'tong', value: 5 };
    expect(canPeng(hand, target)).toBe(true);
  });
});

describe('canMingGang', () => {
  it('should return true when having 3 same tiles', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 5 },
      { id: '2', suit: 'tong', value: 5 },
      { id: '3', suit: 'tong', value: 5 },
    ];
    const target: Tile = { id: '4', suit: 'tong', value: 5 };
    expect(canMingGang(hand, target)).toBe(true);
  });

  it('should return false when having only 2 same tiles', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 5 },
      { id: '2', suit: 'tong', value: 5 },
    ];
    const target: Tile = { id: '3', suit: 'tong', value: 5 };
    expect(canMingGang(hand, target)).toBe(false);
  });

  it('should return false when no same tile', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tiao', value: 5 },
    ];
    const target: Tile = { id: '2', suit: 'tong', value: 5 };
    expect(canMingGang(hand, target)).toBe(false);
  });
});

describe('canAnGang', () => {
  it('should return tile when having 4 same tiles', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 5 },
      { id: '2', suit: 'tong', value: 5 },
      { id: '3', suit: 'tong', value: 5 },
      { id: '4', suit: 'tong', value: 5 },
    ];
    const result = canAnGang(hand);
    expect(result).not.toBeNull();
    expect(result?.suit).toBe('tong');
    expect(result?.value).toBe(5);
  });

  it('should return null when having only 3 same tiles', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 5 },
      { id: '2', suit: 'tong', value: 5 },
      { id: '3', suit: 'tong', value: 5 },
    ];
    expect(canAnGang(hand)).toBeNull();
  });

  it('should return null when no 4 same tiles', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 1 },
      { id: '2', suit: 'tiao', value: 2 },
      { id: '3', suit: 'wan', value: 3 },
    ];
    expect(canAnGang(hand)).toBeNull();
  });

  it('should return only one tile even with multiple gangs possible', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 5 },
      { id: '2', suit: 'tong', value: 5 },
      { id: '3', suit: 'tong', value: 5 },
      { id: '4', suit: 'tong', value: 5 },
      { id: '5', suit: 'tiao', value: 3 },
      { id: '6', suit: 'tiao', value: 3 },
      { id: '7', suit: 'tiao', value: 3 },
      { id: '8', suit: 'tiao', value: 3 },
    ];
    const result = canAnGang(hand);
    expect(result).not.toBeNull();
  });
});

describe('canHu', () => {
  it('should return false for non-winning hand', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 1 },
      { id: '2', suit: 'tong', value: 2 },
      { id: '3', suit: 'tong', value: 4 },
    ];
    expect(canHu(hand)).toBe(false);
  });

  it('should return false when not que yi men', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 1 },
      { id: '2', suit: 'tiao', value: 1 },
      { id: '3', suit: 'wan', value: 1 },
      { id: '4', suit: 'tong', value: 2 },
      { id: '5', suit: 'tiao', value: 2 },
    ];
    const discard: Tile = { id: '6', suit: 'wan', value: 2 };
    expect(canHu(hand, discard)).toBe(false);
  });

  it('should return true for simple winning hand with que yi men', () => {
    // 一个可以胡的手牌示例（已满足缺一门）
    const hand: Tile[] = [
      // 对子
      { id: '1', suit: 'tong', value: 1 },
      { id: '2', suit: 'tong', value: 1 },
      // 刻子
      { id: '3', suit: 'tong', value: 2 },
      { id: '4', suit: 'tong', value: 2 },
      { id: '5', suit: 'tong', value: 2 },
      // 顺子
      { id: '6', suit: 'tong', value: 3 },
      { id: '7', suit: 'tong', value: 4 },
      { id: '8', suit: 'tong', value: 5 },
      // 其他牌凑够14张
      { id: '9', suit: 'tiao', value: 1 },
      { id: '10', suit: 'tiao', value: 1 },
      { id: '11', suit: 'tiao', value: 1 },
      { id: '12', suit: 'tiao', value: 2 },
      { id: '13', suit: 'tiao', value: 2 },
    ];
    const discard: Tile = { id: '14', suit: 'tiao', value: 2 };
    expect(canHu(hand, discard)).toBe(true);
  });
});

describe('sortTiles', () => {
  it('should sort by suit order', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'wan', value: 1 },
      { id: '2', suit: 'tong', value: 1 },
      { id: '3', suit: 'tiao', value: 1 },
    ];
    const sorted = sortTiles(hand);
    expect(sorted[0].suit).toBe('tong');
    expect(sorted[1].suit).toBe('tiao');
    expect(sorted[2].suit).toBe('wan');
  });

  it('should sort by value within same suit', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 9 },
      { id: '2', suit: 'tong', value: 1 },
      { id: '3', suit: 'tong', value: 5 },
    ];
    const sorted = sortTiles(hand);
    expect(sorted[0].value).toBe(1);
    expect(sorted[1].value).toBe(5);
    expect(sorted[2].value).toBe(9);
  });

  it('should not modify original array', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'wan', value: 1 },
      { id: '2', suit: 'tong', value: 1 },
    ];
    const original = [...hand];
    sortTiles(hand);
    expect(hand).toEqual(original);
  });
});

describe('getTingTiles', () => {
  it('should return empty array for non-ting hand', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 1 },
      { id: '2', suit: 'tiao', value: 2 },
      { id: '3', suit: 'wan', value: 3 },
    ];
    expect(getTingTiles(hand)).toHaveLength(0);
  });

  it('should return tiles that complete que yi men', () => {
    // 缺一门的手牌
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 1 },
      { id: '2', suit: 'tong', value: 1 },
      { id: '3', suit: 'tiao', value: 1 },
    ];
    const tingTiles = getTingTiles(hand);
    // 应该只返回筒和条（缺万）
    for (const tile of tingTiles) {
      expect(tile.suit).not.toBe('wan');
    }
  });
});

describe('getTileDisplay', () => {
  it('should return correct format for tong', () => {
    const tile: Tile = { id: '1', suit: 'tong', value: 5 };
    expect(getTileDisplay(tile)).toBe('5筒');
  });

  it('should return correct format for tiao', () => {
    const tile: Tile = { id: '1', suit: 'tiao', value: 3 };
    expect(getTileDisplay(tile)).toBe('3条');
  });

  it('should return correct format for wan', () => {
    const tile: Tile = { id: '1', suit: 'wan', value: 9 };
    expect(getTileDisplay(tile)).toBe('9万');
  });
});

describe('getTileColorClass', () => {
  it('should return suit name as class', () => {
    expect(getTileColorClass('tong')).toBe('tong');
    expect(getTileColorClass('tiao')).toBe('tiao');
    expect(getTileColorClass('wan')).toBe('wan');
  });
});

describe('aiDiscard', () => {
  it('should return a tile from hand', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 1 },
      { id: '2', suit: 'tiao', value: 2 },
    ];
    const discarded = aiDiscard(hand);
    expect(hand).toContain(discarded);
  });

  it('should not modify original hand', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 1 },
      { id: '2', suit: 'tiao', value: 2 },
    ];
    const original = [...hand];
    aiDiscard(hand);
    expect(hand).toEqual(original);
  });
});

describe('aiShouldPeng', () => {
  it('should return false for missing suit', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 1 },
      { id: '2', suit: 'tiao', value: 1 },
    ];
    const target: Tile = { id: '3', suit: 'wan', value: 1 };
    // 缺万，不应该碰万
    expect(aiShouldPeng(hand, target)).toBe(false);
  });

  it('should behave probabilistically for valid suit', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 1 },
      { id: '2', suit: 'tiao', value: 1 },
      { id: '3', suit: 'tong', value: 5 },
    ];
    const target: Tile = { id: '4', suit: 'tong', value: 5 };
    // 多次调用测试概率性行为
    const results = Array.from({ length: 100 }, () => aiShouldPeng(hand, target));
    // 70% 概率应该碰，所以大部分应该为 true
    const trueCount = results.filter(r => r).length;
    expect(trueCount).toBeGreaterThan(50);
    expect(trueCount).toBeLessThan(90);
  });
});

describe('aiShouldGang', () => {
  it('should return false for missing suit', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 1 },
      { id: '2', suit: 'tiao', value: 1 },
    ];
    const target: Tile = { id: '3', suit: 'wan', value: 1 };
    expect(aiShouldGang(hand, target)).toBe(false);
  });

  it('should behave probabilistically for valid suit', () => {
    const hand: Tile[] = [
      { id: '1', suit: 'tong', value: 1 },
      { id: '2', suit: 'tiao', value: 1 },
    ];
    const target: Tile = { id: '3', suit: 'tong', value: 1 };
    const results = Array.from({ length: 100 }, () => aiShouldGang(hand, target));
    const trueCount = results.filter(r => r).length;
    // 80% 概率应该杠
    expect(trueCount).toBeGreaterThan(70);
    expect(trueCount).toBeLessThan(95);
  });
});

// ============================================================
// 以下为补充测试用例
// ============================================================

// 辅助函数：快速生成牌
function t(suit: Suit, value: number, idx = 0): Tile {
  return { id: `${suit}-${value}-${idx}`, suit, value };
}

describe('canHu - 边界与牌型覆盖', () => {
  it('只有一对（2 张）应该胡', () => {
    const hand: Tile[] = [t('tong', 1, 0), t('tong', 1, 1)];
    expect(canHu(hand)).toBe(true);
  });

  it('5 张牌：1 组顺子 + 1 雀头', () => {
    const hand: Tile[] = [
      t('tong', 1, 0), t('tong', 1, 1), // 雀头
      t('tong', 2, 0), t('tong', 3, 0), t('tong', 4, 0), // 顺子
    ];
    expect(canHu(hand)).toBe(true);
  });

  it('5 张牌：1 组刻子 + 1 雀头', () => {
    const hand: Tile[] = [
      t('tong', 1, 0), t('tong', 1, 1), // 雀头
      t('tong', 5, 0), t('tong', 5, 1), t('tong', 5, 2), // 刻子
    ];
    expect(canHu(hand)).toBe(true);
  });

  it('8 张牌：2 碰后手牌', () => {
    const hand: Tile[] = [
      t('tiao', 3, 0), t('tiao', 3, 1), // 雀头
      t('tiao', 4, 0), t('tiao', 5, 0), t('tiao', 6, 0), // 顺子
      t('tiao', 7, 0), t('tiao', 7, 1), t('tiao', 7, 2), // 刻子
    ];
    expect(canHu(hand)).toBe(true);
  });

  it('11 张牌：1 碰后手牌', () => {
    const hand: Tile[] = [
      t('tong', 1, 0), t('tong', 1, 1), // 雀头
      t('tong', 2, 0), t('tong', 3, 0), t('tong', 4, 0), // 顺子
      t('tong', 5, 0), t('tong', 6, 0), t('tong', 7, 0), // 顺子
      t('tiao', 1, 0), t('tiao', 1, 1), t('tiao', 1, 2), // 刻子
    ];
    expect(canHu(hand)).toBe(true);
  });

  it('14 张全刻子胡牌（碰碰和）', () => {
    const hand: Tile[] = [
      t('tong', 1, 0), t('tong', 1, 1), // 雀头
      t('tong', 2, 0), t('tong', 2, 1), t('tong', 2, 2), // 刻子
      t('tong', 3, 0), t('tong', 3, 1), t('tong', 3, 2), // 刻子
      t('tiao', 5, 0), t('tiao', 5, 1), t('tiao', 5, 2), // 刻子
      t('tiao', 9, 0), t('tiao', 9, 1), t('tiao', 9, 2), // 刻子
    ];
    expect(canHu(hand)).toBe(true);
  });

  it('14 张全顺子胡牌（平胡）', () => {
    const hand: Tile[] = [
      t('tong', 1, 0), t('tong', 1, 1), // 雀头
      t('tong', 2, 0), t('tong', 3, 0), t('tong', 4, 0), // 顺子
      t('tong', 5, 0), t('tong', 6, 0), t('tong', 7, 0), // 顺子
      t('tiao', 1, 0), t('tiao', 2, 0), t('tiao', 3, 0), // 顺子
      t('tiao', 7, 0), t('tiao', 8, 0), t('tiao', 9, 0), // 顺子
    ];
    expect(canHu(hand)).toBe(true);
  });

  it('14 张混合刻子+顺子', () => {
    const hand: Tile[] = [
      t('tong', 5, 0), t('tong', 5, 1), // 雀头
      t('tong', 1, 0), t('tong', 2, 0), t('tong', 3, 0), // 顺子
      t('tong', 7, 0), t('tong', 7, 1), t('tong', 7, 2), // 刻子
      t('tiao', 4, 0), t('tiao', 5, 0), t('tiao', 6, 0), // 顺子
      t('tiao', 9, 0), t('tiao', 9, 1), t('tiao', 9, 2), // 刻子
    ];
    expect(canHu(hand)).toBe(true);
  });

  it('三门花色不能胡', () => {
    const hand: Tile[] = [
      t('tong', 1, 0), t('tong', 1, 1),
      t('tiao', 2, 0), t('tiao', 2, 1), t('tiao', 2, 2),
      t('wan', 3, 0), t('wan', 3, 1), t('wan', 3, 2),
    ];
    expect(canHu(hand)).toBe(false);
  });

  it('牌数不对不能胡（3 张）', () => {
    const hand: Tile[] = [t('tong', 1, 0), t('tong', 1, 1), t('tong', 2, 0)];
    expect(canHu(hand)).toBe(false);
  });

  it('牌数不对不能胡（4 张）', () => {
    const hand: Tile[] = [
      t('tong', 1, 0), t('tong', 1, 1), t('tong', 2, 0), t('tong', 3, 0),
    ];
    expect(canHu(hand)).toBe(false);
  });

  it('不成型的 14 张不能胡', () => {
    const hand: Tile[] = [
      t('tong', 1, 0), t('tong', 3, 0), t('tong', 5, 0), t('tong', 7, 0), t('tong', 9, 0),
      t('tiao', 1, 0), t('tiao', 3, 0), t('tiao', 5, 0), t('tiao', 7, 0), t('tiao', 9, 0),
      t('tong', 2, 0), t('tong', 4, 0), t('tong', 6, 0), t('tong', 8, 0),
    ];
    expect(canHu(hand)).toBe(false);
  });

  it('通过 discard 参数凑成胡牌', () => {
    // 13 张差一张胡
    const hand: Tile[] = [
      t('tong', 1, 0), t('tong', 1, 1), // 雀头
      t('tong', 2, 0), t('tong', 3, 0), t('tong', 4, 0), // 顺子
      t('tong', 5, 0), t('tong', 6, 0), t('tong', 7, 0), // 顺子
      t('tiao', 1, 0), t('tiao', 2, 0), t('tiao', 3, 0), // 顺子
      t('tiao', 7, 0), t('tiao', 8, 0), // 差一张 9 条
    ];
    expect(canHu(hand)).toBe(false);
    expect(canHu(hand, t('tiao', 9, 0))).toBe(true);
  });

  it('清一色胡牌', () => {
    const hand: Tile[] = [
      t('tong', 1, 0), t('tong', 1, 1),
      t('tong', 2, 0), t('tong', 3, 0), t('tong', 4, 0),
      t('tong', 5, 0), t('tong', 6, 0), t('tong', 7, 0),
      t('tong', 7, 1), t('tong', 8, 0), t('tong', 9, 0),
      t('tong', 9, 1), t('tong', 9, 2), t('tong', 9, 3),
    ];
    expect(canHu(hand)).toBe(true);
  });
});

describe('getTingTiles - 补充', () => {
  it('差一张成顺子的听牌', () => {
    // 13 张手牌，已缺万：
    // 1 1 筒（雀头）+ 2 3 4 筒（顺子）+ 5 6 7 筒（顺子）+ 1 2 3 条（顺子）+ 7 8 条（差 6 或 9 条）
    const hand: Tile[] = [
      t('tong', 1, 0), t('tong', 1, 1),
      t('tong', 2, 0), t('tong', 3, 0), t('tong', 4, 0),
      t('tong', 5, 0), t('tong', 6, 0), t('tong', 7, 0),
      t('tiao', 1, 0), t('tiao', 2, 0), t('tiao', 3, 0),
      t('tiao', 7, 0), t('tiao', 8, 0),
    ];
    const ting = getTingTiles(hand);
    expect(ting.length).toBeGreaterThan(0);
    // 应包含 6 条或 9 条
    const has6or9 = ting.some(tile => tile.suit === 'tiao' && (tile.value === 6 || tile.value === 9));
    expect(has6or9).toBe(true);
    // 不应该听万（缺万）
    for (const tile of ting) {
      expect(tile.suit).not.toBe('wan');
    }
  });

  it('差一张成刻子的听牌', () => {
    // 1 1 筒 + 2 2 2 筒 + 3 3 筒（差 3 筒成刻子变雀头）+ 7 8 9 条 + 1 2 3 条
    const hand: Tile[] = [
      t('tong', 1, 0), t('tong', 1, 1),
      t('tong', 2, 0), t('tong', 2, 1), t('tong', 2, 2),
      t('tong', 3, 0), t('tong', 3, 1),
      t('tiao', 7, 0), t('tiao', 8, 0), t('tiao', 9, 0),
      t('tiao', 1, 0), t('tiao', 2, 0), t('tiao', 3, 0),
    ];
    const ting = getTingTiles(hand);
    expect(ting.length).toBeGreaterThan(0);
    // 应包含 3 筒
    const hasTong3 = ting.some(tile => tile.suit === 'tong' && tile.value === 3);
    expect(hasTong3).toBe(true);
  });

  it('没有听牌的手牌返回空数组', () => {
    const hand: Tile[] = [
      t('tong', 1, 0), t('tong', 3, 0), t('tong', 5, 0), t('tong', 7, 0), t('tong', 9, 0),
      t('tiao', 1, 0), t('tiao', 3, 0), t('tiao', 5, 0), t('tiao', 7, 0), t('tiao', 9, 0),
      t('tong', 2, 0), t('tong', 4, 0), t('tong', 6, 0),
    ];
    expect(getTingTiles(hand)).toHaveLength(0);
  });

  it('听多张牌', () => {
    // 简单听：1 1 筒 + 2 3 4 筒 + 5 6 7 筒 + 8 8 8 条 + 1 2 条 → 听 3 条
    // 或者构造一个能听多张的
    const hand: Tile[] = [
      t('tong', 2, 0), t('tong', 3, 0), t('tong', 4, 0),
      t('tong', 5, 0), t('tong', 6, 0), t('tong', 7, 0),
      t('tong', 8, 0), t('tong', 8, 1), t('tong', 8, 2),
      t('tiao', 3, 0), t('tiao', 3, 1), t('tiao', 3, 2),
      t('tiao', 5, 0),
    ];
    const ting = getTingTiles(hand);
    // 听 5 条的对子
    const hasTiao5 = ting.some(tile => tile.suit === 'tiao' && tile.value === 5);
    expect(hasTiao5).toBe(true);
  });
});

describe('canPeng / canMingGang / canAnGang - 补充边界', () => {
  it('canPeng: 空手牌 → false', () => {
    const target: Tile = t('tong', 1, 0);
    expect(canPeng([], target)).toBe(false);
  });

  it('canPeng: 手牌中有相同花色但不同值 → false', () => {
    const hand: Tile[] = [t('tong', 1, 0), t('tong', 2, 0)];
    const target: Tile = t('tong', 3, 0);
    expect(canPeng(hand, target)).toBe(false);
  });

  it('canMingGang: 空手牌 → false', () => {
    const target: Tile = t('tong', 1, 0);
    expect(canMingGang([], target)).toBe(false);
  });

  it('canMingGang: 恰好 3 张相同混在其他牌中', () => {
    const hand: Tile[] = [
      t('tong', 5, 0), t('tong', 5, 1), t('tong', 5, 2),
      t('tiao', 1, 0), t('tiao', 2, 0),
    ];
    const target: Tile = t('tong', 5, 3);
    expect(canMingGang(hand, target)).toBe(true);
  });

  it('canAnGang: 空手牌 → null', () => {
    expect(canAnGang([])).toBeNull();
  });

  it('canAnGang: 只有 1 张牌 → null', () => {
    expect(canAnGang([t('tong', 1, 0)])).toBeNull();
  });
});

describe('aiDiscard - 补充', () => {
  it('无定缺花色时从全手牌中随机选', () => {
    const hand: Tile[] = [t('tong', 1, 0), t('tiao', 2, 0), t('wan', 3, 0)];
    const result = aiDiscard(hand);
    expect(hand).toContain(result);
  });

  it('只有一张牌时返回该牌', () => {
    const hand: Tile[] = [t('tong', 5, 0)];
    const result = aiDiscard(hand);
    expect(result).toBe(hand[0]);
  });

  it('优先出定缺花色的牌', () => {
    const hand: Tile[] = [
      t('tong', 1, 0), t('tong', 2, 0),
      t('tiao', 5, 0),
    ];
    // 多次测试，定缺 tiao 时应该优先出条
    let tiaoCount = 0;
    for (let i = 0; i < 50; i++) {
      const result = aiDiscard(hand, 'tiao');
      if (result.suit === 'tiao') tiaoCount++;
    }
    expect(tiaoCount).toBe(50); // 有条的牌时一定出条
  });

  it('定缺花色的牌打完后随机出其他牌', () => {
    const hand: Tile[] = [t('tong', 1, 0), t('tong', 2, 0)];
    // 定缺 tiao 但手上没有条
    const result = aiDiscard(hand, 'tiao');
    expect(hand).toContain(result);
  });
});

describe('aiShouldPeng - 补充', () => {
  it('有三门花色时，缺门花色牌不碰', () => {
    const hand: Tile[] = [t('tong', 1, 0), t('tiao', 2, 0)];
    // 缺万
    const target: Tile = t('wan', 5, 0);
    expect(aiShouldPeng(hand, target)).toBe(false);
  });

  it('只有一门花色时，该门牌可碰（概率）', () => {
    const hand: Tile[] = [t('tong', 1, 0), t('tong', 2, 0)];
    const target: Tile = t('tong', 5, 0);
    // getMissingSuit 返回 tiao 或 wan，不是 tong，所以应该概率碰
    const results = Array.from({ length: 50 }, () => aiShouldPeng(hand, target));
    const trueCount = results.filter(r => r).length;
    expect(trueCount).toBeGreaterThan(0);
  });
});

describe('aiShouldGang - 补充', () => {
  it('有三门花色时，缺门花色牌不杠', () => {
    const hand: Tile[] = [t('tong', 1, 0), t('tiao', 2, 0)];
    const target: Tile = t('wan', 5, 0);
    expect(aiShouldGang(hand, target)).toBe(false);
  });
});

describe('sortTiles - 补充边界', () => {
  it('空数组 → 空数组', () => {
    expect(sortTiles([])).toEqual([]);
  });

  it('单张牌 → 返回自身', () => {
    const hand = [t('tong', 5, 0)];
    const sorted = sortTiles(hand);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].suit).toBe('tong');
    expect(sorted[0].value).toBe(5);
  });

  it('已排序的牌不变', () => {
    const hand = [t('tong', 1, 0), t('tong', 2, 0), t('tiao', 1, 0)];
    const sorted = sortTiles(hand);
    expect(sorted[0].suit).toBe('tong');
    expect(sorted[0].value).toBe(1);
    expect(sorted[1].suit).toBe('tong');
    expect(sorted[1].value).toBe(2);
    expect(sorted[2].suit).toBe('tiao');
  });
});

describe('hasQueYiMen - 补充', () => {
  it('只有一门花色 → true', () => {
    const hand: Tile[] = [t('wan', 1, 0), t('wan', 5, 0), t('wan', 9, 0)];
    expect(hasQueYiMen(hand)).toBe(true);
  });
});

describe('getMissingSuit - 补充', () => {
  it('只有一门时返回第一个缺失的花色', () => {
    const hand: Tile[] = [t('wan', 1, 0)];
    const missing = getMissingSuit(hand);
    // 缺 tong 或 tiao
    expect(missing).toBe('tong'); // tong 在 allSuits 数组中排第一
  });

  it('空手牌返回 tong（第一个花色）', () => {
    const missing = getMissingSuit([]);
    expect(missing).toBe('tong');
  });
});

// ============ 番型识别 & 计分测试 ============

function meld(type: Meld['type'], tiles: Tile[], fromPlayerId?: string): Meld {
  return { type, tiles, fromPlayerId };
}

describe('isSevenPairs', () => {
  it('7组对子返回 true', () => {
    const tiles: Tile[] = [
      t('tong', 1, 0), t('tong', 1, 1),
      t('tong', 2, 0), t('tong', 2, 1),
      t('tong', 3, 0), t('tong', 3, 1),
      t('tiao', 4, 0), t('tiao', 4, 1),
      t('tiao', 5, 0), t('tiao', 5, 1),
      t('tiao', 6, 0), t('tiao', 6, 1),
      t('wan', 9, 0), t('wan', 9, 1),
    ];
    expect(isSevenPairs(tiles)).toBe(true);
  });

  it('非14张返回 false', () => {
    expect(isSevenPairs([t('tong', 1, 0), t('tong', 1, 1)])).toBe(false);
  });

  it('有顺子不是七对', () => {
    const tiles: Tile[] = [
      t('tong', 1, 0), t('tong', 2, 0),  // 不是对子
      t('tong', 3, 0), t('tong', 3, 1),
      t('tiao', 4, 0), t('tiao', 4, 1),
      t('tiao', 5, 0), t('tiao', 5, 1),
      t('tiao', 6, 0), t('tiao', 6, 1),
      t('wan', 7, 0), t('wan', 7, 1),
      t('wan', 9, 0), t('wan', 9, 1),
    ];
    expect(isSevenPairs(tiles)).toBe(false);
  });
});

describe('canHu 支持七对', () => {
  it('七对牌型也能胡（缺一门）', () => {
    const tiles: Tile[] = [
      t('tong', 1, 0), t('tong', 1, 1),
      t('tong', 2, 0), t('tong', 2, 1),
      t('tong', 3, 0), t('tong', 3, 1),
      t('tiao', 4, 0), t('tiao', 4, 1),
      t('tiao', 5, 0), t('tiao', 5, 1),
      t('tiao', 6, 0), t('tiao', 6, 1),
      t('tiao', 9, 0), t('tiao', 9, 1),
    ];
    expect(canHu(tiles)).toBe(true);
  });
});

describe('isQingYiSe', () => {
  it('手牌+melds只有一门花色', () => {
    const hand = [t('tong', 1, 0), t('tong', 2, 0), t('tong', 3, 0), t('tong', 5, 0), t('tong', 5, 1)];
    const melds: Meld[] = [
      meld('peng', [t('tong', 7, 0), t('tong', 7, 1), t('tong', 7, 2)]),
      meld('peng', [t('tong', 9, 0), t('tong', 9, 1), t('tong', 9, 2)]),
    ];
    expect(isQingYiSe(hand, melds)).toBe(true);
  });

  it('有两门花色返回 false', () => {
    const hand = [t('tong', 1, 0), t('tiao', 2, 0)];
    expect(isQingYiSe(hand, [])).toBe(false);
  });
});

describe('isPengPengHu', () => {
  it('手牌全刻子+雀头', () => {
    const hand = [
      t('tong', 1, 0), t('tong', 1, 1), t('tong', 1, 2),
      t('tiao', 5, 0), t('tiao', 5, 1), t('tiao', 5, 2),
      t('wan', 9, 0), t('wan', 9, 1),
    ];
    const melds: Meld[] = [
      meld('peng', [t('tong', 3, 0), t('tong', 3, 1), t('tong', 3, 2)]),
    ];
    expect(isPengPengHu(hand, melds)).toBe(true);
  });

  it('有顺子不是碰碰胡', () => {
    const hand = [
      t('tong', 1, 0), t('tong', 2, 0), t('tong', 3, 0),
      t('tiao', 5, 0), t('tiao', 5, 1),
    ];
    expect(isPengPengHu(hand, [])).toBe(false);
  });
});

describe('isJinGouDiao', () => {
  it('手牌2张 + 4组melds', () => {
    const hand = [t('tong', 1, 0), t('tong', 1, 1)];
    const melds: Meld[] = [
      meld('peng', [t('tong', 2, 0), t('tong', 2, 1), t('tong', 2, 2)]),
      meld('peng', [t('tong', 3, 0), t('tong', 3, 1), t('tong', 3, 2)]),
      meld('peng', [t('tiao', 4, 0), t('tiao', 4, 1), t('tiao', 4, 2)]),
      meld('minggang', [t('wan', 5, 0), t('wan', 5, 1), t('wan', 5, 2), t('wan', 5, 3)]),
    ];
    expect(isJinGouDiao(hand, melds)).toBe(true);
  });

  it('手牌多于2张不是金钩钓', () => {
    const hand = [t('tong', 1, 0), t('tong', 1, 1), t('tong', 2, 0)];
    const melds: Meld[] = [
      meld('peng', [t('tong', 3, 0), t('tong', 3, 1), t('tong', 3, 2)]),
      meld('peng', [t('tong', 4, 0), t('tong', 4, 1), t('tong', 4, 2)]),
      meld('peng', [t('tiao', 5, 0), t('tiao', 5, 1), t('tiao', 5, 2)]),
    ];
    expect(isJinGouDiao(hand, melds)).toBe(false);
  });
});

describe('isLongQiDui', () => {
  it('七对中含4张相同', () => {
    const tiles: Tile[] = [
      t('tong', 1, 0), t('tong', 1, 1), t('tong', 1, 2), t('tong', 1, 3),  // 4张
      t('tong', 2, 0), t('tong', 2, 1),
      t('tiao', 3, 0), t('tiao', 3, 1),
      t('tiao', 4, 0), t('tiao', 4, 1),
      t('tiao', 5, 0), t('tiao', 5, 1),
      t('tiao', 6, 0), t('tiao', 6, 1),
    ];
    expect(isLongQiDui(tiles)).toBe(true);
  });

  it('普通七对没有4张相同', () => {
    const tiles: Tile[] = [
      t('tong', 1, 0), t('tong', 1, 1),
      t('tong', 2, 0), t('tong', 2, 1),
      t('tong', 3, 0), t('tong', 3, 1),
      t('tiao', 4, 0), t('tiao', 4, 1),
      t('tiao', 5, 0), t('tiao', 5, 1),
      t('tiao', 6, 0), t('tiao', 6, 1),
      t('wan', 9, 0), t('wan', 9, 1),
    ];
    expect(isLongQiDui(tiles)).toBe(false);
  });
});

describe('calcHuScore', () => {
  it('平胡 → 基础分5', () => {
    const hand = [
      t('tong', 1, 0), t('tong', 2, 0), t('tong', 3, 0),
      t('tiao', 4, 0), t('tiao', 5, 0), t('tiao', 6, 0),
      t('tong', 7, 0), t('tong', 8, 0), t('tong', 9, 0),
      t('tiao', 1, 0), t('tiao', 1, 1),
    ];
    const result = calcHuScore(hand, [], { isZimo: false });
    expect(result.totalScore).toBe(5);
    expect(result.patterns).toContain('平胡');
  });

  it('平胡自摸 → 5×2=10', () => {
    const hand = [
      t('tong', 1, 0), t('tong', 2, 0), t('tong', 3, 0),
      t('tiao', 4, 0), t('tiao', 5, 0), t('tiao', 6, 0),
      t('tong', 7, 0), t('tong', 8, 0), t('tong', 9, 0),
      t('tiao', 1, 0), t('tiao', 1, 1),
    ];
    const result = calcHuScore(hand, [], { isZimo: true });
    expect(result.totalScore).toBe(10);
    expect(result.patterns).toContain('平胡');
    expect(result.patterns).toContain('自摸');
  });

  it('碰碰胡 → 5×2=10', () => {
    const hand = [
      t('tong', 1, 0), t('tong', 1, 1), t('tong', 1, 2),
      t('tiao', 5, 0), t('tiao', 5, 1), t('tiao', 5, 2),
      t('tong', 9, 0), t('tong', 9, 1),
    ];
    const melds: Meld[] = [
      meld('peng', [t('tiao', 3, 0), t('tiao', 3, 1), t('tiao', 3, 2)]),
    ];
    const result = calcHuScore(hand, melds, { isZimo: false });
    expect(result.totalScore).toBe(10);
    expect(result.patterns).toContain('碰碰胡');
  });

  it('清一色 → 5×4=20', () => {
    const hand = [
      t('tong', 1, 0), t('tong', 2, 0), t('tong', 3, 0),
      t('tong', 4, 0), t('tong', 5, 0), t('tong', 6, 0),
      t('tong', 7, 0), t('tong', 7, 1),
    ];
    const melds: Meld[] = [
      meld('peng', [t('tong', 9, 0), t('tong', 9, 1), t('tong', 9, 2)]),
    ];
    const result = calcHuScore(hand, melds, { isZimo: false });
    expect(result.totalScore).toBe(20);
    expect(result.patterns).toContain('清一色');
  });

  it('七对 → 5×4=20', () => {
    const hand = [
      t('tong', 1, 0), t('tong', 1, 1),
      t('tong', 2, 0), t('tong', 2, 1),
      t('tong', 3, 0), t('tong', 3, 1),
      t('tiao', 4, 0), t('tiao', 4, 1),
      t('tiao', 5, 0), t('tiao', 5, 1),
      t('tiao', 6, 0), t('tiao', 6, 1),
      t('tiao', 9, 0), t('tiao', 9, 1),
    ];
    const result = calcHuScore(hand, [], { isZimo: false });
    expect(result.totalScore).toBe(20);
    expect(result.patterns).toContain('七对');
  });

  it('龙七对 → 5×8=40', () => {
    const hand = [
      t('tong', 1, 0), t('tong', 1, 1), t('tong', 1, 2), t('tong', 1, 3),
      t('tong', 2, 0), t('tong', 2, 1),
      t('tiao', 3, 0), t('tiao', 3, 1),
      t('tiao', 4, 0), t('tiao', 4, 1),
      t('tiao', 5, 0), t('tiao', 5, 1),
      t('tiao', 6, 0), t('tiao', 6, 1),
    ];
    const result = calcHuScore(hand, [], { isZimo: false });
    expect(result.totalScore).toBe(40);
    expect(result.patterns).toContain('龙七对');
  });

  it('清碰 → 5×8=40', () => {
    const hand = [
      t('tong', 1, 0), t('tong', 1, 1), t('tong', 1, 2),
      t('tong', 5, 0), t('tong', 5, 1), t('tong', 5, 2),
      t('tong', 9, 0), t('tong', 9, 1),
    ];
    const melds: Meld[] = [
      meld('peng', [t('tong', 3, 0), t('tong', 3, 1), t('tong', 3, 2)]),
    ];
    const result = calcHuScore(hand, melds, { isZimo: false });
    expect(result.totalScore).toBe(40);
    expect(result.patterns).toContain('清碰');
  });

  it('清七对 → 5×16=80', () => {
    const hand = [
      t('tong', 1, 0), t('tong', 1, 1),
      t('tong', 2, 0), t('tong', 2, 1),
      t('tong', 3, 0), t('tong', 3, 1),
      t('tong', 4, 0), t('tong', 4, 1),
      t('tong', 5, 0), t('tong', 5, 1),
      t('tong', 6, 0), t('tong', 6, 1),
      t('tong', 9, 0), t('tong', 9, 1),
    ];
    const result = calcHuScore(hand, [], { isZimo: false });
    expect(result.totalScore).toBe(80);
    expect(result.patterns).toContain('清七对');
  });

  it('金钩钓 → 5×4=20', () => {
    const hand = [t('tong', 1, 0), t('tong', 1, 1)];
    const melds: Meld[] = [
      meld('peng', [t('tong', 2, 0), t('tong', 2, 1), t('tong', 2, 2)]),
      meld('peng', [t('tong', 3, 0), t('tong', 3, 1), t('tong', 3, 2)]),
      meld('peng', [t('tiao', 4, 0), t('tiao', 4, 1), t('tiao', 4, 2)]),
      meld('minggang', [t('tiao', 5, 0), t('tiao', 5, 1), t('tiao', 5, 2), t('tiao', 5, 3)]),
    ];
    const result = calcHuScore(hand, melds, { isZimo: false });
    expect(result.totalScore).toBe(20);
    expect(result.patterns).toContain('金钩钓');
  });

  it('清一色 + 自摸 → 5×4×2=40', () => {
    const hand = [
      t('tong', 1, 0), t('tong', 2, 0), t('tong', 3, 0),
      t('tong', 4, 0), t('tong', 5, 0), t('tong', 6, 0),
      t('tong', 7, 0), t('tong', 7, 1),
    ];
    const melds: Meld[] = [
      meld('peng', [t('tong', 9, 0), t('tong', 9, 1), t('tong', 9, 2)]),
    ];
    const result = calcHuScore(hand, melds, { isZimo: true });
    expect(result.totalScore).toBe(40);
    expect(result.patterns).toContain('清一色');
    expect(result.patterns).toContain('自摸');
  });

  it('天胡 → 封顶16倍 = 5×16=80', () => {
    const hand = [
      t('tong', 1, 0), t('tong', 2, 0), t('tong', 3, 0),
      t('tiao', 4, 0), t('tiao', 5, 0), t('tiao', 6, 0),
      t('tong', 7, 0), t('tong', 8, 0), t('tong', 9, 0),
      t('tiao', 1, 0), t('tiao', 1, 1),
    ];
    // 天胡(×16) × 自摸(×2) = 32，但封顶16倍 → 5×16=80
    const result = calcHuScore(hand, [], { isZimo: true, isTianHu: true });
    expect(result.totalScore).toBe(80);
    expect(result.multiplier).toBe(16);
    expect(result.patterns).toContain('天胡');
    expect(result.patterns).toContain('自摸');
  });

  it('杠上花 → 平胡自摸×杠上花 = 5×2×2=20', () => {
    const hand = [
      t('tong', 1, 0), t('tong', 2, 0), t('tong', 3, 0),
      t('tiao', 4, 0), t('tiao', 5, 0), t('tiao', 6, 0),
      t('tong', 7, 0), t('tong', 8, 0), t('tong', 9, 0),
      t('tiao', 1, 0), t('tiao', 1, 1),
    ];
    const result = calcHuScore(hand, [], { isZimo: true, isGangShangHua: true });
    expect(result.totalScore).toBe(20);
    expect(result.patterns).toContain('杠上花');
    expect(result.patterns).toContain('自摸');
  });

  it('杠上炮 → 平胡×杠上炮 = 5×2=10', () => {
    const hand = [
      t('tong', 1, 0), t('tong', 2, 0), t('tong', 3, 0),
      t('tiao', 4, 0), t('tiao', 5, 0), t('tiao', 6, 0),
      t('tong', 7, 0), t('tong', 8, 0), t('tong', 9, 0),
      t('tiao', 1, 0), t('tiao', 1, 1),
    ];
    const result = calcHuScore(hand, [], { isZimo: false, isGangShangPao: true });
    expect(result.totalScore).toBe(10);
    expect(result.patterns).toContain('杠上炮');
  });
});

describe('dealLuckyTiles', () => {
  it('庄家手牌恰好13张', () => {
    for (let i = 0; i < 50; i++) {
      const { hands } = dealLuckyTiles();
      expect(hands[0]).toHaveLength(13);
    }
  });

  it('其他三家各13张', () => {
    for (let i = 0; i < 20; i++) {
      const { hands } = dealLuckyTiles();
      expect(hands[1]).toHaveLength(13);
      expect(hands[2]).toHaveLength(13);
      expect(hands[3]).toHaveLength(13);
    }
  });

  it('总牌数 = 108（4家手牌 + 牌墙）', () => {
    for (let i = 0; i < 20; i++) {
      const { wall, hands } = dealLuckyTiles();
      const total = hands[0].length + hands[1].length + hands[2].length + hands[3].length + wall.length;
      expect(total).toBe(108);
    }
  });

  it('无重复牌 ID', () => {
    for (let i = 0; i < 20; i++) {
      const { wall, hands } = dealLuckyTiles();
      const allIds = [...hands[0], ...hands[1], ...hands[2], ...hands[3], ...wall].map(t => t.id);
      expect(new Set(allIds).size).toBe(108);
    }
  });

  it('庄家手牌能听牌（加 winTile 可胡）', () => {
    for (let i = 0; i < 20; i++) {
      const { wall, hands } = dealLuckyTiles();
      // winTile 在牌墙末尾
      const winTile = wall[wall.length - 1];
      const dealerHandWithWin = [...hands[0], winTile];
      expect(canHu(dealerHandWithWin)).toBe(true);
    }
  });
});

describe('canBuGang', () => {
  it('有碰且手牌有第4张时返回该牌', () => {
    const melds: Meld[] = [{
      type: 'peng',
      tiles: [t('tong', 5, 0), t('tong', 5, 1), t('tong', 5, 2)],
    }];
    const hand = [t('tong', 5, 3), t('tiao', 1, 0), t('tiao', 2, 0)];
    const result = canBuGang(hand, melds);
    expect(result).not.toBeNull();
    expect(result!.suit).toBe('tong');
    expect(result!.value).toBe(5);
  });

  it('无匹配碰时返回 null', () => {
    const melds: Meld[] = [{
      type: 'peng',
      tiles: [t('tong', 5, 0), t('tong', 5, 1), t('tong', 5, 2)],
    }];
    const hand = [t('tiao', 1, 0), t('tiao', 2, 0), t('tiao', 3, 0)];
    expect(canBuGang(hand, melds)).toBeNull();
  });

  it('非碰的 meld 不计入', () => {
    const melds: Meld[] = [{
      type: 'minggang',
      tiles: [t('tong', 5, 0), t('tong', 5, 1), t('tong', 5, 2), t('tong', 5, 3)],
    }];
    const hand = [t('tiao', 1, 0)];
    expect(canBuGang(hand, melds)).toBeNull();
  });
});
