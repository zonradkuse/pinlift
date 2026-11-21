// Rules that keep data consistent between devices and app versions.
import { SYNCED_KEYS, type AppData, type Synced, type SyncedKey } from './types.ts';
import { DAY_MS } from './stats.ts';

/** Data format version. Additive changes (new optional fields) keep it; writes always spread existing records. */
export const SCHEMA = 1;

export class NewerVersionError extends Error {
  constructor() { super('This data comes from a newer app version. Update this app first (Settings → Check for updates).'); }
}

/** updatedAt for a write: now, but always after the record it replaces (whose clock may run ahead). */
export const stamp = (prev?: Pick<Synced, 'updatedAt'>, now = Date.now()) => Math.max(now, (prev?.updatedAt ?? 0) + 1);

type Rec = Record<string, unknown>;
const isObj = (x: unknown): x is Rec => typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isBool = (x: unknown) => typeof x === 'boolean';
const opt = (x: unknown, check: (v: unknown) => boolean) => x === undefined || check(x);
const strings = (x: unknown) => Array.isArray(x) && x.every(isStr);
const list = (x: unknown, check: (v: Rec) => boolean) => Array.isArray(x) && x.every((v) => isObj(v) && check(v));

const validSet = (x: Rec) => isNum(x.weight) && isNum(x.reps) && isNum(x.at) && opt(x.kind, (k) => k === 'warmup' || k === 'drop');
const validCardio = (x: unknown) => isObj(x) && isNum(x.durationSec) && isNum(x.distanceM) && isNum(x.at) && opt(x.floors, isNum);
const validEntry = (x: Rec) => isStr(x.id) && isStr(x.deviceId) && list(x.sets, validSet) && opt(x.cardio, validCardio);

/** Shape checks per collection; unknown extra fields are allowed (and kept) for newer app versions. */
const VALID: Record<SyncedKey, (r: Rec) => boolean> = {
  sessions: (r) => isStr(r.id) && isNum(r.startedAt) && opt(r.endedAt, isNum) && opt(r.workoutId, isStr) && opt(r.stravaId, isNum) && list(r.entries, validEntry),
  workouts: (r) => isStr(r.id) && isStr(r.name) && strings(r.deviceIds),
  customDevices: (r) => isStr(r.id) && isStr(r.name) && (r.kind === 'strength' || r.kind === 'cardio') && strings(r.primary) && strings(r.secondary)
    && isNum(r.step) && isStr(r.description) && strings(r.cues),
  deviceSettings: (r) => ['step', 'repMin', 'repMax', 'rest'].every((k) => opt(r[k], isNum)) && opt(r.notes, isStr) && opt(r.hidden, isBool),
  qr: (r) => strings(r.deviceIds) || isStr(r.deviceId),
};

/**
 * Validates data from storage, a QR transfer or a file: malformed records are dropped (one bad record must not
 * break the app), timestamps more than a day in the future are clamped (they could never be overwritten).
 */
export function sanitize(raw: unknown, now = Date.now()): { data: AppData; dropped: number } {
  if (!isObj(raw) || !isNum(raw.schema) || !SYNCED_KEYS.every((k) => isObj(raw[k]))) throw new Error('This is not Pinlift data');
  if (raw.schema > SCHEMA) throw new NewerVersionError();
  let dropped = 0;
  const data = { schema: SCHEMA } as AppData;
  for (const k of SYNCED_KEYS) {
    const out: Record<string, unknown> = {};
    for (const [id, r] of Object.entries(raw[k] as Rec)) {
      if (isObj(r) && isNum(r.updatedAt) && opt(r.deleted, isBool) && VALID[k](r)) out[id] = r.updatedAt > now + DAY_MS ? { ...r, updatedAt: now } : r;
      else dropped++;
    }
    (data as unknown as Record<string, unknown>)[k] = out;
  }
  return { data, dropped };
}
