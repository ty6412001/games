import { expect, test } from '@playwright/test';

test('dice roll animates and advances turn state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '▶ 开始游戏' }).click();
  await page.getByRole('button', { name: '20 分钟' }).click();
  await page.getByRole('button', { name: '⚡ 开始游戏' }).click();

  await expect(page.getByRole('button', { name: /🎲 掷骰/ })).toBeVisible();

  await expect(page.getByText('爸爸', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('妈妈', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('小朋友', { exact: true }).first()).toBeVisible();

  const diceButton = page.getByRole('button', { name: /🎲 掷骰/ });
  await diceButton.click();

  // dice should be disabled during rolling/moving
  await expect(diceButton).toBeDisabled();

  // wait for animations (800ms dice + up to 6*260ms movement + settle)
  await page.waitForTimeout(5000);

  // something should be on screen: landing overlay OR quiz modal
  const landing = page.getByRole('button', { name: '下一位' });
  const quizContinue = page.getByRole('button', { name: '继续' });
  const buyButtons = page.getByRole('button', { name: /买下|跳过/ });
  const anyOverlay = landing.or(quizContinue).or(buyButtons).first();

  await expect(anyOverlay).toBeVisible({ timeout: 6_000 });
});
