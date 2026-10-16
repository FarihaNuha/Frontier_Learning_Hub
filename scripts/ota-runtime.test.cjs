const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
function fingerprint(mode) {
  const source = fs.readFileSync(path.join(__dirname, 'ota-runtime.cjs'), 'utf8');
  const fakeFs = {
    ...fs,
    readdirSync(directory, options) {
      const entries = fs.readdirSync(directory, options);
      return mode === 'clean' && directory.replace(/\\/g, '/').endsWith('/res/xml') ? entries.filter(entry => entry.name !== 'config.xml') : entries;
    },
    readFileSync(file, encoding) {
      if (file.replace(/\\/g, '/').endsWith('/res/xml/config.xml')) throw new Error('Generated config must never be fingerprinted');
      const bytes = fs.readFileSync(file, encoding);
      return mode === 'native-change' && file.replace(/\\/g, '/').endsWith('/android/app/build.gradle') ? bytes + '\n// native configuration changed\n' : bytes;
    },
  };
  const context = { __dirname, Buffer, module: { exports: {} }, require: name => name === 'fs' ? fakeFs : require(name) };
  vm.runInNewContext(source, context);
  return context.module.exports.runtimeInfo().runtime;
}
test('clean CI and synced Android builds retain the shipped compatibility ID', () => {
  assert.equal(fingerprint('clean'), fingerprint('synced'));
});
test('only the exact first APK source fingerprint is aliased', () => {
  const { compatibleFingerprint } = require('./ota-runtime.cjs');
  assert.equal(compatibleFingerprint('1.4.11', 'ebc7f9f52aeaeee1e7fd1ff0'), '6a3c4937c05c28962c1f5e56');
  assert.equal(compatibleFingerprint('1.4.12', 'ebc7f9f52aeaeee1e7fd1ff0'), 'ebc7f9f52aeaeee1e7fd1ff0');
  assert.equal(compatibleFingerprint('1.4.11', 'different'), 'different');
});
test('a native source change does not reuse the compatibility alias', () => {
  assert.notEqual(fingerprint('native-change'), fingerprint('clean'));
});
