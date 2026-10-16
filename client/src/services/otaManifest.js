const REPOSITORY = 'https://github.com/FarihaNuha/Frontier_Learning_Hub/releases/download/';
const bytes = value => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid update signature');
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
};
export async function verifyManifest(envelope, runtime, publicKey, subtle = crypto.subtle) {
  if (!envelope || typeof envelope.payload !== 'string' || envelope.payload.length > 20000 || typeof envelope.signature !== 'string' || envelope.signature.length > 200) throw new Error('Invalid update manifest');
  const payload = bytes(envelope.payload);
  const key = await subtle.importKey('jwk', publicKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  if (!await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, bytes(envelope.signature), payload)) throw new Error('Update signature did not match');
  const update = JSON.parse(new TextDecoder().decode(payload));
  if (update.schema !== 1 || update.appId !== 'com.frontier.learningacademy' || update.runtime !== runtime || !Number.isSafeInteger(update.sequence) || update.sequence < 1) throw new Error('This update requires a different APK');
  if (update.version !== `${runtime.split('-')[0]}-ota.${update.sequence}`) throw new Error('Invalid update version');
  if (!/^[a-f0-9]{64}$/.test(update.sha256) || !Number.isSafeInteger(update.size) || update.size < 1 || update.size > 30000000) throw new Error('Invalid update bundle');
  const expected = `${REPOSITORY}ota-${runtime}-${update.sequence}/unicore-web.zip`;
  if (update.url !== expected) throw new Error('Untrusted update download');
  return update;
}
export const sequenceOf = version => Number(/-ota\.(\d+)$/.exec(version || '')?.[1] || 0);
export const feedUrl = runtime => `${REPOSITORY}live-updates/android-${runtime}.json`;
