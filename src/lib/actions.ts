// All changes to the app data. Destructive actions return their undo.
import { getData, seedData, update, updateLocal } from './store.ts';
import { activeSession } from './selectors.ts';
import { isForgotten, toast } from './ui-state.ts';
import { dayKey, endTime } from './stats.ts';
import { mergeData } from './merge.ts';
import { linkTo, tombstone, withDevice, withoutDevice } from './qr.ts';
import { fmtDate, fmtTime } from './format.ts';
import { entryId, uid } from './id.ts';
import { stamp } from './sync.ts';
import type { AppData, BodyWeight, CustomDevice, Device, DeviceSettings, Entry, Session, StrengthSet, Workout } from './types.ts';

export type Undo = () => void;
/** Times of sets and workouts are kept in whole seconds (enough for timers, and compact to transfer). */
const nowSec = () => Math.round(Date.now() / 1000) * 1000;

/** Ends a session at its real end (see endTime); an empty one is discarded. */
function closeSession(s: Session) {
  if (s.entries.length) s.endedAt = Math.round(endTime(s) / 1000) * 1000; else s.deleted = true;
  s.updatedAt = stamp(s);
}

/** Runs `fn` on the running session, starting one if needed. */
function withActive(d: AppData, fn: (s: Session) => void) {
  let s = activeSession(d);
  if (s && isForgotten(s)) {
    // Logging into a forgotten workout would book today's sets on an old day: close it and start fresh.
    closeSession(s);
    const closed = s;
    if (!closed.deleted) setTimeout(() => toast(`Closed your open workout from ${fmtDate(closed.startedAt)} at ${fmtTime(closed.endedAt!)}`));
    s = undefined;
  }
  if (!s) {
    const id = uid();
    s = d.sessions[id] = { id, startedAt: nowSec(), entries: [], updatedAt: stamp() };
  }
  fn(s);
  s.updatedAt = stamp(s);
}

/** Change a session in place; entries left without sets or cardio are dropped. */
export function updateSession(id: string, fn: (s: Session) => void) {
  update((d) => {
    const s = d.sessions[id];
    if (!s) return;
    fn(s);
    s.entries = s.entries.filter((e) => e.sets.length || e.cardio);
    s.updatedAt = stamp(s);
  });
}

/** Starts a workout, or attaches the workout to the session that is already running. */
export const startWorkout = (workoutId?: string) => update((d) => withActive(d, (s) => { if (workoutId) s.workoutId = workoutId; }));

export function logSet(deviceId: string, weight: number, reps: number, kind?: StrengthSet['kind']) {
  update((d) => withActive(d, (s) => {
    let e = s.entries.findLast((x) => x.deviceId === deviceId && !x.cardio);
    if (!e) s.entries.push(e = { id: entryId(s.entries), deviceId, sets: [] });
    e.sets.push({ weight, reps, at: nowSec(), ...(kind ? { kind } : {}) });
  }));
}

export function logCardio(deviceId: string, durationSec: number, distanceM: number, floors?: number) {
  update((d) => withActive(d, (s) => {
    s.entries.push({ id: entryId(s.entries), deviceId, sets: [], cardio: { durationSec, distanceM, at: nowSec(), ...(floors ? { floors } : {}) } });
  }));
}

export function updateSet(sessionId: string, entryId: string, index: number, patch: Partial<StrengthSet>) {
  updateSession(sessionId, (s) => {
    const set = s.entries.find((e) => e.id === entryId)?.sets[index];
    if (set) { Object.assign(set, patch); if (!set.kind) delete set.kind; }
  });
}

/** Puts back only the removed item, keeping everything done since. */
function reinsert(sessionId: string, entry: Entry, entryPos: number, set?: { index: number; value: StrengthSet }) {
  updateSession(sessionId, (s) => {
    const existing = s.entries.find((e) => e.id === entry.id);
    if (set && existing) existing.sets.splice(set.index, 0, set.value);
    else s.entries.splice(Math.min(entryPos, s.entries.length), 0, set ? { ...structuredClone(entry), sets: [set.value] } : structuredClone(entry));
  });
}

const findEntry = (sessionId: string, entryId: string) => {
  const entries = getData().sessions[sessionId]?.entries ?? [];
  const pos = entries.findIndex((e) => e.id === entryId);
  return pos < 0 ? undefined : { pos, entry: structuredClone(entries[pos]) };
};

export function removeSet(sessionId: string, entryId: string, index: number): Undo {
  const found = findEntry(sessionId, entryId);
  const value = found?.entry.sets[index];
  updateSession(sessionId, (s) => { s.entries.find((e) => e.id === entryId)?.sets.splice(index, 1); });
  return () => { if (found && value) reinsert(sessionId, found.entry, found.pos, { index, value }); };
}

export function removeEntry(sessionId: string, entryId: string): Undo {
  const found = findEntry(sessionId, entryId);
  updateSession(sessionId, (s) => { s.entries = s.entries.filter((e) => e.id !== entryId); });
  return () => { if (found) reinsert(sessionId, found.entry, found.pos); };
}

/** Removes all of a device's entries from a session. */
export const removeDevice = (sessionId: string, deviceId: string) =>
  updateSession(sessionId, (s) => { s.entries = s.entries.filter((e) => e.deviceId !== deviceId); });

/** Ends the session; an empty session is discarded. Returns whether it was kept. */
export function finishSession(id: string): boolean {
  const kept = !!getData().sessions[id]?.entries.length;
  update((d) => { const s = d.sessions[id]; if (s) closeSession(s); });
  return kept;
}

export const deleteSession = (id: string) =>
  update((d) => { const s = d.sessions[id]; if (s) Object.assign(s, { deleted: true, entries: [], updatedAt: stamp(s) }); });

export const setStravaId = (sessionId: string, stravaId: number) => updateSession(sessionId, (s) => { s.stravaId = stravaId; });

/** Links a code to a device (replacing other links unless `add`). */
export function linkQr(code: string, deviceId: string, add = false): Undo {
  const prev = getData().qr[code];
  update((d) => { const cur = d.qr[code]; d.qr[code] = add ? withDevice(cur, deviceId, stamp(cur)) : linkTo(deviceId, stamp(cur), cur); });
  return () => update((d) => { const cur = d.qr[code]; d.qr[code] = prev ? { ...prev, updatedAt: stamp(cur) } : tombstone(stamp(cur), cur); });
}

export const unlinkQr = (code: string, deviceId: string) => update((d) => { const cur = d.qr[code]; d.qr[code] = withoutDevice(cur, deviceId, stamp(cur)); });

/** Saves a workout plan, keeping fields of the stored copy (e.g. from newer app versions). */
export const saveWorkout = (w: Omit<Workout, 'updatedAt'>) => update((d) => { const prev = d.workouts[w.id]; d.workouts[w.id] = { ...prev, ...w, updatedAt: stamp(prev) }; });
export const deleteWorkout = (id: string) => update((d) => {
  const prev = d.workouts[id];
  if (prev) d.workouts[id] = { ...prev, deleted: true, updatedAt: stamp(prev) };
});

export const setDeviceSettings = (id: string, patch: Partial<Omit<DeviceSettings, 'updatedAt'>>) =>
  update((d) => { const prev = d.deviceSettings[id]; d.deviceSettings[id] = { ...prev, ...patch, updatedAt: stamp(prev) }; });

export const saveCustomDevice = (dev: Device) =>
  update((d) => { const prev = d.customDevices[dev.id]; const custom: CustomDevice = { ...prev, ...dev, updatedAt: stamp(prev) }; d.customDevices[dev.id] = custom; });

/** Body weight of a day (default: today). One entry per day: weighing again replaces it. */
export function logBodyWeight(kg: number, day = dayKey(Date.now())) {
  const [y, m, dd] = day.split('-').map(Number);
  update((d) => {
    const prev = d.bodyWeights[day];
    const w: BodyWeight = { ...prev, kg, at: new Date(y, m - 1, dd, 12).getTime(), updatedAt: stamp(prev) };
    delete w.deleted;
    d.bodyWeights[day] = w;
  });
}

export function deleteBodyWeight(day: string): Undo {
  const prev = getData().bodyWeights[day];
  update((d) => { const cur = d.bodyWeights[day]; if (cur) d.bodyWeights[day] = { ...cur, deleted: true, updatedAt: stamp(cur) }; });
  return () => update((d) => { if (prev) d.bodyWeights[day] = { ...prev, updatedAt: stamp(d.bodyWeights[day]) }; });
}

/** Merges data from another device and tells the user what happened. */
export function importAndReport(remote: AppData, dropped = 0): number {
  let changed = 0;
  update((d) => { const r = mergeData(d, remote); changed = r.changed; Object.assign(d, r.data); });
  updateLocal({ lastImportAt: Date.now() });
  const skipped = dropped ? ` (${dropped} damaged ${dropped === 1 ? 'record' : 'records'} skipped)` : '';
  toast((changed ? `Imported ${changed} changes` : 'Everything was already up to date') + skipped);
  return changed;
}

export const resetData = () => update((d) => Object.assign(d, seedData()));
