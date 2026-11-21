import { test, expect } from './fixtures.ts';
import { fillSet, waitForServiceWorker } from './helpers.ts';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import type { AddressInfo } from 'node:net';

const DIST = join(process.cwd(), 'dist');
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

test('a new deployment is offered as an update, applied on tap, and keeps the running workout', async ({ page }) => {
  let version = 1;
  // Serves dist/ as "v1"; as "v2" the service worker and index.html change like after a real redeploy.
  const server = createServer((req, res) => {
    let path = new URL(req.url!, 'http://x').pathname;
    if (path.endsWith('/')) path += 'index.html';
    const file = join(DIST, path);
    if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) return void res.writeHead(404).end();
    let body = readFileSync(file);
    if (version === 2 && path === '/sw.js') body = Buffer.from(body.toString().replace(/const CACHE = "([^"]+)"/, 'const CACHE = "$1-v2"'));
    if (version === 2 && path === '/index.html') body = Buffer.from(body.toString().replace('</head>', '<meta name="build" content="v2"></head>'));
    // Like GitHub Pages: every file may be cached by the browser for 10 minutes.
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream', 'cache-control': 'max-age=600' }).end(body);
  });
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://localhost:${(server.address() as AddressInfo).port}/`;
  try {
    await page.goto(base);
    await waitForServiceWorker(page);
    await page.goto(base + '#/device/leg-press');
    await fillSet(page, 100, 10);
    await page.getByRole('button', { name: 'Log set 1' }).click();
    await expect(page.getByText('A new version is available')).toHaveCount(0);

    const otherTab = await page.context().newPage();
    await otherTab.goto(base + '#/stats');

    version = 2;
    await page.goto(base + '#/settings');
    await page.getByRole('button', { name: 'Check for updates' }).click();
    await expect(page.getByText('A new version is available')).toBeVisible();
    await expect(page.locator('meta[name="build"]')).toHaveCount(0); // still running v1 until the user agrees

    await page.getByRole('button', { name: 'Reload' }).click();
    await expect(page.locator('meta[name="build"]')).toHaveAttribute('content', 'v2');
    await expect(page.getByText('A new version is available')).toHaveCount(0);
    // Other open tabs must not keep running old code against the new caches.
    await expect(otherTab.locator('meta[name="build"]')).toHaveAttribute('content', 'v2');
    await page.goto(base + '#/device/leg-press');
    await expect(page.getByText('100 kg × 10', { exact: true })).toBeVisible();
  } finally {
    server.close();
  }
});

test('"Check for updates" says so when there is nothing new', async ({ page }) => {
  await page.goto('./');
  await waitForServiceWorker(page);
  await page.goto('./#/settings');
  await page.getByRole('button', { name: 'Check for updates' }).click();
  await expect(page.getByText('You have the latest version')).toBeVisible();
});
