// Base45 (RFC 9285): packs bytes into the QR alphanumeric charset, ~97% as dense as raw binary QR.
const C = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

export function encode45(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 2) {
    if (i + 1 < bytes.length) {
      const n = bytes[i] * 256 + bytes[i + 1];
      out += C[n % 45] + C[Math.floor(n / 45) % 45] + C[Math.floor(n / 2025)];
    } else {
      out += C[bytes[i] % 45] + C[Math.floor(bytes[i] / 45)];
    }
  }
  return out;
}

export function decode45(s: string): Uint8Array {
  if (s.length % 3 === 1) throw new Error('base45: invalid length');
  const v = [...s].map((ch) => { const i = C.indexOf(ch); if (i < 0) throw new Error('base45: invalid character'); return i; });
  const out: number[] = [];
  for (let i = 0; i < v.length; i += 3) {
    if (i + 2 < v.length) {
      const n = v[i] + v[i + 1] * 45 + v[i + 2] * 2025;
      if (n > 0xffff) throw new Error('base45: overflow');
      out.push(n >> 8, n & 0xff);
    } else {
      const n = v[i] + v[i + 1] * 45;
      if (n > 0xff) throw new Error('base45: overflow');
      out.push(n);
    }
  }
  return Uint8Array.from(out);
}
