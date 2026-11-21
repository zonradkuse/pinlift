import type { Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

// Emits a small cache-first service worker that precaches every build output and public file.
const source = (cache: string, files: string[]) => `const CACHE = ${JSON.stringify(cache)};
const FILES = ${JSON.stringify(files)};
// A new version waits until the page asks it to take over (the user taps "Reload"), so nothing changes under a running app.
// cache: 'reload' bypasses the browser's HTTP cache: hosts like GitHub Pages let browsers cache files for minutes,
// and a new version must never store the previous index.html.
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE)
  .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))));
self.addEventListener('message', (e) => { if (e.data === 'skip-waiting') self.skipWaiting(); });
self.addEventListener('activate', (e) => e.waitUntil(caches.keys()
  .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const cached = req.mode === 'navigate' ? caches.match('./index.html', { ignoreVary: true }) : caches.match(req, { ignoreSearch: true, ignoreVary: true });
  e.respondWith(cached.then((r) => r || fetch(req)));
});
`;

export function swPlugin(): Plugin {
  return {
    name: 'pinlift-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = [...new Set(['./', 'index.html', ...Object.keys(bundle), ...readdirSync('public')])].map((f) => (f.startsWith('.') ? f : './' + f));
      const hash = createHash('sha256');
      for (const out of Object.values(bundle)) hash.update(out.type === 'chunk' ? out.code : out.source);
      for (const f of readdirSync('public').sort()) hash.update(readFileSync(`public/${f}`)); // icon/manifest-only deploys must update too
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: source('pinlift-' + hash.digest('hex').slice(0, 12), files) });
    },
  };
}
