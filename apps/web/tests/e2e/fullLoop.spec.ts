import { expect, test } from '@playwright/test';

test('complete turn: dice → move → landing → next turn', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '▶ 开始游戏' }).click();

  // select 20-minute duration for faster test
  await page.getByRole('button', { name: '20 分钟' }).click();

  await page.getByRole('button', { name: '⚡ 开始游戏' }).click();

  // game screen visible
  await expect(page.getByRole('button', { name: /🎲 掷骰/ })).toBeVisible();

  // player panel shows all 3 default players (爸爸, 妈妈, 小朋友)
  await expect(page.getByText('爸爸')).toBeVisible();
  await expect(page.getByText('妈妈')).toBeVisible();
  await expect(page.getByText('小朋友')).toBeVisible();

  // roll dice
  await page.getByRole('button', { name: /🎲 掷骰/ }).click();

  // wait for animation to finish (dice + movement up to ~2s)
  await page.waitForTimeout(2500);

  // landing overlay or quiz modal should appear (or auto-resolved); dice button should be re-enabled eventually
  const dismissOrNext = page.getByRole('button', { name: '下一位' });
  const buyButton = page.getByRole('button', { name: /买下/ });
  const skipButton = page.getByRole('button', { name: '跳过' });
  const continueButton = page.getByRole('button', { name: '继续' });

  // first player is 爸爸 (adult) → no quiz, either LandingOverlay or auto-advance
  const handled = await Promise.race([
    dismissOrNext.waitFor({ state: 'visible', timeout: 5_000 }).then(() => 'landing'),
    skipButton.waitFor({ state: 'visible', timeout: 5_000 }).then(() => 'buy'),
    continueButton.waitFor({ state: 'visible', timeout: 5_000 }).then(() => 'quiz'),
  ]).catch(() => 'nothing');

  if (handled === 'buy') {
    await skipButton.click();
    await dismissOrNext.click();
  } else if (handled === 'landing') {
    await dismissOrNext.click();
  } else if (handled === 'quiz') {
    await continueButton.click();
    if (await dismissOrNext.isVisible().catch(() => false)) {
      await dismissOrNext.click();
    }
  }

  // dice button available again
  await expect(page.getByRole('button', { name: /🎲 掷骰/ })).toBeEnabled({ timeout: 5_000 });
});
