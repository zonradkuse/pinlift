import { encode45, decode45 } from './base45.ts';
import { SYNCED_KEYS, type AppData } from './types.ts';
import { sanitize } from './sync.ts';
import { fromWire, toWire } from './wire.ts';
import { randomId } from './id.ts';

// Frame: "GT2:<id>:<index>/<total>:<base45 chunk>" – entirely QR alphanumeric, so QR codes stay small.
// GT1 (the stored format, before the compact wire format) is still accepted.
const FRAME = /^GT([12]):([0-9A-Z]{4}):(\d+)\/(\d+):([0-9A-Z $%*+\-./:]*)$/;

export interface Frame { version: 1 | 2; id: string; index: number; total: number; data: Uint8Array }

const streamBytes = async (input: BlobPart, t: CompressionStream | DecompressionStream) =>
  new Uint8Array(await new Response(new Blob([input]).stream().pipeThrough(t)).arrayBuffer());

export const pack = (data: AppData) => streamBytes(JSON.stringify(toWire(data)), new CompressionStream('deflate-raw'));

/** Decompresses, decodes and validates a transfer; malformed records are dropped (see sanitize). */
export async function unpack(bytes: Uint8Array, version: 1 | 2 = 2): Promise<{ data: AppData; dropped: number }> {
  const json: unknown = JSON.parse(new TextDecoder().decode(await streamBytes(bytes as BlobPart, new DecompressionStream('deflate-raw'))));
  return sanitize(version === 2 ? fromWire(json) : json);
}

/** Only records changed after `since` (deletions included). Safe to merge because merging is per record. */
export function changedSince(d: AppData, since: number): AppData {
  const out = { schema: 1 } as AppData;
  for (const k of SYNCED_KEYS) (out as unknown as Record<string, object>)[k] = Object.fromEntries(Object.entries(d[k]).filter(([, v]) => v.updatedAt > since));
  return out;
}


export function toFrames(bytes: Uint8Array, chunkSize: number, id = randomId()): string[] {
  const total = Math.max(1, Math.ceil(bytes.length / chunkSize));
  return Array.from({ length: total }, (_, i) =>
    `GT2:${id}:${i}/${total}:${encode45(bytes.subarray(i * chunkSize, (i + 1) * chunkSize))}`);
}

export function parseFrame(text: string): Frame | null {
  const m = FRAME.exec(text);
  if (!m || +m[3] >= +m[4]) return null;
  try { return { version: +m[1] as 1 | 2, id: m[2], index: +m[3], total: +m[4], data: decode45(m[5]) }; } catch { return null; }
}

export class Assembler {
  id = '';
  total = 0;
  version: 1 | 2 = 2;
  private parts = new Map<number, Uint8Array>();
  get received() { return this.parts.size; }
  get complete() { return this.total > 0 && this.parts.size === this.total; }
  has(index: number) { return this.parts.has(index); }
  add(f: Frame) {
    if (f.id !== this.id || f.total !== this.total || f.version !== this.version) { this.id = f.id; this.total = f.total; this.version = f.version; this.parts.clear(); }
    this.parts.set(f.index, f.data);
  }
  bytes(): Uint8Array {
    const chunks = Array.from({ length: this.total }, (_, i) => this.parts.get(i)!);
    const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    chunks.reduce((off, c) => (out.set(c, off), off + c.length), 0);
    return out;
  }
}
