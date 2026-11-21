import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeData } from './merge.ts';
import { emptyData } from './types.ts';

const w = (id: string, name: string, updatedAt: number, deleted = false) => ({ id, name, deviceIds: [], updatedAt, deleted });

test('newer record wins, records from both sides are kept, tombstones propagate', () => {
  const a = emptyData(), b = emptyData();
  a.workouts = { x: w('x', 'old', 1), y: w('y', 'only-a', 1), z: w('z', 'alive', 1) };
  b.workouts = { x: w('x', 'new', 2), q: w('q', 'only-b', 1), z: w('z', 'alive', 5, true) };
  b.qr = { 'CODE-1': { deviceIds: ['leg-press'], updatedAt: 3 } };
  const { data, changed } = mergeData(a, b);
  assert.equal(data.workouts.x.name, 'new');
  assert.equal(data.workouts.y.name, 'only-a');
  assert.equal(data.workouts.q.name, 'only-b');
  assert.equal(data.workouts.z.deleted, true);
  assert.deepEqual(data.qr['CODE-1'].deviceIds, ['leg-press']);
  assert.equal(changed, 4);
});

test('identical records are not changes and merging is idempotent', () => {
  const a = emptyData(), b = emptyData();
  a.workouts = { x: w('x', 'same', 2) };
  b.workouts = { x: w('x', 'same', 2), y: w('y', 'new', 1) };
  const first = mergeData(a, b);
  assert.equal(first.changed, 1);
  assert.equal(mergeData(first.data, b).changed, 0);
});
