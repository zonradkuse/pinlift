import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from './csv.ts';
import { emptyData, type Device } from './types.ts';

test('CSV has one row per set or cardio log, quoted where needed', () => {
  const d = emptyData();
  const t = new Date(2026, 10, 21, 18, 5).getTime();
  d.workouts.w = { id: 'w', name: 'Upper, "heavy"', deviceIds: [], updatedAt: 0 };
  d.sessions.s = { id: 's', startedAt: t, endedAt: t + 3600e3, workoutId: 'w', updatedAt: 0, entries: [
    { id: 'e1', deviceId: 'press', sets: [{ weight: 20, reps: 10, at: t, kind: 'warmup' }, { weight: 42.5, reps: 8, at: t }] },
    { id: 'e2', deviceId: 'tread', sets: [], cardio: { durationSec: 1500, distanceM: 5000, at: t } }] };
  d.sessions.gone = { id: 'gone', startedAt: t, updatedAt: 0, deleted: true, entries: [] };
  const names: Record<string, string> = { press: 'Chest Press', tread: 'Treadmill' };
  const csv = toCsv(d, (id) => ({ name: names[id] }) as Device).trim().split('\n');
  assert.equal(csv[0], 'date,time,workout,device,set,type,weight_kg,reps,duration_s,distance_m,floors');
  assert.deepEqual(csv.slice(1), [
    '2026-11-21,18:05,"Upper, ""heavy""",Chest Press,1,warmup,20,10,,,',
    '2026-11-21,18:05,"Upper, ""heavy""",Chest Press,2,work,42.5,8,,,',
    '2026-11-21,18:05,"Upper, ""heavy""",Treadmill,,cardio,,,1500,5000,',
  ]);
});
