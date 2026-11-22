import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../../components/ui.tsx';
import { setDeviceSettings } from '../../lib/actions.ts';
import type { AppData, Device } from '../../lib/types.ts';

const SAVE_DELAY_MS = 400;

/** Seat height, pads, …: shown on the log tab, edited inline, saved while typing. */
export function SetupNotes({ data, dev }: { data: AppData; dev: Device }) {
  const notes = data.deviceSettings[dev.id]?.notes ?? '';
  const [editing, setEditing] = useState(false);
  const timer = useRef(0);
  const save = (v: string) => setDeviceSettings(dev.id, { notes: v.trim() || undefined });
  useEffect(() => () => clearTimeout(timer.current), []);
  if (editing) {
    return (
      <label class="field">
        <span>Setup (seat height, pads, …)</span>
        <textarea autoFocus defaultValue={notes} placeholder="Seat 4, back pad 2"
          onInput={(e) => { const v = (e.target as HTMLTextAreaElement).value; clearTimeout(timer.current); timer.current = window.setTimeout(() => save(v), SAVE_DELAY_MS); }}
          onBlur={(e) => { clearTimeout(timer.current); save((e.target as HTMLTextAreaElement).value); setEditing(false); }} />
      </label>
    );
  }
  return notes
    ? <button class="card outlined body-m notes interactive" style={{ textAlign: 'left', width: '100%' }} onClick={() => setEditing(true)}
        aria-label={`Setup: ${notes}. Tap to edit`}><strong>Setup: </strong>{notes}</button>
    : <button class="chip interactive" style={{ alignSelf: 'flex-start' }} onClick={() => setEditing(true)}><Icon name="add" />{dev.bodyweight ? 'Add note' : 'Add seat setting'}</button>;
}
