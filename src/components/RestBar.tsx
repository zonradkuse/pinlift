import { useEffect } from 'preact/hooks';
import { Icon, useTick } from './ui.tsx';
import { getLocal, notify, useStore } from '../lib/store.ts';
import { activeSession, deviceOptions, DEFAULT_REST, getDevice, lastSetAt } from '../lib/selectors.ts';
import { formatDuration } from '../lib/cardio.ts';

let audio: AudioContext | undefined;
let armedFor = 0, alertedFor = 0;

// Timer adjustments for the current set (memory only; reset when a new set is logged).
let rest = { forSet: 0, extra: 0, skipped: false };
function restState(setAt: number) {
  if (rest.forSet !== setAt) rest = { forSet: setAt, extra: 0, skipped: false };
  return rest;
}
const addRest = (sec: number) => { rest.extra += sec; notify(); };
const skipRest = () => { rest.skipped = true; notify(); };

/**
 * Call from a tap handler: browsers only allow sound after a user gesture.
 * Audio is only touched when sound is enabled, because an audio context can interrupt music playing on the phone.
 */
export function primeAlarm() {
  if (!getLocal().restSound) return;
  try { audio ??= new AudioContext(); void audio.resume(); } catch { /* no audio */ }
}

/** Short vibration, e.g. for the last seconds of a hold. */
export const buzz = () => navigator.vibrate?.(80);

/** Vibration, plus a beep when the timer sound is on in Settings. */
export function alarm() {
  navigator.vibrate?.([200, 100, 200]);
  if (!audio || !getLocal().restSound) return;
  for (const start of [0, 0.25]) {
    const osc = audio.createOscillator(), gain = audio.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, audio.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + start + 0.18);
    osc.connect(gain).connect(audio.destination);
    osc.start(audio.currentTime + start);
    osc.stop(audio.currentTime + start + 0.2);
  }
}

const HIDE_AFTER = 10 * 60;

/** Countdown to the target rest after the last logged set (on any device). */
export function RestBar() {
  const { data } = useStore();
  useTick(500);
  const s = activeSession(data);
  const at = lastSetAt(s);
  const st = restState(at);
  const entry = s?.entries.find((e) => e.sets.some((x) => x.at === at));
  const dev = entry && getDevice(data, entry.deviceId);
  const target = (dev ? deviceOptions(data, dev).rest : DEFAULT_REST) + st.extra;
  const elapsed = (Date.now() - at) / 1000;
  const left = Math.ceil(target - elapsed);
  const visible = !!at && !st.skipped && elapsed < target + HIDE_AFTER;

  const over = left <= 0;
  useEffect(() => {
    document.body.classList.toggle('resting', visible);
    return () => document.body.classList.remove('resting');
  }, [visible]);
  useEffect(() => {
    // Alert only on the transition we watched: not when reopening the app long after the rest ended.
    if (visible && !over) armedFor = at;
    else if (visible && over && armedFor === at && alertedFor !== at) { alertedFor = at; alarm(); }
  }, [visible, over, at]);
  if (!visible) return null;
  return (
    <div class={'restbar' + (over ? ' over' : '')} role="timer" aria-live={over ? 'assertive' : 'off'}>
      <Icon name="timer" />
      <div class="spacer">
        <div class="label-m">{over ? 'Rest is over: next set' : 'Rest'}</div>
        <div class="headline-s num" data-testid="rest-time">{over ? `+${formatDuration(-left)}` : formatDuration(left)}</div>
      </div>
      {!over && <button class="btn text interactive" onClick={() => addRest(30)}>+30 s</button>}
      <button class="btn tonal interactive" onClick={skipRest}>{over ? 'Done' : 'Skip'}</button>
      {!over && <div class="restbar-progress" style={{ width: `${Math.min(100, (elapsed / target) * 100)}%` }} />}
    </div>
  );
}
