import { test } from 'node:test';
import assert from 'node:assert/strict';
import { errorText, fmtAmount, fmtCardio, fmtPr, fmtProgress, fmtSet, fmtSets, parseDecimal } from './format.ts';
import { set } from './fixtures.ts';

test('sets in long and compact form', () => {
  assert.equal(fmtSet(set(42.5, 8)), '42.5 kg × 8');
  assert.equal(fmtSet(set(42.5, 8), { compact: true }), '42.5×8');
  assert.equal(fmtSets([set(40, 12), set(40, 11)]), '40 kg × 12, 40 kg × 11');
  assert.equal(fmtSets([set(40, 12), set(40, 11)], { compact: true }), '40×12 · 40×11');
  assert.equal(fmtSet(set(20, 10, { kind: 'warmup' }), { kind: true }), '20 kg × 10 · warm-up');
});

test('personal records', () => {
  const pr = { sessionId: 's', deviceId: 'd', at: 0 };
  assert.equal(fmtPr({ ...pr, kind: 'weight', value: 45, previous: 40 }), '45 kg (was 40 kg)');
  assert.equal(fmtPr({ ...pr, kind: 'assist', value: 30, previous: 35 }), 'only 30 kg assistance (was 35 kg)');
  assert.equal(fmtPr({ ...pr, kind: 'floors', value: 60, previous: 50 }), '60 floors (was 50)');
});

test('cardio without distance shows time and floors', () => {
  assert.equal(fmtCardio({ distanceM: 0, durationSec: 1200, at: 0, floors: 60 }), '20:00 · 60 floors');
  assert.equal(fmtCardio({ distanceM: 5000, durationSec: 1500, at: 0 }, 'run'), '5.00 km in 25:00 (12 km/h)');
});

test('parseDecimal accepts comma decimals and rejects garbage', () => {
  assert.equal(parseDecimal('42,5'), 42.5);
  assert.equal(parseDecimal(' 7 '), 7);
  assert.equal(parseDecimal(''), undefined);
  assert.equal(parseDecimal('abc'), undefined);
});

test('errorText', () => {
  assert.equal(errorText(new Error('boom')), 'boom');
  assert.equal(errorText('plain'), 'plain');
});

test('fmtAgo: today, yesterday, days ago (local calendar days)', async () => {
  const { fmtAgo } = await import('./format.ts');
  const now = new Date(2026, 10, 21, 10).getTime();
  assert.equal(fmtAgo(new Date(2026, 10, 21, 8).getTime(), now), 'today');
  assert.equal(fmtAgo(new Date(2026, 10, 20, 23).getTime(), now), 'yesterday');
  assert.equal(fmtAgo(new Date(2026, 10, 16, 12).getTime(), now), '5 days ago');
});

test('bodyweight sets and records: BW plus added weight', () => {
  const pr = { sessionId: 's', deviceId: 'd', at: 0 };
  assert.equal(fmtSet(set(0, 12), { bw: true }), 'BW × 12');
  assert.equal(fmtSet(set(5, 8), { bw: true }), 'BW + 5 kg × 8');
  assert.equal(fmtSets([set(0, 12), set(2.5, 8)], { compact: true, bw: true }), 'BW×12 · BW+2.5×8');
  assert.equal(fmtPr({ ...pr, kind: 'added', value: 5, previous: 0 }), 'BW + 5 kg (was BW)');
  assert.equal(fmtPr({ ...pr, kind: 'reps', value: 15, previous: 12 }), '15 reps (was 12)');
});

test('what a workout amounted to: weight lifted, else reps (bodyweight), else distance or cardio time', () => {
  const sum = { volume: 0, sets: 0, reps: 0, holdSec: 0, distanceM: 0, cardioSec: 0, durationSec: 0 };
  assert.equal(fmtAmount({ ...sum, volume: 1200, sets: 3, reps: 30 }), '1,200 kg');
  assert.equal(fmtAmount({ ...sum, sets: 3, reps: 36 }), '36 reps');
  assert.equal(fmtAmount({ ...sum, distanceM: 2000, cardioSec: 480 }), '2.00 km');
  assert.equal(fmtAmount({ ...sum, cardioSec: 1200 }), '20:00 cardio');
});

test('timed exercises: sets are seconds held', () => {
  const pr = { sessionId: 's', deviceId: 'd', at: 0 };
  assert.equal(fmtSet(set(0, 45), { bw: true, timed: true }), '45 s');
  assert.equal(fmtSet(set(10, 90), { bw: true, timed: true }), 'BW + 10 kg × 1:30 min');
  assert.equal(fmtSets([set(0, 45), set(0, 40)], { compact: true, bw: true, timed: true }), '45s · 40s');
  assert.equal(fmtPr({ ...pr, kind: 'hold', value: 75, previous: 60 }), '1:15 min (was 1:00 min)');
  assert.equal(fmtProgress({ reps: 5 }, true), '+5 s vs last time');
  const sum = { volume: 0, sets: 2, reps: 0, holdSec: 90, distanceM: 0, cardioSec: 0, durationSec: 0 };
  assert.equal(fmtAmount(sum), '1:30 min held');
});
