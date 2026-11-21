import type { CardioType } from './types.ts';

export function formatDuration(sec: number): string {
  const t = Math.round(sec);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export const speedKmh = (distanceM: number, sec: number) => (sec > 0 ? (distanceM / sec) * 3.6 : 0);
export const pacePerKm = (distanceM: number, sec: number) => (distanceM > 0 ? sec / (distanceM / 1000) : 0);
export const pacePer500m = (distanceM: number, sec: number) => (distanceM > 0 ? sec / (distanceM / 500) : 0);

export interface CardioInfo {
  label: string;
  /** Unit the machine shows distance in; null = no distance (floors instead). */
  distance: 'km' | 'm' | null;
  /** Pace per km or per 500 m (rowing convention). */
  pace: 'km' | '500m';
  /** Running and rowing machines always show distance; for the others it is optional. */
  needsDistance: boolean;
  /** Faster than this is a typo. */
  maxKmh: number;
  logLabel: string;
}

/** Everything that differs between cardio machine types, in one place. */
export const CARDIO: Record<CardioType, CardioInfo> = {
  run: { label: 'Running', distance: 'km', pace: 'km', needsDistance: true, maxKmh: 30, logLabel: 'Log run' },
  row: { label: 'Rowing', distance: 'm', pace: '500m', needsDistance: true, maxKmh: 30, logLabel: 'Log row' },
  bike: { label: 'Bike', distance: 'km', pace: 'km', needsDistance: false, maxKmh: 80, logLabel: 'Log session' },
  elliptical: { label: 'Cross trainer', distance: 'km', pace: 'km', needsDistance: false, maxKmh: 40, logLabel: 'Log session' },
  stairs: { label: 'Stairs', distance: null, pace: 'km', needsDistance: false, maxKmh: 40, logLabel: 'Log session' },
};

export const needsDistance = (t?: CardioType) => !!t && CARDIO[t].needsDistance;

/** Pace in seconds per km or per 500 m, as the machine type expects. */
export const pace = (t: CardioType | undefined, distanceM: number, sec: number) =>
  t && CARDIO[t].pace === '500m' ? pacePer500m(distanceM, sec) : pacePerKm(distanceM, sec);

/** Why a cardio log can't be saved, or null when it looks plausible. */
export function cardioProblem(t: CardioType, distanceM: number, sec: number): string | null {
  if (!(sec > 0)) return 'Enter the time.';
  if (sec > 5 * 3600) return 'That is longer than 5 h. Check minutes and seconds.';
  if (!(distanceM > 0)) return needsDistance(t) ? 'Enter the distance.' : null;
  const v = speedKmh(distanceM, sec);
  if (v > CARDIO[t].maxKmh) return `That is ${Math.round(v)} km/h, too fast. Check time and distance.`;
  if (v < 1) return `That is ${v.toFixed(1)} km/h, too slow. Check time and distance.`;
  return null;
}
