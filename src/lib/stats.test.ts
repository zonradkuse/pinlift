import { test } from 'node:test';
import assert from 'node:assert/strict';
import { e1rm, sessionSummary, previousSets, computePRs, lastActivity, isStale, endTime, STALE_MS } from './stats.ts';
import type { Session, Entry, Device, StrengthSet } from './types.ts';

const strength = (deviceId: string, ...s: [number, number][]): Entry =>
  ({ id: deviceId + Math.random(), deviceId, sets: s.map(([weight, reps]) => ({ weight, reps, at: 0 })) });
const cardio = (deviceId: string, distanceM: number, durationSec: number): Entry =>
  ({ id: deviceId + Math.random(), deviceId, sets: [], cardio: { distanceM, durationSec, at: 0 } });
const session = (id: string, startedAt: number, entries: Entry[], extra: Partial<Session> = {}): Session =>
  ({ id, startedAt, endedAt: startedAt + 3600_000, entries, updatedAt: startedAt, ...extra });

test('e1rm uses Epley and is identity for single reps', () => {
  assert.equal(e1rm(100, 1), 100);
  assert.equal(e1rm(100, 10), 100 * (1 + 10 / 30));
});

test('sessionSummary totals volume, sets, reps and cardio distance', () => {
  const s = session('a', 0, [strength('press', [50, 10], [50, 8]), strength('curl', [20, 12]), cardio('tread', 3000, 900)]);
  const sum = sessionSummary(s);
  assert.equal(sum.volume, 50 * 10 + 50 * 8 + 20 * 12);
  assert.equal(sum.sets, 3);
  assert.equal(sum.reps, 30);
  assert.equal(sum.distanceM, 3000);
  assert.equal(sum.durationSec, 3600);
});

test('previousSets returns sets from the latest earlier session, skipping deleted ones', () => {
  const sessions = [
    session('a', 1, [strength('press', [40, 12])]),
    session('b', 2, [strength('press', [42.5, 9])]),
    session('c', 3, [strength('press', [99, 1])], { deleted: true }),
    session('d', 4, [strength('curl', [20, 10])]),
  ];
  assert.deepEqual(previousSets(sessions, 'press', 'd').map((s) => s.weight), [42.5]);
  assert.deepEqual(previousSets(sessions, 'press', 'b').map((s) => s.weight), [40]);
  assert.deepEqual(previousSets(sessions, 'nope', 'd'), []);
});

test('computePRs: baseline is not a PR, heavier weight is, more reps at the same weight is not', () => {
  const sessions = [
    session('a', 1, [strength('press', [40, 10])]),
    session('b', 2, [strength('press', [42.5, 8])]),
    session('c', 3, [strength('press', [42.5, 10])]),
    session('d', 4, [strength('press', [30, 10])]),
  ];
  const prs = computePRs(sessions);
  assert.deepEqual(prs.map((p) => [p.sessionId, p.kind]), [['b', 'weight']]);
  assert.equal(prs[0].value, 42.5);
  assert.equal(prs[0].previous, 40);
});

test('computePRs: cardio speed PR needs at least 1 km, distance PR otherwise', () => {
  const sessions = [
    session('a', 1, [cardio('tread', 5000, 1800)]),
    session('b', 2, [cardio('tread', 500, 60)]),
    session('c', 3, [cardio('tread', 6000, 2400)]),
    session('d', 4, [cardio('tread', 5000, 1500)]),
  ];
  assert.deepEqual(computePRs(sessions).map((p) => [p.sessionId, p.kind]), [['c', 'distance'], ['d', 'speed']]);
});

test('computePRs: one PR per device per session, ordered chronologically regardless of input order', () => {
  const sessions = [
    session('b', 2, [strength('press', [50, 5], [45, 12])]),
    session('a', 1, [strength('press', [40, 10])]),
  ];
  assert.deepEqual(computePRs(sessions).map((p) => [p.sessionId, p.kind]), [['b', 'weight']]);
});

const devs: Record<string, Partial<Device>> = { assist: { assisted: true }, stairs: { kind: 'cardio', cardio: 'stairs' } };
const getDevice = (id: string) => ({ id, name: id, kind: 'strength', primary: [], secondary: [], description: '', cues: [], step: 5, ...devs[id] }) as Device;
const warm = (weight: number, reps: number): StrengthSet => ({ weight, reps, at: 0, kind: 'warmup' });

test('warm-up sets are excluded from volume, set count, previous sets and PRs', () => {
  const a = session('a', 1, [{ id: '1', deviceId: 'press', sets: [warm(20, 10), { weight: 40, reps: 10, at: 0 }] }]);
  const b = session('b', 2, [{ id: '2', deviceId: 'press', sets: [warm(60, 5), { weight: 40, reps: 10, at: 0 }] }]);
  assert.equal(sessionSummary(a).volume, 400);
  assert.equal(sessionSummary(a).sets, 1);
  assert.deepEqual(previousSets([a, b], 'press', 'b').map((x) => x.weight), [40]);
  assert.deepEqual(computePRs([a, b]), []);
});

test('assisted machines: no volume, PR is less assistance', () => {
  const a = session('a', 1, [strength('assist', [40, 10])]);
  const b = session('b', 2, [strength('assist', [35, 8])]);
  const c = session('c', 3, [strength('assist', [45, 12])]);
  assert.equal(sessionSummary(a, getDevice).volume, 0);
  assert.equal(sessionSummary(a, getDevice).sets, 1);
  const prs = computePRs([a, b, c], getDevice);
  assert.deepEqual(prs.map((p) => [p.sessionId, p.kind, p.value, p.previous]), [['b', 'assist', 35, 40]]);
});

test('stair climber: floors PR, duration-only logs are fine', () => {
  const st = (id: string, t: number, floors?: number): Session =>
    session(id, t, [{ id, deviceId: 'stairs', sets: [], cardio: { durationSec: 600, distanceM: 0, at: 0, floors } }]);
  const prs = computePRs([st('a', 1, 40), st('b', 2), st('c', 3, 55)], getDevice);
  assert.deepEqual(prs.map((p) => [p.sessionId, p.kind, p.value]), [['c', 'floors', 55]]);
});

test('stale workouts: last activity, staleness and a sensible end time', () => {
  const start = 1_000_000_000_000;
  const s: Session = { id: 's', startedAt: start, updatedAt: start, entries: [
    { id: 'e', deviceId: 'press', sets: [{ weight: 40, reps: 10, at: start + 20 * 60e3 }, { weight: 40, reps: 9, at: start + 25 * 60e3 }] }] };
  const last = start + 25 * 60e3;
  assert.equal(lastActivity(s), last);
  assert.equal(isStale(s, last + STALE_MS - 1), false);
  assert.equal(isStale(s, last + STALE_MS + 1), true);
  assert.equal(endTime(s, last + 10 * 60e3), last + 10 * 60e3); // finished right after training: now
  assert.equal(endTime(s, last + 2 * 86400e3), last + 5 * 60e3); // forgotten: shortly after the last set
  assert.equal(lastActivity({ ...s, entries: [] }), start);
});

test('drop sets count as volume but never as a record', () => {
  const a = session('a', 1, [strength('assist', [40, 10])]);
  const b = session('b', 2, [{ id: 'x', deviceId: 'assist', sets: [{ weight: 40, reps: 10, at: 0 }, { weight: 20, reps: 5, at: 0, kind: 'drop' }] }]);
  assert.deepEqual(computePRs([a, b], getDevice), []);
  const c = session('c', 3, [{ id: 'y', deviceId: 'press', sets: [{ weight: 50, reps: 10, at: 0 }, { weight: 40, reps: 8, at: 0, kind: 'drop' }] }]);
  assert.equal(sessionSummary(c).volume, 820);
});
