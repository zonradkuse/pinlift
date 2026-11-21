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
  expect(await storedOpenSessions(page)).toBe(0);
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page).toHaveURL(/#\/session/);
  await expect(page.getByRole('heading', { name: 'Lower body' })).toBeVisible();
});
