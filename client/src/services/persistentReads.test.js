import { createPersistentReadStorage } from './persistentReads';
import { createReadCache } from './requestCache';
const fallback = () => { const items = new Map(); return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value), removeItem: key => items.delete(key) }; };
const databaseFactory = () => {
  const records = new Map();
  return { open() {
    const request = {};
    queueMicrotask(() => {
      request.result = {
        createObjectStore() {}, close() {},
        transaction() {
          const transaction = {};
          transaction.objectStore = () => ({
            getAll() { const read = {}; queueMicrotask(() => { read.result = [...records.values()]; read.onsuccess?.(); }); return read; },
            put(row) { records.set(row.key, row); queueMicrotask(() => transaction.oncomplete?.()); },
            delete(key) { records.delete(key); queueMicrotask(() => transaction.oncomplete?.()); },
          });
          return transaction;
        },
      };
      request.onupgradeneeded?.(); request.onsuccess?.();
    });
    return request;
  } };
};
test('multiple large sections survive a new process, well beyond localStorage capacity and 15 minutes', async () => {
  const indexedDB = databaseFactory();
  const disk = createPersistentReadStorage({ indexedDB, fallback: fallback() });
  await disk.initialize();
  let time = 1000;
  const cache = createReadCache(async config => ({ status: 200, data: { title: config.url, details: 'x'.repeat(400000) } }), () => 'student', () => time, { storage: disk });
  for (let i = 0; i < 10; i++) await cache.request({ url: `/courses/c${i}` });
  await disk.flush();
  const rebootedDisk = createPersistentReadStorage({ indexedDB, fallback: fallback() });
  await rebootedDisk.initialize();
  const slowNetwork = jest.fn(() => new Promise(() => {}));
  time += 86400000;
  const rebooted = createReadCache(slowNetwork, () => 'student', () => time, { storage: rebootedDisk });
  for (let i = 0; i < 10; i++) {
    expect(rebooted.peek({ url: `/courses/c${i}` }).title).toBe(`/courses/c${i}`);
    expect((await rebooted.request({ url: `/courses/c${i}` })).data.title).toBe(`/courses/c${i}`);
  }
  expect(slowNetwork).toHaveBeenCalledTimes(10);
  expect(createReadCache(slowNetwork, () => 'another', () => time, { storage: rebootedDisk }).peek({ url: '/courses/c0' })).toBeNull();
  rebooted.clear(); await rebootedDisk.flush();
  const afterLogout = createPersistentReadStorage({ indexedDB, fallback: fallback() }); await afterLogout.initialize();
  expect(createReadCache(slowNetwork, () => 'student', () => time, { storage: afterLogout }).peek({ url: '/courses/c0' })).toBeNull();
});
test('a blocked database cannot keep startup waiting indefinitely', async () => {
  const local = fallback(); local.setItem('saved', 'local');
  const storage = createPersistentReadStorage({ indexedDB: { open: () => ({}) }, fallback: local, timeoutMs: 5 });
  await storage.initialize();
  expect(storage.getItem('saved')).toBe('local');
  expect(storage.budgetBytes).toBe(2000000);
  storage.setItem('another', 'still usable');
  expect(storage.getItem('another')).toBe('still usable');
});
