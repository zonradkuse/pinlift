import { Empty, Icon, ListItem } from '../../components/ui.tsx';
import { LineChart } from '../../components/Chart.tsx';
import { isWork, live, progressSeries, type ProgressMetric } from '../../lib/stats.ts';
import { fmtCardio, fmtDate, fmtSets } from '../../lib/format.ts';
import { href, to } from '../../lib/routes.ts';
import type { AppData, Device } from '../../lib/types.ts';

const METRIC: Record<ProgressMetric, [title: string, unit: string]> = {
  e1rm: ['Estimated 1-rep max (kg)', 'kg'], assist: ['Least assistance (kg)', 'kg'], speed: ['Average speed (km/h)', 'km/h'], floors: ['Floors', 'floors'],
};

export function DeviceHistory({ data, dev }: { data: AppData; dev: Device }) {
  const sessions = Object.values(data.sessions);
  const rows = live(sessions).flatMap((s) => {
    const entries = s.entries.filter((e) => e.deviceId === dev.id && (e.cardio || e.sets.some(isWork)));
    return entries.length ? [{ s, entries }] : [];
  });
  if (!rows.length) return <Empty icon="history">No history for this device yet.</Empty>;
  const { metric, points } = progressSeries(sessions, dev);
  const [title, unit] = METRIC[metric];
  return (
    <div class="stack">
      {points.length > 0 && <><h2 class="title-s">{title}</h2><LineChart points={points} unit={unit} label={`${dev.name} progress`} /></>}
      <ul class="list">
        {[...rows].reverse().map(({ s, entries }) => (
          <ListItem href={href(to.summary(s.id))} title={fmtDate(s.startedAt)} trailing={<Icon name="chevron_right" />}
            supporting={<span class="num">{entries.map((e) => (e.cardio ? fmtCardio(e.cardio, dev.cardio) : fmtSets(e.sets.filter(isWork), { compact: true }))).join(' · ')}</span>} />
        ))}
      </ul>
    </div>
  );
}
