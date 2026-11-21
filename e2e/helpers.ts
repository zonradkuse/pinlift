import { expect, type Page } from '@playwright/test';
import jsQR from 'jsqr';

type Stored = {
  sessions?: Record<string, { deleted?: boolean; endedAt?: number; entries: { deviceId: string; sets: unknown[] }[] }>;
  deviceSettings?: Record<string, { notes?: string }>;
  lastSentAt?: number;
};

/** A key of the app's IndexedDB store ('data' or 'local') as persisted, not just rendered. Tests wait on it before reloading. */
export const readKv = (page: Page, key: 'data' | 'local') => page.evaluate((k) => new Promise<Stored>((resolve) => {
  const req = indexedDB.open('gym-tracker');
  req.onsuccess = () => {
    const get = req.result.transaction('kv').objectStore('kv').get(k);
    get.onsuccess = () => resolve(get.result ?? {});
  };
}), key);

const openSessions = (d: Stored) => Object.values(d.sessions ?? {}).filter((s) => !s.deleted && !s.endedAt);

/** Sets stored for a device in the running workout. */
export const storedSets = async (page: Page, deviceId: string) =>
  openSessions(await readKv(page, 'data')).flatMap((s) => s.entries).filter((e) => e.deviceId === deviceId).reduce((n, e) => n + e.sets.length, 0);

/** A fixed reference time; freezeAt(page, ms) sets the page clock to T0 + ms (timers keep running). */
export const T0 = new Date('2026-11-20T18:00:00').getTime();
export const freezeAt = (page: Page, offsetMs = 0) => page.clock.setFixedTime(T0 + offsetMs);

export async function fillSet(page: Page, weight: number, reps?: number) {
  await page.getByLabel(/^(Weight|Assistance)$/).fill(String(weight));
  if (reps !== undefined) await page.getByLabel('Reps', { exact: true }).fill(String(reps));
}

export async function logSets(page: Page, deviceId: string, sets: [number, number][]) {
  await page.goto(`./#/device/${deviceId}`);
  const before = await storedSets(page, deviceId);
  for (const [i, [w, r]] of sets.entries()) {
    await fillSet(page, w, r);
    await page.getByRole('button', { name: /^Log set/ }).click();
    await expect.poll(() => storedSets(page, deviceId)).toBe(before + i + 1); // persisted, not just rendered
  }
}

export async function finishWorkout(page: Page) {
  await page.goto('./#/session');
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await expect(page.getByTestId('total-volume')).toBeVisible();
  await expect.poll(async () => openSessions(await readKv(page, 'data')).length).toBe(0);
}

export async function startPlan(page: Page, name: string) {
  await page.goto('./#/');
  await page.getByRole('button', { name: `Start ${name}` }).click();
  await expect(page).toHaveURL(/#\/session/);
}

export const waitForServiceWorker = (page: Page) => page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));

/** Rasterises the QR code shown on the page and decodes it (grayscale + base64 keeps the page→test transfer small). */
export async function readShownQr(page: Page, size = 300): Promise<string | null> {
  const gray = Buffer.from(await page.evaluate(async (px) => {
    const svg = document.querySelector('.qr-box svg')!;
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    await img.decode();
    const c = Object.assign(document.createElement('canvas'), { width: px, height: px });
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, px, px); ctx.drawImage(img, 0, 0, px, px);
    const data = ctx.getImageData(0, 0, px, px).data;
    let bin = '';
    for (let i = 0; i < data.length; i += 4) bin += String.fromCharCode(data[i]);
    return btoa(bin);
  }, size), 'base64');
  const rgba = new Uint8ClampedArray(size * size * 4).map((_, i) => (i % 4 === 3 ? 255 : gray[i >> 2]));
  return jsQR(rgba, size, size)?.data ?? null;
}
