import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggest } from './progression.ts';

const opts = { step: 2.5, repMin: 8, repMax: 12 };
const sets = (...s: [number, number][]) => s.map(([weight, reps], i) => ({ weight, reps, at: i }));

test('no history gives no suggestion', () => {
  assert.equal(suggest([], opts), null);
});

test('all top sets at repMax -> increase one step, aim for repMin', () => {
  const s = suggest(sets([40, 12], [40, 12], [40, 13]), opts)!;
  assert.equal(s.kind, 'increase');
  assert.equal(s.weight, 42.5);
  assert.equal(s.reps, 8);
});

test('warm-up sets at lower weight are ignored', () => {
  const s = suggest(sets([20, 15], [40, 12], [40, 12]), opts)!;
  assert.equal(s.kind, 'increase');
  assert.equal(s.weight, 42.5);
});

test('within range -> same weight, beat the weakest top set by one rep', () => {
  const s = suggest(sets([40, 12], [40, 10], [40, 9]), opts)!;
  assert.equal(s.kind, 'same');
  assert.equal(s.weight, 40);
  assert.equal(s.reps, 10);
});

test('best top set below repMin -> one step down', () => {
  const s = suggest(sets([50, 6], [50, 5]), opts)!;
  assert.equal(s.kind, 'decrease');
  assert.equal(s.weight, 47.5);
  assert.equal(s.reps, 8);
});

test('never suggests negative weight and avoids float noise', () => {
  assert.equal(suggest(sets([1, 3]), { ...opts, step: 2.5 })!.weight, 0);
  assert.equal(suggest(sets([0.1, 12]), { ...opts, step: 0.2 })!.weight, 0.3);
});

test('assisted machines progress towards less assistance', () => {
  const a = { ...opts, step: 5, assisted: true };
  const up = suggest(sets([40, 12], [40, 12], [40, 12]), a)!;
  assert.equal(up.kind, 'increase');
  assert.equal(up.weight, 35);
  const down = suggest(sets([40, 6], [40, 5]), a)!;
  assert.equal(down.kind, 'decrease');
  assert.equal(down.weight, 45);
  // the hardest sets are the ones with the least assistance
  assert.equal(suggest(sets([50, 12], [40, 9]), a)!.weight, 40);
  assert.equal(suggest(sets([5, 12]), a)!.weight, 0);
});

test('warm-up sets never drive the suggestion', () => {
  const s = suggest([{ weight: 60, reps: 3, at: 0, kind: 'warmup' as const }, ...sets([40, 12], [40, 12])], opts)!;
  assert.equal(s.weight, 42.5);
});

test('drop sets never drive the suggestion (also on assisted machines)', () => {
  const drop = { weight: 30, reps: 4, at: 0, kind: 'drop' as const };
  const s = suggest([...sets([40, 12], [40, 12]), drop], { ...opts, step: 5, assisted: true })!;
  assert.deepEqual([s.kind, s.weight], ['increase', 35]);
});

test('bodyweight: the weight is added weight, never below zero; reasons say bodyweight', () => {
  const bw = { step: 2.5, repMin: 8, repMax: 15, bodyweight: true };
  const low = suggest(sets([0, 6], [0, 5]), bw)!;
  assert.equal(low.weight, 0);
  assert.match(low.reason, /at bodyweight/);
  assert.deepEqual([suggest(sets([0, 15], [0, 16]), bw)!.weight, suggest(sets([0, 15], [0, 16]), bw)!.reps], [2.5, 8]);
  assert.match(suggest(sets([2.5, 15], [2.5, 15]), bw)!.reason, /BW \+ 2.5 kg/);
});

test('timed: double progression in seconds, +5 s at a time, then added weight', () => {
  const t = { step: 2.5, repMin: 30, repMax: 60, bodyweight: true, timed: true };
  const same = suggest(sets([0, 30], [0, 30]), t)!;
  assert.deepEqual([same.kind, same.weight, same.reps], ['same', 0, 35]);
  assert.match(same.reason, /Hold longer until every set reaches 60 s/);
  const up = suggest(sets([0, 60], [0, 62]), t)!;
  assert.deepEqual([up.weight, up.reps], [2.5, 30]);
  assert.match(up.reason, /reached 60\+ s/);
  assert.match(suggest(sets([0, 20], [0, 15]), t)!.reason, /Below 30 s/);
});
