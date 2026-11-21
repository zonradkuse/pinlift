import { test, expect } from './fixtures.ts';
import { finishWorkout, logSets, readKv, storedSets } from './helpers.ts';

test('two open tabs do not overwrite each other', async ({ page, context }) => {
  await page.goto('./#/session');
  const other = await context.newPage();
  await other.goto('./#/session');
  await logSets(page, 'chest-press', [[40, 10]]);
  await expect(other.getByRole('link', { name: /Chest Press/ })).toBeVisible(); // the other tab picked up the change
  await logSets(other, 'leg-press', [[100, 10]]);
  await expect.poll(async () => [await storedSets(page, 'chest-press'), await storedSets(page, 'leg-press')]).toEqual([1, 1]);
});

test('a damaged record in an imported file is skipped instead of breaking the app', async ({ page }) => {
  await logSets(page, 'chest-press', [[40, 10]]);
  await finishWorkout(page);
  await page.goto('./#/settings');
  const file = { schema: 1, sessions: {}, customDevices: {}, deviceSettings: {}, qr: {},
    workouts: { bad: { id: 'bad', updatedAt: 1 }, good: { id: 'good', name: 'Imported plan', deviceIds: ['leg-press'], updatedAt: 1 } } };
  await page.locator('input[type=file]').setInputFiles({ name: 'export.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByText(/1 damaged record skipped/)).toBeVisible();
  await expect.poll(async () => Object.keys((await readKv(page, 'data') as { workouts?: object }).workouts ?? {})).toContain('good');
  await page.goto('./');
  await page.reload();
  await expect(page.getByRole('button', { name: /^Imported plan/ })).toBeVisible();
});

test('an unexpected error shows a recovery screen with a way to save the data', async ({ page }) => {
  await logSets(page, 'chest-press', [[40, 10]]);
  await finishWorkout(page);
  // Simulate a bug: number formatting throws while a screen renders.
  await page.evaluate(() => Object.defineProperty(Intl.NumberFormat.prototype, 'format', { get() { throw new Error('simulated bug'); } }));
  await page.goto('./#/stats');
  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
  await expect(page.getByText('simulated bug')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export data' }).click();
  expect((await download).suggestedFilename()).toMatch(/^pinlift-.*\.json$/);
});

test('the app refuses to run inside a frame (clickjacking)', async ({ page, baseURL }) => {
  await page.setContent(`<iframe src="${baseURL}" style="width:400px;height:400px"></iframe>`);
  const frame = page.frameLocator('iframe');
  await expect(frame.getByText('Open Pinlift directly')).toBeVisible();
  await expect(frame.getByRole('heading', { name: 'Pinlift' })).toHaveCount(0);
});
