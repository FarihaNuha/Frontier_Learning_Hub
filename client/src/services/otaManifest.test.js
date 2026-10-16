import { verifyManifest, sequenceOf } from './otaManifest';
const crypto = require('crypto');
const { TextDecoder } = require('util');
global.TextDecoder = TextDecoder;
const pair = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publicKey = pair.publicKey.export({ format: 'jwk' });
const runtime = '1.4.11-test';
const update = { schema: 1, appId: 'com.frontier.learningacademy', runtime, sequence: 10, version: '1.4.11-ota.10', size: 400, sha256: 'a'.repeat(64), url: `https://github.com/FarihaNuha/Frontier_Learning_Hub/releases/download/ota-${runtime}-10/unicore-web.zip` };
const envelope = data => {
  const payload = Buffer.from(JSON.stringify(data));
  return { payload: payload.toString('base64url'), signature: crypto.sign('sha256', payload, { key: pair.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url') };
};
const subtle = { importKey: (...args) => crypto.webcrypto.subtle.importKey(...args), verify: (algorithm, key, signature, payload) => crypto.webcrypto.subtle.verify(algorithm, key, Buffer.from(signature), Buffer.from(payload)) };
test('a real publisher ECDSA signature binds the exact runtime, URL and checksum', async () => {
  expect(await verifyManifest(envelope(update), runtime, publicKey, subtle)).toEqual(update);
});
test('modified bytes cannot retain the original signature', async () => {
  const signed = envelope(update); signed.payload = Buffer.from(JSON.stringify({ ...update, sha256: 'b'.repeat(64) })).toString('base64url');
  await expect(verifyManifest(signed, runtime, publicKey, subtle)).rejects.toThrow('signature');
});
test.each([
  { runtime: '1.4.12-other' }, { appId: 'another.app' }, { sequence: -1 },
  { url: 'https://example.com/arbitrary.zip' }, { sha256: 'not-a-checksum' },
  { size: 40000000 }, { version: 'wrong-version' },
])('even a signed incompatible or malformed payload is rejected: %p', async change => {
  await expect(verifyManifest(envelope({ ...update, ...change }), runtime, publicKey, subtle)).rejects.toThrow();
});
test('oversized envelopes are rejected before crypto and sequences ignore native/builtin versions', async () => {
  await expect(verifyManifest({ payload: 'x'.repeat(21000), signature: 'a' }, runtime, publicKey, subtle)).rejects.toThrow();
  expect(sequenceOf('builtin')).toBe(0); expect(sequenceOf('1.4.11')).toBe(0); expect(sequenceOf(update.version)).toBe(10);
});
