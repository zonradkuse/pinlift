import { defineConfig } from 'vite';
import { swPlugin } from './build/sw-plugin.ts';
import { cspPlugin } from './build/csp-plugin.ts';
import pkg from './package.json' with { type: 'json' };

// `vite build --mode embedded`: a build for another page's frame (e.g. a claude.ai preview). One JS bundle, no service
// worker (frames get none) and no CSP meta tag (the host sets its own, and inlining the bundle needs inline scripts).
export default defineConfig(({ mode }) => ({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { target: 'es2022', ...(mode === 'embedded' ? { rollupOptions: { output: { inlineDynamicImports: true } } } : {}) },
  plugins: mode === 'embedded' ? [] : [cspPlugin(), swPlugin()],
}));
