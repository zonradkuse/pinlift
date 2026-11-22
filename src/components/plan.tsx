import { Icon, ListItem, confirmDialog } from './ui.tsx';
import { Pictogram } from './Pictogram.tsx';
import { useStore } from '../lib/store.ts';
import { activeSession, deviceLookup, deviceOptions, workoutOf } from '../lib/selectors.ts';
import { finishSession, startWorkout } from '../lib/actions.ts';
import { isForgotten } from '../lib/ui-state.ts';
import { suggest } from '../lib/progression.ts';
import { isWork, previousSets, sessionSummary } from '../lib/stats.ts';
import { fmtAmount, fmtCardio, fmtSet, fmtSets, setFormat } from '../lib/format.ts';
import { navigate } from '../lib/router.ts';
import { href, to } from '../lib/routes.ts';
import type { AppData, Device, Session, Workout } from '../lib/types.ts';

/** What a plan row says: today's sets, or the target and last time. */
function rowInfo(data: AppData, d: Device, s?: Session): string {
  const entries = s?.entries.filter((e) => e.deviceId === d.id) ?? [];
  if (entries.length) {
    return d.kind === 'cardio' ? entries.map((e) => e.cardio && fmtCardio(e.cardio, d.cardio)).join(' · ')
      : fmtSets(entries.flatMap((e) => e.sets).filter(isWork), { compact: true, ...setFormat(d) });
  }
  const prev = previousSets(Object.values(data.sessions), d.id, s?.id);
  if (!prev.length) return 'Not done yet';
  const last = fmtSets(prev, { compact: true, ...setFormat(d) });
  const target = d.kind === 'strength' ? suggest(prev, deviceOptions(data, d)) : null;
  return target ? `Target ${fmtSet({ weight: target.weight, reps: target.reps, at: 0 }, setFormat(d))}${target.kind === 'same' ? '+' : ''} · last ${last}` : `Last ${last}`;
}

/** A device in a workout plan, with its pictogram and target (or today's sets when `session` is given). */
export function PlanRow({ data, device, session, withQr }: { data: AppData; device: Device; session?: Session; withQr: Set<string> }) {
  const done = !!session?.entries.some((e) => e.deviceId === device.id);
  return (
    <ListItem href={href(to.device(device.id))} title={device.name} supporting={<span class="num">{rowInfo(data, device, session)}</span>}
      leading={<span class={'pictogram-tile' + (done ? ' done' : '')}>{done ? <Icon name="check" /> : <Pictogram device={device} size={40} />}</span>}
      trailing={<>{withQr.has(device.id) && <span class="leading" title="Has a QR code"><Icon name="qr_code" size={18} /></span>}<Icon name="chevron_right" /></>} />
  );
}

/** Starting a plan asks first when a different workout with logged sets is running. */
/** Finishes the running workout after a confirmation (an empty one is offered for discarding), then shows its summary. */
export function useFinishWorkout() {
  const { data } = useStore();
  return async () => {
    const s = activeSession(data);
    if (!s) return;
    if (!s.entries.length) {
      if (await confirmDialog({ title: 'Discard empty workout?', body: 'Nothing has been logged yet.', confirm: 'Discard' })) { finishSession(s.id); navigate(to.home()); }
      return;
    }
    const sum = sessionSummary(s, deviceLookup(data));
    if (await confirmDialog({ title: 'Finish workout?', body: `${sum.sets} sets, ${fmtAmount(sum)}${sum.volume ? ' lifted' : ''}.`, confirm: 'Finish' })) {
      finishSession(s.id);
      navigate(to.summary(s.id, true), true);
    }
  };
}

/** On a device screen once nothing else is due (last exercise of a plan, or any in a free workout), in place of "Next". */
export function FinishButton({ cls = 'btn tonal interactive' }: { cls?: string }) {
  const finish = useFinishWorkout();
  return <button class={cls} onClick={finish}><Icon name="flag" />Finish workout</button>;
}

export function useStartWorkout() {
  const { data } = useStore();
  return async (w?: Workout) => {
    const active = activeSession(data);
    if (active && w && active.workoutId !== w.id && active.entries.length && !isForgotten(active)) {
      const current = workoutOf(data, active);
      const sets = sessionSummary(active, deviceLookup(data)).sets;
      const ok = await confirmDialog({ title: `Switch to ${w.name}?`, confirm: 'Switch',
        body: `${current ? `“${current.name}” is running. ` : ''}Your ${sets} logged sets stay in this workout.` });
      if (!ok) return;
    }
    startWorkout(w?.id);
    navigate(to.session());
  };
}
