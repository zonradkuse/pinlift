import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBadges } from './badges.ts';
import { weekIndex, weeklyStreak, compareWeight } from './stats.ts';
import type { Device, Entry, Session } from './types.ts';

const DAY = 86400_000;
const MON = new Date(2026, 0, 5, 18).getTime(); // Monday 18:00 local
const dev = (id: string, extra: Partial<Device> = {}): Device =>
  ({ id, name: id, kind: 'strength', primary: ['chest'], secondary: [], description: '', cues: [], step: 2.5, ...extra });
const devices: Record<string, Device> = {
  press: dev('press'),
  tread: dev('tread', { kind: 'cardio', cardio: 'run', primary: [] }),
};
const get = (id: string) => devices[id];
const lift = (weight: number, reps: number, n = 1): Entry =>
  ({ id: String(Math.random()), deviceId: 'press', sets: Array.from({ length: n }, () => ({ weight, reps, at: 0 })) });
const run = (distanceM: number): Entry => ({ id: String(Math.random()), deviceId: 'tread', sets: [], cardio: { distanceM, durationSec: 1800, at: 0 } });
const ses = (id: string, startedAt: number, entries: Entry[], extra: Partial<Session> = {}): Session =>
  ({ id, startedAt, endedAt: startedAt + 3600_000, entries, updatedAt: 0, ...extra });
const ids = (sessions: Session[]) => computeBadges(sessions, get).map((b) => `${b.id}@${b.sessionId}`);

test('weekIndex starts weeks on Monday', () => {
  const sun = MON - DAY, nextSun = MON + 6 * DAY;
  assert.equal(weekIndex(MON), weekIndex(nextSun));
  assert.equal(weekIndex(sun) + 1, weekIndex(MON));
});

test('first workout badge is earned by the first completed session only', () => {
  const b = ids([ses('a', MON, [lift(40, 10)]), ses('b', MON + DAY, [lift(40, 10)])]);
  assert.ok(b.includes('first-workout@a'));
  assert.ok(!b.some((x) => x.startsWith('first-workout@b')));
});

test('active (unfinished) sessions earn nothing', () => {
  assert.deepEqual(ids([ses('a', MON, [lift(40, 10)], { endedAt: undefined })]), []);
});

test('4-week streak requires consecutive weeks', () => {
  const weekly = [0, 1, 2, 3].map((w) => ses('w' + w, MON + w * 7 * DAY, [lift(40, 10)]));
  assert.ok(ids(weekly).includes('streak-4@w3'));
  const gap = [0, 1, 3, 4].map((w) => ses('w' + w, MON + w * 7 * DAY, [lift(40, 10)]));
  assert.ok(!ids(gap).some((x) => x.startsWith('streak-4')));
});

test('session volume, PR, run distance and time-of-day badges', () => {
  const early = new Date(2026, 0, 6, 6, 30).getTime();
  const b = ids([
    ses('a', MON, [lift(100, 10, 5)]), // 5000 kg
    ses('b', early, [lift(105, 5), run(5000)]),
  ]);
  for (const want of ['session-5t@a', 'pr-1@b', 'run-5k@b', 'early-bird@b']) assert.ok(b.includes(want), want);
  assert.ok(!b.some((x) => x.startsWith('night-owl')));
});

test('weeklyStreak counts back from this or last week', () => {
  const s = [0, 1, 2].map((w) => ses('w' + w, MON + w * 7 * DAY, []));
  assert.equal(weeklyStreak(s, MON + 2 * 7 * DAY + DAY), 3);
  assert.equal(weeklyStreak(s, MON + 3 * 7 * DAY + DAY), 3); // still alive during the following week
  assert.equal(weeklyStreak(s, MON + 4 * 7 * DAY + DAY), 0);
});

test('compareWeight picks the largest object not heavier than the total', () => {
  assert.match(compareWeight(1000) ?? "", /small car/);
  assert.match(compareWeight(12500) ?? "", /school bus/);
  assert.equal(compareWeight(1), null);
});
