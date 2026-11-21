import { useErrorBoundary } from 'preact/hooks';
import { Intro } from './components/Intro.tsx';
import { useRoute } from './lib/router.ts';
import { Crash } from './components/Crash.tsx';
import { useStore } from './lib/store.ts';
import { activeSession } from './lib/selectors.ts';
import { closeIntro, isForgotten, isIntroOpen } from './lib/ui-state.ts';
import { DialogHost, NAV, NavBar, Snackbar, useWakeLock } from './components/ui.tsx';
import { Train } from './screens/Train.tsx';
import { SessionScreen } from './screens/Session.tsx';
import { DeviceScreen } from './screens/device/DeviceScreen.tsx';
import { Picker } from './screens/Picker.tsx';
import { NewDevice } from './screens/NewDevice.tsx';
import { Choose } from './screens/Choose.tsx';
import { ScanScreen } from './screens/Scan.tsx';
import { Summary } from './screens/Summary.tsx';
import { WorkoutEditor } from './screens/WorkoutEditor.tsx';
import { History } from './screens/History.tsx';
import { Stats } from './screens/Stats.tsx';
import { Awards } from './screens/Awards.tsx';
import { Settings, StravaCode } from './screens/Settings.tsx';
import { Send } from './screens/Send.tsx';
import { PlanPreview } from './screens/PlanPreview.tsx';

const TOP_LEVEL = new Set(NAV.map(([path]) => path));

export function App() {
  const [error, resetError] = useErrorBoundary((e) => console.error(e));
  const { path: [p0 = '', p1 = ''], query } = useRoute();
  const { data, local } = useStore();
  const active = activeSession(data);
  useWakeLock(!!active && !isForgotten(active) && local.keepAwake !== false);
  const screen = (() => {
    switch (p0) {
      case '': return <Train />;
      case 'session': return <SessionScreen />;
      case 'device': return <DeviceScreen key={p1} id={p1} />;
      case 'devices': return <Picker key={query.toString()} assign={query.get('assign') ?? undefined} addTo={query.get('addto') ?? undefined} />;
      case 'choose': return <Choose code={query.get('code') ?? ''} />;
      case 'new-device': return <NewDevice assign={query.get('assign') ?? undefined} />;
      case 'scan': return <ScanScreen link={query.get('link') ?? undefined} back={query.get('back') ?? undefined} />;
      case 'summary': return <Summary key={p1} id={p1} />;
      case 'workout': return <WorkoutEditor key={p1} id={p1} />;
      case 'history': return <History />;
      case 'stats': return <Stats />;
      case 'awards': return <Awards />;
      case 'settings': return <Settings />;
      case 'send': return <Send />;
      case 'plan': return <PlanPreview key={p1} id={p1} />;
      case 'strava-code': return <StravaCode code={query.get('code') ?? ''} />;
      default: return <Train />;
    }
  })();
  if (error) return <><Crash error={error} reset={resetError} /><Snackbar /></>;
  if (isIntroOpen()) return <Intro onDone={closeIntro} />;
  return (
    <>
      {screen}
      {p0 !== 'scan' && <NavBar active={p0} detail={!TOP_LEVEL.has(p0)} />}
      <Snackbar />
      <DialogHost />
    </>
  );
}
