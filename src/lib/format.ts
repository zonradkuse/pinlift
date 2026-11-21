import { CARDIO, formatDuration, pace, speedKmh } from './cardio.ts';
import type { CardioLog, CardioType, StrengthSet } from './types.ts';
import type { PR } from './stats.ts';

const nf = (digits: number) => new Intl.NumberFormat('en', { maximumFractionDigits: digits });
export const fmtNum = (n: number, digits = 1) => nf(digits).format(n);
export const fmtKg = (kg: number) => `${fmtNum(kg)} kg`;
export const fmtDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);
export const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const fmtShortDate = (ts: number) => new Date(ts).toLocaleDateString('en', { day: 'numeric', month: 'short' });
export const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });

export function fmtCardio(c: CardioLog, type?: CardioType): string {
  const floors = c.floors ? ` · ${c.floors} floors` : '';
  if (!c.distanceM) return formatDuration(c.durationSec) + floors;
  const base = `${fmtDistance(c.distanceM)} in ${formatDuration(c.durationSec)}`;
  if (!c.durationSec) return base;
  return type && CARDIO[type].pace === '500m'
    ? `${base} (${formatDuration(pace(type, c.distanceM, c.durationSec))} /500 m)`
    : `${base} (${fmtNum(speedKmh(c.distanceM, c.durationSec))} km/h)`;
}

export const SET_KIND_LABEL = { warmup: 'warm-up', drop: 'drop' } as const;

/** "42.5 kg × 8", compact "42.5×8"; `kind` appends "· warm-up" / "· drop". */
export function fmtSet(s: StrengthSet, opts: { compact?: boolean; kind?: boolean } = {}): string {
  const base = opts.compact ? `${fmtNum(s.weight)}×${s.reps}` : `${fmtNum(s.weight)} kg × ${s.reps}`;
  return opts.kind && s.kind ? `${base} · ${SET_KIND_LABEL[s.kind]}` : base;
}

export const fmtSets = (sets: StrengthSet[], opts: { compact?: boolean } = {}) => sets.map((s) => fmtSet(s, opts)).join(opts.compact ? ' · ' : ', ');

export const fmtPr = (p: PR) => p.kind === 'weight' ? `${fmtKg(p.value)} (was ${fmtKg(p.previous)})`
  : p.kind === 'assist' ? `only ${fmtKg(p.value)} assistance (was ${fmtKg(p.previous)})`
  : p.kind === 'speed' ? `${fmtNum(p.value)} km/h (was ${fmtNum(p.previous)})`
  : p.kind === 'floors' ? `${p.value} floors (was ${p.previous})`
  : `${fmtDistance(p.value)} (was ${fmtDistance(p.previous)})`;

export const fmtProgress = (p: { weight: number } | { reps: number }) => 'weight' in p
  ? `${p.weight > 0 ? '+' : '−'}${fmtNum(Math.abs(p.weight))} kg vs last time`
  : `+${p.reps} rep${p.reps > 1 ? 's' : ''} vs last time`;

/** Accepts "42,5" as well as "42.5". */
export function parseDecimal(input: string): number | undefined {
  const n = parseFloat(input.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** "today", "yesterday" or "N days ago", by local calendar day. */
export function fmtAgo(ts: number, now = Date.now()): string {
  const day = (t: number) => { const d = new Date(t); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400_000; };
  const n = day(now) - day(ts);
  return n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`;
}
