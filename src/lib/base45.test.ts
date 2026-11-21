import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encode45, decode45 } from './base45.ts';

const enc = new TextEncoder(), dec = new TextDecoder();
// Test vectors from RFC 9285, section 4.
const vectors: [string, string][] = [['AB', 'BB8'], ['Hello!!', '%69 VD92EX0'], ['base-45', 'UJCLQE7W581'], ['ietf!', 'QED8WEX0']];

test('encodes RFC 9285 vectors', () => {
  for (const [plain, coded] of vectors) assert.equal(encode45(enc.encode(plain)), coded);
});

test('decodes RFC 9285 vectors', () => {
  for (const [plain, coded] of vectors) assert.equal(dec.decode(decode45(coded)), plain);
});

test('round-trips all byte values', () => {
  const bytes = Uint8Array.from({ length: 513 }, (_, i) => (i * 7) % 256);
  assert.deepEqual(decode45(encode45(bytes)), bytes);
});

test('rejects invalid input', () => {
  assert.throws(() => decode45('GGW')); // 65535 + 1 overflows two bytes
  assert.throws(() => decode45('ab'));  // lowercase is not in the alphabet
  assert.throws(() => decode45('A'));   // dangling character
});
