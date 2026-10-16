// Shared, bounded read-through cache. Live actions and document binaries bypass it.
const PREFIX = 'unicore_reads_v3:';
const eligible = url => {
  const path = (url || '').split('?')[0];
  if (/view-base64|download|export|\/auth\/|\/conversation\/|\/inbox|unread|\/exams\/[a-f0-9]{24}$|\/attempt|\/answers/.test(path) || /(?:token|password)=/i.test(url || '')) return false;
  return /^\/(courses|lectures$|assignments(?:\/my-submissions)?$|exams(?:\/my-submissions)?$|assessments|results|attendance|academic|registration(?:\/|$)|registration-payments\/(history|invoice)|service\/(calendar|notices)|announcements|ums\/admin|community\/(users|public\/posts|courses\/[^/]+\/posts))/.test(path);
};
const decode = value => { if (typeof value !== 'string') return value; try { return JSON.parse(value); } catch { return value; } };
const clone = value => value === undefined ? undefined : typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

export function createReadCache(adapter, owner, now = Date.now, options = {}) {
  const entries = new Map(), pending = new Map(), listeners = new Set();
  const storage = options.storage;
  let generation = 0;
  const remember = (key, entry) => {
    entry.bytes = entry.bytes || JSON.stringify(entry.data).length;
    entries.delete(key);
    let bytes = [...entries.values()].reduce((sum, item) => sum + (item.bytes || 0), 0);
    while (entries.size >= 60 || bytes + entry.bytes > 6000000) {
      const first = entries.keys().next().value;
      if (first === undefined) break;
      bytes -= entries.get(first).bytes || 0; entries.delete(first);
    }
    entries.set(key, entry);
  };
  const keyFor = config => `${PREFIX}${owner()}:${config.baseURL || ''}:${config.url}:${JSON.stringify(config.params || {})}`;
  const index = () => { try { return JSON.parse(storage?.getItem(PREFIX + 'index') || '[]'); } catch { return []; } };
  const removeDisk = predicate => {
    if (!storage) return;
    try { const kept = index().filter(item => { if (!predicate(item.key)) return true; storage.removeItem(item.key); return false; }); storage.setItem(PREFIX + 'index', JSON.stringify(kept)); } catch { }
  };
  const persist = (key, entry) => {
    if (!storage) return;
    try {
      const encoded = JSON.stringify(entry);
      if (encoded.length > 300000) return;
      let items = index().filter(item => item.key !== key);
      let bytes = items.reduce((sum, item) => sum + item.bytes, 0);
      while (items.length >= 50 || bytes + encoded.length > 2000000) {
        const oldest = items.shift(); if (!oldest) break;
        storage.removeItem(oldest.key); bytes -= oldest.bytes;
      }
      storage.setItem(key, encoded);
      items.push({ key, bytes: encoded.length });
      storage.setItem(PREFIX + 'index', JSON.stringify(items));
    } catch { /* Caching must also work when device storage is unavailable. */ }
  };
  const read = config => {
    const key = keyFor(config);
    let entry = entries.get(key);
    if (!entry && storage) { try { entry = JSON.parse(storage.getItem(key) || 'null'); } catch { } }
    if (!entry || now() - entry.savedAt > 15 * 60000 || entry.savedAt > now()) return null;
    remember(key, entry);
    return entry;
  };
  const emit = event => { for (const listener of listeners) { try { listener(event); } catch { } } };
  const invalidate = (prefix = '', notify = true) => {
    generation++;
    const match = key => !prefix || key.includes(prefix);
    for (const key of entries.keys()) if (match(key)) entries.delete(key);
    for (const key of pending.keys()) if (match(key)) pending.delete(key);
    removeDisk(match);
    if (notify) emit({ invalidated: prefix, owner: owner() });
  };
  const clear = () => invalidate('');
  const domains = url => {
    if (/^\/auth\/(fcm-token|push-test)/.test(url) || /^\/community\/(conversation\/.*\/read|messages(?:\/|$))/.test(url)) return [];
    if (url.includes('/notifications')) return [];
    if (/\/community\//.test(url)) return ['/community/'];
    if (/\/lectures/.test(url)) return ['/lectures', '/community/'];
    if (/\/assignments/.test(url)) return ['/assignments', '/courses'];
    if (/\/exams/.test(url)) return ['/exams', '/results'];
    if (/\/attendance/.test(url)) return ['/attendance', '/assessments', '/results'];
    if (/\/service\//.test(url)) return ['/service/'];
    if (/\/results|\/assessments/.test(url)) return ['/results', '/assessments', '/academic/'];
    return [''];
  };
  const asResponse = (entry, config) => ({ status: 200, statusText: 'OK', headers: {}, config, data: clone(entry.data) });
  const load = config => {
    const key = keyFor(config), epoch = generation, scope = owner();
    if (pending.has(key)) return pending.get(key);
    const promise = adapter({ ...config, signal: undefined, cancelToken: undefined }).then(response => {
      if (epoch === generation && scope === owner() && response.status === 200) {
        const entry = { data: clone(response.data), savedAt: now() };
        if (JSON.stringify(entry.data)?.length < 1000000) {
          remember(key, entry); persist(key, entry);
        } else {
          entries.delete(key); removeDisk(candidate => candidate === key);
        }
        emit({ url: config.url, params: config.params || {}, owner: scope, data: clone(decode(response.data)) });
      }
      return response;
    }).finally(() => { if (pending.get(key) === promise) pending.delete(key); });
    pending.set(key, promise);
    return promise;
  };
  const request = async config => {
    const method = (config.method || 'get').toLowerCase();
    if (method !== 'get') {
      const related = domains(config.url || '');
      related.forEach(prefix => invalidate(prefix, false));
      const response = await adapter(config);
      related.forEach(prefix => invalidate(prefix));
      return response;
    }
    if (owner() === 'anonymous' || !eligible(config.url) || config.responseType === 'blob' || config.responseType === 'arraybuffer') return adapter(config);
    const cached = config.cache === false ? null : read(config);
    if (cached) {
      // Paint saved content immediately; silently refresh stale reads.
      if (now() - cached.savedAt >= (config.cacheTtl || 30000)) load(config).catch(error => {
        // Authentication failures must still reach the API interceptor.
        if ([401, 403].includes(error.response?.status)) { invalidate(''); options.onAuthError?.(error); }
      });
      return asResponse(cached, config);
    }
    const response = await load(config);
    return { ...response, config, data: clone(response.data) };
  };
  return {
    request, clear, invalidate,
    peek: config => { if (owner() === 'anonymous' || !eligible(config.url)) return null; const entry = read(config); return entry ? clone(decode(entry.data)) : null; },
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
  };
}
