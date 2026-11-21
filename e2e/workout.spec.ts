import { test, expect } from './fixtures.ts';
import { fillSet, finishWorkout, logSets, readKv, startPlan } from './helpers.ts';
import type { Page } from '@playwright/test';

const storedOpenSessions = async (page: Page) =>
  Object.values((await readKv(page, 'data')).sessions ?? {}).filter((s) => !s.deleted && !s.endedAt).length;

test('planned workout: log sets, summary with volume and badge, then a heavier suggestion and a PR', async ({ page }) => {
  await startPlan(page, 'Upper body');
  await page.getByRole('link', { name: /Chest Press/ }).click();
  await expect(page.getByText(/First time on this device/)).toBeVisible();

  await fillSet(page, 40, 12);
  await page.getByRole('button', { name: 'Log set 1' }).click();
  await page.getByRole('button', { name: 'Log set 2' }).click();
  await expect(page.getByText('40 kg × 12', { exact: true })).toHaveCount(2);

  await page.getByRole('link', { name: 'Back' }).click();
  await expect(page.getByRole('link', { name: /Chest Press.*40×12 · 40×12/ })).toBeVisible();
  await finishWorkout(page);
  await expect(page.getByTestId('total-volume')).toHaveText('960 kg');
  await expect(page.getByText('First rep', { exact: true })).toBeVisible();

  // All sets hit the top of the 8–12 range -> one 5 kg step up.
  await page.goto('./#/device/chest-press');
  await expect(page.getByTestId('suggestion')).toHaveText('45 kg × 8');
  await expect(page.getByTestId('last-time')).toContainText('40 kg × 12, 40 kg × 12');
  await page.getByRole('button', { name: 'Use' }).click();
  await expect(page.getByLabel('Weight', { exact: true })).toHaveValue('45');
  await page.getByRole('button', { name: 'Log set 1' }).click();
  await expect(page.getByText('New PR!')).toBeVisible();
  await finishWorkout(page);
  await expect(page.getByText('45 kg (was 40 kg)')).toBeVisible();
  await expect(page.getByText('Personal best', { exact: true })).toBeVisible();
});

test('cardio: treadmill run computes speed and pace', async ({ page }) => {
  await page.goto('./#/device/treadmill');
  await page.getByLabel('Minutes').fill('25');
  await page.getByLabel(/Distance/).fill('5');
  await expect(page.getByText('12', { exact: true })).toBeVisible(); // km/h
  await expect(page.getByText('5:00', { exact: true })).toBeVisible(); // per km
  await page.getByRole('button', { name: 'Log run' }).click();
  await expect(page.getByRole('listitem').getByText('5.00 km in 25:00 (12 km/h)')).toBeVisible();
  await finishWorkout(page);
  await expect(page.getByText('5K', { exact: true })).toBeVisible();
});

test('custom workout from muscle groups', async ({ page }) => {
  await page.goto('./#/workout/new');
  await page.getByLabel('Name').fill('Arms day');
  await page.getByRole('button', { name: 'Arms' }).click();
  await page.getByRole('button', { name: /Add all/ }).click();
  await page.getByRole('button', { name: 'Save workout' }).click();
  await expect(page.getByRole('button', { name: /^Arms day/ })).toContainText('Biceps');
});

test('session survives a reload (IndexedDB persistence)', async ({ page }) => {
  await logSets(page, 'leg-press', [[100, 10]]);
  await page.reload();
  await expect(page.getByText('100 kg × 10', { exact: true })).toBeVisible();
});

test('tapping a workout plan shows it without starting; Start starts it', async ({ page }) => {
  await page.goto('./#/');
  await page.getByRole('button', { name: /^Lower body/ }).click();
  await expect(page).toHaveURL(/#\/plan\/w-lower$/);
  await expect(page.getByRole('link', { name: /Leg Press/ })).toBeVisible();
  const groups = page.getByRole('region', { name: 'Exercises per muscle group' });
  await expect(groups.getByRole('listitem', { name: 'Legs: 6 exercises' })).toBeVisible();
  await expect(groups).toContainText('Not trained: Chest, Back, Shoulders, Arms, Core');
  expect(await storedOpenSessions(page)).toBe(0);
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page).toHaveURL(/#\/session/);
  await expect(page.getByRole('heading', { name: 'Lower body' })).toBeVisible();
});

test('muscle group overview while building a workout and after finishing one', async ({ page }) => {
  await page.goto('./#/workout/new');
  const plan = page.getByRole('region', { name: 'Exercises per muscle group' });
  await expect(plan).toHaveCount(0);
  await page.getByRole('button', { name: 'Chest', exact: true }).click();
  await page.getByRole('button', { name: /^Chest Press/ }).click();
  await expect(plan.getByRole('listitem', { name: 'Chest: 1 exercise' })).toBeVisible();
  await expect(plan.getByRole('listitem', { name: 'Back: 0 exercises' })).toBeVisible();
  await expect(plan).toContainText('Not trained: Back, Shoulders, Arms, Core, Legs, Glutes');

  await logSets(page, 'leg-press', [[100, 10], [100, 10]]);
  await finishWorkout(page);
  const done = page.getByRole('region', { name: 'Sets per muscle group' });
  await expect(done.getByRole('listitem', { name: 'Legs: 2 sets' })).toBeVisible();
  await expect(done.getByRole('listitem', { name: 'Glutes: 2 sets' })).toBeVisible();
  await expect(done).toContainText('Not trained: Chest, Back, Shoulders, Arms, Core');
});

test('a rowing-only workout counts as a training day and shows its muscles, but adds no sets', async ({ page }) => {
  await page.goto('./#/device/rower');
  await page.getByLabel('Minutes').fill('8');
  await page.getByLabel(/Distance/).fill('2000');
  await page.getByRole('button', { name: 'Log row' }).click();
  await finishWorkout(page);
  const done = page.getByRole('region', { name: 'Muscles trained' });
  await expect(done).toContainText('Not trained: Chest, Shoulders, Arms, Core');
  await expect(done.getByRole('listitem')).toHaveCount(0); // no sets: no bars

  await page.goto('./#/stats');
  await expect(page.locator('svg[aria-label^="Training days"] rect').last().locator('title')).not.toContainText('rest day');
  await expect(page.getByText('No weights lifted in this period.')).toBeVisible();
});
