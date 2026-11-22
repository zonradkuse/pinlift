import type { CardioType, Device, Session } from './types.ts';
import { isWork, sessionSummary } from './stats.ts';
import { fmtCardio, fmtKg, fmtLoad } from './format.ts';

export interface StravaAuth {
  clientId: string; clientSecret: string;
  accessToken?: string; refreshToken?: string; expiresAt?: number; athlete?: string;
}

export interface StravaActivity {
  name: string; sport_type: string; start_date_local: string; elapsed_time: number;
  description: string; trainer: 1; distance?: number;
}

const SPORT: Record<CardioType, [string, string]> = {
  run: ['Run', 'Treadmill run'], row: ['Rowing', 'Indoor row'], bike: ['Ride', 'Indoor ride'],
  elliptical: ['Elliptical', 'Elliptical'], stairs: ['StairStepper', 'Stair climber'],
};

/** ISO 8601 local time with UTC offset, e.g. 2026-11-21T18:05:00+01:00 */
export function localIso(ts: number): string {
  const d = new Date(ts), p = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` +
    `${off < 0 ? '-' : '+'}${p(off / 60)}:${p(off % 60)}`;
}

export function buildActivity(s: Session, getDevice: (id: string) => Device | undefined, workoutName?: string): StravaActivity {
  const sum = sessionSummary(s, getDevice);
  const lines: string[] = [];
  if (sum.sets) lines.push(`Total lifted: ${fmtKg(sum.volume)} · ${sum.sets} sets · ${sum.reps} reps`);
  const cardioTypes = new Set<CardioType>();
  for (const e of s.entries) {
    const d = getDevice(e.deviceId);
    const name = d?.name ?? e.deviceId;
    const work = e.sets.filter(isWork);
    if (work.length) {
      const harder = (a: number, b: number) => (d?.assisted ? a < b : a > b);
      const best = work.reduce((a, b) => (harder(b.weight, a.weight) || (b.weight === a.weight && b.reps > a.reps) ? b : a));
      lines.push(`${name}: ${work.length} sets, best ${fmtLoad(best.weight, d?.bodyweight)}${d?.assisted ? ' assistance' : ''} × ${best.reps}`);
    }
    if (e.cardio) {
      if (d?.cardio) cardioTypes.add(d.cardio);
      lines.push(`${name}: ${fmtCardio(e.cardio, d?.cardio)}`);
    }
  }
  lines.push('', 'Tracked with Pinlift');
  const onlyCardio = !sum.sets && cardioTypes.size === 1 ? SPORT[[...cardioTypes][0]] : null;
  return {
    name: workoutName ?? onlyCardio?.[1] ?? 'Strength workout',
    sport_type: onlyCardio?.[0] ?? 'WeightTraining',
    start_date_local: localIso(s.startedAt),
    elapsed_time: sum.durationSec,
    description: lines.join('\n'),
    trainer: 1,
    ...(onlyCardio ? { distance: sum.distanceM } : {}),
  };
}

export const authorizeUrl = (clientId: string, redirectUri: string, state: string) =>
  'https://www.strava.com/oauth/authorize?' + new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: 'code', approval_prompt: 'auto', scope: 'activity:write', state,
  });

async function tokenRequest(auth: StravaAuth, params: Record<string, string>): Promise<StravaAuth> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST', body: new URLSearchParams({ client_id: auth.clientId, client_secret: auth.clientSecret, ...params }),
  });
  if (!res.ok) throw new Error(`Strava login failed (${res.status})`);
  const t = await res.json();
  return { ...auth, accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: t.expires_at * 1000,
    athlete: t.athlete ? `${t.athlete.firstname ?? ''} ${t.athlete.lastname ?? ''}`.trim() : auth.athlete };
}

export const exchangeCode = (auth: StravaAuth, code: string) => tokenRequest(auth, { code, grant_type: 'authorization_code' });

export async function freshAuth(auth: StravaAuth): Promise<StravaAuth> {
  if (!auth.refreshToken) throw new Error('Connect Strava in Settings first');
  if (auth.accessToken && (auth.expiresAt ?? 0) > Date.now() + 60_000) return auth;
  return tokenRequest(auth, { refresh_token: auth.refreshToken, grant_type: 'refresh_token' });
}

/** Revokes the app's access at Strava (best effort). */
export const deauthorize = (auth: StravaAuth) =>
  fetch('https://www.strava.com/oauth/deauthorize', { method: 'POST', body: new URLSearchParams({ access_token: auth.accessToken ?? '' }) }).catch(() => undefined);

export async function createActivity(auth: StravaAuth, a: StravaActivity): Promise<number> {
  const res = await fetch('https://www.strava.com/api/v3/activities', {
    method: 'POST', headers: { Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(a),
  });
  if (!res.ok) throw new Error(`Strava upload failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).id;
}
