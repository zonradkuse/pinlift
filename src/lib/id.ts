/** Short random id from [0-9A-Z] (QR-alphanumeric safe). */
export const randomId = (len = 4) =>
  Array.from(crypto.getRandomValues(new Uint8Array(len)), (b) => '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[b % 36]).join('');

/** Record id: 12 characters (~62 bits) keep transfers small; older data uses UUIDs, which stay valid. */
export const uid = () => randomId(12);

/** Entry id, unique within its session. */
export function entryId(taken: { id: string }[]): string {
  for (;;) { const id = randomId(4); if (!taken.some((e) => e.id === id)) return id; }
}
