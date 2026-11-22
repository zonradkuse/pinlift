// Pose and machine data for the pictograms (drawn for this app, in a 100×100 box, figure facing right).
// Angles are absolute segment directions in degrees: 0 = right, 90 = down, -90 = up.
export type Pt = [number, number];
type Angles = [number, number];
export type Pose =
  | { view?: 'side'; hip: Pt; torso: number; arm: Angles; leg: Angles; arm2?: Angles; leg2?: Angles }
  | { view: 'front'; hip: Pt; arm: Angles; leg: Angles; thigh?: number };
/** Machine shapes; a type prefixed with '+' is drawn in front of the figure. */
export type Part = [string, ...number[]];
/** [x1, y1, x2, y2, bend] – bend curves the arrow sideways. */
export type Arrow = [number, number, number, number, number?];
export interface PictogramSpec { pose: Pose; parts: Part[]; arrows?: Arrow[]; floor?: boolean }

// Seated machine base: figure upright on a seat with a backrest.
const HIP: Pt = [42, 60];
const SEAT: Part[] = [['seat', 28, 64, 26, 5], ['line', 34, 66, 32, 30, 6], ['line', 40, 69, 40, 92, 4]];
const seated = (arm: Angles, extra: Partial<Extract<Pose, { hip: Pt; torso: number }>> = {}) =>
  ({ hip: HIP, torso: -90, arm, leg: [0, 90] as Angles, ...extra });
// Front view, seated: short (foreshortened) thighs.
const FRONT_SEAT: Part[] = [['pad', 39, 30, 22, 36], ['seat', 34, 63, 32, 5]];
const frontSeated = (arm: Angles, leg: Angles = [100, 90]) => ({ view: 'front' as const, hip: [50, 62] as Pt, arm, leg, thigh: 9 });

export const PICTOGRAMS: Record<string, PictogramSpec> = {
  // Chest
  'chest-press': { pose: seated([0, 0]), parts: [...SEAT, ['+line', 71, 29, 71, 41, 4]], arrows: [[60, 24, 78, 24]] },
  'incline-chest-press': { pose: { hip: [44, 62], torso: -115, arm: [-30, -40], leg: [0, 95] },
    parts: [['seat', 30, 66, 26, 5], ['line', 38, 68, 24, 36, 6], ['+dot', 57, 23, 4]], arrows: [[62, 32, 74, 18]] },
  'decline-chest-press': { pose: seated([25, 15]), parts: [...SEAT, ['+line', 69, 39, 69, 51, 4]], arrows: [[68, 30, 82, 36]] },
  butterfly: { pose: frontSeated([0, -90]), parts: [...FRONT_SEAT, ['+pad', 69, 20, 6, 22], ['+pad', 25, 20, 6, 22]],
    arrows: [[84, 12, 68, 12], [16, 12, 32, 12]] },
  'seated-dip': { pose: seated([100, 70]), parts: [...SEAT, ['+dot', 44, 63, 4]], arrows: [[54, 42, 54, 58]] },
  // Back
  'lat-pulldown': { pose: seated([-65, -90], { torso: -98 }), parts: [...SEAT, ['pad', 54, 52, 14, 5], ['cable', 46, 8, 46, 0], ['+line', 32, 8, 62, 8, 3.5]],
    arrows: [[70, 12, 70, 30]] },
  'seated-row': { pose: seated([5, 0]), parts: [...SEAT, ['pad', 49, 36, 5, 20], ['+line', 71, 30, 71, 42, 4]], arrows: [[84, 26, 64, 26]] },
  'low-row': { pose: seated([25, 10]), parts: [...SEAT, ['+line', 70, 41, 70, 53, 4], ['cable', 70, 47, 94, 64]], arrows: [[86, 36, 66, 36]] },
  't-bar-row': { pose: { hip: [40, 52], torso: -25, arm: [90, 90], leg: [100, 80] },
    parts: [['line', 18, 92, 72, 70, 3.5], ['+plate', 66, 73, 6]], arrows: [[80, 74, 80, 58]] },
  pullover: { pose: seated([-130, -100]), parts: [...SEAT, ['+dot', 30, 10, 4]], arrows: [[24, 6, 62, 22, -14]] },
  'reverse-fly': { pose: frontSeated([2, 0]), parts: [...FRONT_SEAT, ['+dot', 86, 38, 4], ['+dot', 14, 38, 4]],
    arrows: [[68, 26, 84, 26], [32, 26, 16, 26]] },
  'back-extension': { pose: seated([60, -60], { torso: -120 }), parts: [['seat', 28, 64, 26, 5], ['pad', 16, 30, 7, 18], ['line', 40, 69, 40, 92, 4]],
    arrows: [[44, 10, 18, 14, -6]] },
  shrug: { pose: { view: 'front', hip: [50, 56], arm: [82, 90], leg: [95, 90] }, parts: [['+dot', 61, 59, 4], ['+dot', 39, 59, 4]],
    arrows: [[72, 30, 72, 14], [28, 30, 28, 14]] },
  // Shoulders
  'shoulder-press': { pose: seated([-60, -95]), parts: [...SEAT, ['+line', 42, 8, 56, 8, 3.5]], arrows: [[64, 24, 64, 8]] },
  'lateral-raise': { pose: frontSeated([-8, 10]), parts: [...FRONT_SEAT, ['+pad', 62, 31, 12, 6], ['+pad', 26, 31, 12, 6]],
    arrows: [[74, 52, 84, 40, 4], [26, 52, 16, 40, -4]] },
  // Arms
  'biceps-curl': { pose: seated([30, -70]), parts: [...SEAT, ['line', 46, 46, 62, 54, 6], ['+dot', 60, 29, 4]], arrows: [[70, 46, 68, 26, 6]] },
  'triceps-extension': { pose: seated([30, 50]), parts: [...SEAT, ['line', 46, 46, 62, 54, 6], ['+dot', 64, 54, 4]], arrows: [[70, 36, 74, 54, -6]] },
  // Core
  'ab-crunch': { pose: seated([105, -25], { torso: -55 }), parts: [['seat', 28, 64, 26, 5], ['line', 40, 69, 40, 92, 4], ['+dot', 66, 49, 4]],
    arrows: [[56, 14, 76, 28, -6]] },
  'rotary-torso': { pose: frontSeated([110, -170]), parts: [...FRONT_SEAT], arrows: [[24, 44, 76, 44, 14]] },
  // Legs
  'leg-press': { pose: { hip: [44, 66], torso: -150, arm: [40, 10], leg: [-40, 10] },
    parts: [['line', 46, 72, 16, 56, 6], ['line', 81, 44, 85, 68, 5]], arrows: [[66, 40, 82, 38]] },
  'hack-squat': { pose: { hip: [40, 58], torso: -100, arm: [-60, -120], leg: [30, 110] },
    parts: [['line', 32, 64, 26, 20, 6], ['line', 40, 91, 66, 86, 5]], arrows: [[54, 42, 50, 24]] },
  'leg-extension': { pose: seated([90, 0], { leg: [0, 15] }), parts: [...SEAT, ['+dot', 79, 70, 4.5]], arrows: [[66, 86, 86, 74, -4]] },
  'seated-leg-curl': { pose: seated([90, 0], { leg: [0, 10] }), parts: [...SEAT, ['pad', 50, 50, 16, 5], ['+dot', 80, 68, 4.5]],
    arrows: [[88, 70, 72, 88, -6]] },
  'lying-leg-curl': { pose: { hip: [46, 56], torso: 180, arm: [100, 30], leg: [0, -60] },
    parts: [['line', 12, 63, 72, 63, 6], ['line', 42, 66, 42, 92, 4], ['+dot', 77, 41, 4.5]], arrows: [[88, 52, 76, 32, 6]] },
  'hip-abductor': { pose: frontSeated([100, 70], [60, 90]), parts: [...FRONT_SEAT, ['+pad', 64, 66, 5, 12], ['+pad', 31, 66, 5, 12]],
    arrows: [[72, 76, 86, 76], [28, 76, 14, 76]] },
  'hip-adductor': { pose: frontSeated([100, 70], [35, 90]), parts: [...FRONT_SEAT, ['+pad', 59, 63, 5, 12], ['+pad', 36, 63, 5, 12]],
    arrows: [[86, 72, 74, 72], [14, 72, 26, 72]] },
  'glute-machine': { pose: { hip: [52, 54], torso: -20, arm: [100, 80], leg: [170, 120], leg2: [95, 85] },
    parts: [['line', 68, 38, 80, 50, 6], ['+dot', 75, 74, 4]], arrows: [[28, 44, 12, 50]] },
  'hip-thrust': { pose: { hip: [52, 52], torso: 190, arm: [80, 0], leg: [40, 95] },
    parts: [['seat', 6, 50, 26, 6], ['line', 18, 56, 18, 92, 4], ['+plate', 52, 44, 6]], arrows: [[52, 34, 52, 20]] },
  'standing-calf': { pose: { hip: [46, 50], torso: -90, arm: [70, 100], leg: [90, 90] },
    parts: [['pad', 38, 17, 18, 5], ['seat', 42, 89, 18, 5]], arrows: [[34, 90, 34, 74]] },
  'seated-calf': { pose: seated([60, 0], { leg: [0, 90] }), parts: [...SEAT, ['pad', 54, 51, 16, 5], ['seat', 58, 80, 16, 4]], arrows: [[78, 76, 78, 60]] },
  'smith-machine': { pose: { hip: [40, 58], torso: -75, arm: [30, -100], leg: [30, 110] },
    parts: [['line', 76, 4, 76, 92, 3], ['+line', 34, 32, 82, 32, 3.5], ['+plate', 80, 32, 5]], arrows: [[88, 54, 88, 38]] },
  'cable-crossover': { pose: { view: 'front', hip: [50, 56], arm: [60, 120], leg: [95, 90] },
    parts: [['ring', 92, 8, 4], ['ring', 8, 8, 4], ['cable', 92, 8, 58, 54], ['cable', 8, 8, 42, 54]],
    arrows: [[80, 32, 64, 62, 8], [20, 32, 36, 62, -8]] },
  'cable-pushdown': { pose: { hip: [44, 52], torso: -95, arm: [95, 20], leg: [92, 88] },
    parts: [['ring', 58, 6, 4], ['cable', 58, 6, 54, 47], ['+line', 50, 47, 58, 47, 4]], arrows: [[66, 44, 66, 62]] },
  // Free weights
  'barbell-bench': { pose: { hip: [54, 58], torso: 180, arm: [-90, -90], leg: [20, 100] },
    parts: [['seat', 14, 63, 56, 5], ['line', 22, 68, 22, 92, 4], ['line', 62, 68, 62, 92, 4], ['+plate', 29, 27, 7]], arrows: [[42, 40, 42, 22]] },
  'barbell-squat': { pose: { hip: [40, 58], torso: -75, arm: [30, -100], leg: [30, 110] }, parts: [['+plate', 47, 32, 8]], arrows: [[70, 56, 70, 38]] },
  deadlift: { pose: { hip: [38, 50], torso: -35, arm: [95, 90], leg: [70, 100] }, parts: [['+plate', 57, 76, 10]], arrows: [[78, 66, 78, 48]] },
  'db-shoulder-press': { pose: seated([-60, -95]), parts: [...SEAT, ['+db', 49, 8]], arrows: [[64, 24, 64, 8]] },
  'db-curl': { pose: { hip: [46, 52], torso: -90, arm: [75, -60], leg: [90, 90] }, parts: [['+db', 57, 29]], arrows: [[68, 50, 68, 30, -6]] },
  'assisted-dip-chin': { pose: { hip: [46, 60], torso: -90, arm: [-80, -95], leg: [90, 180] },
    parts: [['line', 22, 84, 58, 84, 5], ['line', 70, 4, 70, 92, 3], ['+line', 34, 6, 70, 6, 3.5]], arrows: [[60, 92, 60, 70]] },
  // Bodyweight
  'push-up': { pose: { hip: [40, 76], torso: -25, arm: [90, 90], leg: [155, 155] }, parts: [], arrows: [[88, 80, 88, 62]] },
  'pike-push-up': { pose: { hip: [40, 55], torso: 40, arm: [52, 52], leg: [112, 112] }, parts: [], arrows: [[90, 86, 90, 68]] },
  'pull-up': { pose: { view: 'front', hip: [50, 52], arm: [-30, -90], leg: [92, 92] }, parts: [['line', 14, 5, 86, 5, 3.5]],
    arrows: [[92, 42, 92, 24]], floor: false },
  'chin-up': { pose: { hip: [46, 58], torso: -100, arm: [-60, -95], leg: [100, 130] }, parts: [['line', 28, 6, 72, 6, 3.5]],
    arrows: [[70, 44, 70, 26]], floor: false },
  dip: { pose: { hip: [46, 58], torso: -80, arm: [160, 60], leg: [100, 150] },
    parts: [['line', 26, 52, 64, 52, 4], ['line', 30, 54, 30, 94, 3], ['line', 60, 54, 60, 94, 3]], arrows: [[76, 62, 76, 44]] },
  'inverted-row': { pose: { hip: [42, 72], torso: -30, arm: [-100, -60], leg: [150, 150] },
    parts: [['line', 68, 32, 84, 32, 3.5], ['line', 84, 30, 84, 94, 3]], arrows: [[92, 62, 92, 46]] },
  'bodyweight-squat': { pose: { hip: [40, 67], torso: -60, arm: [0, 0], leg: [20, 110] }, parts: [], arrows: [[22, 80, 22, 60]] },
  lunge: { pose: { hip: [48, 75], torso: -90, arm: [100, 80], leg: [0, 90], leg2: [120, 180] }, parts: [], arrows: [[86, 74, 86, 54]] },
  'glute-bridge': { pose: { hip: [52, 72], torso: 155, arm: [15, 5], leg: [0, 95] }, parts: [], arrows: [[52, 93, 52, 81]] },
  'hanging-leg-raise': { pose: { hip: [46, 58], torso: -95, arm: [-75, -85], leg: [0, 0] }, parts: [['line', 30, 4, 70, 4, 3.5]],
    arrows: [[66, 88, 88, 68, 8]], floor: false },
  crunch: { pose: { hip: [52, 88], torso: -150, arm: [30, -150], leg: [-60, 70] }, parts: [], arrows: [[12, 56, 36, 54, -6]] },
  // Cardio
  treadmill: { pose: { hip: [46, 52], torso: -80, arm: [120, 60], arm2: [60, -30], leg: [50, 110], leg2: [120, 160] },
    parts: [['line', 8, 90, 80, 90, 4], ['line', 80, 90, 88, 40, 3], ['line', 82, 36, 96, 40, 4]], arrows: [[62, 98, 26, 98]], floor: false },
  rower: { pose: { hip: [34, 66], torso: -105, arm: [150, -5], leg: [-5, 10] },
    parts: [['line', 8, 73, 92, 73, 3], ['line', 76, 60, 76, 72, 4], ['ring', 86, 52, 8], ['cable', 29, 48, 86, 52]], arrows: [[64, 82, 40, 82]] },
  bike: { pose: { hip: [40, 54], torso: -60, arm: [20, 30], leg: [30, 115], leg2: [0, 80] },
    parts: [['seat', 32, 56, 14, 4], ['line', 40, 60, 52, 78, 3], ['line', 52, 78, 70, 40, 3], ['line', 66, 38, 76, 41, 4], ['ring', 52, 78, 6], ['ring', 74, 76, 11]] },
  elliptical: { pose: { hip: [44, 48], torso: -88, arm: [30, -60], arm2: [60, -20], leg: [70, 100], leg2: [110, 80] },
    parts: [['line', 66, 14, 74, 70, 3], ['line', 20, 89, 80, 83, 3], ['ring', 84, 80, 8]] },
  stairs: { pose: { hip: [40, 50], torso: -85, arm: [60, -10], leg: [-5, 90], leg2: [120, 70] },
    parts: [['poly', 12, 94, 16, 94, 16, 84, 36, 84, 36, 74, 56, 74, 56, 64, 76, 64, 76, 54, 90, 54], ['line', 58, 36, 88, 46, 3]], arrows: [[18, 52, 30, 40]], floor: false },
};
