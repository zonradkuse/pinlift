import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { Icon, ListItem, Tile, TopBar, useWide } from '../components/ui.tsx';
import { ImportActions, fileDropHandlers } from '../components/ImportActions.tsx';
import type { LocalState } from '../lib/store.ts';
import type { AppData } from '../lib/types.ts';
import { BarChart, LineChart } from '../components/Chart.tsx';
import { Heatmap } from '../components/Heatmap.tsx';
import { HBars } from '../components/HBars.tsx';
import { useStore } from '../lib/store.ts';
import { bodyWeights, deviceLookup, deviceName, finishedSessions, getDevice, workoutOf } from '../lib/selectors.ts';
import { useDerived } from '../lib/derived.ts';
import { bestSetsByDevice, dailyVolume, DAY_MS, progressSeries, sessionSummary, setsPerMuscleGroup, weekIndex, weeklyStreak } from '../lib/stats.ts';
import { formatDuration } from '../lib/cardio.ts';
import { fmtAgo, fmtAmount, fmtDate, fmtDistance, fmtKg, fmtNum, fmtPr, fmtSet, fmtShortDate } from '../lib/format.ts';
import { href, to } from '../lib/routes.ts';
import { MUSCLE_GROUPS } from '../data/catalog.ts';

const MUSCLE_WEEKS = 4, LIST_ROWS = 6, BODY_WEIGHT_DAYS = 90;
/** After this many days without an import, a computer's copy is probably behind the phone. */
const STALE_IMPORT_DAYS = 3;

/** No data yet (typically on a computer): explain where the data comes from and how to bring it over. */
const NoData = () => (
  <div class="card outlined stack" style={{ maxWidth: '640px', margin: '24px auto' }}>
    <Icon name="monitoring" size={40} />
    <h2 class="headline-s">No workouts here yet</h2>
    <p class="body-m">Workouts are logged on your phone and stay on your devices; there is no server. To see them here, open
      <strong> Settings → Send</strong> on the phone and receive the codes with this computer's camera, or import an export file.</p>
    <ImportActions back={to.stats()} />
    <p class="body-s muted">Tip: you can also drop an export file anywhere on this page.</p>
  </div>
);

/** Desktop: how fresh the data is, with import one click away. */
function DataStatus({ latest, local, now }: { latest: number; local: LocalState; now: number }) {
  const stale = local.lastImportAt !== undefined && now - local.lastImportAt > STALE_IMPORT_DAYS * DAY_MS;
  return (
    <div class={'card row wrap notice ' + (stale ? 'tertiary' : 'outlined')} data-testid="data-status">
      <Icon name="history" />
      <span class="spacer body-m">
        {stale && <strong>Your phone may have newer workouts. </strong>}
        Latest workout {fmtShortDate(latest)}{local.lastImportAt !== undefined ? ` · imported ${fmtAgo(local.lastImportAt, now)}` : ''}
      </span>
      <ImportActions back={to.stats()} />
    </div>
  );
}

const Card = ({ title, span, children, action }: { title: string; span?: boolean; children: ComponentChildren; action?: ComponentChildren }) => (
  <section class={'card outlined dash-card' + (span ? ' span-2' : '')} aria-label={title}>
    <div class="row"><h2 class="title-m spacer">{title}</h2>{action}</div>
    {children}
  </section>
);

const fmtChange = (kg: number) => `${kg > 0 ? '+' : kg < 0 ? '−' : '±'}${fmtNum(Math.abs(kg))} kg`;

/** Latest body weight, the change over the last 90 days and a small trend chart. */
function BodyWeightCard({ data, now, wide }: { data: AppData; now: number; wide: boolean }) {
  const all = bodyWeights(data), latest = all.at(-1);
  const recent = all.filter((w) => w.at >= now - BODY_WEIGHT_DAYS * DAY_MS);
  return (
    <Card title="Body weight" action={<a class="btn text interactive" href={href(to.body())}>Log weight</a>}>
      {!latest ? <p class="body-m muted">Log your weight now and then to see the trend here.</p> : <>
        <div class="row wrap" style={{ alignItems: 'baseline' }}>
          <span class="headline-s num">{fmtKg(latest.kg)}</span>
          {recent.length > 1 && <span class="body-m muted">{fmtChange(latest.kg - recent[0].kg)} since {fmtShortDate(recent[0].at)}</span>}
        </div>
        {recent.length > 1 && <LineChart points={recent.map((w) => ({ x: w.at, y: w.kg }))} unit="kg" label="Body weight trend"
          {...(wide ? { width: 560, height: 160 } : { height: 120 })} />}
      </>}
    </Card>
  );
}

/** Analytics dashboard: the start page on desktop. */
export function Stats() {
  const { data, local } = useStore();
  const { prs } = useDerived(data);
  const wide = useWide();
  const [picked, setPicked] = useState('');
  const lookup = deviceLookup(data);
  const sessions = finishedSessions(data);
  const now = Date.now();
  if (!sessions.length) {
    return (
      <main class="screen wide-screen" {...fileDropHandlers}>
        <TopBar title="Analytics" /><NoData />
        <div style={{ maxWidth: '640px', margin: '0 auto' }}><BodyWeightCard data={data} now={now} wide={false} /></div>
      </main>
    );
  }

  const sums = sessions.map((s) => ({ s, sum: sessionSummary(s, lookup) }));
  const total = sums.reduce((n, x) => n + x.sum.volume, 0);
  const distance = sums.reduce((n, x) => n + x.sum.distanceM, 0);
  const weeks = wide ? 26 : 12;
  const thisWeek = weekIndex(now);
  const bars = Array.from({ length: weeks }, (_, i) => {
    const ago = weeks - 1 - i;
    const value = sums.filter((x) => weekIndex(x.s.startedAt) === thisWeek - ago).reduce((n, x) => n + x.sum.volume, 0);
    return { label: fmtShortDate(now - ago * 7 * DAY_MS), value };
  });
  const muscleSets = setsPerMuscleGroup(sessions, lookup, now - MUSCLE_WEEKS * 7 * DAY_MS);
  const best = bestSetsByDevice(sessions, lookup);
  const byName = [...best.keys()].sort((a, b) => deviceName(data, a).localeCompare(deviceName(data, b)));
  const selected = picked || [...best.entries()].sort((a, b) => b[1].uses - a[1].uses)[0]?.[0]; // default: most-trained
  const selectedDevice = selected ? getDevice(data, selected) : undefined;
  const chartSize = wide ? { width: 560, height: 220 } : {};

  return (
    <main class="screen wide-screen" {...fileDropHandlers}>
      <TopBar title="Analytics" />
      {wide && <DataStatus latest={sessions[sessions.length - 1].startedAt} local={local} now={now} />}
      <div class="kpis">
        <Tile value={sessions.length} label="Workouts" />
        <Tile value={`${fmtNum(total / 1000)} t`} label="Lifted in total" />
        <Tile value={prs.length} label="Personal records" />
        <Tile value={weeklyStreak(sessions, now)} label="Week streak" />
        <Tile value={fmtDistance(distance)} label="Cardio distance" />
      </div>

      <div class="dashboard">
        <Card title="Volume per week (kg)" span>
          {bars.some((b) => b.value) ? <BarChart bars={bars} unit="kg" label={`Volume lifted per week, last ${weeks} weeks`} {...(wide ? { width: 1080, height: 240 } : {})} />
            : <p class="body-m muted">No weights lifted in this period.</p>}
        </Card>
        <Card title="Training days">
          <Heatmap volumes={dailyVolume(sessions, lookup)} weeks={wide ? 26 : 15} now={now} />
        </Card>
        <Card title={`Sets per muscle group (last ${MUSCLE_WEEKS} weeks)`}>
          <HBars unit="sets" rows={MUSCLE_GROUPS.map((g) => ({ label: g.name, value: muscleSets.get(g.id) ?? 0 }))} />
          <p class="body-s muted mt-8">Working sets of strength exercises; cardio isn't counted.</p>
        </Card>
        {selectedDevice && (
          <Card title="Estimated 1-rep max (kg)">
            <label class="field" style={{ margin: '8px 0 12px', maxWidth: '360px' }}><span>Device</span>
              <select value={selected} onChange={(e) => setPicked((e.target as HTMLSelectElement).value)}>
                {byName.map((id) => <option value={id}>{deviceName(data, id)}</option>)}
              </select></label>
            <LineChart points={progressSeries(sessions, selectedDevice).points} unit="kg" label={`Estimated one-rep max for ${selectedDevice.name}`}
              {...chartSize} />
          </Card>
        )}
        <BodyWeightCard data={data} now={now} wide={wide} />
        <Card title="Recent personal records" action={<a class="btn text interactive" href={href(to.awards())}>All</a>}>
          {!prs.length && <p class="body-m muted">No records yet.</p>}
          <ul class="list flush">
            {[...prs].reverse().slice(0, LIST_ROWS).map((p) => (
              <ListItem href={href(to.summary(p.sessionId))} leading={<span class="medal small"><Icon name="emoji_events" size={22} /></span>}
                title={deviceName(data, p.deviceId)} supporting={`${fmtPr(p)} · ${fmtShortDate(p.at)}`} />
            ))}
          </ul>
        </Card>
        <Card title="Recent workouts" action={<a class="btn text interactive" href={href(to.history())}>All</a>}>
          <ul class="list flush">
            {sums.slice(-LIST_ROWS).reverse().map(({ s, sum }) => (
              <ListItem href={href(to.summary(s.id))} title={workoutOf(data, s)?.name || 'Workout'}
                supporting={<span class="num">{fmtDate(s.startedAt)} · {formatDuration(sum.durationSec)} · {fmtAmount(sum)}</span>} />
            ))}
          </ul>
        </Card>
        {byName.length > 0 && (
          <Card title="Best sets" span>
            <table class="body-m num data-table">
              <thead><tr class="label-m muted"><th>Device</th><th>Best set</th><th>Trained</th><th class="right">Est. 1RM</th></tr></thead>
              <tbody>{byName.map((id) => {
                const b = best.get(id)!;
                return <tr><td><a href={href(to.device(id))}>{deviceName(data, id)}</a></td><td>{fmtSet(b.set)}</td><td>{b.uses}×</td>
                  <td class="right">{fmtKg(Math.round(b.e1rm))}</td></tr>;
              })}</tbody>
            </table>
          </Card>
        )}
      </div>
    </main>
  );
}
