import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestCardio, bestSet, bestSetsByDevice, cardioLogs, previousSession, progressSeries } from './stats.ts';
import { dropSetWeight, progressVsLast } from './progression.ts';
import { cardio, device, lift, session, set } from './fixtures.ts';

const assist = device('assist', { assisted: true, step: 5 });
const press = device('press');
const tread = device('tread', { kind: 'cardio', cardio: 'run' });
const stairs = device('stairs', { kind: 'cardio', cardio: 'stairs' });
const lookup = (id: string) => ({ assist, press, tread, stairs } as Record<string, typeof press>)[id];

test('bestSet: heaviest (least assistance), then most reps', () => {
  assert.deepEqual(bestSet([set(40, 10), set(45, 6), set(45, 8)]), set(45, 8));
  assert.deepEqual(bestSet([set(40, 10), set(30, 6)], true), set(30, 6));
  assert.equal(bestSet([]), undefined);
});

test('previousSession: latest earlier session with working sets on the device', () => {
  const a = session('a', 1, [lift('press', [40, 10])]);
  const b = session('b', 2, [lift('press', set(20, 10, { kind: 'warmup' }))]);
  const c = session('c', 3, [lift('curl', [10, 10])]);
  assert.equal(previousSession([a, b, c], 'press', 'c')?.session.id, 'a');
  assert.deepEqual(previousSession([a, b, c], 'press')?.sets, [set(40, 10)]);
  assert.equal(previousSession([a, b, c], 'press', 'a'), undefined);
});

test('progressSeries: e1RM for machines, least assistance, speed or floors for cardio; drop sets ignored', () => {
  const s = [
    session('a', 1, [lift('press', [50, 10], set(60, 1, { kind: 'drop' }))]),
    session('b', 2, [lift('assist', [40, 10], set(60, 5, { kind: 'drop' }))]),
    session('c', 3, [cardio('tread', 5000, 1500)]),
    session('d', 4, [cardio('stairs', 0, 600, { floors: 40 })]),
  ];
  assert.deepEqual(progressSeries(s, press), { metric: 'e1rm', points: [{ x: 1, y: 50 * (1 + 10 / 30) }] });
  assert.deepEqual(progressSeries(s, assist), { metric: 'assist', points: [{ x: 2, y: 40 }] });
  assert.deepEqual(progressSeries(s, tread), { metric: 'speed', points: [{ x: 3, y: 12 }] });
  assert.deepEqual(progressSeries(s, stairs), { metric: 'floors', points: [{ x: 4, y: 40 }] });
});

test('bestSetsByDevice: best regular set per machine with how often it was trained; no 1RM for assisted', () => {
  const s = [
    session('a', 1, [lift('press', [50, 10]), lift('assist', [40, 10])]),
    session('b', 2, [lift('press', [55, 5], set(70, 1, { kind: 'warmup' }))]),
  ];
  const best = bestSetsByDevice(s, lookup);
  assert.deepEqual([...best.keys()], ['press']);
  assert.deepEqual(best.get('press'), { set: set(50, 10), e1rm: 50 * (1 + 10 / 30), uses: 2 });
});

test('cardioLogs and bestCardio: fastest log of at least 1 km', () => {
  const s = [session('a', 1, [cardio('tread', 5000, 1800)]), session('b', 2, [cardio('tread', 500, 60)]), session('c', 3, [cardio('tread', 3000, 900)])];
  const logs = cardioLogs(s, 'tread');
  assert.deepEqual(logs.map((l) => l.session.id), ['a', 'b', 'c']);
  assert.equal(bestCardio(logs)?.session.id, 'c');
  assert.equal(bestCardio([]), undefined);
});

test('progressVsLast: weight gain first, otherwise extra reps at the same weight', () => {
  assert.deepEqual(progressVsLast([set(42.5, 8)], [set(40, 12)]), { weight: 2.5 });
  assert.deepEqual(progressVsLast([set(40, 10), set(40, 12)], [set(40, 11)]), { reps: 1 });
  assert.equal(progressVsLast([set(40, 10)], [set(40, 11)]), null);
  assert.equal(progressVsLast([set(37.5, 12)], [set(40, 8)]), null);
  assert.deepEqual(progressVsLast([set(30, 8)], [set(35, 8)], true), { weight: -5 });
  assert.equal(progressVsLast([set(20, 10, { kind: 'warmup' })], [set(40, 8)]), null);
});

test('dropSetWeight: 20% lighter (or more assistance), rounded to the step', () => {
  assert.equal(dropSetWeight(50, 2.5), 40);
  assert.equal(dropSetWeight(47.5, 5), 40);
  assert.equal(dropSetWeight(40, 5, true), 50);
});

test('setsPerMuscleGroup counts working sets by the primary muscles of each device, within the period', async () => {
  const { setsPerMuscleGroup } = await import('./stats.ts');
  const chest = device('chest', { primary: ['chest'] }), legs = device('legs', { primary: ['quads', 'glutes'] });
  const get = (id: string) => ({ chest, legs } as Record<string, typeof chest>)[id];
  const s = [
    session('old', 1_000, [lift('chest', [40, 10])]),
    session('new', 10_000, [lift('chest', [40, 10], set(20, 10, { kind: 'warmup' }), [40, 9]), lift('legs', [100, 10])]),
  ];
  const counts = setsPerMuscleGroup(s, get, 5_000);
  assert.equal(counts.get('chest'), 2);
  assert.equal(counts.get('legs'), 1);  // quads
  assert.equal(counts.get('glutes'), 1);
  assert.equal(counts.get('back') ?? 0, 0);
});

test('dailyVolume sums lifted weight per local calendar day', async () => {
  const { dailyVolume, dayKey } = await import('./stats.ts');
  const d1 = new Date(2026, 10, 20, 9).getTime(), d1b = new Date(2026, 10, 20, 18).getTime(), d2 = new Date(2026, 10, 21, 9).getTime();
  const days = dailyVolume([session('a', d1, [lift('press', [40, 10])]), session('b', d1b, [lift('press', [50, 10])]), session('c', d2, [lift('press', [10, 10])])]);
  assert.equal(days.get(dayKey(d1)), 900);
  assert.equal(days.get(dayKey(d2)), 100);
  assert.equal(dayKey(d1), '2026-11-20');
});

test('muscleCoverage: per group by primary muscles, map muscles split into primary and secondary', async () => {
  const { muscleCoverage } = await import('./stats.ts');
  const chest = device('chest', { primary: ['chest'], secondary: ['triceps', 'shoulders'] });
  const row = device('row', { primary: ['lats', 'upper_back'], secondary: ['biceps', 'chest'] });
  const curl = device('curl', { primary: ['biceps'] });
  const c = muscleCoverage([{ device: chest, count: 3 }, { device: row, count: 2 }, { device: curl, count: 0 }, { count: 1 }]);
  assert.equal(c.groups.get('chest'), 3);
  assert.equal(c.groups.get('back'), 2); // lats and upper back are one group: counted once
  assert.equal(c.groups.get('arms') ?? 0, 0); // secondary muscles and devices without sets don't count
  assert.deepEqual([...c.trained].sort(), ['back', 'chest']);
  assert.deepEqual([...c.primary].sort(), ['chest', 'lats', 'upper_back']);
  assert.deepEqual([...c.secondary].sort(), ['biceps', 'shoulders', 'triceps']);
});

test('muscleCoverage: cardio trains its muscles; it adds to counts only when counted (exercises), never as sets', async () => {
  const { muscleCoverage, workingSetsByEntry } = await import('./stats.ts');
  const rower = device('rower', { kind: 'cardio', cardio: 'row', primary: ['upper_back', 'quads', 'glutes'] });
  const planned = muscleCoverage([{ device: rower, count: 1 }]);
  assert.equal(planned.groups.get('legs'), 1);
  assert.equal(planned.groups.get('back'), 1);
  const done = muscleCoverage(workingSetsByEntry(session('s', 0, [cardio('rower', 2000, 480)]), () => rower));
  assert.equal(done.groups.size, 0); // no sets
  assert.deepEqual([...done.trained].sort(), ['back', 'glutes', 'legs']);
  assert.ok(done.primary.has('quads'));
});

test('bodyweight exercises: progress is the most reps in a set; no 1RM', () => {
  const pu = device('pu', { bodyweight: true });
  const s = [session('a', 1, [lift('pu', [0, 10], [0, 12])]), session('b', 2, [lift('pu', [5, 8])])];
  const { metric, points } = progressSeries(s, pu);
  assert.equal(metric, 'reps');
  assert.deepEqual(points.map((p) => p.y), [12, 8]);
  assert.equal(bestSetsByDevice(s, () => pu).has('pu'), false);
});
