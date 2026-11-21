import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { Icon } from './ui.tsx';
import { PictogramSvg } from './Pictogram.tsx';
import { PICTOGRAMS } from '../data/pictograms.ts';
import { installPrompt, isIos, isStandalone } from '../lib/pwa.ts';
import type { IconName } from '../data/icons.ts';

// First-run introduction. Shown once per device (a per-device convenience, so localStorage is enough).
const KEY = 'pinlift.introDone';
export const introSeen = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const markSeen = () => { try { localStorage.setItem(KEY, '1'); } catch { /* private mode: shown again next time */ } };

interface Step { title: string; art: ComponentChildren; body: ComponentChildren }
const art = (icon: IconName) => <span class="intro-art"><Icon name={icon} size={56} /></span>;

function steps(): Step[] {
  const list: Step[] = [
    { title: 'Scan the machine, see what to lift', art: <span class="intro-art pictogram-hero"><PictogramSvg spec={PICTOGRAMS['chest-press']} size={120} /></span>,
      body: <>Scan the QR code on a machine, or pick it from the list, to see your last sets and a suggested weight. The first scan of a code links it to its machine.</> },
    { title: 'No server. Your data stays here.', art: art('cloud_off'),
      body: <>Pinlift has <strong>no account and no server</strong>: every workout is <strong>stored only on this device</strong>. Move it to your computer by scanning QR codes, and export a backup now and then. If you clear the app's data, it is gone.</> },
    { title: 'Plans, records and badges', art: art('emoji_events'),
      body: <>Build workout plans, follow the rest timer, set personal records and earn badges. On a computer, Analytics shows your progress over weeks and months.</> },
  ];
  const prompt = installPrompt();
  if (!isStandalone() && (prompt || isIos())) {
    list.push({ title: 'Install Pinlift', art: art('smartphone'),
      body: prompt
        ? <>Install it to open Pinlift full screen and offline, like any other app.<div class="mt-16"><button class="btn tonal interactive" onClick={() => prompt.prompt()}><Icon name="download" />Install</button></div></>
        : <>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. On iPhone this also matters for your data: Safari deletes the data of websites that aren't installed after 7 days without a visit.</> });
  }
  return list;
}

export function Intro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const all = steps(), step = all[i], last = i === all.length - 1;
  const done = () => { markSeen(); onDone(); };
  return (
    <div class="intro" role="dialog" aria-modal="true" aria-label="Welcome to Pinlift">
      <div class="intro-body">
        <div class="label-l muted">Welcome to Pinlift</div>
        {step.art}
        <h1 class="headline-s">{step.title}</h1>
        <p class="body-m">{step.body}</p>
      </div>
      <div class="intro-nav">
        <div class="intro-dots" aria-label={`Step ${i + 1} of ${all.length}`}>{all.map((_, n) => <span class={n === i ? 'on' : ''} />)}</div>
        <div class="row">
          {!last && <button class="btn text interactive" onClick={done}>Skip</button>}
          <span class="spacer" />
          {last ? <button class="btn interactive" onClick={done}>Get started</button>
            : <button class="btn interactive" onClick={() => setI(i + 1)}>Next</button>}
        </div>
      </div>
    </div>
  );
}
