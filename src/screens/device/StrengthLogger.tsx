import { useState } from 'preact/hooks';
import { Icon, ListItem, Stepper, useTick } from '../../components/ui.tsx';
import { primeAlarm } from '../../components/RestBar.tsx';
import { logSet, removeSet, updateSet } from '../../lib/actions.ts';
import { deviceName, deviceOptions, recentDevices, remainingPlan } from '../../lib/selectors.ts';
import { toast } from '../../lib/ui-state.ts';
import { useDerived } from '../../lib/derived.ts';
import { dropSetWeight, progressVsLast, suggest } from '../../lib/progression.ts';
import { isWork, previousSession } from '../../lib/stats.ts';
import { fmtLoad, fmtProgress, fmtSet, fmtSets, fmtShortDate } from '../../lib/format.ts';
import { href, to } from '../../lib/routes.ts';
import { SetupNotes } from './SetupNotes.tsx';
import type { AppData, Device, Session, StrengthSet } from '../../lib/types.ts';

type SetKind = StrengthSet['kind'];
type Row = StrengthSet & { entryId: string; index: number };
const same = (a: Row, b: Row) => a.entryId === b.entryId && a.index === b.index;
const FIRST_TIME_WEIGHT = 20;

function Suggestion({ data, dev, active, onUse }: { data: AppData; dev: Device; active?: Session; onUse: (w: number, r: number) => void }) {
  const opts = deviceOptions(data, dev);
  const prev = previousSession(Object.values(data.sessions), dev.id, active?.id);
  const sugg = suggest(prev?.sets ?? [], opts);
  if (!sugg) {
    return (
      <div class="card tertiary body-m">
        {opts.bodyweight ? `First time on this exercise. Aim for about ${Math.round((opts.repMin + opts.repMax) / 2)} clean reps; once ${opts.repMax} feel easy, `
          + 'the app suggests adding weight (vest, belt).'
          : <>First time on this device. Pick {opts.assisted ? 'an assistance' : 'a weight'} you can manage for about {Math.round((opts.repMin + opts.repMax) / 2)} controlled reps
          — the app will suggest the next one from here.</>}
      </div>
    );
  }
  return (
    <div class="card primary">
      <div class="row" style={{ alignItems: 'flex-start' }}>
        <Icon name={sugg.kind === 'increase' ? 'trending_up' : sugg.kind === 'decrease' ? 'arrow_downward' : 'fitness_center'} />
        <div class="spacer">
          <div class="label-m">Suggestion</div>
          <div class="title-l" data-testid="suggestion">{fmtLoad(sugg.weight, opts.bodyweight)}{opts.assisted ? ' assist' : ''} × {sugg.reps}{sugg.kind === 'same' ? '+' : ''}</div>
          <div class="body-m">{sugg.reason}</div>
        </div>
        <button class="btn tonal interactive" onClick={() => onUse(sugg.weight, sugg.reps)}>Use</button>
      </div>
      {prev && <div class="body-s mt-8" data-testid="last-time">Last time ({fmtShortDate(prev.session.startedAt)}): {fmtSets(prev.sets, { bw: opts.bodyweight })}</div>}
    </div>
  );
}

export function StrengthLogger({ data, dev, active }: { data: AppData; dev: Device; active?: Session }) {
  useTick(1000); // superset chips expire, rest timer
  const opts = deviceOptions(data, dev);
  const prev = previousSession(Object.values(data.sessions), dev.id, active?.id);
  const rows: Row[] = (active?.entries ?? []).filter((e) => e.deviceId === dev.id && !e.cardio)
    .flatMap((e) => e.sets.map((s, index) => ({ ...s, entryId: e.id, index })));
  const workRows = rows.filter(isWork);
  const last = workRows.at(-1);
  const initial = last ?? (prev && suggest(prev.sets, opts)) ?? undefined;
  const [weight, setWeight] = useState(initial?.weight ?? prev?.sets.at(-1)?.weight ?? (opts.bodyweight ? 0 : FIRST_TIME_WEIGHT));
  const [reps, setReps] = useState(initial?.reps ?? opts.repMin);
  const [kind, setKind] = useState<SetKind>(undefined);
  const [editing, setEditing] = useState<Row | null>(null);
  const { prs } = useDerived(data);
  const pr = active && prs.find((p) => p.sessionId === active.id && p.deviceId === dev.id);
  const progress = progressVsLast(rows, prev?.sets ?? [], opts.assisted);
  const next = remainingPlan(data, active, dev.id)[0];
  const recent = recentDevices(active, dev.id);
  const label = (r: Row) => (r.kind === 'warmup' ? 'W' : String(workRows.findIndex((w) => same(w, r)) + 1));

  const startEdit = (r: Row) => { setEditing(r); setWeight(r.weight); setReps(r.reps); setKind(r.kind); };
  const stopEdit = () => { setEditing(null); setKind(undefined); if (last) { setWeight(last.weight); setReps(last.reps); } };
  const chooseKind = (k: SetKind) => {
    const next = kind === k ? undefined : k;
    if (!editing && next === 'drop') setWeight(dropSetWeight(weight, opts.step, opts.assisted));
    setKind(next);
  };
  const log = () => { primeAlarm(); logSet(dev.id, weight, reps, kind); setKind(undefined); };
  const remove = (r: Row) => {
    const undo = removeSet(active!.id, r.entryId, r.index);
    setEditing(null);
    toast('Set deleted', { label: 'Undo', run: undo });
  };

  return (
    <div class="stack">
      <SetupNotes data={data} dev={dev} />
      {!editing && <Suggestion data={data} dev={dev} active={active} onUse={(w, r) => { setWeight(w); setReps(r); }} />}
      {editing && <div class="title-m">Edit set {label(editing)}</div>}
      <Stepper label={opts.assisted ? 'Assistance' : opts.bodyweight ? 'Added weight' : 'Weight'} unit="kg" value={weight} step={opts.step} onChange={setWeight} />
      <Stepper label="Reps" value={reps} step={1} decimals={false} onChange={(v) => setReps(Math.round(v))} />
      <div class="row" role="group" aria-label="Set type">
        <button class="chip interactive" aria-pressed={kind === 'warmup'} onClick={() => chooseKind('warmup')}>{kind === 'warmup' && <Icon name="check" />}Warm-up</button>
        <button class="chip interactive" aria-pressed={kind === 'drop'} onClick={() => chooseKind('drop')}>{kind === 'drop' && <Icon name="check" />}Drop set</button>
      </div>
      {editing ? (
        <div class="row wrap">
          <button class="btn large interactive spacer" disabled={reps < 1}
            onClick={() => { updateSet(active!.id, editing.entryId, editing.index, { weight, reps, kind }); stopEdit(); }}>
            <Icon name="check" />Update set {label(editing)}</button>
          <button class="btn outlined danger interactive" onClick={() => remove(editing)}><Icon name="delete" />Delete</button>
          <button class="btn text interactive" onClick={stopEdit}>Cancel</button>
        </div>
      ) : (
        <button class="btn large block interactive" disabled={reps < 1} onClick={log}>
          <Icon name="add" />{kind === 'warmup' ? 'Log warm-up set' : kind === 'drop' ? 'Log drop set' : `Log set ${workRows.length + 1}`}
        </button>
      )}

      {rows.length > 0 && (
        <div>
          <div class="row wrap" style={{ margin: '8px 0' }}>
            <h2 class="title-m spacer">Today</h2>
            {pr && <span class="chip static gold"><Icon name="emoji_events" size={16} />New PR!</span>}
            {!pr && progress && <span class="chip static primary" data-testid="progress"><Icon name="trending_up" size={16} />{fmtProgress(progress)}</span>}
          </div>
          <ul class="list">
            {rows.map((r) => (
              <ListItem onClick={() => startEdit(r)} selected={!!editing && same(editing, r)} label={`Set ${label(r)}: ${fmtSet(r, { bw: opts.bodyweight })}. Tap to edit`}
                leading={<span class={'avatar' + (r.kind === 'warmup' ? ' muted' : '')}>{label(r)}</span>}
                title={<span class={'num' + (r.kind === 'warmup' ? ' muted-text' : '')}>{fmtSet(r, { kind: true, bw: opts.bodyweight })}</span>}
                trailing={<Icon name="edit" size={20} />} />
            ))}
          </ul>
        </div>
      )}

      {rows.length > 0 && (next || recent.length > 0) && (
        <div class="row wrap">
          {recent.map((id) => <a class="chip interactive" href={href(to.device(id))}>↔ {deviceName(data, id)}</a>)}
          {next && <a class="btn tonal interactive" style={{ marginLeft: 'auto' }} href={href(to.device(next.id))}>Next: {next.name}<Icon name="chevron_right" /></a>}
        </div>
      )}
    </div>
  );
}
