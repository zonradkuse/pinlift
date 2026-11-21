import { Empty, Icon, ListItem, TopBar } from '../components/ui.tsx';
import { useStore } from '../lib/store.ts';
import { deviceLookup, finishedSessions, workoutOf } from '../lib/selectors.ts';
import { useDerived } from '../lib/derived.ts';
import { sessionSummary } from '../lib/stats.ts';
import { formatDuration } from '../lib/cardio.ts';
import { fmtDate, fmtDistance, fmtKg } from '../lib/format.ts';
import { href, to } from '../lib/routes.ts';
import type { Session } from '../lib/types.ts';

const monthOf = (s: Session) => new Date(s.startedAt).toLocaleDateString('en', { month: 'long', year: 'numeric' });

export function History() {
  const { data } = useStore();
  const { prs } = useDerived(data);
  const lookup = deviceLookup(data);
  const sessions = finishedSessions(data).reverse();
  const months = new Map<string, Session[]>();
  for (const s of sessions) months.set(monthOf(s), [...(months.get(monthOf(s)) ?? []), s]);
  return (
    <main class="screen wide-screen">
      <TopBar title="History" />
      {!sessions.length && <Empty icon="history">Finished workouts show up here.</Empty>}
      {[...months].map(([month, list]) => (
        <section>
          <div class="list-subheader" style={{ paddingLeft: 0 }}>{month}</div>
          <ul class="list">
            {list.map((s) => {
              const sum = sessionSummary(s, lookup);
              const n = prs.filter((p) => p.sessionId === s.id).length;
              const amount = sum.sets ? fmtKg(sum.volume) : sum.distanceM ? fmtDistance(sum.distanceM) : `${formatDuration(sum.cardioSec)} cardio`;
              return (
                <ListItem href={href(to.summary(s.id))} title={workoutOf(data, s)?.name || 'Workout'}
                  supporting={<span class="num">{fmtDate(s.startedAt)} · {formatDuration(sum.durationSec)} · {amount}</span>}
                  trailing={n > 0 && <span class="chip static gold"><Icon name="emoji_events" size={16} />{n}</span>} />
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
