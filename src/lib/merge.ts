import { SYNCED_KEYS, type AppData, type Synced } from './types.ts';

/** A tie (same updatedAt, different content) is broken the same way on every device, so both converge. */
const remoteWins = (l: Synced | undefined, r: Synced) =>
  !l || r.updatedAt > l.updatedAt || (r.updatedAt === l.updatedAt && JSON.stringify(r) > JSON.stringify(l));

/** Last-writer-wins per record. */
export function mergeData(local: AppData, remote: AppData): { data: AppData; changed: number } {
  const data = structuredClone(local);
  let changed = 0;
  for (const k of SYNCED_KEYS) {
    const target = data[k] as Record<string, Synced>;
    for (const [id, r] of Object.entries(remote[k] as Record<string, Synced>)) {
      if (remoteWins(target[id], r)) { target[id] = structuredClone(r); changed++; }
    }
  }
  return { data, changed };
}
