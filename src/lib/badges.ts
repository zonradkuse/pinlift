import type { Device, Muscle, Session } from './types.ts';
import { computePRs, finished, isWork, sessionSummary, weekIndex } from './stats.ts';

export interface Badge { id: string; name: string; description: string; icon: 'trophy' | 'fire' | 'run' | 'row' | 'medal' }
export interface EarnedBadge { id: string; sessionId: string; at: number }

interface Totals {
  sessions: number; volume: number; prs: number; streak: number; devices: Set<string>;
  sessionVolume: number; sessionPrs: number; maxRun: number; maxRow: number; cardioM: number;
  startHour: number; weekMuscles: Set<Muscle>;
}

const b = (id: string, name: string, description: string, icon: Badge['icon'], test: (t: Totals) => boolean) =>
  ({ id, name, description, icon, test });

const COVERAGE: Muscle[][] = [['chest'], ['lats', 'upper_back'], ['shoulders'], ['biceps', 'triceps'], ['abs', 'obliques'], ['quads', 'hamstrings', 'glutes']];

export const BADGES = [
  b('first-workout', 'First rep', 'Finish your first workout', 'medal', (t) => t.sessions >= 1),
  ...[[10, 'Regular'], [25, 'Dedicated'], [50, 'Committed'], [100, 'Centurion'], [250, 'Iron veteran']].map(([n, name]) =>
    b(`workouts-${n}`, name as string, `Finish ${n} workouts`, 'medal', (t) => t.sessions >= (n as number))),
  ...[[4, 'Habit forming'], [12, 'Quarter strong'], [26, 'Half-year hero'], [52, 'Year of iron']].map(([n, name]) =>
    b(`streak-${n}`, name as string, `Train ${n} weeks in a row`, 'fire', (t) => t.streak >= (n as number))),
  ...[[1, 'Tonne up', '1 t'], [6, 'Elephant mover', '6 t (an African elephant)'], [40, 'Truckload', '40 t (a loaded semi truck)'],
    [150, 'Blue whale', '150 t (a blue whale)'], [400, 'Jumbo jet', '400 t (a Boeing 747)'], [1000, 'Kiloton', '1,000 t']].map(([n, name, what]) =>
    b(`volume-${n}t`, name as string, `Lift ${what} in total`, 'trophy', (t) => t.volume >= (n as number) * 1000)),
  b('session-5t', 'Heavy day', 'Lift 5 t in one workout', 'trophy', (t) => t.sessionVolume >= 5000),
  b('session-10t', 'Monster session', 'Lift 10 t in one workout', 'trophy', (t) => t.sessionVolume >= 10000),
  b('pr-1', 'Personal best', 'Set your first personal record', 'trophy', (t) => t.prs >= 1),
  b('pr-10', 'Record breaker', 'Set 10 personal records', 'trophy', (t) => t.prs >= 10),
  b('pr-50', 'Unstoppable', 'Set 50 personal records', 'trophy', (t) => t.prs >= 50),
  b('pr-hat-trick', 'Hat trick', '3 personal records in one workout', 'trophy', (t) => t.sessionPrs >= 3),
  b('run-5k', '5K', 'Run 5 km in one go', 'run', (t) => t.maxRun >= 5000),
  b('run-10k', '10K', 'Run 10 km in one go', 'run', (t) => t.maxRun >= 10000),
  b('row-2k', '2K row', 'Row 2,000 m in one go', 'row', (t) => t.maxRow >= 2000),
  b('row-5k', '5K row', 'Row 5,000 m in one go', 'row', (t) => t.maxRow >= 5000),
  b('cardio-marathon', 'Marathon total', 'Cover 42.2 km on cardio machines', 'run', (t) => t.cardioM >= 42195),
  b('explorer-10', 'Explorer', 'Use 10 different devices', 'medal', (t) => t.devices.size >= 10),
  b('explorer-25', 'Gym cartographer', 'Use 25 different devices', 'medal', (t) => t.devices.size >= 25),
  b('full-coverage', 'Full coverage', 'Train chest, back, shoulders, arms, core and legs within one week', 'medal',
    (t) => COVERAGE.every((g) => g.some((m) => t.weekMuscles.has(m)))),
  b('early-bird', 'Early bird', 'Start a workout before 7:00', 'medal', (t) => t.startHour < 7),
  b('night-owl', 'Night owl', 'Start a workout at 21:00 or later', 'medal', (t) => t.startHour >= 21),
];

export const badgeById = new Map(BADGES.map((x) => [x.id, x]));

/** Badges earned by finished sessions, each attributed to the session that unlocked it. */
export function computeBadges(sessions: Iterable<Session>, getDevice: (id: string) => Device | undefined): EarnedBadge[] {
  const list = finished(sessions);
  const prsBySession = new Map<string, number>();
  for (const pr of computePRs(list, getDevice)) prsBySession.set(pr.sessionId, (prsBySession.get(pr.sessionId) ?? 0) + 1);
  const t: Totals = { sessions: 0, volume: 0, prs: 0, streak: 0, devices: new Set(), sessionVolume: 0, sessionPrs: 0,
    maxRun: 0, maxRow: 0, cardioM: 0, startHour: 12, weekMuscles: new Set() };
  const earned: EarnedBadge[] = [];
  let lastWeek = NaN;
  for (const s of list) {
    const week = weekIndex(s.startedAt);
    if (week !== lastWeek) { t.streak = week === lastWeek + 1 ? t.streak + 1 : 1; t.weekMuscles = new Set(); lastWeek = week; }
    const sum = sessionSummary(s, getDevice);
    t.sessions++; t.volume += sum.volume; t.sessionVolume = sum.volume; t.cardioM += sum.distanceM;
    t.sessionPrs = prsBySession.get(s.id) ?? 0; t.prs += t.sessionPrs;
    t.startHour = new Date(s.startedAt).getHours();
    for (const e of s.entries) {
      t.devices.add(e.deviceId);
      const d = getDevice(e.deviceId);
      if (e.sets.some(isWork)) d?.primary.forEach((m) => t.weekMuscles.add(m));
      if (e.cardio && d?.cardio === 'run') t.maxRun = Math.max(t.maxRun, e.cardio.distanceM);
      if (e.cardio && d?.cardio === 'row') t.maxRow = Math.max(t.maxRow, e.cardio.distanceM);
    }
    for (const badge of BADGES) {
      if (!earned.some((x) => x.id === badge.id) && badge.test(t)) earned.push({ id: badge.id, sessionId: s.id, at: s.endedAt! });
    }
  }
  return earned;
}
