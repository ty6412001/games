import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1180, height: 820 } });

const isAtMostOneScreen = async (page: import('@playwright/test').Page) => {
  return page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }));
};

test('main menu fits in iPad landscape', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('heading', { name: '奥特曼' }).waitFor();
  const { scrollHeight, clientHeight } = await isAtMostOneScreen(page);
  expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 4);
});

test('setup screen fits in iPad landscape with 3 players', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '▶ 开始游戏' }).click();
  await page.getByText('⏱️ 对局时长').waitFor();
  const { scrollHeight, clientHeight } = await isAtMostOneScreen(page);
  expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 4);
});

test('game screen fits in iPad landscape', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '▶ 开始游戏' }).click();
  await page.getByRole('button', { name: '⚡ 开始游戏' }).click();
  await page.getByRole('button', { name: /🎲 掷骰/ }).waitFor();
  const { scrollHeight, clientHeight } = await isAtMostOneScreen(page);
  expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 4);
});
