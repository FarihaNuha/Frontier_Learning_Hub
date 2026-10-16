const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const root = path.resolve(__dirname, '..');
const compatibleFingerprint = (version, fingerprint) => version === '1.4.11' && fingerprint === 'ebc7f9f52aeaeee1e7fd1ff0' ? '6a3c4937c05c28962c1f5e56' : fingerprint;
function runtimeInfo() {
  const gradle = fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8');
  const version = gradle.match(/versionName\s+"([^"]+)"/)[1];
  const hash = createHash('sha256');
  const files = ['capacitor.config.json', 'android/build.gradle', 'android/variables.gradle', 'android/app/build.gradle', 'android/app/src/main/AndroidManifest.xml', 'client/src/services/otaPublicKey.json'];
  // Capacitor creates this Cordova bridge file during sync. It is absent in a
  // clean checkout and must not change the native source compatibility ID.
  const walk = directory => { for (const item of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) { const file = `${directory}/${item.name}`; if (item.isDirectory()) walk(file); else if (file !== 'android/app/src/main/res/xml/config.xml') files.push(file); } };
  walk('android/app/src/main/java'); walk('android/app/src/main/res');
  for (const file of files.sort()) {
    let bytes = fs.readFileSync(path.join(root, file));
    if (/\.(java|xml|json|gradle)$/.test(file)) bytes = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
    hash.update(file + '\n'); hash.update(bytes); hash.update('\n');
  }
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  for (const name of Object.keys(lock.packages).filter(name => /^node_modules\/@(capacitor|capgo)\//.test(name)).sort()) hash.update(`${name}:${lock.packages[name].version}\n`);
  const fingerprint = hash.digest('hex').slice(0, 24);
  // The first shipped OTA APK included the generated file in its fingerprint.
  // Alias only its exact source fingerprint so that installed 1.4.11 APKs keep
  // receiving compatible updates. Any native source change gets a new ID.
  const compatible = compatibleFingerprint(version, fingerprint);
  return { nativeVersion: version, runtime: `${version}-${compatible}` };
}
if (require.main === module) {
  const info = runtimeInfo();
  const output = path.join(root, 'client/src/generated/otaRuntime.json');
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(info, null, 2) + '\n');
  console.log('Prepared native runtime:', info.runtime);
}
module.exports = { runtimeInfo, compatibleFingerprint };
