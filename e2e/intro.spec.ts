import { test, expect } from '@playwright/test';

test('first launch shows a short introduction: core features, no server, data on this phone', async ({ page }) => {
  await page.goto('./');
  const intro = page.getByRole('dialog', { name: 'Welcome to Pinlift' });
  await expect(intro).toBeVisible();
  await expect(intro).toContainText(/scan/i);
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(intro).toContainText('No server');
  await expect(intro).toContainText('stored only on this device');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(intro).toContainText(/records/i);
  await page.getByRole('button', { name: /^(Next|Get started)$/ }).click();
  if (await page.getByRole('button', { name: 'Get started' }).isVisible()) await page.getByRole('button', { name: 'Get started' }).click();
  await expect(intro).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Pinlift' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pinlift' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Welcome to Pinlift' })).toHaveCount(0); // only once
});

test('the introduction can be skipped and shown again from Settings', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.goto('./#/settings');
  await page.getByRole('button', { name: 'Show introduction' }).click();
  await expect(page.getByRole('dialog', { name: 'Welcome to Pinlift' })).toBeVisible();
});

test('on iPhone the last step explains how to install, because Safari deletes data of sites that are not installed', async ({ browser }) => {
  const page = await browser.newPage({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', viewport: { width: 390, height: 844 } });
  await page.goto('./');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('dialog', { name: 'Welcome to Pinlift' })).toContainText('Add to Home Screen');
  await expect(page.getByRole('dialog', { name: 'Welcome to Pinlift' })).toContainText('7 days');
  await page.close();
});
