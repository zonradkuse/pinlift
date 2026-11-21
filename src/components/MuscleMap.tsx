import type { Muscle } from '../lib/types.ts';
import type { MuscleCoverage } from '../lib/stats.ts';
import { MUSCLE_GROUPS } from '../data/catalog.ts';
import { HBars } from './HBars.tsx';

// Stylised anatomy, drawn for this app. Shapes describe the figure's right side (viewer's left)
// and are mirrored unless `c` (centre) is set. Coordinates live in a 100×200 box per figure.
type Shape = { m?: Muscle; d: string; c?: boolean };

const ARMS = 'M22.5 72 Q18 81 16.5 93 L21 94 Q26 85 28.5 73.5 Z';
const HEAD: Shape[] = [
  { d: 'M50 3 C56 3 59 8 59 14 C59 21 55 25 50 25 C45 25 41 21 41 14 C41 8 44 3 50 3 Z', c: true },
  { d: 'M45 24 L55 24 L56.5 31 L43.5 31 Z', c: true },
  { d: 'M18.5 94.5 C21.5 94.5 22.5 97 22 100 C21.5 103 18 104 16 102 C14.5 100 15 95 18.5 94.5 Z' },
];

const FRONT: Shape[] = [
  ...HEAD,
  { m: 'traps', d: 'M44 28 Q40 31.5 35 32.5 L44.5 34 Z' },
  { m: 'shoulders', d: 'M34 33 Q26 33.5 23.5 42 Q23 48 25 52 L30.5 46.5 Q33.5 40 37.5 35 Z' },
  { m: 'chest', d: 'M49.2 35.5 L38.5 35.5 Q33.5 40.5 32.5 47 Q34.5 53.5 42 54.5 Q47 54.5 49.2 52 Z' },
  { m: 'biceps', d: 'M25 53.5 Q22 59.5 22 66.5 Q23.5 71 27 71 Q31.5 63 31.5 50 Z' },
  { m: 'forearms', d: ARMS },
  { m: 'abs', d: 'M43.6 56.5 h5.6 v7 h-5.6 Z M43.6 64.8 h5.6 v7 h-5.6 Z M43.6 73.1 h5.6 v7.5 h-5.6 Z M43.6 82 h5.6 v9.5 q-3 0 -5.6 -3.5 Z' },
  { m: 'obliques', d: 'M42.3 56 Q36.5 56.5 35 62 Q34.5 74 37.5 83.5 Q39.5 87.5 42.6 88.5 Z' },
  { m: 'abductors', d: 'M36.5 86 Q32 91 31.5 100 L35.5 97.5 Q36.5 92 39.5 88.5 Z' },
  { m: 'quads', d: 'M38.5 91 Q33 99 32.8 114 Q33.5 128 37.5 135.5 Q42.5 138 46 134.5 Q47.5 124 47 110 Q47 99 45.5 94 Z' },
  { m: 'adductors', d: 'M47 94.5 Q49.6 96 49.6 101 Q49.2 111 47.8 121 Q46.6 108 47 94.5 Z' },
  { m: 'calves', d: 'M36 142 Q33 152 34 162 Q35.5 172 38.8 178 L42.3 178 Q44.3 165 44 152 Q43 143.5 40 140.5 Z' },
  { d: 'M38.5 180 L42.8 180 Q45 186 44.3 190 L35.5 190 Q34.5 186 38.5 180 Z' },
];

const BACK: Shape[] = [
  ...HEAD,
  { m: 'traps', c: true, d: 'M50 24 L45 26.5 Q40 31 34.5 33 L42.5 37 L50 58 L57.5 37 L65.5 33 Q60 31 55 26.5 Z' },
  { m: 'rear_delts', d: 'M34 33.5 Q26 34 23.5 42.5 Q23 48 25 52 L30.5 46 Q33 40.5 38.5 36.5 Z' },
  { m: 'upper_back', d: 'M41.5 38.5 Q36.5 38.5 34.5 42.5 Q35.5 47.5 40.5 49.5 L47.2 48 Z' },
  { m: 'lats', d: 'M34 45 Q33 56 36.5 66 Q40.5 76 46 80.5 L49.3 79 L49.3 62 L42 51.5 Q37.5 49.5 34 45 Z' },
  { m: 'triceps', d: 'M25 53 Q22 59.5 22 66.5 Q23.5 71 27 71 Q31.5 62.5 31.5 49.5 Z' },
  { m: 'forearms', d: ARMS },
  { m: 'lower_back', c: true, d: 'M42.5 80 L50 83 L57.5 80 L56.5 91 L43.5 91 Z' },
  { m: 'abductors', d: 'M36.5 85 Q33 89.5 33.5 95.5 L40 90 Z' },
  { m: 'glutes', d: 'M49.4 92.5 L40.5 90.8 Q34.2 94.5 34 103 Q35.5 112 43 113.5 Q48 112.5 49.4 108.5 Z' },
  { m: 'hamstrings', d: 'M35.5 114.5 Q33.8 124 35.8 133 Q38.8 138.5 43 137.5 Q46.3 136 47 130 Q48 121 47.6 114 Q42 116.5 35.5 114.5 Z' },
  { m: 'calves', d: 'M36 141.5 Q32 150 33.8 160 Q35.5 168.5 39.8 171 L43 171 Q46 160 45 150 Q44 142 40.2 139 Z' },
  { d: 'M37.5 173 L43 173 Q44.5 182 44.3 190 L35.5 190 Q35 182 37.5 173 Z' },
];

function Figure({ shapes, primary, secondary, x }: { shapes: Shape[]; primary: Set<Muscle>; secondary: Set<Muscle>; x: number }) {
  const fill = (m?: Muscle) => !m ? 'var(--md-surface-container-highest)'
    : primary.has(m) ? 'var(--md-primary)' : secondary.has(m) ? 'var(--muscle-secondary)' : 'var(--md-outline-variant)';
  return (
    <g transform={`translate(${x} 0)`}>
      {shapes.map((s) => <path d={s.d} fill={fill(s.m)} />)}
      <g transform="translate(100 0) scale(-1 1)">
        {shapes.filter((s) => !s.c).map((s) => <path d={s.d} fill={fill(s.m)} />)}
      </g>
    </g>
  );
}

export function MuscleMap({ primary, secondary }: { primary: Muscle[]; secondary: Muscle[] }) {
  const p = new Set(primary), s = new Set(secondary);
  return (
    <figure class="muscle-map" style={{ margin: 0 }}>
      <svg viewBox="0 0 210 206" role="img" aria-label={`Trained muscles: ${primary.join(', ')}`}>
        <Figure shapes={FRONT} primary={p} secondary={s} x={0} />
        <Figure shapes={BACK} primary={p} secondary={s} x={110} />
        <text x="50" y="204" text-anchor="middle" font-size="7" fill="var(--md-on-surface-variant)">Front</text>
        <text x="160" y="204" text-anchor="middle" font-size="7" fill="var(--md-on-surface-variant)">Back</text>
      </svg>
      <figcaption class="row body-s muted" style={{ justifyContent: 'center', gap: '16px' }}>
        <span class="row" style={{ gap: '6px' }}><i style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--md-primary)' }} />Primary</span>
        {secondary.length > 0 && <span class="row" style={{ gap: '6px' }}><i style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--muscle-secondary)' }} />Secondary</span>}
      </figcaption>
    </figure>
  );
}

/** What a workout covers: muscle map, a count per muscle group, and the groups it leaves out. */
export function MuscleOverview({ title, coverage: c, unit }: { title: string; coverage: MuscleCoverage; unit: string }) {
  const missing = MUSCLE_GROUPS.filter((g) => !c.groups.get(g.id)).map((g) => g.name);
  return (
    <section class="card outlined" aria-label={title}>
      <h2 class="title-m">{title}</h2>
      <div class="muscle-overview">
        <MuscleMap primary={[...c.primary]} secondary={[...c.secondary]} />
        <HBars unit={unit} rows={MUSCLE_GROUPS.map((g) => ({ label: g.name, value: c.groups.get(g.id) ?? 0 }))} />
      </div>
      {missing.length > 0 && <p class="body-m muted">Not trained: {missing.join(', ')}</p>}
    </section>
  );
}
