import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildActivity, authorizeUrl, localIso } from './strava.ts';
import type { Device, Entry, Session } from './types.ts';

const dev = (id: string, extra: Partial<Device> = {}): Device =>
  ({ id, name: id.toUpperCase(), kind: 'strength', primary: [], secondary: [], description: '', cues: [], step: 2.5, ...extra });
const devices: Record<string, Device> = {
  press: dev('press'), tread: dev('tread', { kind: 'cardio', cardio: 'run' }), rower: dev('rower', { kind: 'cardio', cardio: 'row' }),
};
const get = (id: string) => devices[id];
const start = new Date(2026, 10, 21, 18, 5, 0).getTime();
const ses = (entries: Entry[]): Session => ({ id: 's', startedAt: start, endedAt: start + 3000_000, updatedAt: 0, entries });
const lift: Entry = { id: '1', deviceId: 'press', sets: [{ weight: 50, reps: 10, at: 0 }, { weight: 55, reps: 8, at: 0 }] };
const run = (deviceId: string, distanceM: number): Entry => ({ id: deviceId, deviceId, sets: [], cardio: { distanceM, durationSec: 1500, at: 0 } });

test('localIso keeps the instant and includes an offset', () => {
  const iso = localIso(start);
  assert.match(iso, /^2026-11-21T18:05:00[+-]\d{2}:\d{2}$/);
  assert.equal(new Date(iso).getTime(), start);
});

test('strength session becomes a WeightTraining activity with a volume summary', () => {
  const a = buildActivity(ses([lift, run('tread', 2000)]), get, 'Upper body');
  assert.equal(a.sport_type, 'WeightTraining');
  assert.equal(a.name, 'Upper body');
  assert.equal(a.elapsed_time, 3000);
  assert.equal(a.trainer, 1);
  assert.equal(a.distance, undefined);
  assert.match(a.description, /Total lifted: 940 kg/);
  assert.match(a.description, /PRESS: 2 sets, best 55 kg × 8/);
  assert.match(a.description, /TREAD: 2\.00 km in 25:00/);
});

test('single-type cardio sessions map to the matching sport with distance', () => {
  const r = buildActivity(ses([run('tread', 5000)]), get);
  assert.equal(r.sport_type, 'Run');
  assert.equal(r.distance, 5000);
  assert.equal(r.name, 'Treadmill run');
  assert.equal(buildActivity(ses([run('rower', 2000)]), get).sport_type, 'Rowing');
});

test('authorizeUrl requests write scope with state', () => {
  const u = new URL(authorizeUrl('123', 'https://gym.example/', 'xyz'));
  assert.equal(u.origin + u.pathname, 'https://www.strava.com/oauth/authorize');
  assert.equal(u.searchParams.get('client_id'), '123');
  assert.equal(u.searchParams.get('redirect_uri'), 'https://gym.example/');
  assert.equal(u.searchParams.get('response_type'), 'code');
  assert.equal(u.searchParams.get('scope'), 'activity:write');
  assert.equal(u.searchParams.get('state'), 'xyz');
});
