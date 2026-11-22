import { useState } from 'preact/hooks';
import { Empty, Icon, ListItem, TopBar } from '../components/ui.tsx';
import { Pictogram } from '../components/Pictogram.tsx';
import { useStore } from '../lib/store.ts';
import { activeSession, allDevices, devicesForQr, devicesWithQr, lastBest, remainingPlan } from '../lib/selectors.ts';
import { linkQr } from '../lib/actions.ts';
import { toast } from '../lib/ui-state.ts';
import { fmtSet } from '../lib/format.ts';
import { navigate } from '../lib/router.ts';
import { href, to } from '../lib/routes.ts';
import { FILTER_GROUPS, inGroups, muscleSummary } from '../data/catalog.ts';
import type { Device } from '../lib/types.ts';

/** Device list. With `assign`, picking links a new QR code; with `addTo`, picking adds an exercise to an existing code. */
export function Picker({ assign, addTo }: { assign?: string; addTo?: string }) {
  const { data } = useStore();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const withQr = devicesWithQr(data);
  const code = assign ?? addTo;
  const active = activeSession(data);
  const devices = allDevices(data)
    .filter((d) => d.name.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((d) => !group || inGroups(d, [group]))
    .filter((d) => !addTo || !devicesForQr(data, addTo).includes(d.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  // While linking a sticker mid-workout, the machine is almost always the next one of the plan.
  const planNext = code && !q && !group ? remainingPlan(data, active).filter((d) => !withQr.has(d.id)) : [];
  const shown = new Set(planNext.map((d) => d.id));
  const noQr = devices.filter((d) => !withQr.has(d.id) && !shown.has(d.id)), qr = devices.filter((d) => withQr.has(d.id) && !shown.has(d.id));

  const pick = (d: Device) => {
    if (!code) return navigate(to.device(d.id));
    const undo = linkQr(code, d.id, !!addTo);
    toast(`QR code linked to ${d.name}`, { label: 'Undo', run: () => { undo(); if (assign) navigate(to.devices({ assign }), true); } });
    navigate(to.device(d.id), true);
  };
  const item = (d: Device) => {
    const top = lastBest(data, d);
    return (
      <ListItem onClick={() => pick(d)} title={d.name} supporting={muscleSummary(d)}
        leading={<span class="pictogram-tile"><Pictogram device={d} size={40} /></span>}
        trailing={<>{top && <span class="trailing num">{fmtSet(top, { bw: d.bodyweight })}</span>}{withQr.has(d.id) && <Icon name="qr_code" size={18} />}</>} />
    );
  };

  return (
    <main class="screen no-nav">
      <TopBar title={assign ? 'Which device is this?' : addTo ? 'Add exercise to QR code' : 'Devices'} up={assign ? to.scan() : active ? to.session() : to.home()} />
      {assign && <div class="card tertiary body-m notice">New QR code. Pick the device it belongs to — next time, scanning it opens the device directly.</div>}
      {addTo && <div class="card tertiary body-m notice">Pick another exercise done on this machine (e.g. bench and squat on the Smith machine). Scanning the code will then let you choose.</div>}
      <label class="search"><Icon name="search" /><input type="search" placeholder="Search devices" aria-label="Search devices"
        value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} /></label>
      <div class="chips" style={{ margin: '8px -16px' }} role="group" aria-label="Filter by muscle group">
        {FILTER_GROUPS.map((x) => (
          <button class="chip interactive" aria-pressed={group === x.id} onClick={() => setGroup(group === x.id ? null : x.id)}>
            {group === x.id && <Icon name="check" />}{x.name}</button>
        ))}
      </div>
      {!devices.length && <Empty icon="search">No device matches.</Empty>}
      {planNext.length > 0 && <><div class="list-subheader">Next in your plan</div><ul class="list">{planNext.map(item)}</ul></>}
      {noQr.length > 0 && <><div class="list-subheader">Without QR code</div><ul class="list">{noQr.map(item)}</ul></>}
      {qr.length > 0 && <><div class="list-subheader">With QR code</div><ul class="list">{qr.map(item)}</ul></>}
      <a class="btn outlined interactive mt-16" href={href(to.newDevice(assign))}><Icon name="add" />Add custom device</a>
      {!code && <a class="fab no-nav interactive" href={href(to.scan())}><Icon name="qr_code_scanner" />Scan</a>}
    </main>
  );
}
