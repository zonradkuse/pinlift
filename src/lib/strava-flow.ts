import { authorizeUrl, buildActivity, createActivity, deauthorize, exchangeCode, freshAuth } from './strava.ts';
import { getData, getLocal, updateLocal } from './store.ts';
import { deviceLookup, workoutOf } from './selectors.ts';
import { setStravaId } from './actions.ts';
import { toast } from './ui-state.ts';
import { errorText } from './format.ts';
import { navigate } from './router.ts';
import { randomId } from './id.ts';
import { to } from './routes.ts';

const redirectUri = () => location.origin + location.pathname;

export async function connectStrava(clientId: string, clientSecret: string) {
  const state = 'strava-' + randomId(8);
  await updateLocal({ strava: { clientId, clientSecret }, stravaState: state }); // must be stored before leaving the page
  location.href = authorizeUrl(clientId, redirectUri(), state);
}

/** Exchanges an authorization code; `creds` when the code was pasted by hand. */
export async function redeemCode(code: string, creds?: { clientId: string; clientSecret: string }) {
  if (creds) await updateLocal({ strava: creds });
  const auth = getLocal().strava;
  if (!auth?.clientId || !auth.clientSecret) throw new Error('Enter client ID and secret first');
  const next = await exchangeCode(auth, code.trim());
  await updateLocal({ strava: next, stravaState: undefined });
  toast(`Connected to Strava${next.athlete ? ` as ${next.athlete}` : ''}`);
}

/** Strava redirects back to the app with ?code=…&state=…; finish the login here. */
export async function handleStravaRedirect() {
  const q = new URLSearchParams(location.search);
  const state = q.get('state');
  if (!state?.startsWith('strava-')) return;
  history.replaceState(null, '', redirectUri() + '#/settings');
  const code = q.get('code');
  if (q.get('error') || !code) return toast('Strava authorization was cancelled');
  if (!q.get('scope')?.includes('activity:write')) return toast('Please allow Strava to upload activities');
  if (getLocal().stravaState !== state) {
    // Different storage context (e.g. iOS opened Safari instead of the installed app): hand the code over manually.
    return navigate(to.stravaCode(code), true);
  }
  try { await redeemCode(code); } catch (e) { toast(errorText(e)); }
}

export async function postToStrava(sessionId: string) {
  const d = getData(), s = d.sessions[sessionId];
  const auth = getLocal().strava;
  if (!s || !auth) throw new Error('Connect Strava in Settings first');
  const fresh = await freshAuth(auth);
  if (fresh !== auth) updateLocal({ strava: fresh });
  setStravaId(sessionId, await createActivity(fresh, buildActivity(s, deviceLookup(d), workoutOf(d, s)?.name)));
}

/** Revokes access at Strava and forgets the tokens (keeps client ID and secret for reconnecting). */
export function disconnectStrava() {
  const auth = getLocal().strava;
  if (!auth) return;
  if (auth.accessToken) deauthorize(auth);
  updateLocal({ strava: { clientId: auth.clientId, clientSecret: auth.clientSecret } });
}
