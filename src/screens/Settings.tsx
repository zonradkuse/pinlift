import { useEffect, useState } from 'preact/hooks';
import { Icon, ListItem, SwitchRow, TopBar, confirmDialog } from '../components/ui.tsx';
import { updateLocal, useStore, type LocalState } from '../lib/store.ts';
import { deviceName } from '../lib/selectors.ts';
import { resetData, setDeviceSettings } from '../lib/actions.ts';
import { importFile } from '../components/ImportActions.tsx';
import { openIntro, toast } from '../lib/ui-state.ts';
import { connectStrava, disconnectStrava, redeemCode } from '../lib/strava-flow.ts';
import { exportCsv, exportJson } from '../lib/backup.ts';
import { canCheckForUpdates, checkForUpdate, isStandalone } from '../lib/pwa.ts';
import { errorText, fmtDate } from '../lib/format.ts';
import { navigate } from '../lib/router.ts';
import { href, to } from '../lib/routes.ts';
import type { AppData } from '../lib/types.ts';

function TransferSection({ local }: { local: LocalState }) {
  return (
    <>
      <h2 class="title-m section-title">Transfer data</h2>
      <p class="body-m muted">Move your data between phone and computer by scanning QR codes. Nothing leaves your devices.</p>
      <div class="grid-2" style={{ marginTop: '12px' }}>
        <a class="btn tonal interactive" href={href(to.send())}><Icon name="qr_code" />Send</a>
        <a class="btn tonal interactive" href={href(to.scan())}><Icon name="qr_code_scanner" />Receive</a>
        <button class="btn outlined interactive" onClick={exportJson}><Icon name="download" />Export file</button>
        <label class="btn outlined interactive"><Icon name="upload" />Import file
          <input type="file" accept="application/json,.json" class="sr-only" onChange={(e) => {
            const input = e.target as HTMLInputElement;
            if (input.files?.[0]) importFile(input.files[0]);
            input.value = '';
          }} /></label>
        <button class="btn text interactive" style={{ gridColumn: 'span 2' }} onClick={exportCsv}><Icon name="download" />Export CSV for spreadsheets</button>
      </div>
      {local.lastBackupAt && <p class="body-s muted mt-8">Last backup: {fmtDate(local.lastBackupAt)}</p>}
    </>
  );
}

const WorkoutSection = ({ local }: { local: LocalState }) => (
  <>
    <h2 class="title-m section-title">Workout</h2>
    <SwitchRow title="Keep screen on" supporting="While a workout is running, so the phone doesn't lock between sets."
      checked={local.keepAwake !== false} onChange={(keepAwake) => updateLocal({ keepAwake })} />
    <SwitchRow title="Sound when rest is over" supporting="The phone vibrates when the rest is over. iPhones can't vibrate from websites; turn this on there."
      checked={!!local.restSound} onChange={(restSound) => updateLocal({ restSound })} />
  </>
);

function StravaSection({ local }: { local: LocalState }) {
  const [clientId, setClientId] = useState(local.strava?.clientId ?? '');
  const [clientSecret, setSecret] = useState(local.strava?.clientSecret ?? '');
  const [code, setCode] = useState('');
  const input = (set: (v: string) => void) => (e: Event) => set((e.target as HTMLInputElement).value.trim());
  if (local.strava?.refreshToken) {
    return (
      <>
        <h2 class="title-m section-title">Strava</h2>
        <div class="card row">
          <Icon name="link" />
          <div class="spacer body-m">Connected{local.strava.athlete ? ` as ${local.strava.athlete}` : ''}. Post workouts from their summary.</div>
          <button class="btn text interactive" onClick={disconnectStrava}>Disconnect</button>
        </div>
      </>
    );
  }
  return (
    <>
      <h2 class="title-m section-title">Strava</h2>
      <div class="stack">
        <details class="body-m">
          <summary class="label-l" style={{ cursor: 'pointer' }}>How to set up (one time, ~2 minutes)</summary>
          <ol style={{ paddingLeft: '20px' }}>
            <li>Open <a href="https://www.strava.com/settings/api" target="_blank" rel="noopener noreferrer">strava.com/settings/api</a> and create an app (any name and website).</li>
            <li>Set <strong>Authorization Callback Domain</strong> to <code>{location.hostname}</code>.</li>
            <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> below and tap Connect.</li>
          </ol>
          The secret is stored only on this device and is never included in transfers.
        </details>
        <label class="field"><span>Client ID</span><input inputMode="numeric" value={clientId} onInput={input(setClientId)} /></label>
        <label class="field"><span>Client secret</span><input type="password" autoComplete="off" value={clientSecret} onInput={input(setSecret)} /></label>
        <button class="btn interactive" disabled={!clientId || !clientSecret} onClick={() => connectStrava(clientId, clientSecret)}><Icon name="link" />Connect Strava</button>
        <details class="body-m">
          <summary class="label-l" style={{ cursor: 'pointer' }}>Got a code from the browser?</summary>
          <p class="muted">On iPhone the Strava login may finish in Safari instead of the installed app. Paste the code it shows here.</p>
          <div class="row mt-8">
            <label class="field spacer"><span>Code</span><input value={code} onInput={input(setCode)} /></label>
            <button class="btn tonal interactive" disabled={!code || !clientId || !clientSecret} onClick={async () => {
              try { await redeemCode(code, { clientId, clientSecret }); setCode(''); } catch (e) { toast(errorText(e)); }
            }}>Use code</button>
          </div>
        </details>
      </div>
    </>
  );
}

function DevicesSection({ data }: { data: AppData }) {
  const hidden = Object.entries(data.deviceSettings).filter(([, s]) => s.hidden).map(([id]) => id);
  return (
    <>
      <h2 class="title-m section-title">Devices</h2>
      <ul class="list"><ListItem href={href(to.devices())} leading={<Icon name="list_alt" />} title="Manage devices" trailing={<Icon name="chevron_right" />} /></ul>
      {hidden.length > 0 && <>
        <div class="list-subheader" style={{ paddingLeft: 0 }}>Hidden devices</div>
        <ul class="list">{hidden.map((id) => (
          <ListItem title={deviceName(data, id)} trailing={<button class="btn text interactive" onClick={() => setDeviceSettings(id, { hidden: false })}>Show</button>} />
        ))}</ul>
      </>}
    </>
  );
}

function StorageSection() {
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => { navigator.storage?.persisted?.().then(setPersisted).catch(() => {}); }, []);
  const reset = async () => {
    if (await confirmDialog({ title: 'Delete all data?', body: 'All workouts, plans and settings on this device are deleted. Export first if unsure.', confirm: 'Delete everything', danger: true })) {
      resetData(); toast('All data deleted'); navigate(to.home());
    }
  };
  return (
    <>
      <h2 class="title-m section-title">Storage</h2>
      <p class="body-m muted">
        Data is stored in this browser only{persisted === false ? ' and may be cleared by the browser when space runs low' : ''}.
        {!isStandalone() && ' Install the app (Share → Add to Home Screen on iPhone, or the install prompt on Android) — on iPhone, data of non-installed sites is deleted after 7 days without a visit.'}
        {' '}Transfer or export regularly as a backup.
      </p>
      <button class="btn text danger interactive mt-8" style={{ paddingLeft: 0 }} onClick={reset}><Icon name="delete" />Delete all data</button>
    </>
  );
}

const VersionSection = () => (
  <>
    <h2 class="title-m section-title">App version</h2>
    <div class="row">
      <span class="body-m spacer">Pinlift {__APP_VERSION__}</span>
      <button class="btn text interactive" onClick={openIntro}>Show introduction</button>
      {canCheckForUpdates() && <button class="btn text interactive" onClick={async () => {
        const r = await checkForUpdate();
        if (r !== 'update') toast(r === 'latest' ? 'You have the latest version' : 'Could not check for updates. Are you online?');
      }}>Check for updates</button>}
    </div>
  </>
);

export function Settings() {
  const { data, local } = useStore();
  return (
    <main class="screen">
      <TopBar title="Settings" />
      <TransferSection local={local} />
      <WorkoutSection local={local} />
      <StravaSection local={local} />
      <DevicesSection data={data} />
      <StorageSection />
      <VersionSection />
    </main>
  );
}

export function StravaCode({ code }: { code: string }) {
  return (
    <main class="screen no-nav">
      <TopBar title="Strava code" up={to.settings()} />
      <div class="stack">
        <p class="body-m">Strava finished the login in this browser, but the app keeps its settings separately. Copy this code, open the installed app, go to <strong>Settings → Strava → Got a code</strong> and paste it within a few minutes.</p>
        <div class="card title-m" style={{ wordBreak: 'break-all' }} data-testid="strava-code">{code}</div>
        <button class="btn interactive" onClick={() => navigator.clipboard.writeText(code).then(() => toast('Code copied'))}>Copy code</button>
      </div>
    </main>
  );
}
