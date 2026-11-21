// Minimal IndexedDB key-value store.
let dbp: Promise<IDBDatabase> | undefined;
const open = () => (dbp ??= new Promise((resolve, reject) => {
  // Storage name kept from before the app was called Pinlift, so existing data stays.
  const req = indexedDB.open('gym-tracker', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('kv');
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
}));

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction('kv', mode).objectStore('kv'));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

export const dbGet = <T>(key: string) => run<T | undefined>('readonly', (s) => s.get(key));
export const dbSet = (key: string, value: unknown) => run<void>('readwrite', (s) => s.put(value, key));
