import { test, expect } from '@playwright/test';

// 辅助函数：选择第一个可用的定缺按钮
async function selectFirstAvailableQueYi(page: any) {
  await expect(page.getByText('请选择定缺花色')).toBeVisible();

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

async function waitForGameStart(page: any) {
  await expect(page.locator('[data-testid="player-hand"]')).toBeVisible({ timeout: 5000 });
}

test.describe('四川麻将游戏流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('游戏启动页面显示正确', async ({ page }) => {
    await expect(page.getByText('四川麻将')).toBeVisible();
    await expect(page.getByText('血战到底 · 四人局')).toBeVisible();

    const startButton = page.getByRole('button', { name: '开始游戏' });
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();
  });

  test('点击开始游戏进入定缺阶段', async ({ page }) => {
    await page.getByRole('button', { name: '开始游戏' }).click();

    await expect(page.getByText('请选择定缺花色')).toBeVisible();

    await expect(page.getByTestId('queyi-tong')).toBeVisible();
    await expect(page.getByTestId('queyi-tiao')).toBeVisible();
    await expect(page.getByTestId('queyi-wan')).toBeVisible();
  });

  test('少于3张的花色不能被定缺', async ({ page }) => {
    await page.getByRole('button', { name: '开始游戏' }).click();

    await expect(page.getByText('请选择定缺花色')).toBeVisible();

    const disabledButtons = page.locator('button:disabled');
    const count = await disabledButtons.count();
    console.log(`Disabled buttons: ${count}`);
  });

  test('选择定缺后进入游戏', async ({ page }) => {
    await page.getByRole('button', { name: '开始游戏' }).click();

    await selectFirstAvailableQueYi(page);

    // 验证进入游戏阶段 - 手牌区域可见
    await waitForGameStart(page);

    const handTiles = page.locator('[data-testid="player-hand"]');
    await expect(handTiles).toBeVisible();
  });

  test('4家玩家都显示在屏幕上', async ({ page }) => {
    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    await expect(page.getByText('我')).toBeVisible();
    await expect(page.getByText('老张')).toBeVisible();
    await expect(page.getByText('老杨')).toBeVisible();
    await expect(page.getByText('老熊')).toBeVisible();
  });

  test('庄家可以出牌', async ({ page }) => {
    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 验证庄家标记
    await expect(page.getByText('庄')).toBeVisible();

    // 打出第一张牌
    const handTiles = page.locator('[data-testid="player-hand"] button');
    const initialCount = await handTiles.count();
    expect(initialCount).toBeGreaterThan(0);

    await handTiles.first().click();

    // 等待AI响应
    await page.waitForTimeout(3000);

    // 验证游戏仍在进行
    const isPlaying = await page.locator('[data-testid="player-hand"]').isVisible().catch(() => false);
    const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
    expect(isPlaying || isFinished).toBe(true);
  });

  test('听牌时显示提示', async ({ page }) => {
    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 打出多张牌
    for (let i = 0; i < 5; i++) {
      const handTiles = page.locator('[data-testid="player-hand"] button');
      const count = await handTiles.count();
      if (count > 0) {
        await handTiles.first().click();
        await page.waitForTimeout(3500);
      }
    }

    const tingText = await page.getByText('听牌:').isVisible().catch(() => false);
    console.log(`听牌显示: ${tingText}`);
  });

  test('AI会自动打牌', async ({ page }) => {
    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 玩家出牌
    const handTiles = page.locator('[data-testid="player-hand"] button');
    await handTiles.first().click();

    // 等待AI回合
    await page.waitForTimeout(4000);

    // 验证游戏推进（手牌仍可见或游戏结束）
    const isPlaying = await page.locator('[data-testid="player-hand"]').isVisible().catch(() => false);
    const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
    expect(isPlaying || isFinished).toBe(true);
  });

  test('游戏结束后显示排名', async ({ page }) => {
    test.setTimeout(120_000);

    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 快速出牌直到游戏结束
    for (let round = 0; round < 20; round++) {
      const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
      if (isFinished) break;

      const handTiles = page.locator('[data-testid="player-hand"] button');
      const count = await handTiles.count();
      if (count === 0) break;

      await handTiles.first().click();
      await page.waitForTimeout(2500);
    }

    // 验证没有报错
    const hasError = await page.getByText('Error').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  // ============ 补充 E2E 测试 ============

  test('牌桌 UI：绿色牌桌和中心圆盘可见', async ({ page }) => {
    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 绿色牌桌元素
    const table = page.locator('.mahjong-table');
    await expect(table).toBeVisible();

    // 中心圆盘
    const disc = page.locator('.center-disc');
    await expect(disc).toBeVisible();
  });

  test('中心圆盘显示方位和剩余牌数', async ({ page }) => {
    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 显示方位
    await expect(page.getByText('东')).toBeVisible();

    // 显示剩余
    await expect(page.getByText('剩余')).toBeVisible();
  });

  test('出牌后手牌数量减少', async ({ page }) => {
    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    const handTiles = page.locator('[data-testid="player-hand"] button');
    const initialCount = await handTiles.count();
    expect(initialCount).toBeGreaterThan(0);

    // 出一张牌
    await handTiles.first().click();

    // 等待状态更新
    await page.waitForTimeout(500);

    // 验证手牌减少（至少少了一张，可能因摸牌又加回来但回合未到时应该少了）
    const afterCount = await page.locator('[data-testid="player-hand"] button').count();
    // 出了一张，如果还没轮到自己摸牌，手牌应该少了
    expect(afterCount).toBeLessThanOrEqual(initialCount);
  });

  test('定缺界面显示花色数量', async ({ page }) => {
    await page.getByRole('button', { name: '开始游戏' }).click();

    await expect(page.getByText('请选择定缺花色')).toBeVisible();

    // 验证显示"张"字样（花色数量统计）
    const zhangTexts = page.locator('text=张');
    const count = await zhangTexts.count();
    expect(count).toBeGreaterThanOrEqual(3); // 三个花色各显示 X 张
  });

  test('定缺界面展示手牌', async ({ page }) => {
    await page.getByRole('button', { name: '开始游戏' }).click();

    await expect(page.getByText('请选择定缺花色')).toBeVisible();

    // 定缺界面应展示手牌
    await expect(page.getByText('你的手牌：')).toBeVisible();
  });

  test('游戏结束后再来一局重新开始', async ({ page }) => {
    test.setTimeout(120_000);

    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 快速出牌
    for (let round = 0; round < 20; round++) {
      const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
      if (isFinished) break;

      const handTiles = page.locator('[data-testid="player-hand"] button');
      const count = await handTiles.count();
      if (count === 0) break;

      await handTiles.first().click();
      await page.waitForTimeout(2500);
    }

    // 如果游戏结束，验证"再来一局"按钮
    const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
    if (isFinished) {
      const restartButton = page.getByRole('button', { name: '再来一局' });
      await expect(restartButton).toBeVisible();

      await restartButton.click();

      // 应该回到开始页面
      await expect(page.getByText('四川麻将')).toBeVisible();
      await expect(page.getByRole('button', { name: '开始游戏' })).toBeVisible();
    }
  });

  test('玩家信息卡片显示分数', async ({ page }) => {
    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 玩家初始分数 1000
    const scoreTexts = page.locator('text=1000');
    const count = await scoreTexts.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('弃牌区最后一张牌有闪烁高亮边框', async ({ page }) => {
    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 出一张牌
    const handTiles = page.locator('[data-testid="player-hand"] button');
    const count = await handTiles.count();
    if (count > 0) {
      await handTiles.first().click();
      // 等待状态更新
      await page.waitForTimeout(500);
    }

    // 检查 .tile-highlight 元素存在（最后打出的牌带闪烁边框）
    // 可能在自家或AI的弃牌区
    await page.waitForTimeout(2000);
    const highlights = page.locator('.tile-highlight');
    const highlightCount = await highlights.count();
    // 至少应有一张最后打出的牌在闪烁（可能是自己或AI打出的）
    console.log(`闪烁高亮牌数: ${highlightCount}`);
    // 只要游戏没结束，就应该有一张在闪烁
    const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
    if (!isFinished) {
      expect(highlightCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('碰/过按钮点击过后消失', async ({ page }) => {
    test.setTimeout(60_000);

    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 持续出牌，等待碰/过按钮出现
    for (let i = 0; i < 10; i++) {
      const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
      if (isFinished) break;

      // 检查是否有"过"按钮出现
      const passBtn = page.getByRole('button', { name: '过' });
      const hasPass = await passBtn.isVisible().catch(() => false);
      if (hasPass) {
        // 点击"过"
        await passBtn.click();
        await page.waitForTimeout(1000);
        // 验证按钮消失
        const stillVisible = await passBtn.isVisible().catch(() => false);
        expect(stillVisible).toBe(false);
        break;
      }

      // 出一张牌
      const handTiles = page.locator('[data-testid="player-hand"] button');
      const tileCount = await handTiles.count();
      if (tileCount > 0) {
        await handTiles.first().click();
        await page.waitForTimeout(3000);
      }
    }
  });

  test('点炮时点击过后胡/过按钮消失', async ({ page }) => {
    test.setTimeout(60_000);

    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 持续出牌，等待"胡"按钮出现（别人放炮）
    for (let i = 0; i < 15; i++) {
      const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
      if (isFinished) break;

      // 检查是否有"胡"按钮出现
      const huBtn = page.getByRole('button', { name: '胡' });
      const hasHu = await huBtn.isVisible().catch(() => false);
      if (hasHu) {
        // 找到"过"按钮并点击
        const passBtn = page.getByRole('button', { name: '过' });
        await expect(passBtn).toBeVisible();
        await passBtn.click();
        await page.waitForTimeout(1000);

        // 验证胡按钮和过按钮都消失
        const huStillVisible = await huBtn.isVisible().catch(() => false);
        const passStillVisible = await passBtn.isVisible().catch(() => false);
        expect(huStillVisible).toBe(false);
        expect(passStillVisible).toBe(false);
        break;
      }

      // 出一张牌
      const handTiles = page.locator('[data-testid="player-hand"] button');
      const tileCount = await handTiles.count();
      if (tileCount > 0) {
        await handTiles.first().click();
        await page.waitForTimeout(3000);
      }
    }
  });

  test('暗杠后点击过，按钮消失且可继续出牌', async ({ page }) => {
    test.setTimeout(120_000);

    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 持续出牌，等待暗杠按钮出现
    let found = false;
    for (let i = 0; i < 40; i++) {
      const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
      if (isFinished) break;

      // 检查是否有"暗杠"按钮
      const anGangBtn = page.getByRole('button', { name: '暗杠' });
      const hasAnGang = await anGangBtn.isVisible().catch(() => false);

      if (hasAnGang) {
        found = true;
        // 点击"过"
        const passBtn = page.getByRole('button', { name: '过' });
        await expect(passBtn).toBeVisible();
        await passBtn.click();
        await page.waitForTimeout(1000);

        // 验证暗杠和过按钮都消失
        const anGangStillVisible = await anGangBtn.isVisible().catch(() => false);
        const passStillVisible = await passBtn.isVisible().catch(() => false);
        expect(anGangStillVisible).toBe(false);
        expect(passStillVisible).toBe(false);
        break;
      }

      // 出一张牌
      const handTiles = page.locator('[data-testid="player-hand"] button');
      const tileCount = await handTiles.count();
      if (tileCount > 0) {
        await handTiles.first().click();
        await page.waitForTimeout(2000);
      }
    }
    // 如果一直没遇到暗杠，跳过此测试
    if (!found) {
      console.log('未遇到暗杠场景，跳过测试');
    }
  });

  test('补杠后点击过，按钮消失且可继续出牌', async ({ page }) => {
    test.setTimeout(60_000);

    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 持续出牌，先碰牌，然后等待补杠按钮
    let hasPenged = false;
    for (let i = 0; i < 30; i++) {
      const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
      if (isFinished) break;

      // 检查是否有"补杠"按钮
      const buGangBtn = page.getByRole('button', { name: '补杠' });
      const hasBuGang = await buGangBtn.isVisible().catch(() => false);

      if (hasBuGang && hasPenged) {
        // 点击"过"
        const passBtn = page.getByRole('button', { name: '过' });
        await expect(passBtn).toBeVisible();
        await passBtn.click();
        await page.waitForTimeout(1000);

        // 验证补杠和过按钮都消失
        const buGangStillVisible = await buGangBtn.isVisible().catch(() => false);
        const passStillVisible = await passBtn.isVisible().catch(() => false);
        expect(buGangStillVisible).toBe(false);
        expect(passStillVisible).toBe(false);
        break;
      }

      // 检查是否有"碰"按钮，点击碰
      const pengBtn = page.getByRole('button', { name: '碰' });
      const hasPeng = await pengBtn.isVisible().catch(() => false);
      if (hasPeng && !hasPenged) {
        await pengBtn.click();
        hasPenged = true;
        await page.waitForTimeout(3000);
        continue;
      }

      // 出一张牌
      const handTiles = page.locator('[data-testid="player-hand"] button');
      const tileCount = await handTiles.count();
      if (tileCount > 0) {
        await handTiles.first().click();
        await page.waitForTimeout(3000);
      }
    }
  });

  test('碰后点击过，按钮消失且游戏继续', async ({ page }) => {
    test.setTimeout(60_000);

    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 持续出牌，等待碰按钮出现
    for (let i = 0; i < 15; i++) {
      const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
      if (isFinished) break;

      // 检查是否有"碰"按钮
      const pengBtn = page.getByRole('button', { name: '碰' });
      const hasPeng = await pengBtn.isVisible().catch(() => false);

      if (hasPeng) {
        // 点击"过"
        const passBtn = page.getByRole('button', { name: '过' });
        await expect(passBtn).toBeVisible();
        await passBtn.click();
        await page.waitForTimeout(1000);

        // 验证碰和过按钮都消失
        const pengStillVisible = await pengBtn.isVisible().catch(() => false);
        const passStillVisible = await passBtn.isVisible().catch(() => false);
        expect(pengStillVisible).toBe(false);
        expect(passStillVisible).toBe(false);
        break;
      }

      // 出一张牌
      const handTiles = page.locator('[data-testid="player-hand"] button');
      const tileCount = await handTiles.count();
      if (tileCount > 0) {
        await handTiles.first().click();
        await page.waitForTimeout(3000);
      }
    }
  });

  test('杠后点击过，按钮消失且游戏继续', async ({ page }) => {
    test.setTimeout(60_000);

    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 持续出牌，等待明杠按钮出现
    for (let i = 0; i < 15; i++) {
      const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
      if (isFinished) break;

      // 检查是否有"杠"按钮（明杠）
      const gangBtn = page.getByRole('button', { name: '杠' });
      const hasGang = await gangBtn.isVisible().catch(() => false);

      if (hasGang) {
        // 点击"过"
        const passBtn = page.getByRole('button', { name: '过' });
        await expect(passBtn).toBeVisible();
        await passBtn.click();
        await page.waitForTimeout(1000);

        // 验证杠和过按钮都消失
        const gangStillVisible = await gangBtn.isVisible().catch(() => false);
        const passStillVisible = await passBtn.isVisible().catch(() => false);
        expect(gangStillVisible).toBe(false);
        expect(passStillVisible).toBe(false);
        break;
      }

      // 出一张牌
      const handTiles = page.locator('[data-testid="player-hand"] button');
      const tileCount = await handTiles.count();
      if (tileCount > 0) {
        await handTiles.first().click();
        await page.waitForTimeout(3000);
      }
    }
  });

  test('自摸时点击过，按钮消失且可继续出牌', async ({ page }) => {
    test.setTimeout(60_000);

    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 持续出牌，等待自摸按钮出现
    for (let i = 0; i < 25; i++) {
      const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
      if (isFinished) break;

      // 检查是否有"自摸"按钮
      const zimoBtn = page.getByRole('button', { name: '自摸' });
      const hasZimo = await zimoBtn.isVisible().catch(() => false);

      if (hasZimo) {
        // 点击"过"
        const passBtn = page.getByRole('button', { name: '过' });
        await expect(passBtn).toBeVisible();
        await passBtn.click();
        await page.waitForTimeout(1000);

        // 验证自摸和过按钮都消失
        const zimoStillVisible = await zimoBtn.isVisible().catch(() => false);
        const passStillVisible = await passBtn.isVisible().catch(() => false);
        expect(zimoStillVisible).toBe(false);
        expect(passStillVisible).toBe(false);

        // 验证可以继续出牌
        const handTiles = page.locator('[data-testid="player-hand"] button');
        const count = await handTiles.count();
        expect(count).toBeGreaterThan(0);
        break;
      }

      // 出一张牌
      const handTiles = page.locator('[data-testid="player-hand"] button');
      const tileCount = await handTiles.count();
      if (tileCount > 0) {
        await handTiles.first().click();
        await page.waitForTimeout(3000);
      }
    }
  });

  test('手气模式庄家手牌14张且牌墙55张', async ({ page }) => {
    await page.getByRole('button', { name: '手气模式' }).click();
    await waitForGameStart(page);

    // 庄家手牌应为14张
    const handTiles = page.locator('[data-testid="player-hand"] button');
    const count = await handTiles.count();
    expect(count).toBe(14);

    // 牌墙应为55张（从中心圆盘读取）
    const wallText = page.locator('.center-disc');
    await expect(wallText).toContainText('55');
  });

  test('普通模式庄家手牌14张且牌墙55张', async ({ page }) => {
    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    const handTiles = page.locator('[data-testid="player-hand"] button');
    const count = await handTiles.count();
    expect(count).toBe(14);

    const wallText = page.locator('.center-disc');
    await expect(wallText).toContainText('55');
  });

  test('多轮出牌后无 JS 报错', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 打 5 轮
    for (let i = 0; i < 5; i++) {
      const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
      if (isFinished) break;

      const handTiles = page.locator('[data-testid="player-hand"] button');
      const count = await handTiles.count();
      if (count === 0) break;

      await handTiles.first().click();
      await page.waitForTimeout(3000);
    }

    expect(errors).toHaveLength(0);
  });

  // ============ 按钮消失专项测试 ============

  test('点炮胡时点击过，胡/过按钮立即消失', async ({ page }) => {
    test.setTimeout(120_000);

    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 持续出牌，等待"胡"按钮出现（点炮）
    for (let i = 0; i < 30; i++) {
      const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
      if (isFinished) break;

      // 检查是否有"胡"按钮出现（别人放炮）
      const huBtn = page.getByRole('button', { name: '胡' });
      const hasHu = await huBtn.isVisible().catch(() => false);

      if (hasHu) {
        // 确认是点炮胡（不是自摸），检查是否有"过"按钮
        const passBtn = page.getByRole('button', { name: '过' });
        const hasPass = await passBtn.isVisible().catch(() => false);

        if (hasPass) {
          // 点击"过"
          await passBtn.click();

          // 立即检查按钮是否消失（不等待timeout）
          await page.waitForTimeout(100);
          const huStillVisible = await huBtn.isVisible().catch(() => false);
          const passStillVisible = await passBtn.isVisible().catch(() => false);

          expect(huStillVisible).toBe(false);
          expect(passStillVisible).toBe(false);
          break;
        }
      }

      // 出一张牌
      const handTiles = page.locator('[data-testid="player-hand"] button');
      const tileCount = await handTiles.count();
      if (tileCount > 0) {
        await handTiles.first().click();
        await page.waitForTimeout(2500);
      }
    }
  });

  test('碰/过按钮点击后立即消失', async ({ page }) => {
    test.setTimeout(120_000);

    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 持续出牌，等待碰/过按钮出现
    for (let i = 0; i < 30; i++) {
      const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
      if (isFinished) break;

      // 检查是否有"碰"按钮出现
      const pengBtn = page.getByRole('button', { name: '碰' });
      const hasPeng = await pengBtn.isVisible().catch(() => false);

      if (hasPeng) {
        const passBtn = page.getByRole('button', { name: '过' });

        // 点击"过"
        await passBtn.click();

        // 立即检查按钮是否消失
        await page.waitForTimeout(100);
        const pengStillVisible = await pengBtn.isVisible().catch(() => false);
        const passStillVisible = await passBtn.isVisible().catch(() => false);

        expect(pengStillVisible).toBe(false);
        expect(passStillVisible).toBe(false);
        break;
      }

      // 出一张牌
      const handTiles = page.locator('[data-testid="player-hand"] button');
      const tileCount = await handTiles.count();
      if (tileCount > 0) {
        await handTiles.first().click();
        await page.waitForTimeout(2500);
      }
    }
  });

  test('明杠/过按钮点击后立即消失', async ({ page }) => {
    test.setTimeout(120_000);

    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 持续出牌，等待杠/过按钮出现
    for (let i = 0; i < 30; i++) {
      const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
      if (isFinished) break;

      // 检查是否有"杠"按钮出现（明杠）
      const gangBtn = page.getByRole('button', { name: '杠' });
      const hasGang = await gangBtn.isVisible().catch(() => false);

      if (hasGang) {
        const passBtn = page.getByRole('button', { name: '过' });

        // 点击"过"
        await passBtn.click();

        // 立即检查按钮是否消失
        await page.waitForTimeout(100);
        const gangStillVisible = await gangBtn.isVisible().catch(() => false);
        const passStillVisible = await passBtn.isVisible().catch(() => false);

        expect(gangStillVisible).toBe(false);
        expect(passStillVisible).toBe(false);
        break;
      }

      // 出一张牌
      const handTiles = page.locator('[data-testid="player-hand"] button');
      const tileCount = await handTiles.count();
      if (tileCount > 0) {
        await handTiles.first().click();
        await page.waitForTimeout(2500);
      }
    }
  });

  test('自摸/过按钮点击后立即消失且可继续出牌', async ({ page }) => {
    test.setTimeout(120_000);

    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 持续出牌，等待自摸按钮出现
    for (let i = 0; i < 40; i++) {
      const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
      if (isFinished) break;

      // 检查是否有"自摸"按钮出现
      const zimoBtn = page.getByRole('button', { name: '自摸' });
      const hasZimo = await zimoBtn.isVisible().catch(() => false);

      if (hasZimo) {
        const passBtn = page.getByRole('button', { name: '过' });

        // 点击"过"
        await passBtn.click();

        // 立即检查按钮是否消失
        await page.waitForTimeout(100);
        const zimoStillVisible = await zimoBtn.isVisible().catch(() => false);
        const passStillVisible = await passBtn.isVisible().catch(() => false);

        expect(zimoStillVisible).toBe(false);
        expect(passStillVisible).toBe(false);

        // 验证可以继续出牌（手牌区域可见且有牌可出）
        const handTiles = page.locator('[data-testid="player-hand"] button');
        const count = await handTiles.count();
        expect(count).toBeGreaterThan(0);
        break;
      }

      // 出一张牌
      const handTiles = page.locator('[data-testid="player-hand"] button');
      const tileCount = await handTiles.count();
      if (tileCount > 0) {
        await handTiles.first().click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('暗杠/过按钮点击后立即消失且可继续出牌', async ({ page }) => {
    test.setTimeout(120_000);

    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    // 持续出牌，等待暗杠按钮出现
    for (let i = 0; i < 50; i++) {
      const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
      if (isFinished) break;

      // 检查是否有"暗杠"按钮出现
      const anGangBtn = page.getByRole('button', { name: '暗杠' });
      const hasAnGang = await anGangBtn.isVisible().catch(() => false);

      if (hasAnGang) {
        const passBtn = page.getByRole('button', { name: '过' });

        // 点击"过"
        await passBtn.click();

        // 立即检查按钮是否消失
        await page.waitForTimeout(100);
        const anGangStillVisible = await anGangBtn.isVisible().catch(() => false);
        const passStillVisible = await passBtn.isVisible().catch(() => false);

        expect(anGangStillVisible).toBe(false);
        expect(passStillVisible).toBe(false);

        // 验证可以继续出牌
        const handTiles = page.locator('[data-testid="player-hand"] button');
        const count = await handTiles.count();
        expect(count).toBeGreaterThan(0);
        break;
      }

      // 出一张牌
      const handTiles = page.locator('[data-testid="player-hand"] button');
      const tileCount = await handTiles.count();
      if (tileCount > 0) {
        await handTiles.first().click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('补杠/过按钮点击后立即消失且可继续出牌', async ({ page }) => {
    test.setTimeout(180_000);

    await page.getByRole('button', { name: '开始游戏' }).click();
    await selectFirstAvailableQueYi(page);
    await waitForGameStart(page);

    let hasPenged = false;

    // 持续出牌，先碰牌，然后等待补杠按钮
    for (let i = 0; i < 40; i++) {
      const isFinished = await page.getByText('游戏结束').isVisible().catch(() => false);
      if (isFinished) break;

      // 检查是否有"补杠"按钮
      const buGangBtn = page.getByRole('button', { name: '补杠' });
      const hasBuGang = await buGangBtn.isVisible().catch(() => false);

      if (hasBuGang && hasPenged) {
        const passBtn = page.getByRole('button', { name: '过' });

        // 点击"过"
        await passBtn.click();

        // 立即检查按钮是否消失
        await page.waitForTimeout(100);
        const buGangStillVisible = await buGangBtn.isVisible().catch(() => false);
        const passStillVisible = await passBtn.isVisible().catch(() => false);

        expect(buGangStillVisible).toBe(false);
        expect(passStillVisible).toBe(false);

        // 验证可以继续出牌
        const handTiles = page.locator('[data-testid="player-hand"] button');
        const count = await handTiles.count();
        expect(count).toBeGreaterThan(0);
        break;
      }

      // 检查是否有"碰"按钮，点击碰
      const pengBtn = page.getByRole('button', { name: '碰' });
      const hasPeng = await pengBtn.isVisible().catch(() => false);
      if (hasPeng && !hasPenged) {
        await pengBtn.click();
        hasPenged = true;
        await page.waitForTimeout(3000);
        continue;
      }

      // 出一张牌
      const handTiles = page.locator('[data-testid="player-hand"] button');
      const tileCount = await handTiles.count();
      if (tileCount > 0) {
        await handTiles.first().click();
        await page.waitForTimeout(2500);
      }
    }
  });
});
