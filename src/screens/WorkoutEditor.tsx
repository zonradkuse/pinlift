import { useState } from 'preact/hooks';
import { Icon, ListItem, TopBar, confirmDialog } from '../components/ui.tsx';
import { Pictogram } from '../components/Pictogram.tsx';
import { useStore } from '../lib/store.ts';
import { allDevices, deviceName, getDevice } from '../lib/selectors.ts';
import { MuscleOverview } from '../components/MuscleMap.tsx';
import { muscleCoverage } from '../lib/stats.ts';
import { deleteWorkout, saveWorkout } from '../lib/actions.ts';
import { uid } from '../lib/id.ts';
import { navigate } from '../lib/router.ts';
import { to } from '../lib/routes.ts';
import { FILTER_GROUPS, inGroups, muscleSummary } from '../data/catalog.ts';

export function WorkoutEditor({ id }: { id: string }) {
  const { data } = useStore();
  const existing = id !== 'new' ? data.workouts[id] : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [ids, setIds] = useState<string[]>(existing?.deviceIds ?? []);
  const [groups, setGroups] = useState<string[]>([]);
  const candidates = allDevices(data).filter((d) => !ids.includes(d.id) && (!groups.length || inGroups(d, groups)))
    .sort((a, b) => a.name.localeCompare(b.name));

  const move = (i: number, dir: number) => {
    const next = [...ids];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setIds(next);
  };
  const save = () => {
    saveWorkout({ ...existing, id: existing?.id ?? 'w-' + uid(), name: name.trim(), deviceIds: ids });
    navigate(to.home(), true);
  };
  const remove = async () => {
    if (existing && await confirmDialog({ title: `Delete “${existing.name}”?`, body: 'Past workouts stay in your history.', confirm: 'Delete', danger: true })) {
      deleteWorkout(existing.id);
      navigate(to.home(), true);
    }
  };
  const toggleGroup = (g: string) => setGroups(groups.includes(g) ? groups.filter((x) => x !== g) : [...groups, g]);

  return (
    <main class="screen no-nav">
      <TopBar title={existing ? 'Edit workout' : 'New workout'} up={to.home()}>
        {existing && <button class="icon-btn interactive" aria-label="Delete workout plan" onClick={remove}><Icon name="delete" /></button>}
      </TopBar>
      <div class="stack">
        <label class="field"><span>Name</span><input value={name} placeholder="e.g. Upper body" onInput={(e) => setName((e.target as HTMLInputElement).value)} /></label>

        <h2 class="title-m section-title" style={{ marginBottom: 0 }}>Devices in order ({ids.length})</h2>
        {!ids.length && <p class="body-m muted">Pick muscle groups below and add devices.</p>}
        <ul class="list">
          {ids.map((devId, i) => (
            <ListItem leading={<span class="avatar">{i + 1}</span>} title={deviceName(data, devId)} trailing={<>
              <button class="icon-btn interactive" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><Icon name="arrow_upward" /></button>
              <button class="icon-btn interactive" aria-label="Move down" disabled={i === ids.length - 1} onClick={() => move(i, 1)}><Icon name="arrow_downward" /></button>
              <button class="icon-btn interactive" aria-label="Remove" onClick={() => setIds(ids.filter((x) => x !== devId))}><Icon name="close" /></button>
            </>} />
          ))}
        </ul>
        {ids.length > 0 && <MuscleOverview title="Exercises per muscle group" unit="exercises"
          coverage={muscleCoverage(ids.map((devId) => ({ device: getDevice(data, devId), count: 1 })))} />}

        <h2 class="title-m section-title" style={{ marginBottom: 0 }}>Add devices</h2>
        <div class="chips wrap" role="group" aria-label="Muscle groups">
          {FILTER_GROUPS.map((g) => (
            <button class="chip interactive" aria-pressed={groups.includes(g.id)} onClick={() => toggleGroup(g.id)}>
              {groups.includes(g.id) && <Icon name="check" />}{g.name}</button>
          ))}
        </div>
        {groups.length > 0 && candidates.length > 0 &&
          <button class="btn text interactive" style={{ alignSelf: 'flex-start' }} onClick={() => setIds([...ids, ...candidates.map((d) => d.id)])}>
            <Icon name="add" />Add all {candidates.length}</button>}
        <ul class="list">
          {candidates.map((d) => <ListItem onClick={() => setIds([...ids, d.id])} title={d.name} supporting={muscleSummary(d)} trailing={<Icon name="add" />}
            leading={<span class="pictogram-tile"><Pictogram device={d} size={40} /></span>} />)}
        </ul>
      </div>
      <div class="bottom-bar">
        <button class="btn large block interactive" disabled={!name.trim() || !ids.length} onClick={save}>Save workout</button>
      </div>
    </main>
  );
}
