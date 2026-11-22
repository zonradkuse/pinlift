import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeSession, deviceName, deviceOptions, devicesForQr, lastBest, recentDevices, remainingPlan, workoutOf, SUPERSET_WINDOW_MS } from './selectors.ts';
import { emptyData } from './types.ts';
import { catalogById } from '../data/catalog.ts';
import { lift, session, set } from './fixtures.ts';

const data = () => {
  const d = emptyData();
  d.workouts.w = { id: 'w', name: 'Upper', deviceIds: ['chest-press', 'lat-pulldown', 'seated-row'], updatedAt: 0 };
  d.sessions.s = session('s', 1000, [lift('chest-press', [40, 10])], { endedAt: undefined, workoutId: 'w' });
  return d;
};

test('activeSession, workoutOf and remainingPlan', () => {
  const d = data();
  const s = activeSession(d)!;
  assert.equal(s.id, 's');
  assert.equal(workoutOf(d, s)?.name, 'Upper');
  assert.deepEqual(remainingPlan(d, s).map((x) => x.id), ['lat-pulldown', 'seated-row']);
  assert.deepEqual(remainingPlan(d, s, 'lat-pulldown').map((x) => x.id), ['seated-row']);
  assert.deepEqual(remainingPlan(d, undefined), []);
});

test('recentDevices: other devices with a set within the superset window', () => {
  const now = 10_000_000;
  const s = session('s', 0, [lift('curl', set(20, 10, { at: now - 60_000 })), lift('press', set(40, 10, { at: now - SUPERSET_WINDOW_MS - 1 })),
    lift('triceps', set(20, 10, { at: now - 1000 }))]);
  assert.deepEqual(recentDevices(s, 'triceps', now), ['curl']);
});

test('deviceOptions: device defaults overridden by user settings', () => {
  const d = emptyData();
  const dev = catalogById.get('chest-press')!;
  assert.deepEqual(deviceOptions(d, dev), { step: 5, repMin: 8, repMax: 12, rest: 90, assisted: false, bodyweight: false });
  d.deviceSettings['chest-press'] = { step: 2.5, rest: 120, updatedAt: 1 };
  assert.deepEqual(deviceOptions(d, dev), { step: 2.5, repMin: 8, repMax: 12, rest: 120, assisted: false, bodyweight: false });
});

test('devicesForQr skips unknown devices; deviceName falls back to the id', () => {
  const d = emptyData();
  d.qr.X = { deviceIds: ['leg-press', 'gone'], updatedAt: 1 };
  assert.deepEqual(devicesForQr(d, 'X'), ['leg-press']);
  assert.equal(deviceName(d, 'leg-press'), 'Leg Press');
  assert.equal(deviceName(d, 'gone'), 'gone');
});

test('lastBest: hardest regular set of the last session, least assistance on assisted machines', () => {
  const d = emptyData();
  d.sessions.a = session('a', 1, [lift('assisted-dip-chin', [40, 10], [35, 8], set(60, 5, { kind: 'drop' })), lift('leg-press', [100, 10], [110, 6])]);
  assert.deepEqual(lastBest(d, catalogById.get('assisted-dip-chin')!), set(35, 8));
  assert.deepEqual(lastBest(d, catalogById.get('leg-press')!), set(110, 6));
});

test('deviceOptions: a device can bring its own rep range (bodyweight exercises); settings still win', () => {
  const d = emptyData();
  const dev = { ...catalogById.get('leg-press')!, bodyweight: true, reps: [10, 20] as [number, number] };
  assert.deepEqual([deviceOptions(d, dev).repMin, deviceOptions(d, dev).repMax, deviceOptions(d, dev).bodyweight], [10, 20, true]);
  d.deviceSettings[dev.id] = { repMax: 25, updatedAt: 1 };
  assert.equal(deviceOptions(d, dev).repMax, 25);
});

test('filter groups: bodyweight exercises have their own chip; every catalog exercise has a pictogram', async () => {
  const { CATALOG, inGroups } = await import('../data/catalog.ts');
  const { PICTOGRAMS } = await import('../data/pictograms.ts');
  assert.deepEqual(CATALOG.filter((d) => inGroups(d, ['bodyweight'])).map((d) => d.id), CATALOG.filter((d) => d.bodyweight).map((d) => d.id));
  assert.ok(CATALOG.filter((d) => d.bodyweight).length >= 10);
  assert.deepEqual(CATALOG.filter((d) => !PICTOGRAMS[d.id]).map((d) => d.id), []);
});
