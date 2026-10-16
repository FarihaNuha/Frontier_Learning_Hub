// A synchronous mirror is hydrated from IndexedDB before React starts. Large
// section snapshots therefore survive a WebView process restart without using
// the small localStorage quota needed by login/settings.
export function createPersistentReadStorage({ indexedDB, fallback, timeoutMs = 400 } = {}) {
  const values = new Map();
  const writes = new Set();
  let database, ready;
  const fallbackGet = key => { try { return fallback?.getItem(key) ?? null; } catch { return null; } };
  const write = (method, key, value) => {
    if (!database) {
      try { if (method === 'put') fallback?.setItem(key, value); else fallback?.removeItem(key); } catch { }
      return;
    }
    const promise = new Promise(resolve => {
      try {
        const transaction = database.transaction('reads', 'readwrite');
        const store = transaction.objectStore('reads');
        if (method === 'put') store.put({ key, value }); else store.delete(key);
        transaction.oncomplete = transaction.onerror = transaction.onabort = () => resolve();
      } catch { resolve(); }
    });
    writes.add(promise); promise.then(() => writes.delete(promise));
  };
  return {
    get budgetBytes() { return database ? 20000000 : 2000000; },
    get entryBytes() { return database ? 5000000 : 1500000; },
    get maxEntries() { return database ? 100 : 50; },
    keys() { let localKeys = []; try { localKeys = Object.keys(fallback || {}); } catch { } return [...new Set([...values.keys(), ...localKeys])]; },
    getItem: key => values.has(key) ? values.get(key) : fallbackGet(key),
    setItem(key, value) { values.set(key, value); write('put', key, value); },
    removeItem(key) { values.delete(key); try { fallback?.removeItem(key); } catch { } write('delete', key); },
    flush: async () => { await Promise.all([...writes]); },
    initialize() {
      if (ready) return ready;
      ready = new Promise(resolve => {
        if (!indexedDB) { resolve(); return; }
        let settled = false, connection;
        const finish = () => { if (!settled) { settled = true; clearTimeout(timer); resolve(); } };
        const timer = setTimeout(() => { connection?.close(); finish(); }, timeoutMs);
        try {
          const request = indexedDB.open('unicore-read-snapshots', 1);
          request.onupgradeneeded = () => request.result.createObjectStore('reads', { keyPath: 'key' });
          request.onerror = request.onblocked = finish;
          request.onsuccess = () => {
            connection = request.result;
            if (settled) { connection.close(); return; }
            const transaction = connection.transaction('reads', 'readonly');
            const read = transaction.objectStore('reads').getAll();
            read.onsuccess = () => {
              if (settled) return;
              for (const item of read.result || []) if (typeof item.key === 'string' && typeof item.value === 'string') values.set(item.key, item.value);
              database = connection;
              connection.onversionchange = () => { connection.close(); database = null; };
              finish();
            };
            transaction.onerror = transaction.onabort = () => { connection.close(); finish(); };
          };
        } catch { finish(); }
      });
      return ready;
    },
  };
}

let local;
try { local = window.localStorage; } catch { }
export const persistentReads = createPersistentReadStorage({ indexedDB: window.indexedDB, fallback: local });
