import { Icon, ListItem, TopBar } from '../components/ui.tsx';
import { Pictogram } from '../components/Pictogram.tsx';
import { useStore } from '../lib/store.ts';
import { devicesByIds, devicesForQr, lastBest } from '../lib/selectors.ts';
import { live } from '../lib/stats.ts';
import { fmtSet } from '../lib/format.ts';
import { href, to } from '../lib/routes.ts';

/** A code linked to several exercises (Smith machine, cable tower): pick one, most recently used first. */
export function Choose({ code }: { code: string }) {
  const { data } = useStore();
  const sessions = live(Object.values(data.sessions));
  const lastUsed = (id: string) => sessions.findLast((s) => s.entries.some((e) => e.deviceId === id))?.startedAt ?? 0;
  const devices = devicesByIds(data, devicesForQr(data, code)).sort((a, b) => lastUsed(b.id) - lastUsed(a.id));
  return (
    <main class="screen no-nav">
      <TopBar title="Which exercise?" up={to.scan()} />
      <ul class="list">
        {devices.map((d) => {
          const top = lastBest(data, d);
          return <ListItem href={href(to.device(d.id))} title={d.name} leading={<span class="pictogram-tile"><Pictogram device={d} size={40} /></span>} supporting={top ? `Last: ${fmtSet(top)}` : 'Not done yet'} trailing={<Icon name="chevron_right" />} />;
        })}
      </ul>
      <a class="btn outlined interactive mt-16" href={href(to.devices({ addTo: code }))}><Icon name="add" />Add exercise to this code</a>
    </main>
  );
}
