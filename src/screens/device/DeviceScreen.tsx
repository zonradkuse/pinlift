import { useState } from 'preact/hooks';
import { Empty, Icon, TopBar } from '../../components/ui.tsx';
import { RestBar } from '../../components/RestBar.tsx';
import { useStore } from '../../lib/store.ts';
import { activeSession, getDevice } from '../../lib/selectors.ts';
import { href, to } from '../../lib/routes.ts';
import { StrengthLogger } from './StrengthLogger.tsx';
import { CardioLogger } from './CardioLogger.tsx';
import { DeviceAbout } from './DeviceAbout.tsx';
import { DeviceHistory } from './DeviceHistory.tsx';

type Tab = 'log' | 'about' | 'history';
const TABS: [Tab, string][] = [['log', 'Log'], ['about', 'About'], ['history', 'History']];

export function DeviceScreen({ id }: { id: string }) {
  const { data } = useStore();
  const [tab, setTab] = useState<Tab>('log');
  const dev = getDevice(data, id);
  const active = activeSession(data);
  if (!dev) return <main class="screen no-nav"><TopBar title="Unknown device" up={to.devices()} /><Empty icon="info">This device does not exist.</Empty></main>;
  return (
    <main class="screen no-nav">
      <TopBar title={dev.name} up={active ? to.session() : to.devices()} />
      <div class="tabs" role="tablist">
        {TABS.map(([t, label]) => <button role="tab" aria-selected={tab === t} class="interactive" onClick={() => setTab(t)}>{label}</button>)}
      </div>
      {tab === 'log' && (dev.kind === 'cardio' ? <CardioLogger data={data} dev={dev} active={active} /> : <StrengthLogger data={data} dev={dev} active={active} />)}
      {tab === 'about' && <DeviceAbout data={data} dev={dev} />}
      {tab === 'history' && <DeviceHistory data={data} dev={dev} />}
      <a class="fab no-nav interactive" href={href(to.scan())} aria-label="Scan next device"><Icon name="qr_code_scanner" /></a>
      <RestBar />
    </main>
  );
}
