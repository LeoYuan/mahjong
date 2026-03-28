// 麻将牌类型
export type Suit = 'tong' | 'tiao' | 'wan';

export interface Tile {
  id: string;
  suit: Suit;
  value: number; // 1-9
}

// 碰/杠类型
export type MeldType = 'peng' | 'minggang' | 'angang' | 'bugang';

export interface Meld {
  type: MeldType;
  tiles: Tile[];
  fromPlayerId?: string; // 从哪位玩家处获得（碰/明杠）
}

// 玩家
export interface Player {
  id: string;
  name: string;
  avatar?: string;
  hand: Tile[];
  discards: Tile[];
  melds: Meld[];
  isDealer: boolean;
  score: number;
  hasHu: boolean;
  isHu: boolean; // 是否已经胡牌（血战到底中已胡玩家继续观战）
  huType?: 'zimo' | 'dianpao'; // 胡牌类型
  huPatterns?: string[]; // 番型列表，如 ['清一色', '自摸']
  huScore?: number; // 本次胡牌得分
  queYiSuit?: Suit; // 定缺的花色
}

// 游戏状态
export type GamePhase = 'waiting' | 'queyi' | 'playing' | 'finished';
export type TurnPhase = 'draw' | 'play' | 'wait_action';

export interface GameState {
  wall: Tile[]; // 牌墙
  currentPlayerIndex: number; // 当前玩家索引
  lastDiscardedTile: Tile | null; // 最后打出的牌
  lastDiscardPlayerIndex: number; // 最后打牌的玩家
  turnPhase: TurnPhase;
  huPlayers: number[]; // 已胡牌的玩家索引
  actions: PendingAction[]; // 待处理的动作
  turnCount: number; // 出牌次数（用于天胡/地胡判定）
  lastActionIsGang: boolean; // 上一个动作是杠（用于杠上花/杠上炮）
  gangScoreRecords: { from: number; to: number; amount: number }[]; // 杠分记录（流局退分用）
  passedGangThisTurn: boolean; // 本回合已跳过暗杠/补杠（用于控制按钮显示）
}

// 待处理动作
export interface PendingAction {
  playerIndex: number;
  type: 'peng' | 'gang' | 'hu';
  targetTile: Tile;
  priority: number;
}

// 游戏配置
export interface GameConfig {
  maxPlayers: number;
  maxRounds: number;
  currentRound: number;
}

// 游戏结果
export interface GameResult {
  playerIndex: number;
  score: number;
  huType?: 'zimo' | 'dianpao';
}

// AI 难度
export type AIDifficulty = 'easy' | 'normal' | 'hard';

// 单局战绩记录
export interface GameRecord {
  roundNumber: number; // 第几局
  timestamp: number; // 时间戳
  players: {
    playerIndex: number;
    name: string;
    isHu: boolean;
    huType?: 'zimo' | 'dianpao';
    huPatterns?: string[];
    scoreChange: number; // 本局输赢分数
    finalScore: number; // 本局结束后的总分
  }[];
  isLuckyMode: boolean; // 是否为手气模式
}
