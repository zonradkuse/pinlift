import { test, expect } from './fixtures.ts';
import { fillSet, finishWorkout, freezeAt, logSets, readKv, startPlan } from './helpers.ts';

test('edit a set, delete one and undo the deletion', async ({ page }) => {
  await logSets(page, 'chest-press', [[40, 10], [40, 10]]);
  await page.getByRole('button', { name: /^Set 2: 40 kg × 10/ }).click();
  await page.getByLabel('Reps', { exact: true }).fill('9');
  await page.getByRole('button', { name: 'Update set 2' }).click();
  await expect(page.getByRole('button', { name: /^Set 2: 40 kg × 9/ })).toBeVisible();

  await page.getByRole('button', { name: /^Set 1: / }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('button', { name: /^Set \d: / })).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: /^Set \d: / })).toHaveCount(2);
});

test('undo after deleting a set keeps sets logged since', async ({ page }) => {
  await logSets(page, 'chest-press', [[40, 10], [40, 10]]);
  await page.getByRole('button', { name: /^Set 2: / }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByLabel('Reps', { exact: true }).fill('8');
  await page.getByRole('button', { name: 'Log set 2' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: /^Set \d: / })).toHaveCount(3);
  await expect(page.getByRole('button', { name: /^Set 3: 40 kg × 8/ })).toBeVisible();
});

test('warm-up sets are marked and excluded from volume and "last time"', async ({ page }) => {
  await page.goto('./#/device/chest-press');
  await fillSet(page, 20, 10);
  await page.getByRole('button', { name: 'Warm-up' }).click();
  await page.getByRole('button', { name: 'Log warm-up set' }).click();
  await fillSet(page, 40);
  await page.getByRole('button', { name: 'Log set 1' }).click();
  await expect(page.getByRole('button', { name: /^Set W: 20 kg × 10/ })).toBeVisible();
  await finishWorkout(page);
  await expect(page.getByTestId('total-volume')).toHaveText('400 kg');
  await page.goto('./#/device/chest-press');
  await expect(page.getByTestId('last-time')).toHaveText(/: 40 kg × 10$/);
});

test('a forgotten workout is offered to be closed at its real end', async ({ page }) => {
  await freezeAt(page);
  await logSets(page, 'leg-press', [[100, 10]]);
  await freezeAt(page, 5 * 3600_000);
  await page.goto('./');
  await expect(page.getByText(/Workout from .* is still open/)).toBeVisible();
  await page.getByRole('button', { name: /^Finish at 18:05/ }).click();
  await expect(page.getByText('5:00', { exact: true })).toBeVisible(); // duration: last set + 5 min, not 5 h
});

test('logging into a forgotten workout closes it and starts a new one', async ({ page }) => {
  await freezeAt(page);
  await logSets(page, 'leg-press', [[100, 10]]);
  await freezeAt(page, 26 * 3600_000);
  await logSets(page, 'chest-press', [[40, 10]]);
  await expect(page.getByText(/Closed your open workout from/)).toBeVisible();
  await page.goto('./#/history');
  await expect(page.locator('a[href^="#/summary/"]')).toHaveCount(1);
});

test('rest timer counts down after a set, can be extended and skipped, and alerts when over', async ({ page }) => {
  await freezeAt(page);
  await logSets(page, 'chest-press', [[40, 10]]);
  await expect(page.getByTestId('rest-time')).toHaveText('1:30');
  await page.getByRole('button', { name: '+30 s' }).click();
  await expect(page.getByTestId('rest-time')).toHaveText('2:00');
  await freezeAt(page, 125_000);
  await expect(page.getByText('Rest is over: next set')).toBeVisible();
  await page.goto('./#/session');
  await expect(page.getByTestId('rest-time')).toHaveText('+0:05'); // also on the session screen
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByTestId('rest-time')).toHaveCount(0);
});

test('rest over: vibrates, sound only when enabled in Settings', async ({ page }) => {
  // Record vibration and audio use instead of producing them.
  await page.addInitScript(() => {
    const w = window as unknown as { alarms: string[]; AudioContext: unknown };
    w.alarms = [];
    Object.defineProperty(navigator, 'vibrate', { value: () => { w.alarms.push('vibrate'); return true; } });
    w.AudioContext = class {
      currentTime = 0; destination = {};
      constructor() { w.alarms.push('audio-context'); }
      resume() { return Promise.resolve(); }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (x: unknown) => x }; }
      createOscillator() { return { frequency: {}, connect: (x: unknown) => x, start: () => w.alarms.push('beep'), stop() {} }; }
    };
  });
  const alarms = () => page.evaluate(() => (window as unknown as { alarms: string[] }).alarms);
  await freezeAt(page);
  await logSets(page, 'chest-press', [[40, 10]]);
  await freezeAt(page, 95_000);
  await expect(page.getByText('Rest is over: next set')).toBeVisible();
  await expect.poll(alarms).toEqual(['vibrate']); // default: no audio at all (it could interrupt music)

  await page.goto('./#/settings');
  await page.getByRole('checkbox', { name: /Sound when rest is over/ }).check();
  await freezeAt(page, 200_000);
  await logSets(page, 'chest-press', [[40, 10]]);
  await freezeAt(page, 300_000);
  await expect(page.getByText('Rest is over: next set')).toBeVisible();
  await expect.poll(alarms).toEqual(['vibrate', 'audio-context', 'vibrate', 'beep', 'beep']);
});

test('assisted machine: suggestion goes towards less assistance, no lifted weight', async ({ page }) => {
  await logSets(page, 'assisted-dip-chin', [[40, 12], [40, 12], [40, 12]]);
  await expect(page.getByLabel('Assistance', { exact: true })).toBeVisible();
  await finishWorkout(page);
  await expect(page.getByTestId('total-volume')).toHaveText('36 reps'); // nothing lifted: reps instead of "0 kg"
  await page.goto('./#/device/assisted-dip-chin');
  await expect(page.getByTestId('suggestion')).toHaveText('35 kg assist × 8');
});

test('cardio: implausible time is rejected, stair climber needs no distance', async ({ page }) => {
  await page.goto('./#/device/treadmill');
  await page.getByLabel('Minutes').fill('2530');
  await page.getByLabel(/Distance/).fill('5');
  await expect(page.getByRole('alert')).toContainText('5 h');
  await expect(page.getByRole('button', { name: 'Log run' })).toBeDisabled();

  await page.goto('./#/device/stairs');
  await page.getByLabel('Minutes').fill('20');
  await page.getByLabel(/Floors/).fill('60');
  await page.getByRole('button', { name: 'Log session' }).click();
  await expect(page.getByRole('listitem').getByText('20:00 · 60 floors')).toBeVisible();
});

test('plan rows show the target; switching plans mid-workout asks first', async ({ page }) => {
  await logSets(page, 'chest-press', [[40, 12], [40, 12]]);
  await finishWorkout(page);
  await startPlan(page, 'Upper body');
  await expect(page.getByRole('link', { name: /Chest Press/ })).toContainText('Target 45 kg × 8 · last 40×12 · 40×12');
  await logSets(page, 'lat-pulldown', [[50, 10]]);
  await page.goto('./#/');
  await page.getByRole('button', { name: 'Start Lower body' }).click();
  await expect(page.getByRole('heading', { name: 'Switch to Lower body?' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.goto('./#/session');
  await expect(page.getByRole('heading', { name: 'Upper body' })).toBeVisible();
});

test('"Next" button and superset chip on the log screen', async ({ page }) => {
  await startPlan(page, 'Upper body');
  await logSets(page, 'biceps-curl', [[20, 10]]);
  await expect(page.getByRole('link', { name: /^Next: Chest Press/ })).toBeVisible();
  await logSets(page, 'triceps-extension', [[20, 10]]);
  await page.getByRole('link', { name: '↔ Biceps Curl' }).click();
  await expect(page.getByRole('heading', { name: 'Biceps Curl' })).toBeVisible();
});

test('seat setting can be added inline on the log screen', async ({ page }) => {
  await page.goto('./#/device/leg-press');
  await page.getByRole('button', { name: 'Add seat setting' }).click();
  await page.getByLabel(/Setup/).fill('Seat 4, back pad 2');
  await page.getByLabel('Reps', { exact: true }).click(); // blur
  await expect(page.getByRole('button', { name: /Setup: Seat 4, back pad 2/ })).toBeVisible();
  await expect.poll(async () => (await readKv(page, 'data')).deviceSettings?.['leg-press']?.notes).toBe('Seat 4, back pad 2');
  await page.reload();
  await expect(page.getByRole('button', { name: /Setup: Seat 4, back pad 2/ })).toBeVisible();
});

test('finished workouts can be edited', async ({ page }) => {
  await logSets(page, 'chest-press', [[40, 10], [40, 10]]);
  await finishWorkout(page);
  await page.getByRole('button', { name: 'Edit workout' }).click();
  await page.getByRole('button', { name: /^40×10/ }).first().click();
  await page.getByLabel('Reps').fill('12');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Done editing' }).click();
  await expect(page.getByTestId('total-volume')).toHaveText('880 kg');
});

test('send only what changed since the last send; CSV export', async ({ page }) => {
  await logSets(page, 'chest-press', [[40, 10]]);
  await finishWorkout(page);
  await page.goto('./#/send');
  await expect(page.getByTestId('frame-counter')).toBeVisible();
  // One full round of codes marks the data as sent; poll the stored state instead of guessing the duration.
  await expect.poll(async () => !!(await readKv(page, 'local')).lastSentAt, { timeout: 15_000 }).toBe(true);
  await page.goto('./#/settings');
  await expect(page.getByText(/Last backup:/)).toBeVisible();
  await page.goto('./#/send');
  await expect(page.getByRole('button', { name: 'Everything' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /^Changes since last send/ }).click();
  await expect(page.getByText('Nothing changed since the last send.')).toBeVisible();

  await page.goto('./#/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export CSV/ }).click();
  const csv = await (await (await download).createReadStream()).toArray();
  expect(Buffer.concat(csv).toString()).toMatch(/^date,time,workout,device,set,type,weight_kg,reps.*\n.*,Chest Press,1,work,40,10,/s);
});
