// A bounded, account-scoped cache for repeat reads. Live chat/call/read-receipt
// requests bypass it. Mutation generations prevent stale in-flight refills.
export function createReadCache(adapter, owner, now = Date.now) {
  const copy = data => typeof structuredClone === "function" ? structuredClone(data) : JSON.parse(JSON.stringify(data));
  const entries = new Map(), pending = new Map();
  let generation = 0;
  const allowed = url => /^\/(courses(?:\/|\?|$)|lectures(?:\?|$)|academic\/student\/|service\/calendar|registration-payments\/(history|invoice)|assessments|results|attendance|community\/(users|public\/posts|courses\/[^/]+\/posts))/.test(url || "");
  const clear = () => { generation++; entries.clear(); pending.clear(); };
  const invalidate = prefix => { generation++; pending.clear(); for (const key of entries.keys()) if (key.includes(prefix)) entries.delete(key); };
  const request = async config => {
    const method = (config.method || "get").toLowerCase();
    if (method !== "get") {
      // Read acknowledgements do not invalidate academic pages on each message.
      if (!/\/community\/(conversation\/.*\/read|messages(?:\/|$))/.test(config.url || "")) clear();
      else { generation++; pending.clear(); for (const key of entries.keys()) if (key.includes("/community/")) entries.delete(key); }
      return adapter(config);
    }
    if (config.cache === false || !allowed(config.url) || config.responseType === "blob") return adapter(config);
    const scope = owner(), epoch = generation;
    const key = `${scope}:${config.baseURL || ""}:${config.url}:${JSON.stringify(config.params || {})}`;
    const cached = entries.get(key);
    if (cached && now() < cached.until) return { ...cached.response, config, data: copy(cached.response.data) };
    if (pending.has(key)) return pending.get(key).then(response => ({ ...response, config, data: copy(response.data) }));
    const load = adapter(config).then(response => {
      if (epoch === generation && scope === owner() && response.status === 200) {
        // Avoid retaining document binaries or multi-megabyte lists in RAM.
        if (JSON.stringify(response.data).length < 1000000) {
          if (entries.size >= 50) entries.delete(entries.keys().next().value);
          entries.set(key, { response: { ...response, data: copy(response.data) }, until: now() + (config.cacheTtl || 30000) });
        }
      }
      return response;
    }).finally(() => { if (pending.get(key) === load) pending.delete(key); });
    pending.set(key, load);
    return load;
  };
  return { request, clear, invalidate };
}
