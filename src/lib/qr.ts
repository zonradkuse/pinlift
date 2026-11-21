import type { QrLink } from './types.ts';

export const qrDevices = (l?: QrLink): string[] => (!l || l.deleted ? [] : l.deviceIds ?? (l.deviceId ? [l.deviceId] : []));

// `deviceId` mirrors the first device so that app versions before multi-device links keep working after a sync.
// Fields of `prev` are kept, so links written by newer app versions survive changes made here.
function link(prev: QrLink | undefined, deviceIds: string[], now: number): QrLink {
  const { deleted: _deleted, ...rest } = prev ?? ({} as QrLink);
  return deviceIds.length ? { ...rest, deviceIds, deviceId: deviceIds[0], updatedAt: now } : { ...rest, deviceIds, deviceId: '', updatedAt: now, deleted: true };
}

/** A removed link (kept so the removal syncs). */
export const tombstone = (now: number, prev?: QrLink) => link(prev, [], now);

export const linkTo = (deviceId: string, now: number, prev?: QrLink) => link(prev, [deviceId], now);
export const withDevice = (l: QrLink | undefined, deviceId: string, now: number) => link(l, [...new Set([...qrDevices(l), deviceId])], now);
export const withoutDevice = (l: QrLink | undefined, deviceId: string, now: number) => link(l, qrDevices(l).filter((id) => id !== deviceId), now);
