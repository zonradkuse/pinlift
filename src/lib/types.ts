export type Muscle =
  | 'chest' | 'shoulders' | 'rear_delts' | 'traps' | 'upper_back' | 'lats' | 'lower_back'
  | 'biceps' | 'triceps' | 'forearms' | 'abs' | 'obliques'
  | 'glutes' | 'quads' | 'hamstrings' | 'adductors' | 'abductors' | 'calves' | 'neck';

export type CardioType = 'run' | 'row' | 'bike' | 'elliptical' | 'stairs';

export interface Device {
  id: string;
  name: string;
  kind: 'strength' | 'cardio';
  cardio?: CardioType;
  primary: Muscle[];
  secondary: Muscle[];
  description: string;
  cues: string[];
  /** Weight increment in kg. */
  step: number;
  /** Counterweight machines (assisted dip/chin): less weight is harder. */
  assisted?: boolean;
  /** Bodyweight exercise: the logged weight is added weight (0 = bodyweight only). */
  bodyweight?: boolean;
  /** Hold exercise (plank, wall sit): the `reps` of its sets are seconds held. */
  timed?: boolean;
  /** Default rep range for the suggestions, e.g. higher for bodyweight exercises (seconds for timed ones). */
  reps?: [number, number];
}

/** Every synced record carries updatedAt; the newer copy wins on merge. */
export interface Synced { updatedAt: number; deleted?: boolean }

export interface CustomDevice extends Device, Synced {}

export interface DeviceSettings extends Synced {
  step?: number;
  repMin?: number;
  repMax?: number;
  /** Seat height, pad positions, ... */
  notes?: string;
  hidden?: boolean;
  /** Target rest between sets in seconds. */
  rest?: number;
}

/** One code can open several exercises (Smith machine, cable tower). `deviceId` is the legacy single-device format. */
export interface QrLink extends Synced { deviceIds: string[]; deviceId?: string }

export interface StrengthSet { weight: number; reps: number; at: number; kind?: 'warmup' | 'drop' }

/** distanceM is 0 when the machine shows no distance (bike, cross trainer, stairs). */
export interface CardioLog { durationSec: number; distanceM: number; at: number; floors?: number }

export interface Entry {
  id: string;
  deviceId: string;
  sets: StrengthSet[];
  cardio?: CardioLog;
}

export interface Session extends Synced {
  id: string;
  startedAt: number;
  endedAt?: number;
  workoutId?: string;
  entries: Entry[];
  stravaId?: number;
}

export interface Workout extends Synced {
  id: string;
  name: string;
  deviceIds: string[];
}

/** Body weight of a day, keyed by local date (YYYY-MM-DD); `at` is noon of that day. */
export interface BodyWeight extends Synced { kg: number; at: number }

/** The collections that are synced between devices (each a record of Synced items). */
export const SYNCED_KEYS = ['sessions', 'workouts', 'customDevices', 'deviceSettings', 'qr', 'bodyWeights'] as const;
/** Collections added after the first release: data from older app versions doesn't have them. */
export const ADDED_LATER: readonly SyncedKey[] = ['bodyWeights'];
export type SyncedKey = typeof SYNCED_KEYS[number];

/** Everything that is transferred between devices. */
export interface AppData {
  schema: 1;
  sessions: Record<string, Session>;
  workouts: Record<string, Workout>;
  customDevices: Record<string, CustomDevice>;
  deviceSettings: Record<string, DeviceSettings>;
  qr: Record<string, QrLink>;
  bodyWeights: Record<string, BodyWeight>;
}

export const isEmptyData = (d: AppData) => SYNCED_KEYS.every((k) => !Object.keys(d[k]).length);

export const emptyData = (): AppData => ({
  schema: 1, sessions: {}, workouts: {}, customDevices: {}, deviceSettings: {}, qr: {}, bodyWeights: {},
});
