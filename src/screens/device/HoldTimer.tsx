import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon, useWakeLock } from '../../components/ui.tsx';
import { alarm, buzz, primeAlarm } from '../../components/RestBar.tsx';
import { formatDuration } from '../../lib/cardio.ts';
import { fmtHold } from '../../lib/format.ts';

/** Seconds to get into position after tapping Start. */
export const GET_READY_SEC = 3;

/**
 * Countdown for a hold (plank, wall sit): get ready, then hold. At zero the target is logged without a tap, since
 * the phone is out of reach; Stop logs the time held so far. Times come from the clock, so they survive a throttled tab.
 */
export function HoldTimer({ target, onLog, onManual }: { target: number; onLog: (sec: number) => void; onManual: () => void }) {
  const [start, setStart] = useState<number | null>(null); // when the hold itself starts (after getting ready)
  const [, rerender] = useState(0);
  const signaled = useRef('');
  useWakeLock(start !== null); // the countdown and its signals need the page in front
  useEffect(() => {
    if (start === null) return;
    const t = setInterval(() => rerender((n) => n + 1), 200);
    document.body.classList.add('holding'); // hides the rest timer and the scan button, which would cover Stop
    return () => { clearInterval(t); document.body.classList.remove('holding'); };
  }, [start]);
  const elapsed = start === null ? 0 : (Date.now() - start) / 1000;
  const left = Math.ceil(target - elapsed);
  useEffect(() => {
    if (start === null) return;
    if (elapsed >= target) { alarm(); setStart(null); onLog(target); return; }
    // A short buzz when the hold starts and on each of the last three seconds.
    const key = elapsed < 0 ? '' : left <= 3 ? `left${left}` : elapsed < 1 ? 'go' : '';
    if (key && key !== signaled.current) { signaled.current = key; buzz(); }
  });

  if (start === null) {
    return (
      <div class="stack">
        <button class="btn large block interactive" disabled={target < 1}
          onClick={() => { primeAlarm(); signaled.current = ''; setStart(Date.now() + GET_READY_SEC * 1000); }}>
          <Icon name="timer" />Start {fmtHold(target)} hold</button>
        <button class="btn text interactive" style={{ alignSelf: 'center' }} disabled={target < 1} onClick={onManual}>Log without timer</button>
      </div>
    );
  }
  const ready = elapsed < 0;
  const stop = () => { const held = Math.floor(elapsed); setStart(null); if (held > 0) onLog(held); };
  return (
    <div class="card primary stack hold-timer" role="timer">
      <div class="label-l">{ready ? 'Get ready' : 'Hold'}</div>
      <div class="hold-time num">{ready ? Math.ceil(-elapsed) : formatDuration(Math.max(0, left))}</div>
      <progress max={target} value={ready ? 0 : Math.min(target, elapsed)} aria-label="Hold progress" />
      <div class="row">
        <button class="btn text interactive" onClick={() => setStart(null)}>Cancel</button>
        {!ready && <button class="btn interactive spacer" onClick={stop}><Icon name="check" />Stop and log</button>}
      </div>
    </div>
  );
}
