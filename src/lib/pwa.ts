// Service worker registration with a user-confirmed update flow.
let registration: ServiceWorkerRegistration | undefined;
let notify: () => void = () => {};

/** A new version is installed and waiting, and this page runs an older one. */
const pending = () => (registration?.waiting && navigator.serviceWorker.controller ? registration.waiting : undefined);

export function registerServiceWorker(onUpdateReady: () => void) {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  notify = () => { if (pending()) onUpdateReady(); };
  // Every controlled tab reloads when a new worker takes over (also tabs where the user didn't tap Reload),
  // so no tab keeps running old code against new caches. The first claim after the initial install doesn't reload.
  let controlled = !!navigator.serviceWorker.controller, reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!controlled) { controlled = true; return; }
    if (!reloading) { reloading = true; location.reload(); }
  });
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    registration = reg;
    const track = (sw: ServiceWorker | null) => sw?.addEventListener('statechange', notify);
    track(reg.installing);
    reg.addEventListener('updatefound', () => track(reg.installing));
    notify();
    // Installed PWAs can stay open for days: look for new deployments whenever the app comes back to the foreground.
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate(); });
    setInterval(checkForUpdate, 60 * 60 * 1000);
  }).catch(() => {});
}

export type UpdateCheck = 'update' | 'latest' | 'failed';

export async function checkForUpdate(): Promise<UpdateCheck> {
  if (!registration) return 'failed';
  try {
    await registration.update();
    const sw = registration.installing;
    if (sw) {
      await Promise.race([
        new Promise<void>((r) => sw.addEventListener('statechange', () => sw.state !== 'installing' && r())),
        new Promise<void>((r) => setTimeout(r, 30_000)),
      ]);
      if (sw.state === 'redundant') return 'failed';
    }
  } catch { return 'failed'; }
  notify();
  return pending() ? 'update' : 'latest';
}

export function applyUpdate() {
  const sw = pending();
  if (sw) sw.postMessage('skip-waiting'); // controllerchange then reloads every tab
  else location.reload();
}

export const canCheckForUpdates = () => !!registration;

// ---- install prompt (Chromium) and platform hints ----
interface InstallEvent extends Event { prompt: () => Promise<void> }
let installEvent: InstallEvent | undefined;

export function listenForInstallPrompt(onChange: () => void) {
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e as InstallEvent; onChange(); });
  addEventListener('appinstalled', () => { installEvent = undefined; onChange(); });
}
export const installPrompt = () => installEvent;
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || !!(navigator as { standalone?: boolean }).standalone;
export const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
