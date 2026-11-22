// Pure reads of the app data (no state, no browser APIs), shared by screens and actions.
import { CATALOG, catalogById } from '../data/catalog.ts';
import { bestSet, finished, isTopSet, previousSets, type DeviceLookup } from './stats.ts';
import { qrDevices } from './qr.ts';
import type { AppData, Device, Session, Workout } from './types.ts';

export const DEFAULT_REST = 90;
export const DEFAULT_REP_RANGE = [8, 12] as const;
/** Devices used this recently count as part of a superset. */
export const SUPERSET_WINDOW_MS = 5 * 60_000;

export const getDevice = (d: AppData, id: string): Device | undefined => catalogById.get(id) ?? d.customDevices[id];
export const deviceLookup = (d: AppData): DeviceLookup => (id) => getDevice(d, id);
export const deviceName = (d: AppData, id: string) => getDevice(d, id)?.name ?? id;
export const devicesByIds = (d: AppData, ids: string[]) => ids.map((id) => getDevice(d, id)).filter((x): x is Device => !!x);

/** Catalog plus custom devices, without hidden ones. */
export const allDevices = (d: AppData): Device[] =>
  [...CATALOG, ...Object.values(d.customDevices).filter((x) => !x.deleted)].filter((x) => !d.deviceSettings[x.id]?.hidden);

export const deviceOptions = (d: AppData, dev: Device) => {
  const s = d.deviceSettings[dev.id];
  const [repMin, repMax] = dev.reps ?? DEFAULT_REP_RANGE;
  return { step: s?.step ?? dev.step, repMin: s?.repMin ?? repMin, repMax: s?.repMax ?? repMax,
    rest: s?.rest ?? DEFAULT_REST, assisted: !!dev.assisted, bodyweight: !!dev.bodyweight };
};

export const activeSession = (d: AppData): Session | undefined =>
  Object.values(d.sessions).filter((s) => !s.deleted && !s.endedAt).sort((a, b) => b.startedAt - a.startedAt)[0];

export const finishedSessions = (d: AppData) => finished(Object.values(d.sessions));

/** Body weights, oldest first. */
export const bodyWeights = (d: AppData) => Object.entries(d.bodyWeights).filter(([, w]) => !w.deleted)
  .map(([day, w]) => ({ day, kg: w.kg, at: w.at })).sort((a, b) => a.at - b.at);

export const workoutOf = (d: AppData, s?: Session): Workout | undefined => (s?.workoutId ? d.workouts[s.workoutId] : undefined);

export const liveWorkouts = (d: AppData) => Object.values(d.workouts).filter((w) => !w.deleted).sort((a, b) => a.name.localeCompare(b.name));

/** Plan devices of the session's workout not done yet (in plan order). */
export const remainingPlan = (d: AppData, s: Session | undefined, except?: string) =>
  !s ? [] : devicesByIds(d, workoutOf(d, s)?.deviceIds ?? []).filter((x) => x.id !== except && !s.entries.some((e) => e.deviceId === x.id));

/** Other devices with a set in the last minutes (superset partners). */
export const recentDevices = (s: Session | undefined, exceptId: string, now = Date.now()) =>
  [...new Set((s?.entries ?? []).filter((e) => e.deviceId !== exceptId && e.sets.some((x) => now - x.at < SUPERSET_WINDOW_MS)).map((e) => e.deviceId))];

export const lastSetAt = (s?: Session) => (s ? Math.max(0, ...s.entries.flatMap((e) => e.sets.map((x) => x.at))) : 0);

export const qrCodesFor = (d: AppData, deviceId: string) =>
  Object.entries(d.qr).filter(([, l]) => qrDevices(l).includes(deviceId)).map(([code]) => code);

export const devicesForQr = (d: AppData, code: string) => qrDevices(d.qr[code]).filter((id) => getDevice(d, id));

export const devicesWithQr = (d: AppData) => new Set(Object.values(d.qr).flatMap((l) => qrDevices(l)));

/** The hardest regular set of the last session on a device, for list subtitles. */
export const lastBest = (d: AppData, dev: Device) => bestSet(previousSets(Object.values(d.sessions), dev.id).filter(isTopSet), dev.assisted);
