import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { fromWire, toWire } from './wire.ts';
import { emptyData, type AppData } from './types.ts';

const sample = (legacy: boolean): AppData => {
  const d = emptyData();
  d.workouts.w = { id: 'w', name: 'Upper', deviceIds: ['chest-press'], updatedAt: 5 };
  d.qr.code = { deviceIds: ['chest-press'], deviceId: 'chest-press', updatedAt: 6 };
  for (let i = 0; i < 40; i++) {
    const start = Date.UTC(2026, 0, 1 + i, 17) + (legacy ? 123 : 0);
    const id = legacy ? crypto.randomUUID() : `S${i}ABCDEFGHIJ`.slice(0, 12);
    d.sessions[id] = { id, startedAt: start, endedAt: start + 3_600_000 + (legacy ? 457 : 0), updatedAt: start + 3_700_123, workoutId: 'w',
      entries: [{ id: legacy ? crypto.randomUUID() : 'E1AB', deviceId: 'chest-press', sets: [0, 1, 2].map((j) => ({ weight: 40, reps: 10 - j, at: start + 90_000 * (j + 1) + (legacy ? 789 : 0) })) },
        { id: legacy ? crypto.randomUUID() : 'E2CD', deviceId: 'treadmill', sets: [], cardio: { durationSec: 1500, distanceM: 5000, at: start + 3_500_000 } }] };
  }
  d.sessions[Object.keys(d.sessions)[0]].stravaId = 42;
  (d.sessions[Object.keys(d.sessions)[1]] as unknown as Record<string, unknown>).futureField = { keep: true }; // from a newer app version
  return d;
};

test('wire format round-trips losslessly, for old (UUID, millisecond) data too', () => {
  for (const legacy of [false, true]) {
    const d = sample(legacy);
    assert.deepEqual(fromWire(JSON.parse(JSON.stringify(toWire(d)))), d);
  }
});

test('wire format is much smaller than the stored format after compression', () => {
  const d = sample(false);
  const v1 = deflateRawSync(JSON.stringify(d)).length, v2 = deflateRawSync(JSON.stringify(toWire(d))).length;
  assert.ok(v2 < v1 * 0.8, `v1 ${v1} bytes, v2 ${v2} bytes`);
});

test('fromWire rejects payloads that are not wire data', () => {
  assert.throws(() => fromWire({ schema: 1 }));
  assert.throws(() => fromWire(null));
});
