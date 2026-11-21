import { Icon, confirmDialog } from './ui.tsx';
import { importAndReport } from '../lib/actions.ts';
import { toast } from '../lib/ui-state.ts';
import { sanitize } from '../lib/sync.ts';
import { errorText } from '../lib/format.ts';
import { href, to } from '../lib/routes.ts';

/** Validates an export file and merges it after confirmation. */
export async function importFile(file: File) {
  try {
    const { data: remote, dropped } = sanitize(JSON.parse(await file.text()));
    if (await confirmDialog({ title: 'Import file?', body: 'The file is merged with the data on this device; newer changes win.', confirm: 'Import' })) importAndReport(remote, dropped);
  } catch (e) { toast(`Import failed: ${errorText(e)}`); }
}

/** Drag & drop of an export file onto an element (desktop). */
export const fileDropHandlers = {
  onDragOver: (e: DragEvent) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); },
  onDrop: (e: DragEvent) => {
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    e.preventDefault();
    importFile(file);
  },
};

/** "Receive from phone" (QR codes through the camera) and "Import file"; `back` is where receiving returns to. */
export const ImportActions = ({ back }: { back: string }) => (
  <div class="row wrap">
    <a class="btn interactive" href={href(to.receive(back))}><Icon name="qr_code_scanner" />Receive from phone</a>
    <label class="btn outlined interactive"><Icon name="upload" />Import file
      <input type="file" accept="application/json,.json" class="sr-only" onChange={(e) => {
        const input = e.target as HTMLInputElement;
        if (input.files?.[0]) importFile(input.files[0]);
        input.value = '';
      }} /></label>
  </div>
);
