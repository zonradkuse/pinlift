import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pack, unpack, toFrames, parseFrame, Assembler, changedSince } from './transfer.ts';
import { emptyData } from './types.ts';

const QR_ALNUM = /^[0-9A-Z $%*+\-./:]+$/;

const sample = () => {
  const d = emptyData();
  for (let i = 0; i < 200; i++) {
    d.sessions['s' + i] = { id: 's' + i, startedAt: i * 1000, endedAt: i * 1000 + 50, updatedAt: i, entries: [
      { id: 'e' + i, deviceId: 'chest-press', sets: [{ weight: 40 + (i % 7), reps: 10, at: i }] }] };
  }
  return d;
};

test('pack/unpack round-trips and compresses', async () => {
  const d = sample();
  const bytes = await pack(d);
  assert.ok(bytes.length < JSON.stringify(d).length / 4, `compressed to ${bytes.length}`);
  assert.deepEqual(await unpack(bytes), { data: d, dropped: 0 });
});

test('unpack rejects data that is not app data', async () => {
  const bytes = new Uint8Array(await new Response(new Blob(['{"hello":1}']).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  await assert.rejects(unpack(bytes));
  await assert.rejects(unpack(bytes, 1));
  await assert.rejects(unpack(new Uint8Array([1, 2, 3])));
});

test('frames use only the QR alphanumeric charset and respect the chunk size', async () => {
  const bytes = await pack(sample());
  const frames = toFrames(bytes, 100, 'AB12');
  assert.equal(frames.length, Math.ceil(bytes.length / 100));
  for (const f of frames) assert.match(f, QR_ALNUM);
  assert.deepEqual(parseFrame(frames[1]), { version: 2, id: 'AB12', index: 1, total: frames.length, data: parseFrame(frames[1])!.data });
  assert.equal(parseFrame(frames[1].replace(/^GT2/, 'GT1'))?.version, 1); // older senders
  assert.equal(parseFrame('https://gym80.de/whatever'), null);
});

test('assembler accepts frames in any order with duplicates', async () => {
  const bytes = await pack(sample());
  const frames = toFrames(bytes, 64, 'ZZ99');
  const asm = new Assembler();
  const shuffled = [...frames].reverse();
  for (const f of [...shuffled.slice(0, 3), ...shuffled]) asm.add(parseFrame(f)!);
  assert.ok(asm.complete);
  assert.equal(asm.received, frames.length);
  assert.deepEqual(asm.bytes(), bytes);
});

test('assembler restarts when a different transfer begins', () => {
  const asm = new Assembler();
  asm.add(parseFrame(toFrames(new Uint8Array(10), 5, 'AAAA')[0])!);
  asm.add(parseFrame(toFrames(new Uint8Array(30), 5, 'BBBB')[0])!);
  assert.equal(asm.id, 'BBBB');
  assert.equal(asm.received, 1);
  assert.equal(asm.total, 6);
  assert.ok(!asm.complete);
});

test('changedSince keeps only records changed after the timestamp, including deletions', () => {
  const d = sample();
  d.sessions.s5.deleted = true;
  d.workouts.w = { id: 'w', name: 'x', deviceIds: [], updatedAt: 500 };
  d.qr.old = { deviceIds: ['a'], updatedAt: 1 };
  const c = changedSince(d, 150);
  assert.deepEqual(Object.keys(c.sessions).sort(), Object.keys(d.sessions).filter((k) => d.sessions[k].updatedAt > 150).sort());
  assert.ok(Object.keys(c.sessions).length === 49);
  assert.deepEqual(Object.keys(c.workouts), ['w']);
  assert.deepEqual(c.qr, {});
  assert.equal(c.schema, 1);
});

test('body weights travel with a transfer, also as changes only', async () => {
  const d = emptyData();
  d.bodyWeights['2026-11-20'] = { kg: 80.4, at: 1, updatedAt: 10 };
  d.bodyWeights['2026-11-01'] = { kg: 81, at: 0, updatedAt: 2 };
  assert.deepEqual((await unpack(await pack(d))).data.bodyWeights, d.bodyWeights);
  assert.deepEqual(Object.keys(changedSince(d, 5).bodyWeights), ['2026-11-20']);
});
