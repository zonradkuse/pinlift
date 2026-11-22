import { Icon, confirmDialog } from '../components/ui.tsx';
import { removeDevice, removeSet, updateSession, updateSet } from '../lib/actions.ts';
import { toast } from '../lib/ui-state.ts';
import { SET_KIND_LABEL, fmtCardio, fmtSet, parseDecimal, type SetFormat } from '../lib/format.ts';
import type { Session, StrengthSet } from '../lib/types.ts';

const toLocalInput = (ts: number) => new Date(ts - new Date(ts).getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

/** Start and end time of a finished workout. */
export function EditTimes({ s }: { s: Session }) {
  const set = (field: 'startedAt' | 'endedAt') => (e: Event) => {
    const v = new Date((e.target as HTMLInputElement).value).getTime();
    if (!Number.isFinite(v)) return;
    if (field === 'startedAt' ? v >= (s.endedAt ?? Infinity) : v <= s.startedAt) return toast('The end has to be after the start');
    updateSession(s.id, (x) => { x[field] = v; });
  };
  return (
    <div class="grid-2 mt-8">
      <label class="field"><span>Started</span><input type="datetime-local" value={toLocalInput(s.startedAt)} onChange={set('startedAt')} /></label>
      <label class="field"><span>Ended</span><input type="datetime-local" value={toLocalInput(s.endedAt ?? Date.now())} onChange={set('endedAt')} /></label>
    </div>
  );
}

type Edit = { value: StrengthSet } | 'delete' | null;

async function editSetDialog(set: StrengthSet, fmt: SetFormat): Promise<Edit> {
  const v = { ...set };
  let del = false;
  const ok = await confirmDialog({ title: 'Edit set', confirm: 'Save', body: (
    <div class="stack mt-8" style={{ color: 'var(--md-on-surface)' }}>
      <label class="field"><span>{fmt.bw ? 'Added weight (kg)' : 'Weight (kg)'}</span><input inputMode="decimal" defaultValue={String(set.weight)}
        onInput={(e) => { v.weight = parseDecimal((e.target as HTMLInputElement).value) ?? 0; }} /></label>
      <label class="field"><span>{fmt.timed ? 'Seconds' : 'Reps'}</span><input inputMode="numeric" defaultValue={String(set.reps)}
        onInput={(e) => { v.reps = Math.round(parseDecimal((e.target as HTMLInputElement).value) ?? 0); }} /></label>
      <label class="field"><span>Type</span>
        <select defaultValue={set.kind ?? ''} onChange={(e) => { v.kind = ((e.target as HTMLSelectElement).value || undefined) as StrengthSet['kind']; }}>
          <option value="">Working set</option>
          {(Object.keys(SET_KIND_LABEL) as (keyof typeof SET_KIND_LABEL)[]).map((k) => <option value={k}>{SET_KIND_LABEL[k]}</option>)}
        </select></label>
      <label class="row body-m error-text"><input type="checkbox" onChange={(e) => { del = (e.target as HTMLInputElement).checked; }} />Delete this set</label>
    </div>
  ) });
  return !ok ? null : del ? 'delete' : { value: v };
}

/** One exercise of a finished workout: tap a set to edit it, or remove the exercise. */
export function EditExercise({ s, deviceId, name, fmt }: { s: Session; deviceId: string; name: string; fmt: SetFormat }) {
  const entries = s.entries.filter((e) => e.deviceId === deviceId);
  return (
    <li class="card outlined" style={{ margin: '0 0 8px', listStyle: 'none' }}>
      <div class="row"><span class="title-m spacer">{name}</span>
        <button class="btn text danger interactive" onClick={async () => {
          if (await confirmDialog({ title: `Remove ${name}?`, body: 'All its sets in this workout are deleted.', confirm: 'Remove', danger: true })) removeDevice(s.id, deviceId);
        }}>Remove</button></div>
      <div class="row wrap">
        {entries.flatMap((e) => e.sets.map((set, i) => (
          <button class="chip interactive num" onClick={async () => {
            const r = await editSetDialog(set, fmt);
            if (r === 'delete') removeSet(s.id, e.id, i);
            else if (r) updateSet(s.id, e.id, i, r.value);
          }}>{fmtSet(set, { compact: true, ...fmt })}{set.kind ? ` ${SET_KIND_LABEL[set.kind]}` : ''}<Icon name="edit" /></button>
        )))}
        {entries.filter((e) => e.cardio).map((e) => <span class="chip static">{fmtCardio(e.cardio!)}</span>)}
      </div>
    </li>
  );
}
