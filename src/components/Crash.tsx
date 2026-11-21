import { exportJson } from '../lib/backup.ts';
import { navigate } from '../lib/router.ts';
import { to } from '../lib/routes.ts';
import { errorText } from '../lib/format.ts';

/** Shown instead of a blank page when a screen throws: the data is safe and can be saved. */
export const Crash = ({ error, reset }: { error: unknown; reset: () => void }) => (
  <main class="screen no-nav">
    <div class="stack" style={{ paddingTop: '48px' }}>
      <h1 class="headline-s">Something went wrong</h1>
      <p class="body-m muted">Your data is still stored on this device. Save a copy, then try Settings or reload the app.</p>
      <pre class="body-s card" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{errorText(error)}</pre>
      <button class="btn interactive" onClick={exportJson}>Export data</button>
      <button class="btn tonal interactive" onClick={() => { navigate(to.settings()); reset(); }}>Open Settings</button>
      <button class="btn text interactive" onClick={() => location.reload()}>Reload</button>
    </div>
  </main>
);
