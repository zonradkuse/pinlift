import { test, expect, type Page } from './fixtures.ts';
import { readKv } from './helpers.ts';

const DAY = 86400_000;
const exportFile = (workouts: number, daysAgo = 1) => {
  const sessions: Record<string, unknown> = {};
  for (let i = 0; i < workouts; i++) {
    const t = Date.now() - (daysAgo + i * 2) * DAY;
    sessions['s' + i] = { id: 's' + i, startedAt: t, endedAt: t + 3600_000, updatedAt: t, entries: [
      { id: 'e' + i, deviceId: 'leg-press', sets: [{ weight: 100, reps: 10, at: t }] }] };
  }
  const data = { schema: 1, sessions, workouts: {}, customDevices: {}, deviceSettings: {}, qr: {} };
  return { name: 'pinlift-export.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) };
};
const workoutsTile = (page: Page) => page.locator('.kpis .tile').filter({ hasText: 'Workouts' }).locator('.value');

test.describe('desktop analytics import', () => {
  test.use({ viewport: { width: 1366, height: 860 } });

  test('empty analytics explains how to get the data and imports a file', async ({ page }) => {
    await page.goto('./#/stats');
    await expect(page.getByRole('link', { name: 'Receive from phone' })).toBeVisible();
    await page.getByLabel('Import file').setInputFiles(exportFile(3));
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(workoutsTile(page)).toHaveText('3');
  });

  test('with data, import stays one click away and an old import is pointed out', async ({ page }) => {
    await page.goto('./#/stats');
    await page.getByLabel('Import file').setInputFiles(exportFile(2, 6));
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(page.getByTestId('data-status')).toContainText('Latest workout');
    await expect(page.getByTestId('data-status')).toContainText('imported today');
    await expect(page.getByRole('link', { name: 'Receive from phone' })).toBeVisible();
    // A week later the import is stale.
    await page.clock.setFixedTime(Date.now() + 7 * DAY);
    await page.reload();
    await expect(page.getByTestId('data-status')).toContainText('imported 7 days ago');
    await expect(page.getByText(/Your phone may have newer workouts/)).toBeVisible();
  });

  test('an export file can be dropped onto the page', async ({ page }) => {
    await page.goto('./#/stats');
    await expect(page.getByRole('heading', { name: 'No workouts here yet' })).toBeVisible();
    const { buffer, name } = exportFile(4);
    await page.evaluate(({ text, name }) => {
      const dt = new DataTransfer();
      dt.items.add(new File([text], name, { type: 'application/json' }));
      document.querySelector('main')!.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    }, { text: buffer.toString(), name });
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(workoutsTile(page)).toHaveText('4');
    expect((await readKv(page, 'local') as { lastImportAt?: number }).lastImportAt).toBeGreaterThan(0);
  });
});
