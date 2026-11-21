import { Icon, ListItem, TopBar, useTick } from '../components/ui.tsx';
import { useStartWorkout } from '../components/plan.tsx';
import { ForgottenCard } from '../components/ForgottenCard.tsx';
import { updateLocal, useStore } from '../lib/store.ts';
import { activeSession, deviceLookup, devicesByIds, liveWorkouts, workoutOf } from '../lib/selectors.ts';
import { isForgotten } from '../lib/ui-state.ts';
import { installPrompt, isIos, isStandalone } from '../lib/pwa.ts';
import { sessionSummary, weeklyStreak } from '../lib/stats.ts';
import { formatDuration } from '../lib/cardio.ts';
import { navigate } from '../lib/router.ts';
import { href, to } from '../lib/routes.ts';
import { MUSCLES } from '../data/catalog.ts';

function InstallCard() {
  const prompt = installPrompt();
  return (
    <div class="card outlined row notice" style={{ alignItems: 'flex-start' }}>
      <Icon name="download" />
      <div class="spacer body-m">
        <div class="title-s">Install the app</div>
        {prompt ? 'Opens full screen, works offline and keeps your data safe.'
          : <>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>. On iPhone, data of sites that aren't installed is deleted after 7 days without a visit.</>}
        <div class="row mt-8">
          {prompt && <button class="btn interactive" onClick={() => prompt.prompt()}>Install</button>}
          <button class="btn text interactive" onClick={() => updateLocal({ installDismissed: true })}>Not now</button>
        </div>
      </div>
    </div>
  );
}

export function Train() {
  const { data, local } = useStore();
  useTick(10_000);
  const active = activeSession(data);
  const forgotten = active && isForgotten(active);
  const streak = weeklyStreak(Object.values(data.sessions));
  const sum = active && sessionSummary(active, deviceLookup(data));
  const current = workoutOf(data, active);

  const start = useStartWorkout();

  return (
    <main class="screen">
      <TopBar title="Pinlift">
        {streak > 0 && <span class="chip static gold" style={{ marginRight: '12px' }} title="Weekly streak">
          <Icon name="local_fire_department" size={18} />{streak} {streak === 1 ? 'week' : 'weeks'}</span>}
      </TopBar>
      {!isStandalone() && !local.installDismissed && (installPrompt() || isIos()) && <InstallCard />}
      {forgotten && <ForgottenCard session={active} />}
      {active && sum && !forgotten && (
        <a class="card primary interactive notice" href={href(to.session())}>
          <div class="row">
            <Icon name="timer" />
            <div class="spacer">
              <div class="title-m">Workout in progress</div>
              <div class="body-m">{formatDuration(sum.durationSec)} · {sum.sets} sets{current ? ` · ${current.name}` : ''}</div>
            </div>
            <Icon name="chevron_right" />
          </div>
        </a>
      )}

      <h2 class="title-m section-title">Start a workout</h2>
      <ul class="list">
        {liveWorkouts(data).map((w) => {
          const muscles = [...new Set(devicesByIds(data, w.deviceIds).flatMap((d) => d.primary))];
          return (
            <ListItem key={w.id} onClick={() => navigate(to.plan(w.id))} leading={<span class="avatar" aria-hidden="true">{w.name.slice(0, 1).toUpperCase()}</span>}
              title={w.name} supporting={`${w.deviceIds.length} devices · ${muscles.slice(0, 5).map((m) => MUSCLES[m]).join(', ')}`}
              actions={<button class="icon-btn tonal interactive" aria-label={`Start ${w.name}`} onClick={() => start(w)}><Icon name="play_arrow" /></button>} />
          );
        })}
      </ul>
      <div class="row wrap mt-16">
        {!active && <button class="btn tonal interactive" onClick={() => start()}><Icon name="play_arrow" />Free workout</button>}
        <a class="btn outlined interactive" href={href(to.workout('new'))}><Icon name="add" />New workout</a>
      </div>

      <h2 class="title-m section-title">Devices</h2>
      <ul class="list" style={{ margin: 0, border: '1px solid var(--md-outline-variant)', borderRadius: '12px' }}>
        <ListItem href={href(to.devices())} leading={<Icon name="list_alt" />} title="Browse all devices"
          supporting="Machines without a QR code are listed first" trailing={<Icon name="chevron_right" />} />
      </ul>

      <a class="fab interactive" href={href(to.scan())}><Icon name="qr_code_scanner" />Scan device</a>
    </main>
  );
}
