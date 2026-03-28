import type { Tile, Suit, Meld } from '../types';

// 生成所有牌（108张）
export function generateAllTiles(): Tile[] {
  const tiles: Tile[] = [];
  const suits: Suit[] = ['tong', 'tiao', 'wan'];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let id = 0;

  for (const suit of suits) {
    for (let value = 1; value <= 9; value++) {
      // 每种牌4张
      for (let i = 0; i < 4; i++) {
        tiles.push({
          id: `${suit}-${value}-${i}`,
          suit,
          value,
        });
      }
    }
  }

  return tiles;
}

// 洗牌（Fisher-Yates算法）
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 发牌
export function dealTiles() {
  const allTiles = shuffle(generateAllTiles());

  // 每人13张，庄家14张
  const hands: Tile[][] = [[], [], [], []];
  for (let i = 0; i < 13; i++) {
    for (let p = 0; p < 4; p++) {
      hands[p].push(allTiles.pop()!);
    }
  }
  hands[0].push(allTiles.pop()!); // 庄家多一张

  return {
    wall: allTiles,
    hands,
  };
}

// 手气模式：给庄家构造大牌听牌，确保几轮内自摸
export function dealLuckyTiles(): { wall: Tile[]; hands: Tile[][]; luckyQueYi: Suit; luckyPattern: string } {
  const allTiles = generateAllTiles();

  // 随机选一门做牌花色
  const suits: Suit[] = ['tong', 'tiao', 'wan'];
  const mainSuit = suits[Math.floor(Math.random() * 3)];
  // 缺的一门：非做牌花色
  const otherSuits = suits.filter(s => s !== mainSuit);
  const queYiSuit = otherSuits[Math.floor(Math.random() * 2)];

  // 随机选大牌型
  const patterns = ['清七对', '龙七对', '清碰', '清一色'] as const;
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];

  const suitTiles = allTiles.filter(t => t.suit === mainSuit);

  let dealerHand: Tile[];
  let winTile: Tile;

  if (pattern === '龙七对') {
    // 含一组4张 + 5组对子 = 14张胡牌，去1张做听 = 13张
    const values = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 6);
    dealerHand = [];
    // values[0] 是龙（4张），values[1..4] 是对子（各2张），values[5] 是雀头
    dealerHand.push(...suitTiles.filter(t => t.value === values[0]).slice(0, 4));
    for (let i = 1; i < 6; i++) {
      dealerHand.push(...suitTiles.filter(t => t.value === values[i]).slice(0, 2));
    }
    // 听 values[5] 的第三张（凑成对子）
    winTile = dealerHand.find(t => t.value === values[5])!;
    dealerHand = dealerHand.filter(t => t.id !== winTile.id);
  } else if (pattern === '清七对') {
    const values = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 7);
    dealerHand = [];
    for (const v of values) {
      dealerHand.push(...suitTiles.filter(t => t.value === v).slice(0, 2));
    }
    winTile = dealerHand.find(t => t.value === values[6])!;
    dealerHand = dealerHand.filter(t => t.id !== winTile.id);
  } else if (pattern === '清碰') {
    // 4组刻子 + 1雀头
    const values = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 5);
    dealerHand = [];
    for (let i = 0; i < 4; i++) {
      dealerHand.push(...suitTiles.filter(t => t.value === values[i]).slice(0, 3));
    }
    dealerHand.push(...suitTiles.filter(t => t.value === values[4]).slice(0, 2));
    winTile = dealerHand.find(t => t.value === values[4])!;
    dealerHand = dealerHand.filter(t => t.id !== winTile.id);
  } else {
    // 清一色：4组面子(顺/刻) + 1雀头 = 14张，去1张听 = 13张
    dealerHand = [];
    const used = new Map<number, number>(); // value -> count used
    const pick = (v: number) => {
      const idx = used.get(v) || 0;
      used.set(v, idx + 1);
      return suitTiles.filter(t => t.value === v)[idx];
    };
    // 3组顺子: 123, 456, 789
    for (const v of [1, 2, 3, 4, 5, 6, 7, 8, 9]) dealerHand.push(pick(v));
    // 1组刻子
    const triV = [1, 4, 7][Math.floor(Math.random() * 3)];
    dealerHand.push(pick(triV), pick(triV), pick(triV));
    // 雀头（2张，去1张做听）
    const eyeV = [2, 5, 8][Math.floor(Math.random() * 3)];
    dealerHand.push(pick(eyeV), pick(eyeV));
    winTile = dealerHand[dealerHand.length - 1];
    dealerHand = dealerHand.slice(0, -1);
  }

  // 确保庄家13张
  if (dealerHand.length !== 13) {
    throw new Error(`dealLuckyTiles: expected 13 tiles for dealer, got ${dealerHand.length} (pattern: ${pattern})`);
  }
  const usedIds = new Set(dealerHand.map(t => t.id));
  usedIds.add(winTile.id);
  const remaining = shuffle(allTiles.filter(t => !usedIds.has(t.id)));

  // 其他三家各发13张
  const hands: Tile[][] = [dealerHand, [], [], []];
  for (let p = 1; p <= 3; p++) {
    for (let i = 0; i < 13; i++) {
      hands[p].push(remaining.pop()!);
    }
  }

  // winTile 放牌墙末尾（pop时第一个摸到）
  const wall = remaining;
  wall.push(winTile);

  return { wall, hands, luckyQueYi: queYiSuit, luckyPattern: pattern };
}

// 检查缺一门
export function hasQueYiMen(hand: Tile[]): boolean {
  const suits = new Set(hand.map(t => t.suit));
  return suits.size <= 2;
}

// 获取缺的一门
export function getMissingSuit(hand: Tile[]): Suit | null {
  const suits = new Set(hand.map(t => t.suit));
  const allSuits: Suit[] = ['tong', 'tiao', 'wan'];
  for (const suit of allSuits) {
    if (!suits.has(suit)) return suit;
  }
  return null;
}

// 检查是否可以碰
export function canPeng(hand: Tile[], targetTile: Tile): boolean {
  const count = hand.filter(t =>
    t.suit === targetTile.suit && t.value === targetTile.value
  ).length;
  return count >= 2;
}

// 检查是否可以明杠
export function canMingGang(hand: Tile[], targetTile: Tile): boolean {
  const count = hand.filter(t =>
    t.suit === targetTile.suit && t.value === targetTile.value
  ).length;
  return count >= 3;
}

// 检查是否可以暗杠
export function canAnGang(hand: Tile[]): Tile | null {
  const valueCount = new Map<string, number>();
  for (const tile of hand) {
    const key = `${tile.suit}-${tile.value}`;
    valueCount.set(key, (valueCount.get(key) || 0) + 1);
  }

  for (const [key, count] of valueCount.entries()) {
    if (count === 4) {
      const [suit, value] = key.split('-');
      return hand.find(t => t.suit === suit && t.value === parseInt(value))!;
    }
  }
  return null;
}

// 检查是否可以补杠（加杠）：手牌中有牌与已碰 meld 匹配
export function canBuGang(hand: Tile[], melds: Meld[]): Tile | null {
  for (const m of melds) {
    if (m.type !== 'peng') continue;
    const pengTile = m.tiles[0];
    const match = hand.find(t => t.suit === pengTile.suit && t.value === pengTile.value);
    if (match) return match;
  }
  return null;
}

// 胡牌判定（支持平胡 + 七对）
export function canHu(hand: Tile[], discard?: Tile): boolean {
  // 1. 检查缺一门
  const allTiles = [...hand];
  if (discard) allTiles.push(discard);

  const suits = new Set(allTiles.map(t => t.suit));
  if (suits.size > 2) return false;

  // 2. 检查牌型（标准胡 或 七对）
  return checkWinPattern(allTiles) || isSevenPairs(allTiles);
}

// 检查七对牌型
export function isSevenPairs(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false;
  const sorted = sortTiles(tiles);
  for (let i = 0; i < 14; i += 2) {
    if (!isSameTile(sorted[i], sorted[i + 1])) return false;
  }
  return true;
}

// 检查胡牌牌型（递归/回溯）— 标准 雀头+面子
function checkWinPattern(tiles: Tile[]): boolean {
  if (![14, 11, 8, 5, 2].includes(tiles.length)) {
    return false;
  }

  // 排序便于处理
  const sorted = sortTiles(tiles);

  // 尝试每种牌作为雀头（对子）
  for (let i = 0; i < sorted.length - 1; i++) {
    if (isSameTile(sorted[i], sorted[i + 1])) {
      // 找到对子，移除后检查剩余
      const remaining = [...sorted.slice(0, i), ...sorted.slice(i + 2)];
      if (remaining.length === 0) return true;
      if (canFormSets(remaining)) return true;
    }
  }

  return false;
}

// 检查剩余牌能否组成刻子或顺子
function canFormSets(tiles: Tile[]): boolean {
  if (tiles.length === 0) return true;
  if (tiles.length % 3 !== 0) return false;

  // 尝试组成刻子
  if (tiles.length >= 3 && isSameTile(tiles[0], tiles[1]) && isSameTile(tiles[0], tiles[2])) {
    if (canFormSets(tiles.slice(3))) return true;
  }

  // 尝试组成顺子
  const first = tiles[0];
  const secondIdx = tiles.findIndex((t, i) => i > 0 && t.suit === first.suit && t.value === first.value + 1);
  const thirdIdx = tiles.findIndex((t, i) => i > 0 && t.suit === first.suit && t.value === first.value + 2);

  if (secondIdx !== -1 && thirdIdx !== -1) {
    const remaining = tiles.filter((_, i) => i !== 0 && i !== secondIdx && i !== thirdIdx);
    if (canFormSets(remaining)) return true;
  }

  return false;
}

// 检查两张牌是否相同
function isSameTile(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.value === b.value;
}

// 排序牌
export function sortTiles(tiles: Tile[]): Tile[] {
  const suitOrder: Record<Suit, number> = { tong: 0, tiao: 1, wan: 2 };
  return [...tiles].sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return a.value - b.value;
  });
}

// 获取听牌列表
export function getTingTiles(hand: Tile[]): Tile[] {
  const tingTiles: Tile[] = [];
  const allSuits: Suit[] = ['tong', 'tiao', 'wan'];

  // 检查缺一门
  const missingSuit = getMissingSuit(hand);
  const availableSuits = missingSuit
    ? allSuits.filter(s => s !== missingSuit)
    : allSuits;

  for (const suit of availableSuits) {
    for (let value = 1; value <= 9; value++) {
      const testTile: Tile = { id: `test-${suit}-${value}`, suit, value };
      if (canHu(hand, testTile)) {
        tingTiles.push(testTile);
      }
    }
  }

  return tingTiles;
}

// 获取牌的显示文本
export function getTileDisplay(tile: Tile): string {
  const suitNames: Record<Suit, string> = { tong: '筒', tiao: '条', wan: '万' };
  return `${tile.value}${suitNames[tile.suit]}`;
}

// 获取牌的颜色类
export function getTileColorClass(suit: Suit): string {
  return suit;
}

// ============ 番型识别 & 计分 ============

export interface HuResult {
  baseScore: number;   // 基础分（5）
  multiplier: number;  // 最终倍数
  patterns: string[];  // 番型名称列表
  totalScore: number;  // baseScore * multiplier
}

// 检查清一色：手牌+碰杠只有一门花色
export function isQingYiSe(hand: Tile[], melds: Meld[]): boolean {
  const allTiles = [...hand, ...melds.flatMap(m => m.tiles)];
  if (allTiles.length === 0) return false;
  const suit = allTiles[0].suit;
  return allTiles.every(t => t.suit === suit);
}

// 检查碰碰胡：手牌部分全刻子（无顺子），melds 全碰/杠
export function isPengPengHu(hand: Tile[], melds: Meld[]): boolean {
  // melds 必须全是碰或杠（本身就是）
  // 手牌部分必须能拆成 雀头 + 全刻子（无顺子）
  const sorted = sortTiles(hand);
  return canFormAllTriplets(sorted);
}

// 检查手牌能否拆成 雀头 + 全刻子
function canFormAllTriplets(tiles: Tile[]): boolean {
  if (tiles.length === 0) return false;
  if (tiles.length % 3 !== 2) return false;

  for (let i = 0; i < tiles.length - 1; i++) {
    if (isSameTile(tiles[i], tiles[i + 1])) {
      const remaining = [...tiles.slice(0, i), ...tiles.slice(i + 2)];
      if (remaining.length === 0) return true;
      if (allTriplets(remaining)) return true;
    }
  }
  return false;
}

function allTriplets(tiles: Tile[]): boolean {
  if (tiles.length === 0) return true;
  if (tiles.length % 3 !== 0) return false;
  if (tiles.length >= 3 && isSameTile(tiles[0], tiles[1]) && isSameTile(tiles[0], tiles[2])) {
    return allTriplets(tiles.slice(3));
  }
  return false;
}

// 检查金钩钓：手牌只剩1张（4组碰/杠 + 单骑）
export function isJinGouDiao(hand: Tile[], melds: Meld[]): boolean {
  return hand.length === 2 && melds.length === 4;
}

// 检查龙七对：七对中含一组4张相同
export function isLongQiDui(tiles: Tile[]): boolean {
  if (!isSevenPairs(tiles)) return false;
  const counts = new Map<string, number>();
  for (const t of tiles) {
    const key = `${t.suit}-${t.value}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.values()).some(c => c >= 4);
}

// 计算胡牌得分
export function calcHuScore(
  hand: Tile[],
  melds: Meld[],
  options: {
    isZimo: boolean;
    isTianHu?: boolean;
    isDiHu?: boolean;
    isGangShangHua?: boolean;
    isGangShangPao?: boolean;
    isQiangGang?: boolean;
  }
): HuResult {
  const BASE = 5;
  const patterns: string[] = [];
  let patternMultiplier = 1;

  // --- 牌型番 ---
  const qingYiSe = isQingYiSe(hand, melds);
  const qiDui = melds.length === 0 && isSevenPairs(hand);
  const longQiDui = qiDui && isLongQiDui(hand);
  const pengPeng = !qiDui && isPengPengHu(hand, melds);
  const jinGouDiao = isJinGouDiao(hand, melds);

  // 复合番型取最高组合
  if (qingYiSe && longQiDui) {
    // 清龙七对没有独立番，按 清七对 ×16 处理
    patterns.push('清七对');
    patternMultiplier = 16;
  } else if (qingYiSe && qiDui) {
    patterns.push('清七对');
    patternMultiplier = 16;
  } else if (qingYiSe && pengPeng) {
    patterns.push('清碰');
    patternMultiplier = 8;
  } else if (longQiDui) {
    patterns.push('龙七对');
    patternMultiplier = 8;
  } else if (qingYiSe && jinGouDiao) {
    // 清一色 + 金钩钓 分别计算 ×4 × ×4 = ×16
    patterns.push('清一色', '金钩钓');
    patternMultiplier = 16;
  } else if (qingYiSe) {
    patterns.push('清一色');
    patternMultiplier = 4;
  } else if (qiDui) {
    patterns.push('七对');
    patternMultiplier = 4;
  } else if (jinGouDiao) {
    patterns.push('金钩钓');
    patternMultiplier = 4;
  } else if (pengPeng) {
    patterns.push('碰碰胡');
    patternMultiplier = 2;
  } else {
    patterns.push('平胡');
    // 平胡 multiplier = 1
  }

  // --- 天胡/地胡 ---
  if (options.isTianHu) {
    patterns.push('天胡');
    patternMultiplier *= 16;
  } else if (options.isDiHu) {
    patterns.push('地胡');
    patternMultiplier *= 16;
  }

  // --- 额外翻倍（叠乘） ---
  if (options.isZimo) {
    patterns.push('自摸');
    patternMultiplier *= 2;
  }
  if (options.isGangShangHua) {
    patterns.push('杠上花');
    patternMultiplier *= 2;
  }
  if (options.isGangShangPao) {
    patterns.push('杠上炮');
    patternMultiplier *= 2;
  }
  if (options.isQiangGang) {
    patterns.push('抢杠胡');
    patternMultiplier *= 2;
  }

  const MAX_MULTIPLIER = 16;
  const cappedMultiplier = Math.min(patternMultiplier, MAX_MULTIPLIER);

  return {
    baseScore: BASE,
    multiplier: cappedMultiplier,
    patterns,
    totalScore: BASE * cappedMultiplier,
  };
}

// AI 简单决策：随机打出一张牌
export function aiDiscard(hand: Tile[], queYiSuit?: Suit): Tile {
  // 优先打定缺花色的牌
  if (queYiSuit) {
    const queYiTiles = hand.filter(t => t.suit === queYiSuit);
    if (queYiTiles.length > 0) {
      return queYiTiles[Math.floor(Math.random() * queYiTiles.length)];
    }
  }

  // 如果没有定缺花色或没有该花色的牌，随机打
  return hand[Math.floor(Math.random() * hand.length)];
}

// AI 是否碰牌
export function aiShouldPeng(hand: Tile[], targetTile: Tile): boolean {
  // 简单策略：如果缺这门，不碰；否则 70% 概率碰
  const missingSuit = getMissingSuit(hand);
  if (missingSuit === targetTile.suit) return false;
  return Math.random() < 0.7;
}

// AI 是否杠牌
export function aiShouldGang(hand: Tile[], targetTile: Tile): boolean {
  // 简单策略：如果缺这门，不杠；否则 80% 概率杠
  const missingSuit = getMissingSuit(hand);
  if (missingSuit === targetTile.suit) return false;
  return Math.random() < 0.8;
}
