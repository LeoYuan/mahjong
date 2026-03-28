# 四川麻将（血战到底）- 软件设计文档 (SDD)

## 1. 项目概述

### 1.1 项目背景
开发一个基于 Web 的四川麻将（血战到底）游戏，支持多人在线对战。

### 1.2 游戏规则简介
四川麻将（血战到底）核心规则：
- 使用 108 张牌（筒、条、万，各 1-9，每种 4 张），无字牌、无花牌
- 必须缺一门才能胡牌
- 一家胡牌后，其他玩家继续游戏，直到流局或三家胡牌
- 点炮者负责，自摸三家付
- 可以碰、杠，不能吃

## 2. 技术架构

### 2.1 技术栈
- **前端**: React + TypeScript + Tailwind CSS
- **状态管理**: Zustand
- **构建工具**: Vite
- **单元测试**: Vitest
- **E2E 测试**: Playwright (Chromium)

### 2.2 系统架构
纯前端实现，本地模拟 4 人对战（1 真人 + 3 AI）

## 3. 数据模型设计

### 3.1 核心实体

```typescript
// 牌
type Suit = 'tong' | 'tiao' | 'wan';

interface Tile {
  id: string;
  suit: Suit;
  value: number; // 1-9
}

// 碰/杠
type MeldType = 'peng' | 'minggang' | 'angang';

interface Meld {
  type: MeldType;
  tiles: Tile[];
  fromPlayerId?: string;
}

// 玩家
interface Player {
  id: string;
  name: string;
  hand: Tile[];
  discards: Tile[];
  melds: Meld[];
  isDealer: boolean;
  score: number;
  hasHu: boolean;
  isHu: boolean;
  queYiSuit?: Suit; // 定缺的花色
}

// 游戏状态
type GamePhase = 'waiting' | 'queyi' | 'playing' | 'finished';

interface GameState {
  wall: Tile[];
  currentPlayerIndex: number;
  lastDiscardedTile: Tile | null;
  turnPhase: 'draw' | 'play' | 'wait_action';
  huPlayers: number[];
}
```

## 4. 游戏流程

```
等待开始 → 定缺 → 游戏进行 → 结算 → 下一局
```

### 4.1 定缺阶段
1. 发牌后，每位玩家选择一门花色定缺
2. 定缺的花色不能用于胡牌
3. AI 自动选择手牌中最少的花色定缺

### 4.2 游戏进行
1. 庄家先出牌
2. 回合流程：摸牌 → 打牌 → 其他玩家响应（碰/杠/胡）
3. 一家胡牌后，其他玩家继续，直到三家胡牌或流局

## 5. 功能清单

### MVP 功能 ✅

| 功能 | 状态 |
|------|------|
| 发牌、摸牌、打牌 | ✅ |
| 碰牌 | ✅ |
| 杠牌（明杠/暗杠） | ✅ |
| 胡牌（点炮、自摸） | ✅ |
| 缺一门判定 | ✅ |
| 定缺功能 | ✅ |
| 血战到底（一家胡后继续） | ✅ |
| 4 人同屏显示 | ✅ |
| 听牌提示 | ✅ |
| AI 对手 | ✅ |
| 欢乐麻将风格 UI | ✅ |

### 后续版本

| 功能 | 版本 |
|------|------|
| 复杂番型（清一色、七对等） | V2 |
| 用户系统、登录注册 | V2 |
| 好友系统、聊天 | V2 |
| 服务器联机对战 | V2 |
| 战绩回放 | V3 |

## 6. 项目结构

```
mahjong/
├── src/
│   ├── components/     # UI 组件
│   │   ├── Tile.tsx          # 立体麻将牌（CSS 3D）
│   │   ├── Player.tsx        # 四方向玩家显示
│   │   ├── GameTable.tsx     # 欢乐麻将风格牌桌
│   │   ├── QueYiPanel.tsx    # 定缺面板
│   │   ├── ActionPanel.tsx   # 碰/杠/胡操作按钮
│   │   └── GameInfo.tsx      # 中心圆盘信息面板
│   ├── stores/
│   │   ├── gameStore.ts
│   │   └── __tests__/
│   │       └── gameStore.test.ts  # Store 集成测试
│   ├── utils/
│   │   ├── mahjong.ts
│   │   └── __tests__/
│   │       └── mahjong.test.ts    # 核心逻辑单元测试
│   └── types/
│       └── index.ts
├── e2e/                # Playwright E2E 测试
│   ├── mahjong.spec.ts
│   └── game-flow.spec.ts
├── .claude/
│   └── skills/         # 项目级 skills
│       ├── core-logic-testing/
│       └── update-spec/
├── playwright.config.ts
└── package.json
```

## 7. 开发规范

### 7.1 测试要求
- 所有核心逻辑必须有 100% 测试覆盖率
- 使用 TDD 方式开发

### 7.2 Spec 更新
- 任何新功能必须先更新 spec 再实现

## 8. 视觉风格

参考腾讯欢乐麻将，采用欢乐麻将风格 UI：
- **牌桌**：绿色毛毡径向渐变 + 木纹边框 + 内阴影
- **牌面**：CSS 3D 立体效果（白色正面 + 侧面厚度 + 绿色牌背），数字+花色名渲染
- **布局**：四方玩家围坐，底部手牌大尺寸，上/左/右显示牌背
- **信息面板**：中心半透明蓝色圆盘，显示东南西北方位 + 剩余牌数
- **玩家卡片**：四角定位，显示头像占位、昵称、分数、定缺花色

## 9. 测试覆盖

| 类别 | 数量 | 工具 |
|------|------|------|
| 核心逻辑单元测试 | 88 | Vitest |
| Store 集成测试 | 18 | Vitest |
| E2E 端到端测试 | 23 | Playwright |

## 10. 更新记录

| 日期 | 变更 |
|------|------|
| 2026-03-22 | 初始版本，MVP 完成 |
| 2026-03-22 | 添加定缺功能 |
| 2026-03-22 | 优化 4 人同屏布局 |
| 2026-03-25 | UI 改造为欢乐麻将风格（CSS 3D 立体牌面、绿色牌桌、中心圆盘） |
| 2026-03-25 | 补充单元测试（88 个）、Store 集成测试（18 个）、E2E 测试（23 个） |
