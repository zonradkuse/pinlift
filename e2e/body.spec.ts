import { test, expect } from './fixtures.ts';
import { freezeAt } from './helpers.ts';

test('body weight: log from Analytics, see the change, replace a day, delete with undo', async ({ page }) => {
  await freezeAt(page); // Fri 20 Nov 2026
  await page.goto('./#/stats');
  const card = page.getByRole('region', { name: 'Body weight' });
  await expect(card).toContainText('Log your weight');
  await card.getByRole('link', { name: 'Log weight' }).click();

  await page.getByLabel('Date').fill('2026-11-13');
  await page.getByLabel('Body weight', { exact: true }).fill('83');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByLabel('Date').fill('2026-11-20');
  await page.getByLabel('Body weight', { exact: true }).fill('82.6');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByLabel('Body weight', { exact: true }).fill('82.4'); // weighed again today: replaces
  await page.getByRole('button', { name: 'Save' }).click();
  const entries = page.getByRole('list', { name: 'Entries' }).getByRole('listitem');
  await expect(entries).toHaveCount(2);
  await expect(entries.first()).toContainText('82.4 kg');

  await entries.first().getByRole('button', { name: /^Delete/ }).click();
  await expect(entries).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(entries).toHaveCount(2);

  await page.goto('./#/stats');
  await expect(card).toContainText('82.4 kg');
  await expect(card).toContainText('−0.6 kg since Nov 13');
  await expect(card.getByRole('img', { name: 'Body weight trend' })).toBeVisible();
});
