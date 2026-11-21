import { test, expect } from './fixtures.ts';
import { finishWorkout, logSets } from './helpers.ts';

test.describe('desktop', () => {
  test.use({ viewport: { width: 1366, height: 860 } });

  test('opens on the analytics dashboard with a side navigation rail on every page', async ({ page }) => {
    await logSets(page, 'chest-press', [[40, 10], [40, 10]]);
    await finishWorkout(page);
    await page.goto('./');
    await expect(page).toHaveURL(/#\/stats$/);
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
    for (const title of ['Volume per week (kg)', 'Training days', 'Sets per muscle group (last 4 weeks)', 'Best sets'])
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
    const rail = await page.getByRole('navigation', { name: 'Main' }).boundingBox();
    expect(rail).toMatchObject({ x: 0 });
    expect(rail!.width).toBeLessThan(120);
    expect(rail!.height).toBeGreaterThan(800);
    await page.goto('./#/device/chest-press');
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  });

  test('analytics uses the width: KPIs in one row, cards side by side', async ({ page }) => {
    await logSets(page, 'leg-press', [[100, 10]]);
    await finishWorkout(page);
    await page.goto('./#/stats');
    const tiles = page.locator('.kpis .tile');
    await expect(tiles).toHaveCount(5);
    const tops = await tiles.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    const days = await page.getByRole('heading', { name: 'Training days' }).boundingBox();
    const muscles = await page.getByRole('heading', { name: /Sets per muscle group/ }).boundingBox();
    expect(Math.abs(days!.y - muscles!.y)).toBeLessThan(4);
    expect(muscles!.x).toBeGreaterThan(days!.x + 300);
  });
});

test('every catalog machine has a pictogram on its About tab and in the device list', async ({ page }) => {
  await page.goto('./#/device/leg-press');
  await page.getByRole('tab', { name: 'About' }).click();
  await expect(page.getByRole('img', { name: 'How to use the Leg Press' })).toBeVisible();
  await page.goto('./#/devices');
  const rows = page.locator('.list-item');
  const withPictogram = page.locator('.list-item svg.pictogram');
  await expect(withPictogram).toHaveCount(await rows.count());
});
