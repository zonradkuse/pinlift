import { test } from 'node:test';
import assert from 'node:assert/strict';
import { errorText, fmtCardio, fmtPr, fmtSet, fmtSets, parseDecimal } from './format.ts';
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
