import { useRef, useState } from 'preact/hooks';
import { Scanner } from '../components/Scanner.tsx';
import { Icon, confirmDialog } from '../components/ui.tsx';
import { getData } from '../lib/store.ts';
import { deviceName, devicesForQr } from '../lib/selectors.ts';
import { importAndReport, linkQr } from '../lib/actions.ts';
import { toast } from '../lib/ui-state.ts';
import { errorText } from '../lib/format.ts';
import { navigate } from '../lib/router.ts';
import { href, to } from '../lib/routes.ts';
import { Assembler, parseFrame, unpack } from '../lib/transfer.ts';

/** Camera screen for machine QR codes and for receiving data from another device. With `link`, a code is linked to that device. */
export function ScanScreen({ link, back }: { link?: string; back?: string }) {
  const asm = useRef(new Assembler());
  const busy = useRef(false);
  const [progress, setProgress] = useState<{ received: number; total: number } | null>(null);

  const finishTransfer = async () => {
    try {
      const { data: remote, dropped } = await unpack(asm.current.bytes(), asm.current.version);
      const sessions = Object.values(remote.sessions).filter((s) => !s.deleted).length;
      const plans = Object.values(remote.workouts).filter((w) => !w.deleted).length;
      if (await confirmDialog({ title: 'Import data?', confirm: 'Import',
        body: `Received ${sessions} workouts and ${plans} workout plans. They are merged with the data on this device; newer changes win.` })) {
        importAndReport(remote, dropped);
        return navigate(back ?? to.history(), true);
      }
    } catch (e) {
      toast(`Transfer failed: ${errorText(e)}`);
    }
    asm.current = new Assembler();
    setProgress(null);
    busy.current = false;
  };

  const onDeviceCode = (text: string) => {
    if (link) {
      toast(`QR code linked to ${deviceName(getData(), link)}`, { label: 'Undo', run: linkQr(text, link) });
      return navigate(to.device(link), true);
    }
    const ids = devicesForQr(getData(), text);
    navigate(ids.length === 1 ? to.device(ids[0]) : ids.length ? to.choose(text) : to.devices({ assign: text }), true);
  };

  const onCode = (text: string) => {
    if (busy.current) return;
    const frame = parseFrame(text);
    if (frame) {
      asm.current.add(frame);
      setProgress({ received: asm.current.received, total: asm.current.total });
      if (asm.current.complete) { busy.current = true; finishTransfer(); }
      return;
    }
    if (progress) return; // ignore machine codes while a transfer is running
    busy.current = true;
    onDeviceCode(text);
  };

  return (
    <div class="scanner">
      <Scanner onCode={onCode} />
      <div class="top">
        <a class="icon-btn interactive" href={href(link ? to.device(link) : back ?? to.home())} aria-label="Close scanner"><Icon name="close" /></a>
        <span class="title-m">{link ? 'Scan QR code to link' : progress ? 'Receiving data' : 'Scan device'}</span>
      </div>
      <div class="bottom">
        {progress ? (
          <>
            <div class="title-m num" data-testid="transfer-progress">{progress.received} / {progress.total} codes</div>
            <div class="progress"><div style={{ width: `${(progress.received / progress.total) * 100}%` }} /></div>
            <div class="body-m">Keep the camera on the other screen until all codes are collected.</div>
          </>
        ) : (
          <>
            <div class="body-m">{link ? 'Point the camera at the QR code on the machine.' : 'Point the camera at a machine QR code — or at the transfer codes of another device.'}</div>
            {!link && <a class="btn tonal interactive" href={href(to.devices())}><Icon name="list_alt" />Pick from list</a>}
          </>
        )}
      </div>
    </div>
  );
}
