import { Empty, Icon, Tile, TopBar, confirmDialog, useTick } from '../components/ui.tsx';
import { PlanRow } from '../components/plan.tsx';
import { ForgottenCard } from '../components/ForgottenCard.tsx';
import { RestBar } from '../components/RestBar.tsx';
import { useStore } from '../lib/store.ts';
import { activeSession, deviceLookup, devicesByIds, devicesWithQr, workoutOf } from '../lib/selectors.ts';
import { deleteSession, finishSession, startWorkout } from '../lib/actions.ts';
import { isForgotten } from '../lib/ui-state.ts';
import { sessionSummary } from '../lib/stats.ts';
import { formatDuration } from '../lib/cardio.ts';
import { fmtKg, fmtNum } from '../lib/format.ts';
import { navigate } from '../lib/router.ts';
import { href, to } from '../lib/routes.ts';
import type { Device } from '../lib/types.ts';

export function SessionScreen() {
  const { data } = useStore();
  useTick(1000);
  const s = activeSession(data);
  if (!s) {
    return (
      <main class="screen no-nav">
        <TopBar title="Workout" up={to.home()} />
        <Empty icon="fitness_center">No workout running.</Empty>
        <button class="btn block interactive" onClick={() => startWorkout()}>Start free workout</button>
      </main>
    );
  }
  const workout = workoutOf(data, s);
  const plan = devicesByIds(data, workout?.deviceIds ?? []);
  const planIds = new Set(plan.map((d) => d.id));
  const extra = devicesByIds(data, [...new Set(s.entries.map((e) => e.deviceId))].filter((id) => !planIds.has(id)));
  const sum = sessionSummary(s, deviceLookup(data));

  const finish = async () => {
    if (!s.entries.length) {
      if (await confirmDialog({ title: 'Discard empty workout?', body: 'Nothing has been logged yet.', confirm: 'Discard' })) { finishSession(s.id); navigate(to.home()); }
      return;
    }
    if (await confirmDialog({ title: 'Finish workout?', body: `${sum.sets} sets, ${sum.volume ? `${fmtKg(sum.volume)} lifted` : `${sum.reps} reps`}.`, confirm: 'Finish' })) {
      finishSession(s.id);
      navigate(to.summary(s.id, true), true);
    }
  };
  const discard = async () => {
    if (await confirmDialog({ title: 'Discard workout?', body: 'All sets of this workout will be deleted.', confirm: 'Discard', danger: true })) {
      deleteSession(s.id); navigate(to.home());
    }
  };

  const withQr = devicesWithQr(data);
  const row = (d: Device) => <PlanRow key={d.id} data={data} device={d} session={s} withQr={withQr} />;

  return (
    <main class="screen no-nav">
      <TopBar title={workout?.name ?? 'Free workout'} up={to.home()}>
        <button class="icon-btn interactive" aria-label="Discard workout" onClick={discard}><Icon name="delete" /></button>
      </TopBar>
      {isForgotten(s) && <ForgottenCard session={s} />}
      <div class="grid-3">
        <Tile value={formatDuration(sum.durationSec)} label="Duration" />
        <Tile value={fmtNum(sum.volume, 0)} label="kg lifted" />
        <Tile value={sum.sets} label="Sets" />
      </div>
      {plan.length > 0 && <><h2 class="title-m section-title">Plan</h2><ul class="list">{plan.map(row)}</ul></>}
      {extra.length > 0 && <><h2 class="title-m section-title">{plan.length ? 'Also done' : 'Done'}</h2><ul class="list">{extra.map(row)}</ul></>}
      {!plan.length && !extra.length && <Empty icon="qr_code_scanner">Scan a device's QR code or pick one from the list to start logging.</Empty>}
      <div class="row wrap mt-16">
        <a class="btn tonal interactive" href={href(to.devices())}><Icon name="add" />Add device</a>
        <button class="btn interactive" onClick={finish}><Icon name="flag" />Finish workout</button>
      </div>
      <a class="fab no-nav interactive" href={href(to.scan())}><Icon name="qr_code_scanner" />Scan</a>
      <RestBar />
    </main>
  );
}
