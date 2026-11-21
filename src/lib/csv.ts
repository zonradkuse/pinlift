import type { AppData, Device } from './types.ts';
import { live } from './stats.ts';

const cell = (v: string | number | undefined) => {
  const s = v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const pad = (n: number) => String(n).padStart(2, '0');

/** One row per set or cardio log, for spreadsheets. */
export function toCsv(d: AppData, getDevice: (id: string) => Device | undefined): string {
  const rows = [['date', 'time', 'workout', 'device', 'set', 'type', 'weight_kg', 'reps', 'duration_s', 'distance_m', 'floors']];
  for (const s of live(Object.values(d.sessions))) {
    const t = new Date(s.startedAt);
    const base = [`${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`, `${pad(t.getHours())}:${pad(t.getMinutes())}`,
      (s.workoutId && d.workouts[s.workoutId]?.name) || ''];
    for (const e of s.entries) {
      const name = getDevice(e.deviceId)?.name ?? e.deviceId;
      e.sets.forEach((x, i) => rows.push([...base, name, String(i + 1), x.kind ?? 'work', String(x.weight), String(x.reps), '', '', '']));
      if (e.cardio) rows.push([...base, name, '', 'cardio', '', '', String(e.cardio.durationSec), String(e.cardio.distanceM), e.cardio.floors === undefined ? '' : String(e.cardio.floors)]);
    }
  }
  return rows.map((r) => r.map(cell).join(',')).join('\n') + '\n';
}
