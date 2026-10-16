import { createUpdateController } from './liveUpdateController';
const update = { sequence: 10, version: '1.4.11-ota.10', url: 'https://trusted/bundle.zip', sha256: 'a'.repeat(64) };
function setup({ bundles = [], currentVersion = '1.4.11', verify = jest.fn(async () => update), online = true } = {}) {
  const plugin = { current: jest.fn(async () => ({ native: '1.4.11', bundle: { id: 'builtin', version: currentVersion } })), list: jest.fn(async () => ({ bundles })), getNextBundle: jest.fn(async () => null), download: jest.fn(async () => ({ id: 'downloaded', status: 'pending' })), setMultiDelay: jest.fn(async () => {}), next: jest.fn(async () => {}) };
  const publish = jest.fn(), getManifest = jest.fn(async () => ({ signed: true }));
  const controller = createUpdateController({ plugin, runtime: 'runtime', nativeVersion: '1.4.11', getManifest, verify, publish, isOnline: () => online });
  return { plugin, publish, controller, getManifest };
}
test('checks a signed update, passes the digest natively and stages only after a process-kill delay', async () => {
  const { controller, plugin, publish } = setup(); await controller.check();
  expect(plugin.download).toHaveBeenCalledWith({ url: update.url, version: update.version, checksum: update.sha256 });
  expect(plugin.setMultiDelay).toHaveBeenCalledWith({ delayConditions: [{ kind: 'kill' }] });
  expect(plugin.setMultiDelay.mock.invocationCallOrder[0]).toBeLessThan(plugin.next.mock.invocationCallOrder[0]);
  expect(plugin.next).toHaveBeenCalledWith({ id: 'downloaded' }); expect(publish).toHaveBeenLastCalledWith({ status: 'ready', version: update.version });
});
test('invalid signatures never reach download or staging', async () => {
  const { controller, plugin, publish } = setup({ verify: async () => { throw Error('Invalid signature'); } });
  await controller.check(); expect(plugin.download).not.toHaveBeenCalled(); expect(plugin.next).not.toHaveBeenCalled(); expect(publish).toHaveBeenLastCalledWith({ status: 'error' });
});
test('a rolled-back failed version is never retried', async () => {
  const { controller, plugin, publish } = setup({ bundles: [{ version: update.version, status: 'error' }] });
  await controller.check(); expect(plugin.download).not.toHaveBeenCalled(); expect(publish).toHaveBeenLastCalledWith({ status: 'reverted', version: '1.4.11' });
});
test('an older signed sequence cannot replace a newer installed one', async () => {
  const { controller, plugin } = setup({ currentVersion: '1.4.11-ota.11' }); await controller.check(); expect(plugin.download).not.toHaveBeenCalled(); expect(plugin.next).not.toHaveBeenCalled();
});
test('a completed download surviving process death is reused and staged', async () => {
  const { controller, plugin } = setup({ bundles: [{ id: 'saved-download', version: update.version, status: 'pending' }] }); await controller.check();
  expect(plugin.download).not.toHaveBeenCalled(); expect(plugin.next).toHaveBeenCalledWith({ id: 'saved-download' });
});
test('offline startup and a different native APK do not request any web update', async () => {
  const offline = setup({ online: false }); await offline.controller.check(); expect(offline.getManifest).not.toHaveBeenCalled();
  const mismatch = setup(); mismatch.plugin.current.mockResolvedValue({ native: '2.0.0', bundle: { id: 'builtin' } }); await mismatch.controller.check(); expect(mismatch.getManifest).not.toHaveBeenCalled();
});
test('concurrent checks coalesce, and a network failure leaves the installed app alone', async () => {
  const { controller, getManifest, plugin, publish } = setup(); let reject;
  getManifest.mockImplementation(() => new Promise((resolve, fail) => { reject = fail; }));
  const first = controller.check(), duplicate = controller.check();
  await new Promise(resolve => setTimeout(resolve, 0)); reject(Error('Network down'));
  await Promise.all([first, duplicate]); expect(getManifest).toHaveBeenCalledTimes(1); expect(plugin.next).not.toHaveBeenCalled(); expect(publish).toHaveBeenLastCalledWith({ status: 'error' });
});
