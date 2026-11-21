import { test, expect } from './fixtures.ts';
import { fakeCamera } from './fake-camera.ts';
import { Assembler, pack, parseFrame, toFrames, unpack } from '../src/lib/transfer.ts';
import { emptyData } from '../src/lib/types.ts';
import { finishWorkout, logSets, readShownQr } from './helpers.ts';

// 30 workouts, packed by the app's own code and split into several QR codes.
const remote = emptyData();
for (let i = 0; i < 30; i++) {
  const t = Date.UTC(2026, 0, 1 + i * 2, 17);
  remote.sessions['s' + i] = { id: 's' + i, startedAt: t, endedAt: t + 3600_000, updatedAt: t, entries: [
    { id: 'e' + i, deviceId: 'leg-press', sets: [{ weight: 80 + i, reps: 10, at: t }, { weight: 80 + i, reps: 9, at: t }] }] };
}
const frames = toFrames(await pack(remote), 200, 'TEST');
test.use(fakeCamera('transfer', frames));

test('receives a multi-code transfer through the camera and merges it', async ({ page }) => {
  expect(frames.length).toBeGreaterThan(3);
  await page.goto('./#/scan');
  await expect(page.getByTestId('transfer-progress')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Import data?' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Received 30 workouts/)).toBeVisible();
  await page.getByRole('button', { name: 'Import' }).click();
  await expect(page).toHaveURL(/#\/history/);
  await expect(page.locator('a[href^="#/summary/"]')).toHaveCount(30);
});

test('receiving from the analytics page returns there after the import', async ({ page }) => {
  await page.goto('./#/stats');
  await page.getByRole('link', { name: 'Receive from phone' }).click();
  await expect(page.getByRole('heading', { name: 'Import data?' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Import' }).click();
  await expect(page).toHaveURL(/#\/stats$/);
  await expect(page.locator('.kpis .tile').filter({ hasText: 'Workouts' }).locator('.value')).toHaveText('30');
});

test('send screen cycles through QR codes that reassemble into this device\'s data', async ({ page }) => {
  await logSets(page, 'chest-press', [[50, 10], [50, 9]]);
  await finishWorkout(page);
  await page.goto('./#/send');
  await page.getByRole('button', { name: 'Low' }).click();
  const asm = new Assembler();
  for (let tries = 0; tries < 200 && !asm.complete; tries++) {
    const code = await readShownQr(page);
    const frame = code && parseFrame(code);
    if (frame) asm.add(frame);
    await page.waitForTimeout(100);
  }
  expect(asm.complete).toBe(true);
  expect(asm.total).toBeGreaterThan(1);
  const { data } = await unpack(asm.bytes());
  const sets = Object.values(data.sessions).flatMap((s) => s.entries.flatMap((e) => e.sets));
  expect(sets.map((s) => `${s.weight}x${s.reps}`)).toEqual(['50x10', '50x9']);
});
