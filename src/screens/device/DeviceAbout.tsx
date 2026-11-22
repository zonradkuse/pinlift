import { Icon, ListItem, SwitchRow, confirmDialog } from '../../components/ui.tsx';
import { MuscleMap } from '../../components/MuscleMap.tsx';
import { Pictogram } from '../../components/Pictogram.tsx';
import { setDeviceSettings, unlinkQr } from '../../lib/actions.ts';
import { deviceName, deviceOptions, devicesForQr, qrCodesFor } from '../../lib/selectors.ts';
import { parseDecimal } from '../../lib/format.ts';
import { href, to } from '../../lib/routes.ts';
import { MUSCLES } from '../../data/catalog.ts';
import { SetupNotes } from './SetupNotes.tsx';
import type { AppData, Device, DeviceSettings } from '../../lib/types.ts';

type NumericSetting = 'step' | 'rest' | 'repMin' | 'repMax';
const NUMERIC: [NumericSetting, string][] = [['step', 'Step (kg)'], ['rest', 'Rest (seconds)'], ['repMin', 'Min reps'], ['repMax', 'Max reps']];
const positive = (v: string) => { const n = parseDecimal(v); return n !== undefined && n > 0 ? n : undefined; };

export function DeviceAbout({ data, dev }: { data: AppData; dev: Device }) {
  const opts = deviceOptions(data, dev);
  const codes = qrCodesFor(data, dev.id);
  const set = (patch: Partial<DeviceSettings>) => setDeviceSettings(dev.id, patch);
  return (
    <div class="stack">
      <div class="about-figures">
        <div class="pictogram-hero"><Pictogram device={dev} size={200} label={`How to use the ${dev.name}`} /></div>
        <MuscleMap primary={dev.primary} secondary={dev.secondary} />
      </div>
      <div class="chips wrap">
        {dev.primary.map((m) => <span class="chip static primary">{MUSCLES[m]}</span>)}
        {dev.secondary.map((m) => <span class="chip static">{MUSCLES[m]}</span>)}
      </div>
      <p class="body-m">{dev.description}</p>
      {dev.cues.length > 0 && <div class="card"><h2 class="title-s">Watch out for</h2><ul class="cues body-m">{dev.cues.map((c) => <li>{c}</li>)}</ul></div>}
      <a class="btn outlined interactive" target="_blank" rel="noopener noreferrer"
        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`gym80 ${dev.name} machine`)}`}><Icon name="videocam" />Find technique videos</a>

      <h2 class="title-m section-title">Your settings</h2>
      <SetupNotes data={data} dev={dev} />
      {dev.kind === 'strength' && (
        <div class="grid-2">
          {NUMERIC.map(([key, label]) => (
            <label class="field"><span>{dev.timed ? label.replace('reps', 'seconds') : label}</span><input inputMode="decimal" defaultValue={String(opts[key])}
              onChange={(e) => set({ [key]: positive((e.target as HTMLInputElement).value) })} /></label>
          ))}
        </div>
      )}

      <h2 class="title-m section-title">QR codes</h2>
      {codes.length === 0 && <p class="body-m muted">No QR code linked. Link one to open this device by scanning.</p>}
      <ul class="list">
        {codes.map((code) => {
          const others = devicesForQr(data, code).filter((id) => id !== dev.id).map((id) => deviceName(data, id));
          return (
            <ListItem leading={<Icon name="qr_code" />} title={<span class="body-m" style={{ wordBreak: 'break-all' }}>{code}</span>}
              supporting={<>{others.length > 0 && `Also opens: ${others.join(', ')} `}<a href={href(to.devices({ addTo: code }))}>Add exercise</a></>}
              trailing={<button class="icon-btn interactive" aria-label="Unlink QR code" onClick={async () => {
                if (await confirmDialog({ title: 'Unlink QR code?', body: `Scanning it will no longer open ${dev.name}.`, confirm: 'Unlink' })) unlinkQr(code, dev.id);
              }}><Icon name="delete" /></button>} />
          );
        })}
      </ul>
      <a class="btn tonal interactive" href={href(to.scan(dev.id))}><Icon name="qr_code_scanner" />Link a QR code</a>
      <SwitchRow title="Hide device" supporting="Hidden devices don't appear in the device list. Restore them in Settings."
        checked={!!data.deviceSettings[dev.id]?.hidden} onChange={(hidden) => set({ hidden })} />
    </div>
  );
}
