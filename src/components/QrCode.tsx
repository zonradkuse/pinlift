import { encode } from 'uqr';

/** Renders text as a QR code: one SVG path, crisp at any size. */
export function QrCode({ text, ecc = 'M', label }: { text: string; ecc?: 'L' | 'M' | 'Q' | 'H'; label?: string }) {
  const { data, size } = encode(text, { ecc, border: 2 });
  let d = '';
  data.forEach((row, y) => row.forEach((on, x) => { if (on) d += `M${x} ${y}h1v1h-1z`; }));
  return (
    <div class="qr-box">
      <svg viewBox={`0 0 ${size} ${size}`} shape-rendering="crispEdges" role="img" aria-label={label ?? 'QR code'}>
        <path d={d} fill="#000" />
      </svg>
    </div>
  );
}
