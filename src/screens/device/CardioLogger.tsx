import { useState } from 'preact/hooks';
import { Icon, ListItem, Tile } from '../../components/ui.tsx';
import { logCardio, removeEntry } from '../../lib/actions.ts';
import { toast } from '../../lib/ui-state.ts';
import { bestCardio, cardioLogs } from '../../lib/stats.ts';
import { CARDIO, cardioProblem, formatDuration, pace, speedKmh } from '../../lib/cardio.ts';
import { fmtCardio, fmtNum, parseDecimal } from '../../lib/format.ts';
import { SetupNotes } from './SetupNotes.tsx';
import type { AppData, Device, Session } from '../../lib/types.ts';

const field = (set: (v: string) => void) => (e: Event) => set((e.target as HTMLInputElement).value);

export function CardioLogger({ data, dev, active }: { data: AppData; dev: Device; active?: Session }) {
  const [min, setMin] = useState('');
  const [secs, setSecs] = useState('');
  const [dist, setDist] = useState('');
  const [floors, setFloors] = useState('');
  const type = dev.cardio ?? 'run';
  const info = CARDIO[type];
  const logs = cardioLogs(Object.values(data.sessions), dev.id);
  const lastLog = logs.filter((l) => l.session.id !== active?.id).at(-1)?.log;
  const best = bestCardio(logs)?.log;
  const today = logs.filter((l) => l.session.id === active?.id);
  const sec = Math.round((parseDecimal(min) ?? 0) * 60 + (parseDecimal(secs) ?? 0));
  const meters = info.distance ? (parseDecimal(dist) ?? 0) * (info.distance === 'km' ? 1000 : 1) : 0;
  const problem = cardioProblem(type, meters, sec);
  const lastDistance = lastLog?.distanceM ? String(info.distance === 'km' ? lastLog.distanceM / 1000 : lastLog.distanceM) : info.distance === 'km' ? '5.0' : '2000';

  const remove = (entryId: string) => toast('Entry deleted', { label: 'Undo', run: removeEntry(active!.id, entryId) });

  return (
    <div class="stack">
      <SetupNotes data={data} dev={dev} />
      <div class="grid-2">
        <Tile label="Last time" value={<span class="body-m num">{lastLog ? fmtCardio(lastLog, type) : '—'}</span>} />
        <Tile label="Best (≥ 1 km)" value={<span class="body-m num">{best ? fmtCardio(best, type) : '—'}</span>} />
      </div>
      <div class="grid-2">
        <label class="field"><span>Minutes</span>
          <input inputMode="numeric" placeholder={lastLog ? String(Math.floor(lastLog.durationSec / 60)) : '25'} value={min} onInput={field(setMin)} /></label>
        <label class="field"><span>Seconds</span>
          <input inputMode="numeric" placeholder={lastLog ? String(lastLog.durationSec % 60).padStart(2, '0') : '00'} value={secs} onInput={field(setSecs)} /></label>
      </div>
      {info.distance ? (
        <label class="field"><span>Distance ({info.distance}{info.needsDistance ? '' : ', optional'})</span>
          <input inputMode="decimal" placeholder={lastDistance} value={dist} onInput={field(setDist)} /></label>
      ) : (
        <label class="field"><span>Floors (optional)</span>
          <input inputMode="numeric" placeholder={String(lastLog?.floors ?? '')} value={floors} onInput={field(setFloors)} /></label>
      )}
      {(min || secs || dist) && problem && <p class="body-m error-text" role="alert">{problem}</p>}
      {!problem && meters > 0 && (
        <div class="grid-2">
          <Tile value={fmtNum(speedKmh(meters, sec))} label="km/h" />
          <Tile value={formatDuration(pace(type, meters, sec))} label={info.pace === '500m' ? 'per 500 m' : 'per km'} />
        </div>
      )}
      <button class="btn large block interactive" disabled={!!problem} onClick={() => {
        logCardio(dev.id, sec, meters, Math.round(parseDecimal(floors) ?? 0) || undefined); setMin(''); setSecs(''); setDist(''); setFloors('');
      }}><Icon name="add" />{info.logLabel}</button>
      {today.length > 0 && (
        <ul class="list">
          {today.map(({ entry, log }) => (
            <ListItem title={<span class="num">{fmtCardio(log, type)}</span>}
              trailing={<button class="icon-btn interactive" aria-label="Delete" onClick={() => remove(entry.id)}><Icon name="delete" /></button>} />
          ))}
        </ul>
      )}
    </div>
  );
}
