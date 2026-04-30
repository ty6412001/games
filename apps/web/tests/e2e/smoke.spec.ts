import { expect, test } from '@playwright/test';

test('main menu loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '奥特曼' })).toBeVisible();
  await expect(page.getByRole('button', { name: '▶ 开始游戏' })).toBeVisible();
  await expect(page.getByRole('button', { name: '📚 每日复习' })).toBeVisible();
});

test('setup screen shows hero selection', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '▶ 开始游戏' }).click();
  await expect(page.getByRole('heading', { name: '对局时长' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '玩家阵容' })).toBeVisible();
  await expect(page.getByText(/玩家 \d/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '⚡ 开始游戏' })).toBeVisible();
});

test('game starts and shows board with center controls', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '▶ 开始游戏' }).click();
  await page.getByRole('button', { name: '⚡ 开始游戏' }).click();
  await expect(page.getByText(/第 1 周/).first()).toBeVisible();
  // center controls now show the dice button and players
  await expect(page.getByRole('button', { name: /🎲 掷骰/ })).toBeVisible();
  await expect(page.getByText('爸爸', { exact: true }).first()).toBeVisible();
});
