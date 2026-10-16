import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { createUpdateController } from './liveUpdateController';
import { verifyManifest, feedUrl } from './otaManifest';
import publicKey from './otaPublicKey.json';
import runtimeInfo from '../generated/otaRuntime.json';

export const liveUpdatesAvailable = () => Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('CapacitorUpdater');
let state = { status: 'idle', nativeVersion: runtimeInfo.nativeVersion };
const listeners = new Set();
const publish = next => { state = { ...state, ...next }; listeners.forEach(listener => listener()); };
export const readUpdateState = () => state;
export const subscribeUpdates = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const controller = createUpdateController({
  plugin: CapacitorUpdater, ...runtimeInfo, publish,
  verify: (envelope, runtime) => verifyManifest(envelope, runtime, publicKey),
  getManifest: async () => {
    const response = await CapacitorHttp.get({ url: feedUrl(runtimeInfo.runtime), connectTimeout: 6000, readTimeout: 6000, responseType: 'json', headers: { 'Cache-Control': 'no-cache' } });
    if (response.status === 404) return null;
    if (response.status !== 200) throw new Error('Update service unavailable');
    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    return data;
  },
});
export const checkLiveUpdates = () => liveUpdatesAvailable() ? controller.check() : Promise.resolve();
let ready;
export function confirmUpdateReady() {
  if (!liveUpdatesAvailable()) return Promise.resolve();
  if (!ready) ready = CapacitorUpdater.notifyAppReady().catch(() => { publish({ status: 'error' }); });
  return ready;
}
