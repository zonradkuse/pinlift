import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backupReminder } from './backup.ts';
import { DAY_MS } from './stats.ts';

test('backup reminder after a few workouts and every 14 days', () => {
  const now = 1_000 * DAY_MS;
  assert.equal(backupReminder(2, undefined, now), null);
  assert.deepEqual(backupReminder(3, undefined, now), { daysSince: null });
  assert.equal(backupReminder(10, now - 13 * DAY_MS, now), null);
  assert.deepEqual(backupReminder(10, now - 20 * DAY_MS, now), { daysSince: 20 });
});
