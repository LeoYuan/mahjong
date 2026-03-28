# 四川麻将（血战到底）- 技术架构设计文档

## 1. 架构概述

### 1.1 架构风格
- **类型**: 纯前端 SPA（Single Page Application）
- **模式**: 集中式状态管理 + 组件化 UI
- **通信**: 无服务端，本地状态管理

### 1.2 技术栈

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 构建 | Vite | ^8.0 | 快速开发服务器、打包 |
| 框架 | React | ^19.2 | UI 组件 |
| 语言 | TypeScript | ~5.9 | 类型安全 |
| 样式 | Tailwind CSS | ^3.4 | 原子化 CSS |
| 状态 | Zustand | ^5.0 | 全局状态管理 |
| 测试 | Vitest | ^4.1 | 单元测试 |

## 2. 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        浏览器                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   UI 组件    │  │  状态管理    │  │      游戏逻辑        │ │
│  │  - Tile     │  │  - Zustand  │  │  - 发牌/摸牌/打牌    │ │
│  │  - Player   │  │  - gameStore│  │  - 碰/杠/胡判定      │ │
│  │  - GameTable│  │             │  │  - AI 决策           │ │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────┘ │
│         │                │                                   │
│         └────────────────┘                                   │
│                  │                                           │
│         ┌────────┴────────┐                                  │
│         │    类型定义      │                                  │
│         │   types/index.ts │                                  │
│         └─────────────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

## 3. 模块设计

### 3.1 目录结构

```
src/
├── components/           # UI 组件层
│   ├── Tile.tsx         # 麻将牌组件
│   ├── Player.tsx       # 玩家区域组件
│   ├── GameTable.tsx    # 游戏主界面
│   ├── QueYiPanel.tsx   # 定缺面板
│   ├── ActionPanel.tsx  # 操作按钮面板
│   ├── GameInfo.tsx     # 游戏信息面板
│   ├── RecordsModal.tsx # 战绩查询弹窗
│   └── ConfettiCelebration.tsx # 撒花庆祝动画
├── stores/              # 状态管理层
│   └── gameStore.ts     # 游戏状态管理
├── utils/               # 工具函数层
│   ├── mahjong.ts       # 麻将核心算法
│   └── __tests__/       # 测试文件
├── types/               # 类型定义层
│   └── index.ts         # 所有类型定义
└── App.tsx              # 应用入口
```

### 3.2 组件层级

```
App
└── GameTable
    ├── GameInfo          # 左上角信息面板
    ├── Player (top)      # 顶部玩家
    ├── Player (left)     # 左侧玩家
    ├── Player (right)    # 右侧玩家
    ├── Player (bottom)   # 底部玩家（自己）
    │   └── Tile[]        # 手牌
    ├── ActionPanel       # 操作按钮
    ├── RecordsModal      # 战绩查询弹窗（条件渲染）
    └── ConfettiCelebration # 撒花动画（条件渲染）

QueYiPanel               # 定缺弹窗（覆盖层）
```

### 3.3 状态管理架构

```typescript
// Zustand Store 结构
interface GameStore {
  // 状态
  phase: GamePhase;           // 游戏阶段
  players: Player[];          // 4 个玩家
  gameState: GameState;       // 游戏状态
  currentUserIndex: number;   // 自己是第几位
  tingTiles: Tile[];          // 听牌提示
  luckyMode: boolean;         // 是否手气模式
  gameRecords: GameRecord[];  // 战绩记录
  roundNumber: number;        // 当前局数

  // Actions
  startGame: () => void;
  startLuckyGame: () => void;
  selectQueYi: (suit: Suit) => void;
  discardTile: (tileId: string) => void;
  pengTile: () => void;
  gangTile: (type: 'ming' | 'an' | 'bu') => void;
  huTile: () => void;
  passAction: () => void;
  clearRecords: () => void;
}
```

## 4. 核心算法

### 4.1 发牌算法

```typescript
function dealTiles() {
  // 1. 生成 108 张牌
  const allTiles = generateAllTiles();

  // 2. 洗牌（Fisher-Yates）
  const shuffled = shuffle(allTiles);

  // 3. 发牌：每人 13 张，庄家 14 张
  const hands = [[], [], [], []];
  for (let i = 0; i < 13; i++) {
    for (let p = 0; p < 4; p++) {
      hands[p].push(shuffled.pop());
    }
  }
  hands[0].push(shuffled.pop()); // 庄家多一张

  return { wall: shuffled, hands };
}
```

### 4.2 胡牌判定

```typescript
function canHu(hand: Tile[], discard?: Tile): boolean {
  // 1. 检查缺一门
  const suits = new Set(allTiles.map(t => t.suit));
  if (suits.size > 2) return false;

  // 2. 检查牌型（回溯找刻子+顺子+对子）
  return checkWinPattern(allTiles);
}
```

### 4.3 AI 决策

```typescript
// AI 定缺：选择手牌最少的花色
function aiSelectQueYi(hand: Tile[]): Suit {
  const suitCount = countBySuit(hand);
  return minBy(['tong', 'tiao', 'wan'], s => suitCount[s]);
}

// AI 打牌：优先打定缺花色
function aiDiscard(hand: Tile[], queYiSuit: Suit): Tile {
  const queYiTiles = hand.filter(t => t.suit === queYiSuit);
  if (queYiTiles.length > 0) return random(queYiTiles);
  return random(hand);
}
```

## 5. 数据流

### 5.1 游戏启动流程

```
[用户点击开始]
    ↓
[startGame action]
    ↓
[dealTiles 发牌]
    ↓
[phase → 'queyi']
    ↓
[显示 QueYiPanel]
    ↓
[玩家选择定缺]
    ↓
[selectQueYi action]
    ↓
[AI 自动定缺]
    ↓
[所有玩家定缺完成]
    ↓
[phase → 'playing']
    ↓
[游戏开始]
```

### 5.2 打牌流程

```
[玩家点击手牌]
    ↓
[discardTile action]
    ↓
[更新玩家手牌和弃牌]
    ↓
[检查其他玩家可响应动作]
    ↓
[有动作？→ 显示 ActionPanel]
    ↓
[无动作？→ 轮到下一位]
    ↓
[nextTurn]
    ↓
[摸牌]
    ↓
[检查自摸]
    ↓
[轮到玩家？→ 高亮]
    ↓
[轮到 AI？→ 自动执行]
```

## 6. 接口设计

### 6.1 组件接口

#### Tile
```typescript
interface TileProps {
  tile?: Tile;              // 牌数据（undefined 显示牌背）
  size?: 'xs' | 'sm' | 'md' | 'lg';
  selected?: boolean;
  disabled?: boolean;
  hidden?: boolean;         // true 显示牌背
  onClick?: () => void;
}
```

#### Player
```typescript
interface PlayerProps {
  player: Player;           // 玩家数据
  position: 'bottom' | 'left' | 'top' | 'right';
  isCurrentTurn: boolean;   // 是否当前回合
  isSelf: boolean;          // 是否自己
  tingTiles: Tile[];        // 听牌提示
  onTileClick?: (tileId: string) => void; // 点击手牌回调
}
```

### 6.2 状态接口

详见 `src/types/index.ts`

## 7. 性能优化

### 7.1 渲染优化
- 使用 Zustand 选择器减少重渲染
- Player 组件按位置区分，避免不必要的重渲染

### 7.2 计算优化
- 听牌检查只在手牌变化时执行
- AI 决策使用简单策略，避免复杂计算

## 8. 测试策略

### 8.1 测试覆盖要求
- 核心算法（`mahjong.ts`）: 100% 覆盖率
- 状态管理（`gameStore.ts`）: 关键流程测试

### 8.2 测试类型
- 单元测试：算法函数
- 集成测试：游戏流程
- 边界测试：边界条件（流局、天胡等）

## 9. 扩展性设计

### 9.1 未来可扩展功能

| 功能 | 扩展点 | 状态 |
|------|--------|------|
| 联机对战 | 添加 WebSocket 层，替换本地状态 | 待实现 |
| 更多番型 | 扩展 `canHu` 函数，添加番型计算 | 已实现基础番型 |
| 好友系统 | 添加用户认证模块 | 待实现 |
| 战绩统计 | 添加本地存储或后端 API | 已实现本地存储 |
| 手气模式 | 添加快速游戏模式 | 已实现 |
| 撒花动画 | 添加游戏庆祝效果 | 已实现 |

### 9.2 已实现的扩展功能

#### 战绩系统
- 使用 localStorage 存储战绩
- 每局游戏结束自动记录
- 支持查看历史对局和清空战绩

#### 手气模式
- 快速游戏模式，胡牌即结束
- 不计分，纯娱乐
- 带撒花庆祝动画

#### 杠牌计分
- 明杠、暗杠、补杠均支持计分
- 手气模式下自动禁用计分

### 9.3 模块化设计
- 游戏逻辑与 UI 分离
- 状态管理集中，便于迁移到服务端
- 组件化设计，易于扩展新功能

## 10. 更新记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-03-28 | v1.2 | 添加战绩系统、手气模式、撒花动画、杠牌计分 |
| 2026-03-22 | v1.1 | 添加定缺功能架构 |
| 2026-03-22 | v1.0 | 初始架构设计 |
