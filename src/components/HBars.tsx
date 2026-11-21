import { fmtNum } from '../lib/format.ts';

/** Horizontal single-series bars with the value at the tip (e.g. sets per muscle group). `unit` is plural. */
export function HBars({ rows, unit }: { rows: { label: string; value: number }[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div class="hbars" role="list">
      {rows.map((r) => {
        const text = `${r.label}: ${fmtNum(r.value)} ${r.value === 1 ? unit.replace(/s$/, '') : unit}`;
        return <div class="hbar" role="listitem" aria-label={text} title={text}>
          <span class="body-m">{r.label}</span>
          <span class="hbar-track">{r.value > 0 && <span class="hbar-fill" style={{ width: `${(r.value / max) * 100}%` }} />}</span>
          <span class="body-m num muted">{fmtNum(r.value)}</span>
        </div>;
      })}
    </div>
  );
}
