import type { CardioType, Device, Muscle, Workout } from '../lib/types.ts';

// Descriptions and cues are generic coaching advice written for this app; adjust per machine in the app.
const s = (id: string, name: string, primary: Muscle[], secondary: Muscle[], step: number, description: string, cues: string[]): Device =>
  ({ id, name, kind: 'strength', primary, secondary, step, description, cues });
/** Bodyweight exercise: the weight field is added weight (vest, belt); `reps` is the default rep range. */
const b = (id: string, name: string, primary: Muscle[], secondary: Muscle[], reps: [number, number], description: string, cues: string[]): Device =>
  ({ ...s(id, name, primary, secondary, 2.5, description, cues), bodyweight: true, reps });
const c = (id: string, name: string, cardio: CardioType, primary: Muscle[], description: string, cues: string[]): Device =>
  ({ id, name, kind: 'cardio', cardio, primary, secondary: [], step: 0, description, cues });

export const CATALOG: Device[] = [
  // Chest
  s('chest-press', 'Chest Press', ['chest'], ['triceps', 'shoulders'], 5,
    'Seated horizontal press. Handles should start at mid-chest height.',
    ['Set the seat so the handles line up with your mid-chest', 'Keep shoulder blades pulled back and down against the pad', 'Do not lock the elbows hard at the end', 'Lower slowly until you feel a stretch in the chest']),
  s('incline-chest-press', 'Incline Chest Press', ['chest'], ['shoulders', 'triceps'], 2.5,
    'Plate-loaded press on an upward path; emphasises the upper chest.',
    ['Press up and slightly forward, not straight up', 'Keep the lower back on the pad', 'Elbows about 45° from the torso', 'Load both sides evenly']),
  s('decline-chest-press', 'Decline Chest Press', ['chest'], ['triceps'], 2.5,
    'Plate-loaded press on a downward path; emphasises the lower chest.',
    ['Brace the core so the hips stay on the seat', 'Control the return, do not bounce at the bottom', 'Wrists straight, stacked over the forearms']),
  s('butterfly', 'Butterfly (Pec Fly)', ['chest'], ['shoulders'], 2.5,
    'Arms sweep together in front of the chest with a slight bend in the elbows.',
    ['Keep a soft, fixed bend in the elbows', 'Start with the hands in line with the chest, not behind the shoulders', 'Squeeze the chest for a second when the pads meet', 'Avoid rolling the shoulders forward']),
  s('seated-dip', 'Seated Dip', ['triceps'], ['chest', 'shoulders'], 5,
    'Push the handles down beside the body to straighten the elbows.',
    ['Keep the chest up and shoulders down, away from the ears', 'Elbows track backwards, not flared out', 'Stop short of a hard lockout']),
  // Back
  s('lat-pulldown', 'Lat Pulldown', ['lats'], ['biceps', 'upper_back', 'rear_delts'], 5,
    'Pull the bar down to the upper chest while seated under the thigh pads.',
    ['Adjust the thigh pads so you cannot lift off the seat', 'Lead with the elbows, pull to the upper chest', 'Do not swing the torso back to move the weight', 'Let the arms extend fully at the top']),
  s('seated-row', 'Seated Row', ['upper_back', 'lats'], ['biceps', 'rear_delts'], 5,
    'Horizontal pull with chest support; trains the mid back.',
    ['Chest stays on the pad for the whole set', 'Pull the elbows back and squeeze the shoulder blades together', 'Neck long, do not shrug']),
  s('low-row', 'Low Row', ['lats', 'upper_back'], ['biceps'], 5,
    'Plate-loaded row from a low angle; strong lat focus.',
    ['Pull towards the hips, not the chest', 'Keep the torso still; the arms do the moving', 'Pause briefly at full contraction']),
  s('t-bar-row', 'T-Bar Row', ['upper_back', 'lats'], ['biceps', 'lower_back'], 5,
    'Plate-loaded row with chest pad or standing platform.',
    ['Neutral spine, hinge at the hips', 'Pull with the elbows close to the body', 'Do not jerk the weight off the floor']),
  s('pullover', 'Pullover', ['lats'], ['chest', 'triceps'], 2.5,
    'Arc movement from overhead to the hips with nearly straight arms.',
    ['Align the shoulder joint with the machine pivot', 'Keep the elbows on the pads and the arms long', 'Move through the full arc slowly']),
  s('reverse-fly', 'Reverse Fly (Rear Delt)', ['rear_delts'], ['upper_back', 'traps'], 2.5,
    'Face the pad and open the arms out to the sides.',
    ['Handles at shoulder height', 'Lead with the back of the hands, soft elbows', 'Do not arch the lower back to finish the rep', 'Use lighter weight than you think']),
  s('back-extension', 'Back Extension', ['lower_back'], ['glutes', 'hamstrings'], 5,
    'Seated extension of the spine against a back pad.',
    ['Move slowly and stay pain-free', 'Extend to upright, do not hyperextend', 'Keep the chin neutral']),
  { ...s('assisted-dip-chin', 'Assisted Dip / Chin', ['lats', 'triceps'], ['biceps', 'chest', 'upper_back'], 5,
    'Kneel or stand on the platform; the counterweight takes part of your bodyweight. Less assistance is harder.',
    ['Pull-up: lead with the chest, elbows down to the ribs', 'Dip: shoulders down, lean slightly forward, stop at upper arms parallel',
      'Step on and off the platform carefully', 'Progress by reducing the assistance']), assisted: true },
  s('shrug', 'Shrug', ['traps'], ['forearms'], 5,
    'Lift the shoulders straight up towards the ears.',
    ['Straight up and down, no rolling', 'Hold the top for a second', 'Arms stay straight']),
  // Shoulders
  s('shoulder-press', 'Shoulder Press', ['shoulders'], ['triceps', 'traps'], 2.5,
    'Seated overhead press.',
    ['Handles start at about chin height', 'Keep the back on the pad, ribs down', 'Press up without shrugging into the ears']),
  s('lateral-raise', 'Lateral Raise', ['shoulders'], ['traps'], 2.5,
    'Raise the arms out to the sides up to shoulder height.',
    ['Align the shoulders with the machine pivots', 'Lift to shoulder height, not higher', 'Lead with the elbows, keep the traps relaxed']),
  // Arms
  s('biceps-curl', 'Biceps Curl', ['biceps'], ['forearms'], 2.5,
    'Curl with the upper arms supported on a pad.',
    ['Line up the elbow with the machine pivot', 'Upper arm stays on the pad', 'Lower all the way under control']),
  s('triceps-extension', 'Triceps Extension', ['triceps'], [], 2.5,
    'Extend the elbows with the upper arms supported.',
    ['Elbow lines up with the pivot', 'Do not let the shoulders roll forward', 'Fully straighten, then return slowly']),
  // Core
  s('ab-crunch', 'Abdominal Crunch', ['abs'], ['obliques'], 5,
    'Seated crunch: curl the ribcage towards the pelvis.',
    ['Exhale as you crunch', 'Move from the trunk, do not pull with the arms', 'Avoid pulling the neck forward']),
  s('rotary-torso', 'Rotary Torso', ['obliques'], ['abs'], 2.5,
    'Seated rotation of the upper body against resistance.',
    ['Small range, slow tempo', 'Hips stay locked in place', 'Train both directions equally']),
  // Legs
  s('leg-press', 'Leg Press', ['quads', 'glutes'], ['hamstrings', 'adductors'], 10,
    'Push the platform away with both feet.',
    ['Feet hip-width, mid-platform', 'Knees track over the toes, do not cave in', 'Keep the lower back on the pad at the bottom', 'Do not lock the knees at the top']),
  s('hack-squat', 'Hack Squat', ['quads', 'glutes'], ['adductors', 'hamstrings'], 5,
    'Plate-loaded squat on a sled with shoulder pads.',
    ['Back flat against the pad', 'Descend under control until thighs are at least parallel', 'Push through the whole foot']),
  s('leg-extension', 'Leg Extension', ['quads'], [], 5,
    'Straighten the knees against a pad at the shins.',
    ['Align the knee with the machine pivot', 'Shin pad just above the ankles', 'Pause at the top, lower slowly']),
  s('seated-leg-curl', 'Seated Leg Curl', ['hamstrings'], ['calves'], 5,
    'Bend the knees to pull the pad down and back.',
    ['Knee in line with the pivot', 'Thigh pad snug so the hips stay down', 'Control the way back up']),
  s('lying-leg-curl', 'Lying Leg Curl', ['hamstrings'], ['glutes', 'calves'], 5,
    'Face down, curl the heels towards the glutes.',
    ['Hips stay pressed into the pad', 'Avoid kicking; curl smoothly', 'Full extension at the bottom']),
  s('hip-abductor', 'Hip Abductor', ['abductors'], ['glutes'], 5,
    'Push the knees outwards against the pads.',
    ['Sit tall with the back on the pad', 'Controlled tempo, no bouncing', 'Pause briefly at the widest point']),
  s('hip-adductor', 'Hip Adductor', ['adductors'], [], 5,
    'Squeeze the knees together against the pads.',
    ['Choose a starting width that is comfortable', 'Squeeze and hold for a second', 'Return slowly']),
  s('glute-machine', 'Glute Kickback', ['glutes'], ['hamstrings'], 5,
    'Drive one leg back against a pad or plate.',
    ['Keep the lower back neutral, do not arch', 'Push through the heel', 'Squeeze the glute at the end']),
  s('hip-thrust', 'Hip Thrust', ['glutes'], ['hamstrings'], 5,
    'Plate-loaded hip extension with a belt or pad on the hips.',
    ['Chin tucked, ribs down', 'Shins vertical at the top', 'Full hip extension without overarching']),
  s('standing-calf', 'Standing Calf Raise', ['calves'], [], 5,
    'Rise onto the toes with shoulder pads loaded.',
    ['Full stretch at the bottom', 'Pause at the top', 'Knees straight but not locked']),
  s('seated-calf', 'Seated Calf Raise', ['calves'], [], 5,
    'Calf raise with bent knees; targets the deeper calf muscle.',
    ['Pad sits just above the knees', 'Slow full range', 'Do not bounce out of the bottom']),
  s('smith-machine', 'Smith Machine', ['quads', 'glutes'], ['chest', 'shoulders'], 5,
    'Guided barbell for squats, presses and lunges.',
    ['Set the safety stops before you start', 'Position your body so the bar path fits the exercise', 'Twist the bar to rack it securely']),
  s('cable-crossover', 'Cable Crossover', ['chest'], ['shoulders'], 2.5,
    'Dual cable station; set the pulleys for flyes, rows or curls.',
    ['Stand in a split stance for balance', 'Keep the movement slow on the way back', 'Set both pulleys to the same height']),
  s('cable-pushdown', 'Triceps Pushdown (Cable)', ['triceps'], [], 2.5,
    'Push a rope or bar down at a high pulley.',
    ['Elbows pinned to your sides', 'Lean slightly forward, keep the torso still', 'Fully extend at the bottom']),
  // Free weights (usually no QR code)
  s('barbell-bench', 'Barbell Bench Press', ['chest'], ['triceps', 'shoulders'], 2.5,
    'Free-weight press lying on a flat bench.',
    ['Use a spotter or safety arms', 'Feet planted, shoulder blades pinched', 'Lower to the lower chest, elbows about 45°']),
  s('barbell-squat', 'Barbell Squat', ['quads', 'glutes'], ['hamstrings', 'lower_back', 'adductors'], 2.5,
    'Back squat in a rack.',
    ['Set the safety pins just below your bottom position', 'Brace the core before every rep', 'Knees follow the toes']),
  s('deadlift', 'Deadlift', ['hamstrings', 'glutes', 'lower_back'], ['upper_back', 'forearms', 'traps'], 2.5,
    'Lift a barbell from the floor to standing.',
    ['Bar over mid-foot, close to the shins', 'Flat back, push the floor away', 'Lock out with the glutes, not by leaning back']),
  s('db-shoulder-press', 'Dumbbell Shoulder Press', ['shoulders'], ['triceps'], 2,
    'Seated or standing overhead press with dumbbells (weight per dumbbell).',
    ['Back supported, ribs down', 'Press up and slightly together', 'Control the descent to ear height']),
  s('db-curl', 'Dumbbell Curl', ['biceps'], ['forearms'], 2,
    'Alternating or simultaneous curls (weight per dumbbell).',
    ['Elbows stay at your sides', 'No swinging', 'Rotate the palms up as you curl']),
  // Bodyweight (no equipment, or just a bar)
  b('push-up', 'Push-up', ['chest'], ['triceps', 'shoulders', 'abs'], [10, 20],
    'Lower the body as one straight plank until the chest nearly touches the floor, then press up.',
    ['Hands slightly wider than the shoulders', 'Squeeze glutes and abs so the hips do not sag', 'Elbows about 45° from the body', 'Too hard? Start with the hands on a bench']),
  b('pike-push-up', 'Pike Push-up', ['shoulders'], ['triceps', 'traps'], [6, 12],
    'Hips high in an inverted V; lower the head towards the floor between the hands.',
    ['Walk the feet closer to make it harder', 'Head travels forward of the hands', 'Keep the legs as straight as you can']),
  b('pull-up', 'Pull-up', ['lats'], ['biceps', 'upper_back', 'rear_delts', 'forearms'], [5, 10],
    'Hang from a bar with an overhand grip and pull until the chin clears the bar.',
    ['Start from a dead hang with straight arms', 'Pull the elbows down towards the ribs', 'No kipping or swinging', 'Can\'t do one yet? Use the assisted machine or a band']),
  b('chin-up', 'Chin-up', ['lats', 'biceps'], ['upper_back', 'forearms'], [5, 10],
    'Like a pull-up with an underhand, shoulder-width grip; more biceps.',
    ['Palms face you', 'Chest up towards the bar', 'Lower all the way down under control']),
  b('dip', 'Dip (Parallel Bars)', ['triceps', 'chest'], ['shoulders'], [6, 12],
    'Support yourself on parallel bars and lower until the upper arms are about parallel to the floor.',
    ['Shoulders down, away from the ears', 'Lean forward slightly for more chest, stay upright for more triceps', 'Stop if you feel it in the front of the shoulder']),
  b('inverted-row', 'Inverted Row', ['upper_back', 'lats'], ['biceps', 'rear_delts'], [8, 15],
    'Lie under a bar (Smith machine or rack), body straight, and pull the chest up to the bar.',
    ['Heels on the floor, body like a plank', 'Squeeze the shoulder blades at the top', 'Lower the bar or bend the knees to make it easier']),
  b('bodyweight-squat', 'Bodyweight Squat', ['quads', 'glutes'], ['hamstrings', 'adductors'], [15, 25],
    'Sit back and down until the thighs are at least parallel, then stand up.',
    ['Feet shoulder-width, toes slightly out', 'Knees follow the toes', 'Chest up, weight on the whole foot']),
  b('lunge', 'Lunge', ['quads', 'glutes'], ['hamstrings', 'adductors', 'calves'], [8, 15],
    'Step forward and lower until both knees are bent about 90°; reps per leg.',
    ['Torso upright', 'Front knee over the ankle, not caving in', 'Back knee comes close to the floor']),
  b('glute-bridge', 'Glute Bridge', ['glutes'], ['hamstrings', 'lower_back'], [12, 20],
    'Lying on your back with bent knees, push the hips up until the body is straight from knees to shoulders.',
    ['Drive through the heels', 'Squeeze the glutes at the top for a second', 'Do not overarch the lower back']),
  b('hanging-leg-raise', 'Hanging Leg Raise', ['abs'], ['obliques', 'forearms'], [8, 15],
    'Hang from a bar and raise the legs to hip height or higher.',
    ['Avoid swinging; pause at the bottom', 'Tilt the pelvis up at the top', 'Bend the knees to make it easier']),
  b('crunch', 'Crunch', ['abs'], ['obliques'], [15, 25],
    'Lying on your back with bent knees, curl the shoulders off the floor.',
    ['Lower back stays on the floor', 'Do not pull on your neck', 'Exhale as you curl up']),
  // Cardio
  c('treadmill', 'Treadmill', 'run', ['quads', 'hamstrings', 'calves', 'glutes'],
    'Running or walking. Log distance and time; speed and pace are calculated.',
    ['Start slowly and warm up for a few minutes', 'Clip the safety key to your clothing', 'Run in the middle of the belt, do not hold the rails', 'Use 1% incline to mimic outdoor running']),
  c('rower', 'Rowing Machine', 'row', ['upper_back', 'lats', 'quads', 'glutes'],
    'Indoor rower. Log distance and time; pace per 500 m is calculated.',
    ['Sequence: legs, then body, then arms; reverse on the way back', 'Keep the back straight, hinge from the hips', 'Damper around 3–5 is enough for most people', 'Drive is quick, recovery is slow']),
  c('bike', 'Exercise Bike', 'bike', ['quads', 'hamstrings', 'calves'],
    'Upright or recumbent bike.',
    ['Saddle at hip height when standing next to it', 'Slight knee bend at the bottom of the stroke', 'Keep the cadence smooth']),
  c('elliptical', 'Cross Trainer', 'elliptical', ['quads', 'glutes', 'hamstrings'],
    'Low-impact elliptical trainer.',
    ['Stand tall, do not lean on the handles', 'Push and pull with the arms to involve the upper body', 'Keep the heels down']),
  c('stairs', 'Stair Climber', 'stairs', ['glutes', 'quads', 'calves'],
    'Continuous stepping machine.',
    ['Use the rails for balance only', 'Step with the whole foot', 'Stay upright']),
];

export const catalogById = new Map(CATALOG.map((d) => [d.id, d]));

const w = (id: string, name: string, deviceIds: string[]): Workout => ({ id, name, deviceIds, updatedAt: 1 });

/** Seeded on first launch with fixed ids/timestamps so seeds merge cleanly between devices. */
export const DEFAULT_WORKOUTS: Workout[] = [
  w('w-upper', 'Upper body', ['chest-press', 'lat-pulldown', 'shoulder-press', 'seated-row', 'butterfly', 'biceps-curl', 'triceps-extension']),
  w('w-lower', 'Lower body', ['leg-press', 'leg-extension', 'seated-leg-curl', 'hip-abductor', 'hip-adductor', 'standing-calf']),
  w('w-core', 'Core', ['ab-crunch', 'rotary-torso', 'back-extension']),
  w('w-push', 'Push', ['chest-press', 'incline-chest-press', 'shoulder-press', 'lateral-raise', 'seated-dip', 'triceps-extension']),
  w('w-pull', 'Pull', ['lat-pulldown', 'seated-row', 'pullover', 'reverse-fly', 'biceps-curl', 'back-extension']),
  w('w-full', 'Full body', ['leg-press', 'chest-press', 'lat-pulldown', 'seated-leg-curl', 'shoulder-press', 'seated-row', 'ab-crunch']),
  w('w-cardio', 'Cardio', ['treadmill', 'rower']),
];

export const MUSCLES: Record<Muscle, string> = {
  chest: 'Chest', shoulders: 'Shoulders', rear_delts: 'Rear delts', traps: 'Traps', upper_back: 'Upper back', lats: 'Lats',
  lower_back: 'Lower back', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', abs: 'Abs', obliques: 'Obliques',
  glutes: 'Glutes', quads: 'Quads', hamstrings: 'Hamstrings', adductors: 'Adductors', abductors: 'Abductors', calves: 'Calves', neck: 'Neck',
};

/** Coarse groups used for filter chips. */
export const MUSCLE_GROUPS: { id: string; name: string; muscles: Muscle[] }[] = [
  { id: 'chest', name: 'Chest', muscles: ['chest'] },
  { id: 'back', name: 'Back', muscles: ['lats', 'upper_back', 'lower_back', 'traps', 'rear_delts'] },
  { id: 'shoulders', name: 'Shoulders', muscles: ['shoulders', 'rear_delts'] },
  { id: 'arms', name: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
  { id: 'core', name: 'Core', muscles: ['abs', 'obliques', 'lower_back'] },
  { id: 'legs', name: 'Legs', muscles: ['quads', 'hamstrings', 'adductors', 'abductors', 'calves'] },
  { id: 'glutes', name: 'Glutes', muscles: ['glutes'] },
];

/** Filter chips: muscle groups plus bodyweight exercises and cardio. */
export const FILTER_GROUPS = [...MUSCLE_GROUPS, { id: 'bodyweight', name: 'Bodyweight', muscles: [] as Muscle[] }, { id: 'cardio', name: 'Cardio', muscles: [] as Muscle[] }];

/** Does the device primarily train any of the groups (or is it cardio / a bodyweight exercise, for those chips)? */
export const inGroups = (dev: Device, groupIds: string[]) => groupIds.some((g) => g === 'cardio' ? dev.kind === 'cardio'
  : g === 'bodyweight' ? !!dev.bodyweight
  : dev.primary.some((m) => MUSCLE_GROUPS.find((x) => x.id === g)?.muscles.includes(m)));

export const muscleSummary = (dev: Device) => (dev.kind === 'cardio' ? 'Cardio' : dev.primary.map((m) => MUSCLES[m]).join(', '));
