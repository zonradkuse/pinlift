import { useEffect, useRef, useState } from 'preact/hooks';
import { QrCode } from '../components/QrCode.tsx';
import { TopBar, useWakeLock } from '../components/ui.tsx';
import { getData, updateLocal, useStore, type LocalState } from '../lib/store.ts';
import { changedSince, pack, toFrames } from '../lib/transfer.ts';
import { isEmptyData } from '../lib/types.ts';
import { to } from '../lib/routes.ts';
import { fmtShortDate } from '../lib/format.ts';

const CHUNK: Record<LocalState['density'], number> = { low: 150, medium: 350, high: 700 };
const INTERVAL = 350;

export function Send() {
  const { local } = useStore();
  const [frames, setFrames] = useState<string[]>([]);
  const [i, setI] = useState(0);
  // Fixed for this screen visit, so marking the send as done doesn't change what is being sent.
  const [since] = useState(local.lastSentAt);
  // Default to everything: one timestamp can't know which receiver got what.
  const [onlyChanges, setOnlyChanges] = useState(false);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    const d = getData();
    const payload = onlyChanges && since ? changedSince(d, since) : d;
    setEmpty(isEmptyData(payload));
    pack(payload).then((b) => { setFrames(toFrames(b, CHUNK[local.density])); setI(0); });
  }, [local.density, onlyChanges]);
  // After one full round every code has been shown once: count that as sent (and as a backup).
  const marked = useRef(false);
  const markSent = () => { if (!marked.current) { marked.current = true; updateLocal({ lastSentAt: Date.now(), lastBackupAt: Date.now() }); } };
  useEffect(() => {
    if (!frames.length) return;
    if (frames.length === 1) { const t = setTimeout(markSent, 2000); return () => clearTimeout(t); }
    let ticks = 0;
    const t = setInterval(() => { setI((n) => (n + 1) % frames.length); if (++ticks === frames.length) markSent(); }, INTERVAL);
    return () => clearInterval(t);
  }, [frames]);
  useWakeLock(true); // the codes must stay visible while the other device scans

  return (
    <main class="screen no-nav">
      <TopBar title="Send data" up={to.settings()} />
      <div class="stack">
        <p class="body-m muted">On the other device open <strong>Settings → Receive</strong> (or just Scan) and point the camera at this screen.
          {frames.length > 1 && ' The codes cycle automatically; missed codes are picked up on the next round.'}</p>
        {since && (
          <div class="segmented" role="group" aria-label="What to send">
            <button aria-pressed={onlyChanges} onClick={() => setOnlyChanges(true)}>Changes since last send ({fmtShortDate(since)})</button>
            <button aria-pressed={!onlyChanges} onClick={() => setOnlyChanges(false)}>Everything</button>
          </div>
        )}
        {onlyChanges && <p class="body-s muted">Only for the device you sent to last time. For any other device, send everything.</p>}
        {empty ? <p class="body-m">Nothing changed since the last send.</p>
          : frames.length > 0 && <QrCode text={frames[i]} label={`Transfer code ${i + 1} of ${frames.length}`} />}
        <div class="row"><span class="title-m num spacer" data-testid="frame-counter">Code {Math.min(i + 1, frames.length)} / {frames.length}</span>
          <span class="body-s muted">~{Math.ceil((frames.length * INTERVAL) / 1000)} s per round</span></div>
        <div class="label-l muted">QR density</div>
        <div class="segmented" role="group" aria-label="QR density">
          {(['low', 'medium', 'high'] as const).map((d) => (
            <button aria-pressed={local.density === d} onClick={() => updateLocal({ density: d })}>{d[0].toUpperCase() + d.slice(1)}</button>))}
        </div>
        <p class="body-s muted">Use Low if the receiving camera struggles (older laptops), High for fewer codes.</p>
      </div>
    </main>
  );
}
