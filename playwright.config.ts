import { defineConfig } from '@playwright/test';

// E2E_BASE_URL=http://localhost:8080/ npm run e2e  -> test a running deployment (e.g. the docker compose stack)
// E2E_PREBUILT=1 npm run e2e                         -> test the existing dist/ (CI deploys exactly what it tested)
const external = process.env.E2E_BASE_URL;
const preview = 'npx vite preview --port 4173 --strictPort';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  fullyParallel: true,
  use: { baseURL: external ?? 'http://localhost:4173/', viewport: { width: 390, height: 844 }, trace: 'off' },
  webServer: external ? undefined : {
    command: process.env.E2E_PREBUILT ? preview : `npx vite build && ${preview}`,
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
  },
});
