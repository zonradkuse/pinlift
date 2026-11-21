import { Icon, ListItem, TopBar, confirmDialog } from '../components/ui.tsx';
import { useStore } from '../lib/store.ts';
import { deviceName } from '../lib/selectors.ts';
import { useDerived } from '../lib/derived.ts';
import { BADGES, type Badge } from '../lib/badges.ts';
import { weeklyStreak } from '../lib/stats.ts';
import { fmtDate, fmtPr } from '../lib/format.ts';
import { href, to } from '../lib/routes.ts';
import type { IconName } from '../data/icons.ts';

const BADGE_ICON: Record<Badge['icon'], IconName> = {
  fire: 'local_fire_department', run: 'directions_run', row: 'rowing', trophy: 'emoji_events', medal: 'workspace_premium',
};
const RECENT_PRS = 15;

export function Awards() {
  const { data } = useStore();
  const { badges, prs } = useDerived(data);
  const earned = new Map(badges.map((b) => [b.id, b]));
  const streak = weeklyStreak(Object.values(data.sessions));
  return (
    <main class="screen wide-screen">
      <TopBar title="Awards" />
      <div class="card tertiary row" style={{ gap: '16px' }}>
        <Icon name="local_fire_department" size={40} />
        <div><div class="headline-s">{streak} {streak === 1 ? 'week' : 'weeks'}</div>
          <div class="body-m">{streak ? 'Training streak — train at least once a week to keep it.' : 'Train this week to start a streak.'}</div></div>
      </div>
      <h2 class="title-m section-title">Badges · {earned.size} of {BADGES.length}</h2>
      <div class="badge-grid">
        {BADGES.map((b) => {
          const e = earned.get(b.id);
          return (
            <button class="badge-cell interactive" onClick={() => confirmDialog({ title: b.name, cancel: '', confirm: 'OK',
              body: <>{b.description}.<br />{e ? `Earned on ${fmtDate(e.at)}.` : 'Not earned yet.'}</> })}>
              <span class={'medal' + (e ? '' : ' locked')}><Icon name={BADGE_ICON[b.icon]} size={28} /></span>
              <span class={'label-m' + (e ? '' : ' muted')}>{b.name}</span>
            </button>
          );
        })}
      </div>
      <h2 class="title-m section-title">Recent personal records</h2>
      {!prs.length && <p class="body-m muted">Beat your previous best on any device to set a record.</p>}
      <ul class="list">
        {[...prs].reverse().slice(0, RECENT_PRS).map((p) => (
          <ListItem href={href(to.summary(p.sessionId))} leading={<span class="medal small"><Icon name="emoji_events" size={22} /></span>}
            title={deviceName(data, p.deviceId)} supporting={`${fmtPr(p)} · ${fmtDate(p.at)}`} />
        ))}
      </ul>
    </main>
  );
}
