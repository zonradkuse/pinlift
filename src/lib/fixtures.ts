// Shared builders for unit tests (not matched by the *.test.ts glob, so never run on its own).
import type { CardioLog, Device, Entry, Session, StrengthSet } from './types.ts';

let n = 0;
export const device = (id: string, extra: Partial<Device> = {}): Device =>
  ({ id, name: id, kind: 'strength', primary: ['chest'], secondary: [], description: '', cues: [], step: 2.5, ...extra });
export const set = (weight: number, reps: number, extra: Partial<StrengthSet> = {}): StrengthSet => ({ weight, reps, at: 0, ...extra });
export const lift = (deviceId: string, ...sets: (StrengthSet | [number, number])[]): Entry =>
  ({ id: `e${n++}`, deviceId, sets: sets.map((s) => (Array.isArray(s) ? set(s[0], s[1]) : s)) });
export const cardio = (deviceId: string, distanceM: number, durationSec: number, extra: Partial<CardioLog> = {}): Entry =>
  ({ id: `e${n++}`, deviceId, sets: [], cardio: { distanceM, durationSec, at: 0, ...extra } });
export const session = (id: string, startedAt: number, entries: Entry[], extra: Partial<Session> = {}): Session =>
  ({ id, startedAt, endedAt: startedAt + 3600_000, entries, updatedAt: startedAt, ...extra });
