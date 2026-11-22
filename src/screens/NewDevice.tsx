import { useState } from 'preact/hooks';
import { SwitchRow, TopBar } from '../components/ui.tsx';
import { linkQr, saveCustomDevice } from '../lib/actions.ts';
import { CARDIO } from '../lib/cardio.ts';
import { parseDecimal } from '../lib/format.ts';
import { uid } from '../lib/id.ts';
import { navigate } from '../lib/router.ts';
import { to } from '../lib/routes.ts';
import { MUSCLES } from '../data/catalog.ts';
import type { CardioType, Device, Muscle } from '../lib/types.ts';

const DEFAULT_STEP = '5';

export function NewDevice({ assign }: { assign?: string }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'strength' | 'cardio'>('strength');
  const [cardio, setCardio] = useState<CardioType>('run');
  const [muscles, setMuscles] = useState<Muscle[]>([]);
  const [step, setStep] = useState(DEFAULT_STEP);
  const [assisted, setAssisted] = useState(false);
  const [bodyweight, setBodyweight] = useState(false);
  const [timed, setTimed] = useState(false);
  const save = () => {
    const dev: Device = {
      id: 'c-' + uid(), name: name.trim(), kind, primary: muscles, secondary: [], description: 'Custom device.', cues: [],
      step: parseDecimal(step) || parseDecimal(DEFAULT_STEP)!,
      ...(kind === 'cardio' ? { cardio } : {}), ...(kind === 'strength' && assisted ? { assisted } : {}), ...(kind === 'strength' && bodyweight ? { bodyweight } : {}), ...(kind === 'strength' && timed ? { timed, reps: [30, 60] as [number, number] } : {}),
    };
    saveCustomDevice(dev);
    if (assign) linkQr(assign, dev.id);
    navigate(to.device(dev.id), true);
  };
  const toggle = (m: Muscle) => setMuscles(muscles.includes(m) ? muscles.filter((x) => x !== m) : [...muscles, m]);
  return (
    <main class="screen no-nav">
      <TopBar title="New device" up={to.devices({ assign })} />
      <div class="stack">
        <label class="field"><span>Name</span><input value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} /></label>
        <div class="segmented" role="group" aria-label="Type">
          <button aria-pressed={kind === 'strength'} onClick={() => setKind('strength')}>Strength</button>
          <button aria-pressed={kind === 'cardio'} onClick={() => setKind('cardio')}>Cardio</button>
        </div>
        {kind === 'cardio' ? (
          <div class="chips wrap">{(Object.keys(CARDIO) as CardioType[]).map((id) => (
            <button class="chip interactive" aria-pressed={cardio === id} onClick={() => setCardio(id)}>{CARDIO[id].label}</button>))}</div>
        ) : (
          <>
            <label class="field"><span>Weight step (kg)</span><input inputMode="decimal" value={step} onInput={(e) => setStep((e.target as HTMLInputElement).value)} /></label>
            <SwitchRow title="Assisted (counterweight)" supporting="Less weight is harder, e.g. assisted dips or pull-ups. Not counted as weight lifted."
              checked={assisted} onChange={(v) => { setAssisted(v); if (v) { setBodyweight(false); setTimed(false); } }} />
            <SwitchRow title="Bodyweight exercise" supporting="The weight you log is added weight (vest, belt); 0 means bodyweight only."
              checked={bodyweight} onChange={(v) => { setBodyweight(v); if (v) setAssisted(false); }} />
            <SwitchRow title="Timed (hold)" supporting="Sets are seconds held, logged with a countdown, e.g. a plank."
              checked={timed} onChange={(v) => { setTimed(v); if (v) setAssisted(false); }} />
            <div class="label-l muted">Trained muscles</div>
            <div class="chips wrap">
              {(Object.keys(MUSCLES) as Muscle[]).map((m) => (
                <button class="chip interactive" aria-pressed={muscles.includes(m)} onClick={() => toggle(m)}>{MUSCLES[m]}</button>
              ))}
            </div>
          </>
        )}
        <button class="btn large block interactive" disabled={!name.trim()} onClick={save}>Save device</button>
      </div>
    </main>
  );
}
