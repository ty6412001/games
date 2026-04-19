import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 1180, height: 820 } });

test('main menu primary buttons are reachable without scrolling', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '▶ 开始游戏' })).toBeInViewport();
  await expect(page.getByRole('button', { name: '📚 每日复习' })).toBeInViewport();
});

test('setup CTA stays reachable even with 5 players', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '▶ 开始游戏' }).click();
  const addPlayer = page.getByRole('button', { name: '+' });
  await addPlayer.click();
  await addPlayer.click();
  const cta = page.getByRole('button', { name: '⚡ 开始游戏' });
  await cta.scrollIntoViewIfNeeded();
  await expect(cta).toBeVisible();
});

test('game screen shows board and dice without scrolling', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '▶ 开始游戏' }).click();
  await page.getByRole('button', { name: '⚡ 开始游戏' }).click();
  await expect(page.getByRole('button', { name: /🎲 掷骰/ })).toBeInViewport();
  await expect(page.getByText(/第 1 周/).first()).toBeInViewport();
});
