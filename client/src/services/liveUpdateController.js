import { sequenceOf } from './otaManifest';
export function createUpdateController({ plugin, getManifest, runtime, nativeVersion, verify, publish, isOnline = () => navigator.onLine }) {
  let running;
  const check = () => {
    if (running) return running;
    running = (async () => {
      if (!isOnline()) { publish({ status: 'offline' }); return; }
      publish({ status: 'checking' });
      try {
        const current = await plugin.current();
        if (current.native !== nativeVersion) throw new Error('Native app version mismatch');
        const [next, listed] = await Promise.all([plugin.getNextBundle(), plugin.list()]);
        if (next?.status !== 'error' && next?.id && next.id !== current.bundle.id) { publish({ status: 'ready', version: next.version }); return; }
        const envelope = await getManifest();
        if (!envelope) { publish({ status: 'current', version: current.bundle.version }); return; }
        const update = await verify(envelope, runtime);
        const history = [...(listed.bundles || []), current.bundle];
        if (sequenceOf(current.bundle.version) >= update.sequence || history.some(item => sequenceOf(item.version) > update.sequence) || history.some(item => item.version === update.version && item.status === 'error')) {
          publish({ status: history.some(item => item.version === update.version && item.status === 'error') ? 'reverted' : 'current', version: current.bundle.version }); return;
        }
        publish({ status: 'downloading', version: update.version });
        const previous = history.find(item => item.version === update.version && ['pending', 'success', 'downloading'].includes(item.status));
        if (previous?.status === 'downloading') return;
        const downloaded = previous || await plugin.download({ url: update.url, version: update.version, checksum: update.sha256 });
        if (!downloaded?.id || downloaded.status === 'error') throw new Error('Update download failed');
        // A call/exam must survive ordinary backgrounding. Install only after a
        // process restart, never by forcing a reload of the user's active page.
        await plugin.setMultiDelay({ delayConditions: [{ kind: 'kill' }] });
        await plugin.next({ id: downloaded.id });
        publish({ status: 'ready', version: update.version });
      } catch { publish({ status: 'error' }); }
    })().finally(() => { running = null; });
    return running;
  };
  return { check };
}
