import { useState } from 'preact/hooks';
import { Empty, Icon, ListItem, Tile, TopBar, confirmDialog } from '../components/ui.tsx';
import { useStore } from '../lib/store.ts';
import { deviceLookup, deviceName, finishedSessions, getDevice, workoutOf } from '../lib/selectors.ts';
import { deleteSession } from '../lib/actions.ts';
import { toast } from '../lib/ui-state.ts';
import { useDerived } from '../lib/derived.ts';
import { navigate, useRoute } from '../lib/router.ts';
import { href, to } from '../lib/routes.ts';
import { compareWeight, isWork, sessionSummary, type SessionSummary } from '../lib/stats.ts';
import { badgeById } from '../lib/badges.ts';
import { backupReminder } from '../lib/backup.ts';
import { formatDuration } from '../lib/cardio.ts';
import { errorText, fmtCardio, fmtDate, fmtDistance, fmtKg, fmtPr, fmtSets, fmtTime } from '../lib/format.ts';
import { postToStrava } from '../lib/strava-flow.ts';
import { EditExercise, EditTimes } from './SummaryEdit.tsx';
import type { Session } from '../lib/types.ts';

function shareText(s: Session, workoutName: string | undefined, sum: SessionSummary, prCount: number) {
  const fun = compareWeight(sum.volume);
  return [
    `${workoutName ?? 'Workout'} · ${fmtDate(s.startedAt)}`,
    sum.sets ? `Lifted ${fmtKg(sum.volume)} in ${sum.sets} sets${fun ? ` (${fun})` : ''}` : '',
    sum.distanceM ? `Cardio: ${fmtDistance(sum.distanceM)}` : '',
    prCount ? `${prCount} new personal record${prCount > 1 ? 's' : ''}!` : '',
  ].filter(Boolean).join('\n');
}

async function share(text: string) {
  try {
    if (navigator.share) await navigator.share({ title: 'Workout', text });
    else { await navigator.clipboard.writeText(text); toast('Summary copied'); }
  } catch { /* user cancelled */ }
}

export function Summary({ id }: { id: string }) {
  const { data, local } = useStore();
  const { query } = useRoute();
  const { prs, badges } = useDerived(data);
  const [posting, setPosting] = useState(false);
  const [editing, setEditing] = useState(false);
  const s = data.sessions[id];
  if (!s || s.deleted) return <main class="screen no-nav"><TopBar title="Workout" up={to.history()} /><Empty icon="history">Workout not found.</Empty></main>;
  const fresh = query.get('fresh') === '1';
  const sum = sessionSummary(s, deviceLookup(data));
  const myPrs = prs.filter((p) => p.sessionId === id);
  const myBadges = badges.filter((b) => b.sessionId === id);
  const workout = workoutOf(data, s);
  const fun = compareWeight(sum.volume);
  const reminder = backupReminder(finishedSessions(data).length, local.lastBackupAt);

  const strava = async () => {
    setPosting(true);
    try { await postToStrava(id); toast('Posted to Strava'); } catch (e) { toast(errorText(e)); }
    setPosting(false);
  };
  const del = async () => {
    if (await confirmDialog({ title: 'Delete workout?', body: 'This cannot be undone.', confirm: 'Delete', danger: true })) { deleteSession(id); navigate(to.history(), true); }
  };

  return (
    <main class="screen no-nav">
      <TopBar title={editing ? 'Edit workout' : fresh ? 'Workout complete' : fmtDate(s.startedAt)} up={fresh ? to.home() : to.history()}>
        {s.endedAt && <button class="icon-btn interactive" aria-label={editing ? 'Done editing' : 'Edit workout'} aria-pressed={editing}
          onClick={() => setEditing(!editing)}><Icon name={editing ? 'check' : 'edit'} /></button>}
        <button class="icon-btn interactive" aria-label="Delete workout" onClick={del}><Icon name="delete" /></button>
      </TopBar>
      {editing && <EditTimes s={s} />}
      <section class="hero">
        <div class="label-l muted">{workout?.name ?? 'Workout'} · {fmtTime(s.startedAt)}</div>
        <div style={{ fontSize: '3.5rem', lineHeight: '4rem', fontWeight: 500 }} data-testid="total-volume">{fmtKg(sum.volume)}</div>
        <div class="body-m muted">{sum.sets ? `lifted in total${fun ? ` — ${fun}!` : ''}` : 'cardio session'}</div>
      </section>
      <div class="grid-3" style={{ margin: '16px 0' }}>
        <Tile value={formatDuration(sum.durationSec)} label="Duration" />
        <Tile value={sum.sets} label={`Sets · ${sum.reps} reps`} />
        <Tile value={sum.distanceM ? fmtDistance(sum.distanceM) : myPrs.length} label={sum.distanceM ? 'Cardio' : 'PRs'} />
      </div>

      {myBadges.length > 0 && <>
        <h2 class="title-m section-title">New badges</h2>
        <div class="badge-grid">{myBadges.map((b, i) => {
          const def = badgeById.get(b.id)!;
          return <div class="badge-cell"><span class="medal pop" style={{ animationDelay: `${i * 120}ms` }}><Icon name="workspace_premium" size={32} /></span>
            <span class="label-l">{def.name}</span><span class="body-s muted">{def.description}</span></div>;
        })}</div>
      </>}

      {myPrs.length > 0 && <>
        <h2 class="title-m section-title">Personal records</h2>
        <ul class="list">{myPrs.map((p) => (
          <ListItem leading={<span class="medal small"><Icon name="emoji_events" size={22} /></span>} title={deviceName(data, p.deviceId)} supporting={fmtPr(p)} />
        ))}</ul>
      </>}

      <h2 class="title-m section-title">Exercises</h2>
      <ul class="list">{[...new Set(s.entries.map((e) => e.deviceId))].map((devId) => {
        if (editing) return <EditExercise s={s} deviceId={devId} name={deviceName(data, devId)} />;
        const d = getDevice(data, devId);
        const entries = s.entries.filter((e) => e.deviceId === devId);
        const sets = entries.flatMap((e) => e.sets).filter(isWork);
        const vol = d?.assisted ? 0 : sets.reduce((n, x) => n + x.weight * x.reps, 0);
        return (
          <ListItem href={href(to.device(devId))} title={deviceName(data, devId)} trailing={sets.length > 0 && <span class="trailing num">{fmtKg(vol)}</span>}
            supporting={<span class="num">{sets.length ? fmtSets(sets, { compact: true }) : entries.map((e) => e.cardio && fmtCardio(e.cardio, d?.cardio)).join(' · ')}</span>} />
        );
      })}</ul>

      {reminder && !editing && (
        <ul class="list mt-16" style={{ margin: '16px 0 0', border: '1px solid var(--md-outline-variant)', borderRadius: '12px' }}>
          <ListItem href={href(to.send())} leading={<Icon name="qr_code" />} trailing={<Icon name="chevron_right" />}
            title={<span class="body-m">{reminder.daysSince === null ? 'Your workouts exist only on this phone.' : `Last backup ${reminder.daysSince} days ago.`} Send them to your computer.</span>} />
        </ul>
      )}
      <div class="row wrap mt-16">
        <button class="btn tonal interactive" onClick={() => share(shareText(s, workout?.name, sum, myPrs.length))}><Icon name="share" />Share</button>
        {local.strava?.refreshToken && (s.stravaId
          ? <a class="btn outlined interactive" href={`https://www.strava.com/activities/${s.stravaId}`} target="_blank" rel="noopener noreferrer"><Icon name="check" />On Strava</a>
          : <button class="btn tonal interactive" disabled={posting} onClick={strava}><Icon name="upload" />{posting ? 'Posting…' : 'Post to Strava'}</button>)}
        {fresh && <a class="btn interactive" href={href(to.home())}>Done</a>}
      </div>
    </main>
  );
}
