import { useState } from 'preact/hooks';
import { fmtNum, fmtShortDate } from '../lib/format.ts';

const M = { l: 40, r: 16, t: 16, b: 24 };
/** Chart size in viewBox units: the SVG scales to its container width, so wide cards use a wider box. */
export interface ChartSize { width?: number; height?: number }

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) { min = min > 0 ? 0 : min - 1; max = max + 1; }
  const raw = (max - min) / count, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw)!;
  const out = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 0.999; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

const compact = (n: number) => (Math.abs(n) >= 10000 ? `${fmtNum(n / 1000)}K` : fmtNum(n));

interface Tip { x: number; y: number; value: string; label: string }

function Tooltip({ tip, W, H }: { tip: Tip | null; W: number; H: number }) {
  if (!tip) return null;
  const left = Math.min(85, Math.max(15, (tip.x / W) * 100));
  return (
    <div role="status" class="chart-tip" style={{ left: `${left}%`, top: `${(tip.y / H) * 100}%` }}>
      <div class="title-s">{tip.value}</div><div class="body-s" style={{ opacity: 0.8 }}>{tip.label}</div>
    </div>
  );
}

function YAxis({ ticks, y, W }: { ticks: number[]; y: (v: number) => number; W: number }) {
  return <>{ticks.map((t) => (
    <g>
      <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" stroke-width="1" />
      <text x={M.l - 6} y={y(t) + 4} text-anchor="end" class="num">{compact(t)}</text>
    </g>
  ))}</>;
}

/** Single-series time line; the title outside names the series, so no legend. */
export function LineChart({ points, unit, label, width: W = 340, height: H = 180 }: { points: { x: number; y: number }[]; unit: string; label: string } & ChartSize) {
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return null;
  const ys = points.map((p) => p.y);
  const ticks = niceTicks(Math.min(...ys), Math.max(...ys));
  const [y0, y1] = [ticks[0], ticks[ticks.length - 1]];
  const [x0, x1] = [points[0].x, points[points.length - 1].x];
  const x = (v: number) => (x1 === x0 ? (M.l + W - M.r) / 2 : M.l + ((v - x0) / (x1 - x0)) * (W - M.l - M.r));
  const y = (v: number) => H - M.b - ((v - y0) / (y1 - y0)) * (H - M.t - M.b);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)} ${y(p.y).toFixed(1)}`).join('');
  const area = `${line}L${x(x1).toFixed(1)} ${H - M.b}L${x(x0).toFixed(1)} ${H - M.b}Z`;
  const last = points[points.length - 1];
  const h = hover === null ? null : points[hover];

  const onMove = (e: PointerEvent) => {
    const svg = e.currentTarget as SVGSVGElement, r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    points.forEach((p, i) => { if (Math.abs(x(p.x) - px) < Math.abs(x(points[best].x) - px)) best = i; });
    setHover(best);
  };

  return (
    <div style={{ position: 'relative' }}>
      <svg class="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onPointerMove={onMove} onPointerDown={onMove}
        onPointerLeave={() => setHover(null)} style={{ touchAction: 'pan-y' }}>
        <YAxis ticks={ticks} y={y} W={W} />
        <path d={area} fill="var(--chart-1)" opacity="0.1" />
        <path d={line} fill="none" stroke="var(--chart-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
        <text x={M.l} y={H - 6} class="num">{fmtShortDate(x0)}</text>
        {x1 !== x0 && <text x={W - M.r} y={H - 6} text-anchor="end" class="num">{fmtShortDate(x1)}</text>}
        <circle cx={x(last.x)} cy={y(last.y)} r="4" fill="var(--chart-1)" stroke="var(--md-surface)" stroke-width="2" />
        {h && <>
          <line x1={x(h.x)} x2={x(h.x)} y1={M.t} y2={H - M.b} stroke="var(--md-outline)" stroke-width="1" />
          <circle cx={x(h.x)} cy={y(h.y)} r="5" fill="var(--chart-1)" stroke="var(--md-surface)" stroke-width="2" />
        </>}
      </svg>
      <Tooltip tip={h ? { x: x(h.x), y: y(h.y), value: `${fmtNum(h.y)} ${unit}`, label: fmtShortDate(h.x) } : null} W={W} H={H} />
    </div>
  );
}

/** Single-series columns, e.g. volume per week. */
export function BarChart({ bars, unit, label, width: W = 340, height: H = 180 }: { bars: { label: string; value: number }[]; unit: string; label: string } & ChartSize) {
  const [hover, setHover] = useState<number | null>(null);
  const ticks = niceTicks(0, Math.max(1, ...bars.map((b) => b.value)));
  const top = ticks[ticks.length - 1];
  const y = (v: number) => H - M.b - (v / top) * (H - M.t - M.b);
  const band = (W - M.l - M.r) / bars.length, bw = Math.min(24, band - 2);
  const bx = (i: number) => M.l + i * band + (band - bw) / 2;
  const col = (i: number, v: number) => {
    const h = H - M.b - y(v), r = Math.min(4, h, bw / 2), x0 = bx(i), yt = y(v);
    return h <= 0 ? '' : `M${x0} ${H - M.b}V${yt + r}Q${x0} ${yt} ${x0 + r} ${yt}H${x0 + bw - r}Q${x0 + bw} ${yt} ${x0 + bw} ${yt + r}V${H - M.b}Z`;
  };
  const lastIdx = bars.length - 1;
  const h = hover === null ? null : bars[hover];
  return (
    <div style={{ position: 'relative' }}>
      <svg class="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onPointerLeave={() => setHover(null)}>
        <YAxis ticks={ticks} y={y} W={W} />
        {bars.map((b, i) => (
          <g onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} tabIndex={0} onFocus={() => setHover(i)}
            aria-label={`${b.label}: ${fmtNum(b.value)} ${unit}`}>
            <rect x={M.l + i * band} y={M.t} width={band} height={H - M.t - M.b} fill="transparent" />
            <path d={col(i, b.value)} fill="var(--chart-1)" opacity={hover === null || hover === i ? 1 : 0.55} />
            {(i === 0 || i === lastIdx || i === Math.floor(lastIdx / 2)) &&
              <text x={bx(i) + bw / 2} y={H - 6} text-anchor="middle">{b.label}</text>}
          </g>
        ))}
        {bars[lastIdx]?.value > 0 && hover === null &&
          <text x={bx(lastIdx) + bw / 2} y={y(Math.max(bars[lastIdx].value, bars[lastIdx - 1]?.value ?? 0)) - 6} text-anchor="middle" class="num"
            style={{ fill: 'var(--md-on-surface)' }}>{compact(bars[lastIdx].value)}</text>}
      </svg>
      <Tooltip tip={h ? { x: bx(hover!) + bw / 2, y: y(h.value), value: `${fmtNum(h.value)} ${unit}`, label: h.label } : null} W={W} H={H} />
    </div>
  );
}
