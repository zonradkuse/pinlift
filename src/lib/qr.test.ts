import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkTo, qrDevices, withDevice, withoutDevice } from './qr.ts';

test('links can hold several devices and read the legacy single-device format', () => {
  assert.deepEqual(qrDevices(undefined), []);
  assert.deepEqual(qrDevices({ deviceIds: ['a', 'b'], updatedAt: 1 }), ['a', 'b']);
  assert.deepEqual(qrDevices({ deviceId: 'a', updatedAt: 1 } as never), ['a']);
  assert.deepEqual(qrDevices({ deviceIds: ['a'], updatedAt: 1, deleted: true }), []);
});

test('adding and removing devices', () => {
  const l = withDevice(undefined, 'a', 5);
  assert.deepEqual(l, { deviceIds: ['a'], deviceId: 'a', updatedAt: 5 }); // deviceId keeps older app versions working
  assert.deepEqual(withDevice(l, 'b', 6).deviceIds, ['a', 'b']);
  assert.deepEqual(withDevice(withDevice(l, 'b', 6), 'a', 7).deviceIds, ['a', 'b']);
  assert.deepEqual(withoutDevice(withDevice(l, 'b', 6), 'a', 8), { deviceIds: ['b'], deviceId: 'b', updatedAt: 8 });
  assert.deepEqual(withoutDevice(l, 'a', 9), { deviceIds: [], deviceId: '', updatedAt: 9, deleted: true });
  assert.deepEqual(linkTo('c', 10), { deviceIds: ['c'], deviceId: 'c', updatedAt: 10 });
});
