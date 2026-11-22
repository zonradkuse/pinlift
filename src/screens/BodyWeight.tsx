import { useState } from 'preact/hooks';
import { Icon, ListItem, Stepper, TopBar } from '../components/ui.tsx';
import { LineChart } from '../components/Chart.tsx';
import { useStore } from '../lib/store.ts';
import { bodyWeights } from '../lib/selectors.ts';
import { deleteBodyWeight, logBodyWeight } from '../lib/actions.ts';
import { toast } from '../lib/ui-state.ts';
import { dayKey } from '../lib/stats.ts';
import { fmtDate, fmtKg } from '../lib/format.ts';
import { to } from '../lib/routes.ts';

const FIRST_GUESS_KG = 75;

/** Log body weight (one entry per day; saving a day again replaces it) and see the trend. */
export function BodyWeightScreen() {
  const { data } = useStore();
  const all = bodyWeights(data);
  const today = dayKey(Date.now());
  const [day, setDay] = useState(today);
  const [kg, setKg] = useState(all.at(-1)?.kg ?? FIRST_GUESS_KG);
  const remove = (w: (typeof all)[number]) => toast(`Deleted ${fmtKg(w.kg)} of ${fmtDate(w.at)}`, { label: 'Undo', run: deleteBodyWeight(w.day) });
  return (
    <main class="screen no-nav">
      <TopBar title="Body weight" up={to.stats()} />
      <div class="stack">
        <Stepper label="Body weight" unit="kg" value={kg} step={0.1} onChange={setKg} />
        <label class="field"><span>Date</span>
          <input type="date" value={day} max={today} onInput={(e) => setDay((e.target as HTMLInputElement).value)} /></label>
        <button class="btn large block interactive" disabled={!day || kg <= 0}
          onClick={() => { logBodyWeight(kg, day); toast(`Saved ${fmtKg(kg)}`); }}>Save</button>
        {all.length > 1 && <LineChart points={all.map((w) => ({ x: w.at, y: w.kg }))} unit="kg" label="Body weight trend" />}
        <ul class="list" aria-label="Entries">
          {[...all].reverse().map((w) => (
            <ListItem title={fmtDate(w.at)} trailing={<span class="trailing num">{fmtKg(w.kg)}</span>}
              actions={<button class="icon-btn interactive" aria-label={`Delete ${fmtDate(w.at)}`} onClick={() => remove(w)}><Icon name="delete" /></button>} />
          ))}
        </ul>
      </div>
    </main>
  );
}
