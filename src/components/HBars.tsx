import { fmtNum } from '../lib/format.ts';

/** Horizontal single-series bars with the value at the tip (e.g. sets per muscle group). */
export function HBars({ rows, unit }: { rows: { label: string; value: number }[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div class="hbars" role="list">
      {rows.map((r) => (
        <div class="hbar" role="listitem" aria-label={`${r.label}: ${fmtNum(r.value)} ${unit}`} title={`${r.label}: ${fmtNum(r.value)} ${unit}`}>
          <span class="body-m">{r.label}</span>
          <span class="hbar-track"><span class="hbar-fill" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span class="body-m num muted">{fmtNum(r.value)}</span>
        </div>
      ))}
    </div>
  );
}
