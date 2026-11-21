import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration, speedKmh, pacePerKm, pacePer500m, cardioProblem, needsDistance } from './cardio.ts';

test('formatDuration', () => {
  assert.equal(formatDuration(1530), '25:30');
  assert.equal(formatDuration(3723), '1:02:03');
  assert.equal(formatDuration(5), '0:05');
});

test('speed and paces', () => {
  assert.equal(speedKmh(5000, 1500), 12);
  assert.equal(pacePerKm(5000, 1500), 300);
  assert.equal(pacePer500m(2000, 480), 120);
  assert.equal(speedKmh(0, 0), 0);
  assert.equal(pacePerKm(0, 100), 0);
});

test('distance is required only for running and rowing', () => {
  assert.equal(needsDistance('run'), true);
  assert.equal(needsDistance('row'), true);
  for (const t of ['bike', 'elliptical', 'stairs'] as const) assert.equal(needsDistance(t), false);
});

test('cardioProblem flags implausible input', () => {
  assert.equal(cardioProblem('run', 5000, 1500), null);
  assert.equal(cardioProblem('stairs', 0, 1200), null);
  assert.match(cardioProblem('run', 0, 1500) ?? '', /distance/i);
  assert.match(cardioProblem('run', 5000, 0) ?? '', /time/i);
  assert.match(cardioProblem('run', 5000, 6 * 3600) ?? '', /5 h/);
  assert.match(cardioProblem('run', 3, 151800) ?? '', /./); // "2530" read as minutes
  assert.match(cardioProblem('run', 5000, 60) ?? '', /fast/i); // 300 km/h
  assert.match(cardioProblem('run', 100, 1800) ?? '', /slow/i); // 0.2 km/h
});
