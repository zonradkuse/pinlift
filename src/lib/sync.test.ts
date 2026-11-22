import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stamp, sanitize, NewerVersionError } from './sync.ts';
import { mergeData } from './merge.ts';
import { emptyData } from './types.ts';
import { withDevice, withoutDevice } from './qr.ts';

test('stamp is always newer than the record it replaces, even if that came from a clock running ahead', () => {
  assert.equal(stamp(undefined, 1000), 1000);
  assert.equal(stamp({ updatedAt: 500 }, 1000), 1000);
  assert.equal(stamp({ updatedAt: 5000 }, 1000), 5001);
});

test('merge ties are broken deterministically so both devices converge', () => {
  const a = emptyData(), b = emptyData();
  a.workouts.x = { id: 'x', name: 'A', deviceIds: [], updatedAt: 7 };
  b.workouts.x = { id: 'x', name: 'B', deviceIds: [], updatedAt: 7 };
  const onA = mergeData(a, b).data.workouts.x.name, onB = mergeData(b, a).data.workouts.x.name;
  assert.equal(onA, onB);
});

test('sanitize drops malformed records, keeps valid and unknown fields, clamps future timestamps', () => {
  const now = 1_000_000_000_000;
  const raw = {
    schema: 1,
    sessions: {
      ok: { id: 'ok', startedAt: 1, updatedAt: 2, entries: [{ id: 'e', deviceId: 'leg-press', sets: [{ weight: 100, reps: 10, at: 3 }] }], extra: 1 },
      bad: { id: 'bad', startedAt: 1, updatedAt: 2, entries: [{ id: 'e', deviceId: 'leg-press', sets: [{ weight: '100', reps: 10, at: 3 }] }] },
      badCardio: { id: 'badCardio', startedAt: 1, updatedAt: 2, entries: [{ id: 'e', deviceId: 'tread', sets: [], cardio: 'x' }] },
    },
    workouts: { w: { id: 'w', name: 'Upper', deviceIds: ['a'], updatedAt: now + 10 * 86400_000 }, noName: { id: 'noName', updatedAt: 1 } },
    customDevices: { c: { id: 'c', name: 'X', kind: 'strength', primary: [], secondary: [], description: '', cues: [], step: 5, updatedAt: 1 }, broken: { id: 'broken', updatedAt: 1 } },
    deviceSettings: { 'leg-press': { notes: 'Seat 4', step: 10, updatedAt: 1 }, x: { step: 'big', updatedAt: 1 } },
    qr: { a: { deviceIds: ['leg-press'], updatedAt: 1 }, legacy: { deviceId: 'leg-press', updatedAt: 1 }, broken: { deviceIds: 'leg-press', updatedAt: 1 } },
  };
  const { data, dropped } = sanitize(raw, now);
  assert.deepEqual(Object.keys(data.sessions), ['ok']);
  assert.equal((data.sessions.ok as unknown as { extra: number }).extra, 1);
  assert.deepEqual(Object.keys(data.workouts), ['w']);
  assert.equal(data.workouts.w.updatedAt, now);
  assert.deepEqual(Object.keys(data.customDevices), ['c']);
  assert.deepEqual(Object.keys(data.deviceSettings), ['leg-press']);
  assert.deepEqual(Object.keys(data.qr), ['a', 'legacy']);
  assert.equal(dropped, 6);
});

test('sanitize: data from before body weights existed gets an empty collection; body weights are validated and merge per day', () => {
  const old = { schema: 1, sessions: {}, workouts: {}, customDevices: {}, deviceSettings: {}, qr: {} };
  assert.deepEqual(sanitize(old, 0).data.bodyWeights, {});
  const { data, dropped } = sanitize({ ...old, bodyWeights: {
    '2026-11-20': { kg: 80.5, at: 1, updatedAt: 5 }, text: { kg: '80', at: 1, updatedAt: 1 }, zero: { kg: 0, at: 1, updatedAt: 1 } } }, 0);
  assert.deepEqual(Object.keys(data.bodyWeights), ['2026-11-20']);
  assert.equal(dropped, 2);
  const other = { ...data, bodyWeights: { '2026-11-20': { kg: 80.1, at: 1, updatedAt: 6 }, '2026-11-21': { kg: 80, at: 2, updatedAt: 1 } } };
  assert.deepEqual(mergeData(data, other).data.bodyWeights['2026-11-20'].kg, 80.1);
  assert.equal(Object.keys(mergeData(data, other).data.bodyWeights).length, 2);
});

test('sanitize rejects other data and data from a newer schema', () => {
  assert.throws(() => sanitize({ hello: 1 }, 0), /not Pinlift data/);
  assert.throws(() => sanitize({ schema: 2, sessions: {}, workouts: {}, customDevices: {}, deviceSettings: {}, qr: {} }, 0), NewerVersionError);
});

test('changing a QR link keeps fields added by newer app versions', () => {
  const l = { deviceIds: ['a'], updatedAt: 1, note: 'from v2' } as never;
  assert.equal((withDevice(l, 'b', 2) as unknown as { note: string }).note, 'from v2');
  assert.equal((withoutDevice(l, 'a', 3) as unknown as { note: string }).note, 'from v2');
});
