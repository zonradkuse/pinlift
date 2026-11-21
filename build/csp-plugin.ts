import type { Plugin } from 'vite';

// Shipped inside index.html so it also applies on hosts that can't set headers (GitHub Pages).
// Build only: the dev server injects inline styles for hot reloading.
// frame-ancestors is ignored in a <meta> tag; nginx sends it as a header.
const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'", "img-src 'self' data: blob:", "media-src 'self' blob:",
  "connect-src 'self' https://www.strava.com", "base-uri 'self'", "form-action 'self'",
].join('; ');

export const cspPlugin = (): Plugin => ({
  name: 'pinlift-csp',
  apply: 'build',
  transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }],
});
