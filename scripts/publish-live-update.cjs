// Used by both GitHub Actions and the local release command. Never logs keys.
const fs = require('fs');
const path = require('path');
const { createHash, sign, createPublicKey } = require('crypto');
const JSZip = require('../client/node_modules/jszip');
const { runtimeInfo } = require('./ota-runtime.cjs');
const root = path.resolve(__dirname, '..');
const repo = 'FarihaNuha/Frontier_Learning_Hub';
const api = `https://api.github.com/repos/${repo}`;
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const keyFile = path.join(root, '.system_generated/ota/signing-key.pem');
const privateKey = process.env.UNICORE_OTA_SIGNING_KEY || (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, 'utf8') : '');
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28', ...options.headers } });
  if (!response.ok) { const error = new Error(`GitHub API returned ${response.status}`); error.status = response.status; throw error; }
  return response.status === 204 ? null : response.json();
}
async function release(tag, name, latest) {
  try { return await request(`${api}/releases/tags/${tag}`); }
  catch (error) { if (error.status !== 404) throw error; }
  return request(`${api}/releases`, { method: 'POST', body: JSON.stringify({ tag_name: tag, target_commitish: process.env.GITHUB_SHA || require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), name, make_latest: latest ? 'true' : 'false', body: 'Signed web updates for compatible UniCore Android builds. This is not an APK; installed OTA-enabled apps retrieve these files automatically.' }) });
}
async function upload(releaseInfo, name, data, type) {
  return request(`https://uploads.github.com/repos/${repo}/releases/${releaseInfo.id}/assets?name=${encodeURIComponent(name)}`, { method: 'POST', headers: { 'Content-Type': type }, body: data });
}
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if ((!dryRun && !token) || !privateKey) throw new Error('GitHub token and UNICORE_OTA_SIGNING_KEY are required');
  const expectedKey = JSON.parse(fs.readFileSync(path.join(root, 'client/src/services/otaPublicKey.json'), 'utf8'));
  const actualKey = createPublicKey(privateKey).export({ format: 'jwk' });
  if (actualKey.x !== expectedKey.x || actualKey.y !== expectedKey.y) throw new Error('OTA signing key does not match the APK trust key');
  const info = runtimeInfo();
  const built = JSON.parse(fs.readFileSync(path.join(root, 'client/src/generated/otaRuntime.json'), 'utf8'));
  if (built.runtime !== info.runtime) throw new Error('Rebuild the client for this native runtime before publishing');
  const sequence = Date.now(), version = `${info.nativeVersion}-ota.${sequence}`;
  const zip = new JSZip();
  const add = directory => {
    for (const entry of fs.readdirSync(path.join(root, 'client/build', directory), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const relative = directory ? `${directory}/${entry.name}` : entry.name;
      if (/\.map$/.test(relative)) continue;
      if (entry.isSymbolicLink() || /(^|\/)\.|\.(pem|key)$/.test(relative)) throw new Error('Unexpected private file in web bundle');
      if (entry.isDirectory()) add(relative); else zip.file(relative, fs.readFileSync(path.join(root, 'client/build', relative)));
    }
  };
  add(''); if (!zip.file('index.html')) throw new Error('Web bundle has no index.html');
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  if (buffer.length > 30000000) throw new Error('Web bundle exceeds the app download limit');
  const tag = `ota-${info.runtime}-${sequence}`;
  const update = { schema: 1, appId: 'com.frontier.learningacademy', runtime: info.runtime, sequence, version, size: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex'), url: `https://github.com/${repo}/releases/download/${tag}/unicore-web.zip` };
  const payload = Buffer.from(JSON.stringify(update));
  const envelope = Buffer.from(JSON.stringify({ payload: payload.toString('base64url'), signature: sign('sha256', payload, { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url') }));
  fs.mkdirSync(path.join(root, 'release-output'), { recursive: true });
  fs.writeFileSync(path.join(root, 'release-output/live-update.json'), envelope);
  if (dryRun) { fs.writeFileSync(path.join(root, 'release-output/unicore-web.zip'), buffer); console.log(JSON.stringify({ dryRun: true, runtime: info.runtime, size: buffer.length, sha256: update.sha256 })); return; }
  const archive = await release(tag, `UniCore UI ${version}`, false);
  await upload(archive, 'unicore-web.zip', buffer, 'application/zip');
  const channel = await release('live-updates', 'UniCore live update channel', false);
  const name = `android-${info.runtime}.json`;
  const old = (await request(`${api}/releases/${channel.id}/assets?per_page=100`)).find(asset => asset.name === name);
  if (old) await request(`${api}/releases/assets/${old.id}`, { method: 'DELETE' });
  const asset = await upload(channel, name, envelope, 'application/json');
  console.log(JSON.stringify({ runtime: info.runtime, version, manifest: asset.browser_download_url, bundle: update.url, sha256: update.sha256 }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
