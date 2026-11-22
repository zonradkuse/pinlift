import { dayKey, DAY_MS } from '../lib/stats.ts';
import { fmtDate, fmtKg } from '../lib/format.ts';

const CELL = 12, GAP = 3, STEP = CELL + GAP, LEFT = 30, TOP = 16;
const DAY_LABELS: [number, string][] = [[0, 'Mon'], [2, 'Wed'], [4, 'Fri']];
// Sequential ramp in one hue: the chart color at increasing opacity on the surface (empty days are neutral).
const LEVELS = [0.3, 0.55, 0.8, 1];

/** Training days of the last `weeks` weeks, GitHub style: one cell per day, darker = more weight lifted.
 *  A day in `volumes` with nothing lifted (cardio) still counts and gets the lightest shade. */
export function Heatmap({ volumes, weeks, now = Date.now() }: { volumes: Map<string, number>; weeks: number; now?: number }) {
  const today = new Date(now);
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7)).getTime();
  const start = monday - (weeks - 1) * 7 * DAY_MS;
  const max = Math.max(1, ...volumes.values());
  const cells = [];
  const months: [number, string][] = [];
  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(start + w * 7 * DAY_MS + 12 * 3600_000); // noon avoids DST edges
    if (weekStart.getDate() <= 7) months.push([w, weekStart.toLocaleDateString('en', { month: 'short' })]);
    for (let d = 0; d < 7; d++) {
      const ts = weekStart.getTime() + d * DAY_MS;
      if (dayKey(ts) > dayKey(now)) continue; // ts is noon: before noon, today would be skipped
      const v = volumes.get(dayKey(ts)), trained = v !== undefined;
      const level = v ? LEVELS[Math.min(LEVELS.length - 1, Math.floor((v / max) * LEVELS.length))] : LEVELS[0];
      cells.push(
        <rect x={LEFT + w * STEP} y={TOP + d * STEP} width={CELL} height={CELL} rx={2}
          fill={trained ? 'var(--chart-1)' : 'var(--md-surface-container-high)'} fill-opacity={trained ? level : 1}>
          <title>{`${fmtDate(ts)}: ${!trained ? 'rest day' : v ? fmtKg(Math.round(v)) : 'workout without weights'}`}</title>
        </rect>,
      );
    }
  }
  return (
    <svg class="chart" viewBox={`0 0 ${LEFT + weeks * STEP} ${TOP + 7 * STEP}`} role="img" aria-label={`Training days in the last ${weeks} weeks`}>
      {months.map(([w, label]) => <text x={LEFT + w * STEP} y={10}>{label}</text>)}
      {DAY_LABELS.map(([d, label]) => <text x={0} y={TOP + d * STEP + 10}>{label}</text>)}
      {cells}
    </svg>
  );
}
