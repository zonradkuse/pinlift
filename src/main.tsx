import './styles.css';
import { render } from 'preact';
import { App } from './app.tsx';
import { getData, handleSaveErrors, initStore, notify } from './lib/store.ts';
import { openIntro, setUpdateReady, toast } from './lib/ui-state.ts';
import { introSeen } from './components/Intro.tsx';
import { errorText } from './lib/format.ts';
import { WIDE_QUERY } from './components/ui.tsx';
import { listenForInstallPrompt, registerServiceWorker } from './lib/pwa.ts';
import { handleStravaRedirect } from './lib/strava-flow.ts';

// Never run inside someone else's frame (clickjacking); static hosts like GitHub Pages can't send frame-ancestors.
if (window.top !== window.self) {
  document.body.textContent = 'Open Pinlift directly.';
  throw new Error('Framed');
}

handleSaveErrors((e) => toast(`Saving failed: ${errorText(e)}`));
// On desktop the app is mostly used for analytics: open there unless a page was asked for.
if (!location.hash && matchMedia(WIDE_QUERY).matches) history.replaceState(null, '', '#/stats');
await initStore();
handleStravaRedirect(); // rewrites the URL synchronously, so it must run before the router reads it
// New users get the introduction once; people who already have workouts (e.g. after an update) don't.
if (!introSeen() && !Object.keys(getData().sessions).length) openIntro();
render(<App />, document.getElementById('app')!);
registerServiceWorker(setUpdateReady);
listenForInstallPrompt(notify);
