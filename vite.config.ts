import { defineConfig } from 'vite';
import { swPlugin } from './build/sw-plugin.ts';
import { cspPlugin } from './build/csp-plugin.ts';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { target: 'es2022' },
  plugins: [cspPlugin(), swPlugin()],
});
