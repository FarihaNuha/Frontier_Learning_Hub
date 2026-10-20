import { useEffect, useSyncExternalStore } from 'react';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { checkLiveUpdates, confirmUpdateReady, liveUpdatesAvailable, readUpdateState, subscribeUpdates } from '../services/liveUpdates';
import { FiRefreshCw } from 'react-icons/fi';
import { SettingsCard } from './SettingsPrimitives';

export function LiveUpdateLifecycle() {
  useEffect(() => {
    confirmUpdateReady();
    const timer = setTimeout(checkLiveUpdates, 5000);
    let handle, disposed = false;
    if (liveUpdatesAvailable()) CapacitorUpdater.addListener('downloadComplete', () => { setTimeout(checkLiveUpdates, 100); }).then(value => { if (disposed) value.remove(); else handle = value; }).catch(() => {});
    const online = () => { checkLiveUpdates(); };
    window.addEventListener('online', online);
    return () => { disposed = true; clearTimeout(timer); handle?.remove(); window.removeEventListener('online', online); };
  }, []);
  return null;
}
export default function AppUpdates() {
  const update = useSyncExternalStore(subscribeUpdates, readUpdateState);
  const available = liveUpdatesAvailable();
  const messages = {
    idle: 'Small app updates download in the background.',
    checking: 'Checking for updates…', downloading: 'Downloading an update. You can keep using UniCore.',
    ready: 'Update ready. Close and reopen UniCore to finish updating.',
    current: 'Your app is up to date.', offline: 'Connect to the internet to check for updates.',
    reverted: 'Using the previous working version. A newer update will be checked when available.',
    error: 'Could not check or prepare the update. Your current app will keep working.',
  };
  const busy = ['checking', 'downloading'].includes(update.status);
  return <SettingsCard title="App updates" description={`Keep UniCore up to date · Version ${update.nativeVersion}`} icon={FiRefreshCw}>
    <div className="settings-update-row">
      <p role="status" aria-live="polite">{available ? messages[update.status] : 'Automatic app updates are available in the Android app.'}</p>
      <button className="settings-button settings-button-secondary" type="button" disabled={!available || busy} onClick={checkLiveUpdates}>{busy ? 'Please wait…' : 'Check for updates'}</button>
    </div>
  </SettingsCard>;
}
