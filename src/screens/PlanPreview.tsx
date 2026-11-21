import { Empty, Icon, TopBar } from '../components/ui.tsx';
import { PlanRow, useStartWorkout } from '../components/plan.tsx';
import { useStore } from '../lib/store.ts';
import { activeSession, devicesByIds, devicesWithQr } from '../lib/selectors.ts';
import { href, to } from '../lib/routes.ts';
import { MUSCLES } from '../data/catalog.ts';

/** A workout plan before starting it: devices with targets; starting needs an explicit tap. */
export function PlanPreview({ id }: { id: string }) {
  const { data } = useStore();
  const start = useStartWorkout();
  const w = data.workouts[id];
  if (!w || w.deleted) return <main class="screen no-nav"><TopBar title="Workout" up={to.home()} /><Empty icon="list_alt">This workout plan does not exist.</Empty></main>;
  const devices = devicesByIds(data, w.deviceIds);
  const muscles = [...new Set(devices.flatMap((d) => d.primary))];
  const withQr = devicesWithQr(data);
  return (
    <main class="screen no-nav">
      <TopBar title={w.name} up={to.home()}>
        <a class="icon-btn interactive" href={href(to.workout(w.id))} aria-label={`Edit ${w.name}`}><Icon name="edit" /></a>
      </TopBar>
      <p class="body-m muted">{devices.length} devices · {muscles.map((m) => MUSCLES[m]).join(', ')}</p>
      {/* The running workout's sets count as today, not as "last time". */}
      <ul class="list mt-8">{devices.map((d) => <PlanRow key={d.id} data={data} device={d} session={activeSession(data)} withQr={withQr} />)}</ul>
      <div class="bottom-bar">
        <button class="btn large block interactive" onClick={() => start(w)}><Icon name="play_arrow" />Start workout</button>
      </div>
    </main>
  );
}
