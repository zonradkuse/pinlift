import { PICTOGRAMS, type Arrow, type Part, type PictogramSpec, type Pose, type Pt } from '../data/pictograms.ts';
import type { Device } from '../lib/types.ts';

// Renders a machine pictogram: a jointed figure (side or front view) posed by segment angles, simple machine
// parts and an arrow for the movement. Angles are absolute directions in degrees (0 = right, 90 = down).
const LEN = { torso: 28, ua: 15, fa: 14, th: 20, sh: 19 };
const WIDTH = { torso: 11, ua: 7.5, fa: 6.5, th: 9.5, sh: 8 };
const HEAD_R = 6.5;

const dir = (deg: number): Pt => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
const add = (p: Pt, d: Pt, len: number): Pt => [p[0] + d[0] * len, p[1] + d[1] * len];
const mirror = (deg: number) => 180 - deg;

interface Limb { a: Pt; b: Pt; w: number; far?: boolean; halo?: boolean }

function figure(pose: Pose): { limbs: Limb[]; head: Pt } {
  const limbs: Limb[] = [];
  const chain = (start: Pt, angles: [number, number], lens: [number, number], widths: [number, number], extra: Partial<Limb> = {}) => {
    const mid = add(start, dir(angles[0]), lens[0]);
    limbs.push({ a: start, b: mid, w: widths[0], ...extra }, { a: mid, b: add(mid, dir(angles[1]), lens[1]), w: widths[1], ...extra });
  };
  if (pose.view === 'front') {
    const [x, y] = pose.hip;
    const thigh = pose.thigh ?? LEN.th;
    for (const side of [1, -1]) {
      const a = (deg: number) => (side === 1 ? deg : mirror(deg));
      chain([x + 4.5 * side, y], [a(pose.leg[0]), a(pose.leg[1])], [thigh, LEN.sh], [WIDTH.th, WIDTH.sh]);
    }
    limbs.push({ a: [x, y], b: [x, y - LEN.torso], w: 14 }, { a: [x - 8, y - 25], b: [x + 8, y - 25], w: 7.5 });
    for (const side of [1, -1]) {
      const a = (deg: number) => (side === 1 ? deg : mirror(deg));
      chain([x + 8 * side, y - 25], [a(pose.arm[0]), a(pose.arm[1])], [LEN.ua, LEN.fa], [WIDTH.ua, WIDTH.fa], { halo: true });
    }
    return { limbs, head: [x, y - LEN.torso - 4 - HEAD_R] };
  }
  const t = dir(pose.torso);
  const shoulder = add(pose.hip, t, 25);
  if (pose.leg2) chain(pose.hip, pose.leg2, [LEN.th, LEN.sh], [WIDTH.th, WIDTH.sh], { far: true });
  if (pose.arm2) chain(shoulder, pose.arm2, [LEN.ua, LEN.fa], [WIDTH.ua, WIDTH.fa], { far: true });
  limbs.push({ a: pose.hip, b: add(pose.hip, t, LEN.torso), w: WIDTH.torso });
  chain(pose.hip, pose.leg, [LEN.th, LEN.sh], [WIDTH.th, WIDTH.sh], { halo: true });
  chain(shoulder, pose.arm, [LEN.ua, LEN.fa], [WIDTH.ua, WIDTH.fa], { halo: true });
  return { limbs, head: add(pose.hip, t, LEN.torso + 4 + HEAD_R) };
}

function PartShape({ part }: { part: Part }) {
  const [type, ...v] = part;
  const kind = type.replace('+', '');
  const m = 'var(--pict-machine)';
  switch (kind) {
    case 'seat': case 'pad': return <rect x={v[0]} y={v[1]} width={v[2]} height={v[3]} rx={Math.min(v[2], v[3]) / 2} fill={m} />;
    case 'line': return <line x1={v[0]} y1={v[1]} x2={v[2]} y2={v[3]} stroke={m} stroke-width={v[4] ?? 4} stroke-linecap="round" />;
    case 'cable': return <line x1={v[0]} y1={v[1]} x2={v[2]} y2={v[3]} stroke={m} stroke-width={1.6} />;
    case 'dot': return <circle cx={v[0]} cy={v[1]} r={v[2] ?? 3.5} fill={m} />;
    case 'ring': return <circle cx={v[0]} cy={v[1]} r={v[2]} fill="none" stroke={m} stroke-width={3} />;
    case 'plate': return <circle cx={v[0]} cy={v[1]} r={v[2]} fill={m} />;
    case 'db': return <g fill={m}><rect x={v[0] - 7} y={v[1] - 1.5} width={14} height={3} /><rect x={v[0] - 9} y={v[1] - 4.5} width={4} height={9} rx={1} /><rect x={v[0] + 5} y={v[1] - 4.5} width={4} height={9} rx={1} /></g>;
    case 'poly': return <polyline points={v.join(' ')} fill="none" stroke={m} stroke-width={3.5} stroke-linejoin="round" stroke-linecap="round" />;
    default: return null;
  }
}

function ArrowShape({ arrow: [x1, y1, x2, y2, bend = 0] }: { arrow: Arrow }) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const cx = mx - ((y2 - y1) / len) * bend, cy = my + ((x2 - x1) / len) * bend;
  const tl = Math.hypot(x2 - cx, y2 - cy) || 1, ux = (x2 - cx) / tl, uy = (y2 - cy) / tl;
  const head = `${x2 + ux * 3},${y2 + uy * 3} ${x2 - ux * 4 - uy * 4},${y2 - uy * 4 + ux * 4} ${x2 - ux * 4 + uy * 4},${y2 - uy * 4 - ux * 4}`;
  return (
    <g fill="var(--md-primary)" stroke="var(--md-primary)">
      <path d={`M${x1} ${y1}Q${cx} ${cy} ${x2 - ux * 2} ${y2 - uy * 2}`} fill="none" stroke-width={3} stroke-linecap="round" />
      <polygon points={head} stroke-width={1} stroke-linejoin="round" />
    </g>
  );
}

export function PictogramSvg({ spec, size, label }: { spec: PictogramSpec; size: number; label?: string }) {
  const { limbs, head } = figure(spec.pose);
  const line = (l: Limb, stroke: string, extra = 0) =>
    <line x1={l.a[0]} y1={l.a[1]} x2={l.b[0]} y2={l.b[1]} stroke={stroke} stroke-width={l.w + extra} stroke-linecap="round" />;
  const behind = spec.parts.filter((p) => !p[0].startsWith('+')), front = spec.parts.filter((p) => p[0].startsWith('+'));
  return (
    <svg class="pictogram" width={size} height={size} viewBox={size < 64 ? '4 0 94 100' : '0 0 100 100'} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
      {spec.floor !== false && <line x1="6" y1="94" x2="94" y2="94" stroke="var(--pict-machine)" stroke-width="2" stroke-linecap="round" opacity="0.6" />}
      {behind.map((p) => <PartShape part={p} />)}
      <g opacity="0.4">{limbs.filter((l) => l.far).map((l) => line(l, 'var(--pict-figure)'))}</g>
      {limbs.filter((l) => !l.far).map((l) => <>{l.halo && line(l, 'var(--pict-bg)', 3.5)}{line(l, 'var(--pict-figure)')}</>)}
      <circle cx={head[0]} cy={head[1]} r={HEAD_R} fill="var(--pict-figure)" />
      {front.map((p) => <PartShape part={p} />)}
      {spec.arrows?.map((a) => <ArrowShape arrow={a} />)}
    </svg>
  );
}

/** Pictogram for a device; custom devices fall back to a generic one for their kind. */
export function Pictogram({ device, size = 48, label }: { device: Device; size?: number; label?: string }) {
  const spec = PICTOGRAMS[device.id] ?? PICTOGRAMS[device.kind === 'cardio' ? FALLBACK_CARDIO[device.cardio ?? 'run'] : 'db-curl'];
  return <PictogramSvg spec={spec} size={size} label={label} />;
}

const FALLBACK_CARDIO: Record<NonNullable<Device['cardio']>, string> = { run: 'treadmill', row: 'rower', bike: 'bike', elliptical: 'elliptical', stairs: 'stairs' };
