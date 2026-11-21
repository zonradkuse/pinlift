import { test, expect } from './fixtures.ts';
import { waitForServiceWorker } from './helpers.ts';

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('./');
  await waitForServiceWorker(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pinlift' })).toBeVisible();
  await page.goto('./#/device/leg-press');
  await expect(page.getByRole('heading', { name: 'Leg Press' })).toBeVisible();
});

test('manifest is installable', async ({ request }) => {
  const m = await (await request.get('./manifest.webmanifest')).json();
  expect(m.display).toBe('standalone');
  for (const icon of m.icons) {
    const res = await request.get('./' + icon.src);
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toBe(icon.type); // the preview server answers unknown paths with index.html
  }
});

test('the built page carries its own CSP (static hosts like GitHub Pages cannot send headers) and nothing violates it', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { violations: string[] };
    w.violations = [];
    document.addEventListener('securitypolicyviolation', (e) => w.violations.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  await page.goto('./');
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', /default-src 'self'.*connect-src 'self' https:\/\/www\.strava\.com/);
  for (const route of ['#/device/chest-press', '#/stats', '#/awards', '#/settings', '#/send', '#/history']) {
    await page.goto('./' + route);
    await page.waitForTimeout(200);
  }
  await page.goto('./#/device/chest-press');
  await page.getByRole('tab', { name: 'About' }).click();
  expect(await page.evaluate(() => (window as unknown as { violations: string[] }).violations)).toEqual([]);
});
