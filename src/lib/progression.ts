import type { StrengthSet } from './types.ts';
import { bestSet, isHarder, isTopSet } from './stats.ts';

export interface ProgressionOptions { step: number; repMin: number; repMax: number; assisted?: boolean; bodyweight?: boolean }

export interface Suggestion {
  kind: 'increase' | 'same' | 'decrease';
  weight: number;
  reps: number;
  reason: string;
}

export const roundKg = (kg: number) => Math.round(kg * 100) / 100;

/**
 * Double progression based on the hardest working sets of the previous session:
 * the heaviest weight, or for assisted machines the least assistance.
 */
export function suggest(last: StrengthSet[], { step, repMin, repMax, assisted, bodyweight }: ProgressionOptions): Suggestion | null {
  const work = last.filter(isTopSet);
  const best = bestSet(work, assisted);
  if (!best) return null;
  const top = best.weight;
  const reps = work.filter((s) => s.weight === top).map((s) => s.reps);
  const weakest = Math.min(...reps);
  const what = assisted ? `${top} kg assistance` : bodyweight ? (top ? `BW + ${top} kg` : 'bodyweight') : `${top} kg`;
  const easier = (w: number) => (assisted ? roundKg(w + step) : Math.max(0, roundKg(w - step)));
  const harder = (w: number) => (assisted ? Math.max(0, roundKg(w - step)) : roundKg(w + step));
  if (weakest >= repMax) {
    return { kind: 'increase', weight: harder(top), reps: repMin, reason: `All sets at ${what} reached ${repMax}+ reps` };
  }
  if (Math.max(...reps) < repMin) {
    return { kind: 'decrease', weight: easier(top), reps: repMin, reason: `Below ${repMin} reps at ${what}` };
  }
  return { kind: 'same', weight: top, reps: Math.min(repMax, weakest + 1), reason: `Add reps until every set hits ${repMax}` };
}

/** Today vs. last time on the hardest weight: a weight gain (negative = less assistance), else extra reps at that weight. */
export function progressVsLast(today: StrengthSet[], prev: StrengthSet[], assisted?: boolean): { weight: number } | { reps: number } | null {
  const t = bestSet(today.filter(isTopSet), assisted), p = bestSet(prev.filter(isTopSet), assisted);
  if (!t || !p) return null;
  if (t.weight !== p.weight) return isHarder(t.weight, p.weight, assisted) ? { weight: roundKg(t.weight - p.weight) } : null;
  return t.reps > p.reps ? { reps: t.reps - p.reps } : null;
}

export const DROP_SET_FACTOR = 0.8;

/** A drop set is easier: 20% lighter, or 20% more counterweight on assisted machines. */
export const dropSetWeight = (weight: number, step: number, assisted?: boolean) =>
  Math.max(0, roundKg(Math.round((assisted ? weight / DROP_SET_FACTOR : weight * DROP_SET_FACTOR) / step) * step));
