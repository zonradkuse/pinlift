import type { Device, Session, StrengthSet } from './types.ts';
import { MUSCLE_GROUPS } from '../data/catalog.ts';
import { speedKmh } from './cardio.ts';

/** Estimated one-rep max (Epley). */
export const e1rm = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));

export const DAY_MS = 86400_000;

export const live = (sessions: Iterable<Session>) =>
  [...sessions].filter((s) => !s.deleted).sort((a, b) => a.startedAt - b.startedAt);

export const finished = (sessions: Iterable<Session>) => live(sessions).filter((s) => s.endedAt);

export type DeviceLookup = (id: string) => Device | undefined;

/** Warm-up sets are logged for completeness but don't count anywhere. */
export const isWork = (s: StrengthSet) => s.kind !== 'warmup';
/** Only regular working sets can be records or drive suggestions (warm-ups and drop sets are easier by design). */
export const isTopSet = (s: StrengthSet) => !s.kind;

export interface SessionSummary { volume: number; sets: number; reps: number; distanceM: number; cardioSec: number; durationSec: number }

/** Totals of working sets; assisted machines add no lifted weight. */
export function sessionSummary(s: Session, getDevice?: DeviceLookup, now = Date.now()): SessionSummary {
  const sum = { volume: 0, sets: 0, reps: 0, distanceM: 0, cardioSec: 0,
    durationSec: Math.round(((s.endedAt ?? now) - s.startedAt) / 1000) };
  for (const e of s.entries) {
    const assisted = getDevice?.(e.deviceId)?.assisted;
    for (const set of e.sets.filter(isWork)) {
      if (!assisted) sum.volume += set.weight * set.reps;
      sum.sets++; sum.reps += set.reps;
    }
    if (e.cardio) { sum.distanceM += e.cardio.distanceM; sum.cardioSec += e.cardio.durationSec; }
  }
  return sum;
}

/** The latest session before `currentId` (or any) with working sets on the device, and those sets. */
export function previousSession(sessions: Iterable<Session>, deviceId: string, currentId?: string): { session: Session; sets: StrengthSet[] } | undefined {
  const list = live(sessions);
  const cur = list.find((s) => s.id === currentId);
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    if (s.id === currentId || (cur && s.startedAt > cur.startedAt)) continue;
    const sets = s.entries.filter((e) => e.deviceId === deviceId).flatMap((e) => e.sets).filter(isWork);
    if (sets.length) return { session: s, sets };
  }
  return undefined;
}

export const previousSets = (sessions: Iterable<Session>, deviceId: string, currentId?: string) =>
  previousSession(sessions, deviceId, currentId)?.sets ?? [];

/** Heavier is harder; on assisted machines less counterweight is harder. */
export const isHarder = (a: number, b: number, assisted?: boolean) => (assisted ? a < b : a > b);

/** Hardest set: heaviest (least assistance), then most reps. */
export const bestSet = (sets: StrengthSet[], assisted?: boolean): StrengthSet | undefined =>
  sets.reduce<StrengthSet | undefined>((best, s) =>
    !best || isHarder(s.weight, best.weight, assisted) || (s.weight === best.weight && s.reps > best.reps) ? s : best, undefined);

export type ProgressMetric = 'e1rm' | 'assist' | 'speed' | 'floors';

/** One point per session for the device's progress chart. */
export function progressSeries(sessions: Iterable<Session>, dev: Device): { metric: ProgressMetric; points: { x: number; y: number }[] } {
  const metric: ProgressMetric = dev.kind === 'cardio' ? (dev.cardio === 'stairs' ? 'floors' : 'speed') : dev.assisted ? 'assist' : 'e1rm';
  const value = (entries: Session['entries']): number | undefined => {
    if (metric === 'speed' || metric === 'floors') {
      const v = entries.map((e) => e.cardio).filter((c) => c && (metric === 'floors' ? c.floors : c.distanceM > 0))
        .map((c) => (metric === 'floors' ? c!.floors! : speedKmh(c!.distanceM, c!.durationSec)));
      return v.length ? Math.max(...v) : undefined;
    }
    const top = entries.flatMap((e) => e.sets).filter(isTopSet);
    if (!top.length) return undefined;
    return metric === 'assist' ? Math.min(...top.map((x) => x.weight)) : Math.max(...top.map((x) => e1rm(x.weight, x.reps)));
  };
  const points = live(sessions).flatMap((s) => {
    const y = value(s.entries.filter((e) => e.deviceId === dev.id));
    return y === undefined ? [] : [{ x: s.startedAt, y }];
  });
  return { metric, points };
}

/** Best regular set per machine (by estimated 1RM) and in how many sessions it was trained. Assisted machines have no 1RM. */
export function bestSetsByDevice(sessions: Iterable<Session>, getDevice: DeviceLookup) {
  const out = new Map<string, { set: StrengthSet; e1rm: number; uses: number }>();
  for (const s of live(sessions)) {
    const used = new Set<string>();
    for (const e of s.entries) {
      if (getDevice(e.deviceId)?.assisted) continue;
      for (const set of e.sets.filter(isTopSet)) {
        const v = e1rm(set.weight, set.reps), b = out.get(e.deviceId);
        if (!b || v > b.e1rm) out.set(e.deviceId, { set, e1rm: v, uses: b?.uses ?? 0 });
        used.add(e.deviceId);
      }
    }
    for (const id of used) out.get(id)!.uses++;
  }
  return out;
}

export interface CardioEntry { session: Session; entry: Session['entries'][number]; log: NonNullable<Session['entries'][number]['cardio']> }

export const cardioLogs = (sessions: Iterable<Session>, deviceId: string): CardioEntry[] =>
  live(sessions).flatMap((session) => session.entries.filter((e) => e.deviceId === deviceId && e.cardio).map((entry) => ({ session, entry, log: entry.cardio! })));

/** Fastest log over at least MIN_SPEED_PR_DISTANCE. */
export const bestCardio = (logs: CardioEntry[]) => logs.filter((l) => l.log.distanceM >= MIN_SPEED_PR_DISTANCE)
  .reduce<CardioEntry | undefined>((b, l) => (!b || speedKmh(l.log.distanceM, l.log.durationSec) > speedKmh(b.log.distanceM, b.log.durationSec) ? l : b), undefined);

export type PrKind = 'weight' | 'assist' | 'speed' | 'distance' | 'floors';
export interface PR { sessionId: string; deviceId: string; kind: PrKind; value: number; previous: number; at: number }

export const MIN_SPEED_PR_DISTANCE = 1000;

interface Best { weight: number; assist: number; speed: number; distance: number; floors: number }

/**
 * Personal records in chronological order; at most one per device and session. A device's first use is the baseline.
 * Strength records are the heaviest weight (least assistance on assisted machines); extra reps are progress, not records.
 */
export function computePRs(sessions: Iterable<Session>, getDevice?: DeviceLookup): PR[] {
  const best = new Map<string, Best>();
  const out: PR[] = [];
  for (const s of live(sessions)) {
    const perDevice = new Map<string, Best>();
    for (const e of s.entries) {
      const b = perDevice.get(e.deviceId) ?? { weight: 0, assist: Infinity, speed: 0, distance: 0, floors: 0 };
      const assisted = getDevice?.(e.deviceId)?.assisted;
      for (const set of e.sets) {
        if (set.reps < 1 || !isTopSet(set)) continue;
        if (assisted) b.assist = Math.min(b.assist, set.weight); else b.weight = Math.max(b.weight, set.weight); // see isHarder
      }
      if (e.cardio) {
        b.distance = Math.max(b.distance, e.cardio.distanceM);
        b.floors = Math.max(b.floors, e.cardio.floors ?? 0);
        if (e.cardio.distanceM >= MIN_SPEED_PR_DISTANCE) b.speed = Math.max(b.speed, speedKmh(e.cardio.distanceM, e.cardio.durationSec));
      }
      perDevice.set(e.deviceId, b);
    }
    for (const [deviceId, cur] of perDevice) {
      const prev = best.get(deviceId);
      if (prev) {
        const at = s.endedAt ?? s.startedAt;
        const pr = (kind: PrKind, value: number, previous: number) => out.push({ sessionId: s.id, deviceId, kind, value, previous, at });
        if (cur.weight > prev.weight && prev.weight > 0) pr('weight', cur.weight, prev.weight);
        else if (cur.assist < prev.assist && prev.assist < Infinity) pr('assist', cur.assist, prev.assist);
        else if (cur.speed > prev.speed && prev.speed > 0) pr('speed', cur.speed, prev.speed);
        else if (cur.distance > prev.distance && prev.distance > 0) pr('distance', cur.distance, prev.distance);
        else if (cur.floors > prev.floors && prev.floors > 0) pr('floors', cur.floors, prev.floors);
      }
      best.set(deviceId, prev ? {
        weight: Math.max(prev.weight, cur.weight), assist: Math.min(prev.assist, cur.assist), speed: Math.max(prev.speed, cur.speed),
        distance: Math.max(prev.distance, cur.distance), floors: Math.max(prev.floors, cur.floors),
      } : cur);
    }
  }
  return out;
}

/** A running workout with no activity for this long was most likely forgotten. */
export const STALE_MS = 3 * 3600_000;
const RECENT_MS = 30 * 60_000, COOL_DOWN_MS = 5 * 60_000;

export const lastActivity = (s: Session) =>
  Math.max(s.startedAt, ...s.entries.flatMap((e) => [...e.sets.map((x) => x.at), e.cardio?.at ?? 0]));

export const isStale = (s: Session, now = Date.now()) => now - lastActivity(s) > STALE_MS;

/** End time when finishing: now right after training, otherwise shortly after the last logged activity. */
export function endTime(s: Session, now = Date.now()): number {
  const last = lastActivity(s);
  return now - last < RECENT_MS ? now : last + COOL_DOWN_MS;
}

/** Week number since epoch; weeks start on Monday (local time). */
export function weekIndex(ts: number): number {
  const d = new Date(ts);
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS + 3) / 7);
}

/** Consecutive training weeks; stays alive until a whole week is missed. */
export function weeklyStreak(sessions: Iterable<Session>, now = Date.now()): number {
  const weeks = new Set(live(sessions).map((s) => weekIndex(s.startedAt)));
  let w = weekIndex(now);
  if (!weeks.has(w)) w--;
  let n = 0;
  while (weeks.has(w)) { n++; w--; }
  return n;
}

const OBJECTS: [number, string, string][] = [
  [4.5, 'house cat', 'house cats'], [30, 'golden retriever', 'golden retrievers'], [70, 'washing machine', 'washing machines'],
  [500, 'grand piano', 'grand pianos'], [1000, 'small car', 'small cars'], [1500, 'hippo', 'hippos'],
  [6000, 'African elephant', 'African elephants'], [12000, 'school bus', 'school buses'], [40000, 'loaded semi truck', 'loaded semi trucks'],
  [150000, 'blue whale', 'blue whales'],
];

/** "about 2.5 grand pianos" */
export function compareWeight(kg: number): string | null {
  const o = OBJECTS.findLast(([w]) => w <= kg);
  if (!o) return null;
  const n = Math.round((kg / o[0]) * 10) / 10;
  return `about ${n} ${n === 1 ? o[1] : o[2]}`;
}

/** Working sets per muscle group (by the devices' primary muscles) for sessions started at or after `since`. */
export function setsPerMuscleGroup(sessions: Iterable<Session>, getDevice: DeviceLookup, since: number): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of live(sessions).filter((x) => x.startedAt >= since)) {
    for (const e of s.entries) {
      const sets = e.sets.filter(isWork).length;
      const muscles = getDevice(e.deviceId)?.primary ?? [];
      if (!sets || !muscles.length) continue;
      for (const g of MUSCLE_GROUPS) if (g.muscles.some((m) => muscles.includes(m))) out.set(g.id, (out.get(g.id) ?? 0) + sets);
    }
  }
  return out;
}

/** Local calendar day as YYYY-MM-DD. */
export const dayKey = (ts: number) => {
  const d = new Date(ts), p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Lifted weight per training day. */
export function dailyVolume(sessions: Iterable<Session>, getDevice?: DeviceLookup): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of live(sessions)) out.set(dayKey(s.startedAt), (out.get(dayKey(s.startedAt)) ?? 0) + sessionSummary(s, getDevice).volume);
  return out;
}
