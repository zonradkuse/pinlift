import { test, expect } from './fixtures.ts';
import { fakeCamera } from './fake-camera.ts';
import { startPlan } from './helpers.ts';

test.use(fakeCamera('device-qr', ['https://example.com/machine/42']));

test('unknown QR code is assigned once, afterwards scanning opens the device directly', async ({ page }) => {
  await page.goto('./#/scan');
  await expect(page.getByRole('heading', { name: 'Which device is this?' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /^Leg Press/ }).click();
  await expect(page.getByRole('heading', { name: 'Leg Press' })).toBeVisible();

  await page.goto('./#/scan');
  await expect(page).toHaveURL(/#\/device\/leg-press$/, { timeout: 15_000 });
  await expect(page.getByText(/First time on this device/)).toBeVisible();

  // Devices without a QR code come first; the linked one moves to the second group.
  await page.goto('./#/devices');
  const order = await page.locator('.list-subheader, .list-item .headline').allTextContents();
  expect(order[0]).toBe('Without QR code');
  expect(order.indexOf('Leg Press')).toBeGreaterThan(order.indexOf('With QR code'));
});

test('linking mid-workout offers the next plan devices first, with undo', async ({ page }) => {
  await startPlan(page, 'Upper body');
  await page.goto('./#/scan');
  await expect(page.getByRole('heading', { name: 'Which device is this?' })).toBeVisible({ timeout: 15_000 });
  const order = await page.locator('.list-subheader, .list-item .headline').allTextContents();
  expect(order.slice(0, 2)).toEqual(['Next in your plan', 'Chest Press']);
  await page.getByRole('button', { name: /^Chest Press/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Chest Press' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('heading', { name: 'Which device is this?' })).toBeVisible();
});

test('one QR code can open several exercises (Smith machine)', async ({ page }) => {
  await page.goto('./#/scan');
  await expect(page.getByRole('heading', { name: 'Which device is this?' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /^Smith Machine/ }).click();
  await page.getByRole('tab', { name: 'About' }).click();
  await page.getByRole('link', { name: 'Add exercise' }).click();
  await page.getByRole('button', { name: /^Barbell Squat/ }).click();
  await expect(page.getByRole('heading', { name: 'Barbell Squat' })).toBeVisible();
  await page.goto('./#/scan');
  await expect(page.getByRole('heading', { name: 'Which exercise?' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('link', { name: /Smith Machine/ })).toBeVisible();
  await page.getByRole('link', { name: /Barbell Squat/ }).click();
  await expect(page.getByRole('heading', { name: 'Barbell Squat' })).toBeVisible();
});
