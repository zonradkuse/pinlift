// Application state: one in-memory document, persisted to IndexedDB on every change. Views subscribe via useStore().
import { useEffect, useState } from 'preact/hooks';
import { dbGet, dbSet } from './db.ts';
import { emptyData, type AppData } from './types.ts';
import { DEFAULT_WORKOUTS } from '../data/catalog.ts';
import type { StravaAuth } from './strava.ts';
import { sanitize } from './sync.ts';

/** Device-local state that is never transferred (secrets, preferences). */
export interface LocalState {
  strava?: StravaAuth;
  stravaState?: string;
  density: 'low' | 'medium' | 'high';
  /** Keep the screen on while a workout runs (default on). */
  keepAwake?: boolean;
  /** Beep when the rest is over (default off; vibration is always on). */
  restSound?: boolean;
  installDismissed?: boolean;
  lastBackupAt?: number;
  lastSentAt?: number;
  /** Last time data from another device was imported (QR transfer or file). */
  lastImportAt?: number;
}

let data: AppData = emptyData();
let local: LocalState = { density: 'medium' };
const subs = new Set<() => void>();
let onSaveError: (e: unknown) => void = console.error;

/** Re-render all subscribed views. */
export const notify = () => subs.forEach((f) => f());

/** Fresh data: the built-in workout plans with fixed ids, so seeds merge cleanly between devices. */
export const seedData = () => {
  const d = emptyData();
  for (const w of DEFAULT_WORKOUTS) d.workouts[w.id] = structuredClone(w);
  return d;
};

/** Stored data is validated like imported data: a damaged record must not stop the app from starting. */
function load(raw: unknown): AppData {
  if (!raw) return seedData();
  try { return sanitize(raw).data; } catch (e) { onSaveError(e); return raw as AppData; }
}

type Key = 'data' | 'local';
// Other open tabs of the app: after a save they re-read that key, so no tab writes back stale data.
let channel: BroadcastChannel | undefined;

async function reload(key: Key) {
  if (key === 'data') data = load(await dbGet<unknown>('data'));
  else local = { ...local, ...(await dbGet<LocalState>('local')) };
}

function persist(key: Key, value: unknown): Promise<void> {
  // Written right away (not queued behind earlier writes) so a closed app loses as little as possible;
  // IndexedDB applies read-write transactions on the same store in the order they were created.
  return dbSet(key, value).then(() => channel?.postMessage(key)).catch(onSaveError);
}

export async function initStore() {
  await reload('data');
  await reload('local');
  navigator.storage?.persist?.().catch(() => {});
  channel = new BroadcastChannel('gym-tracker'); // pre-rename name, like the IndexedDB name
  channel.onmessage = (e: MessageEvent<Key>) => reload(e.data).then(notify);
}

export const handleSaveErrors = (fn: (e: unknown) => void) => { onSaveError = fn; };

export function useStore() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);
  return { data, local };
}

/** Apply a change to a copy of the data (immutable snapshots keep memoised views correct) and persist it. */
export function update(fn: (d: AppData) => void) {
  const next = structuredClone(data);
  fn(next);
  data = next;
  persist('data', next);
  notify();
}

export function updateLocal(patch: Partial<LocalState>): Promise<void> {
  local = { ...local, ...patch };
  notify();
  return persist('local', local);
}

export const getData = () => data;
export const getLocal = () => local;
