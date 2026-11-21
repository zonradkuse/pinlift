// Backups: JSON/CSV export and when to remind the user.
import { getData, updateLocal } from './store.ts';
import { deviceLookup } from './selectors.ts';
import { toCsv } from './csv.ts';
import { DAY_MS } from './stats.ts';

export const BACKUP_REMINDER_DAYS = 14;
const MIN_WORKOUTS_FOR_REMINDER = 3;

/** null = no reminder; otherwise days since the last backup (null when there never was one). */
export function backupReminder(finishedWorkouts: number, lastBackupAt: number | undefined, now = Date.now()): { daysSince: number | null } | null {
  if (finishedWorkouts < MIN_WORKOUTS_FOR_REMINDER) return null;
  if (lastBackupAt === undefined) return { daysSince: null };
  const daysSince = Math.floor((now - lastBackupAt) / DAY_MS);
  return daysSince >= BACKUP_REMINDER_DAYS ? { daysSince } : null;
}

function download(content: string, type: string, ext: string) {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([content], { type })), download: `pinlift-${new Date().toISOString().slice(0, 10)}.${ext}`,
  });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function exportJson() {
  download(JSON.stringify(getData(), null, 1), 'application/json', 'json');
  updateLocal({ lastBackupAt: Date.now() });
}

export const exportCsv = () => { const d = getData(); download(toCsv(d, deviceLookup(d)), 'text/csv', 'csv'); };
