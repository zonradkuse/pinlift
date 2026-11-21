// Transfer format v2: the stored format with times inside a workout written as seconds after its start, and the
// session id only as the key. Lossless (also for older millisecond data) and ~40% smaller after compression.
import type { AppData, Entry, Session } from './types.ts';

export const WIRE_VERSION = 2;

const rel = (t: number, start: number) => (t - start) / 1000;
const abs = (v: number, start: number) => start + Math.round(v * 1000);

function mapTimes(s: Session, f: (t: number) => number): Session {
  const entries = s.entries.map((e): Entry => ({
    ...e, sets: e.sets.map((x) => ({ ...x, at: f(x.at) })), ...(e.cardio ? { cardio: { ...e.cardio, at: f(e.cardio.at) } } : {}),
  }));
  return { ...s, ...(s.endedAt !== undefined ? { endedAt: f(s.endedAt) } : {}), entries };
}

export function toWire(d: AppData): object {
  const sessions: Record<string, object> = {};
  for (const [id, s] of Object.entries(d.sessions)) {
    const w: Partial<Session> = mapTimes(s, (t) => rel(t, s.startedAt));
    delete w.id;
    sessions[id] = w;
  }
  return { ...d, v: WIRE_VERSION, sessions };
}

/** Inverse of toWire. The result still has to go through sanitize(). */
export function fromWire(w: unknown): unknown {
  const x = w as { v?: unknown; sessions?: Record<string, Session> } | null;
  if (!x || x.v !== WIRE_VERSION || typeof x.sessions !== 'object' || !x.sessions) throw new Error('Not a Pinlift transfer');
  const sessions: Record<string, Session> = {};
  for (const [id, s] of Object.entries(x.sessions)) {
    sessions[id] = typeof s?.startedAt === 'number' && Array.isArray(s.entries) ? mapTimes({ ...s, id }, (v) => abs(v, s.startedAt)) : s;
  }
  const { v: _v, ...rest } = x as Record<string, unknown>;
  return { ...rest, sessions };
}
