import { test as base } from '@playwright/test';

/** Tests start past the first-run introduction (it has its own spec). Applies to every page of the context. */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => { try { localStorage.setItem('pinlift.introDone', '1'); } catch { /* opaque origin */ } });
    await use(context);
  },
});
export { expect } from '@playwright/test';
export type { Page } from '@playwright/test';
