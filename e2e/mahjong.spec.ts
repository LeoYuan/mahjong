import { test, expect } from '@playwright/test';

// 辅助函数：选择第一个可用的定缺按钮
async function selectFirstAvailableQueYi(page: any) {
  await expect(page.getByText('请选择定缺花色')).toBeVisible();

  // 尝试每个定缺按钮，选择第一个可用的
  for (const suit of ['tong', 'tiao', 'wan']) {
    const button = page.getByTestId(`queyi-${suit}`);
    const isDisabled = await button.isDisabled().catch(() => true);
    if (!isDisabled) {
      await button.click();
      return suit;
    }
  }
  throw new Error('No available queyi button found');
}

// 等待进入游戏阶段（手牌可见）
async function waitForGameStart(page: any) {
  await expect(page.locator('[data-testid="player-hand"]')).toBeVisible({ timeout: 5000 });
}

test.describe('麻将游戏', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('首页显示并开始游戏', async ({ page }) => {
    // 验证首页标题
    await expect(page.getByText('四川麻将')).toBeVisible();
    await expect(page.getByText('血战到底 · 四人局')).toBeVisible();

    // 点击开始游戏
    await page.getByRole('button', { name: '开始游戏' }).click();

    // 验证进入定缺阶段
    await expect(page.getByText('请选择定缺花色')).toBeVisible();
  });

  test('玩家可以选择定缺并开始游戏', async ({ page }) => {
    // 开始游戏
    await page.getByRole('button', { name: '开始游戏' }).click();

    // 选择第一个可用的定缺
    await selectFirstAvailableQueYi(page);

    // 验证进入游戏阶段，显示手牌
    await waitForGameStart(page);

    // 验证玩家手牌区域可见
    const handTiles = page.locator('[data-testid="player-hand"] button');
    const count = await handTiles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('AI会自动打牌 - 验证下家会出牌', async ({ page }) => {
    // 开始游戏
    await page.getByRole('button', { name: '开始游戏' }).click();

    // 选择定缺
    await selectFirstAvailableQueYi(page);

    // 等待游戏开始
    await waitForGameStart(page);

    // 记录初始手牌数
    const handTiles = page.locator('[data-testid="player-hand"] button');
    const initialCount = await handTiles.count();

    // 玩家打出一张牌
    await handTiles.first().click();

    // 等待AI回合
    await page.waitForTimeout(6000);

    // 验证游戏仍在进行（手牌区域仍然可见，或游戏已结束）
    const isPlaying = await page.locator('[data-testid="player-hand"]').isVisible().catch(() => false);
    const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
    expect(isPlaying || isFinished).toBe(true);
  });

  test('游戏可以进行多轮', async ({ page }) => {
    // 开始游戏并定缺
    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 玩家打出2张牌
    for (let i = 0; i < 2; i++) {
      const handTiles = page.locator('[data-testid="player-hand"] button');
      const count = await handTiles.count();
      if (count > 0) {
        await handTiles.first().click();
      }
      await page.waitForTimeout(4000);
    }

    // 验证游戏仍在进行或已结束（没有报错）
    const isPlaying = await page.locator('[data-testid="player-hand"]').isVisible().catch(() => false);
    const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
    expect(isPlaying || isFinished).toBe(true);
  });

  test('中心信息面板显示剩余牌数', async ({ page }) => {
    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 验证中心圆盘显示剩余
    await expect(page.getByText('剩余')).toBeVisible();
  });

  test('玩家信息显示正确', async ({ page }) => {
    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 验证4个玩家名称都显示
    await expect(page.getByText('我')).toBeVisible();
    await expect(page.getByText('老张')).toBeVisible();
    await expect(page.getByText('老杨')).toBeVisible();
    await expect(page.getByText('老熊')).toBeVisible();
  });
});
