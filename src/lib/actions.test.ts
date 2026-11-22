import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getData, handleSaveErrors, update, seedData } from './store.ts';
import { deleteBodyWeight, finishSession, linkQr, logBodyWeight, logSet, removeSet, updateSet } from './actions.ts';
import { activeSession, bodyWeights } from './selectors.ts';
import { mergeData } from './merge.ts';
import { STALE_MS } from './stats.ts';
import type { AppData } from './types.ts';

// The store runs in Node without IndexedDB; saving just fails quietly.
handleSaveErrors(() => {});
const reset = () => update((d) => Object.assign(d, seedData(), { sessions: {}, qr: {} }));
beforeEach(reset);

test('a set logged into a forgotten workout closes it and starts a new one', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1_000_000_000_000 });
  logSet('leg-press', 100, 10);
  const first = activeSession(getData())!.id;
  t.mock.timers.tick(STALE_MS + 60_000);
  logSet('chest-press', 40, 10);
  const d = getData();
  assert.notEqual(activeSession(d)!.id, first);
  assert.equal(d.sessions[first].endedAt, 1_000_000_000_000 + 5 * 60_000); // last activity + 5 min
});

test('set and end times are stored in whole seconds, ids are short', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1_000_000_000_789 });
  logSet('leg-press', 100, 10);
  const s = activeSession(getData())!;
  assert.equal(s.entries[0].sets[0].at % 1000, 0);
  assert.equal(s.startedAt % 1000, 0);
  assert.ok(s.id.length <= 12 && s.entries[0].id.length <= 4, `${s.id} ${s.entries[0].id}`);
  finishSession(s.id);
  assert.equal(getData().sessions[s.id].endedAt! % 1000, 0);
});

test('undo of a deleted set keeps sets logged since', () => {
  logSet('leg-press', 100, 10);
  logSet('leg-press', 110, 8);
  const s = activeSession(getData())!;
  const undo = removeSet(s.id, s.entries[0].id, 0);
  logSet('leg-press', 120, 6);
  undo();
  assert.deepEqual(activeSession(getData())!.entries[0].sets.map((x) => x.weight), [100, 110, 120]);
});

test('linkQr returns an undo that restores the previous link', () => {
  linkQr('X', 'leg-press');
  const undo = linkQr('X', 'chest-press');
  undo();
  assert.deepEqual(getData().qr.X.deviceIds, ['leg-press']);
});

test('an edit wins against a record received from a device whose clock runs an hour ahead', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 1_000_000_000_000 });
  logSet('leg-press', 100, 10);
  const s = activeSession(getData())!;
  const fromFastDevice: AppData = structuredClone(getData());
  fromFastDevice.sessions[s.id].updatedAt += 3600_000;
  update((d) => Object.assign(d, mergeData(d, fromFastDevice).data));
  updateSet(s.id, s.entries[0].id, 0, { weight: 105 });
  const back = mergeData(fromFastDevice, getData()).data; // the fast device receives the edit
  assert.equal(back.sessions[s.id].entries[0].sets[0].weight, 105);
});

test('body weight: one entry per day where the latest wins, other days by key, delete with undo', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(2026, 10, 20, 7, 30).getTime() });
  logBodyWeight(81.2);
  logBodyWeight(80.9);
  logBodyWeight(81.5, '2026-11-18');
  assert.deepEqual(bodyWeights(getData()).map((w) => [w.day, w.kg]), [['2026-11-18', 81.5], ['2026-11-20', 80.9]]);
  assert.equal(bodyWeights(getData())[0].at, new Date(2026, 10, 18, 12).getTime());
  const undo = deleteBodyWeight('2026-11-20');
  assert.equal(getData().bodyWeights['2026-11-20'].deleted, true); // tombstone, so the deletion syncs
  assert.equal(bodyWeights(getData()).length, 1);
  undo();
  assert.equal(bodyWeights(getData())[1].kg, 80.9);
});
