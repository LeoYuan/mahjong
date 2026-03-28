# 四川麻将（血战到底）- 更新记录

本文档记录所有 spec 变更历史。

## 格式规范

每次更新应包含：
- 日期
- 版本号
- 变更类型（新增/修改/删除）
- 变更内容
- 关联代码变更

---

## 2026-03-22

### v1.1

**新增：定缺功能**
- 类型: 新增
- 需求文档: SRS.md 2.1.2 节、2.4.1 节
- 技术文档: ARCHITECTURE.md 4.3 节、5.1 节
- 代码变更:
  - `src/types/index.ts`: 添加 `queYiSuit` 字段
  - `src/stores/gameStore.ts`: 添加 `selectQueYi` action
  - `src/components/QueYiPanel.tsx`: 新建定缺面板组件
  - `src/components/GameTable.tsx`: 添加定缺阶段处理

**新增：4 人同屏布局**
- 类型: 新增
- 需求文档: SRS.md 2.5.1 节
- 技术文档: ARCHITECTURE.md 3.2 节
- 代码变更:
  - `src/components/GameTable.tsx`: 重构布局
  - `src/components/Player.tsx`: 添加紧凑模式
  - `src/components/Tile.tsx`: 添加 xs 尺寸

### v1.0

**初始版本**
- 类型: 初始
- 需求:
  - 108 张牌（筒条万）
  - 血战到底规则
  - 碰、杠、胡
  - 1 真人 + 3 AI
- 代码实现:
  - 核心算法: `src/utils/mahjong.ts`
  - 状态管理: `src/stores/gameStore.ts`
  - UI 组件: `src/components/`

---

## 变更类型说明

- **新增**: 新功能
- **修改**: 已有功能变更
- **删除**: 功能移除
- **修复**: 问题修复
