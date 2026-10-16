import { clearConversations } from './chatState';
import { clearHomeSnapshots } from './homeSnapshot';
import { useState, useEffect, useCallback, useRef } from 'react';
import api from './api';
import { readAddress } from './requestCache';

export const clearAllCache = () => {
  clearConversations(); clearHomeSnapshots(); api.clearReadCache?.();
  // Remove the obsolete, unbounded session cache on existing installations.
  try { Object.keys(sessionStorage).filter(key => key.startsWith('uftb_swr_cache_')).forEach(key => sessionStorage.removeItem(key)); } catch { }
};
export const getCachedData = (url, params) => api.peekReadCache?.(url, params) ?? null;
export const hasCachedReads = urls => urls.every(url => api.hasReadCache ? api.hasReadCache(url) : getCachedData(url) !== null);

// Legacy sections still load through effects. Hydrate their display state before
// the first paint, and consume the adapter's background refreshes after that.
export function useReadState(url, select, initialValue) {
  const owner = api.readOwner?.() || '';
  const identity = `${owner}:${url}`;
  const currentIdentity = useRef(identity); currentIdentity.current = identity;
  const selectRef = useRef(select); selectRef.current = select;
  const initialRef = useRef(initialValue); initialRef.current = initialValue;
  const snapshot = () => {
    const saved = getCachedData(url);
    return saved === null ? initialRef.current : selectRef.current(saved);
  };
  const [state, update] = useState(() => ({ identity, value: snapshot() }));
  useEffect(() => {
    update(previous => previous.identity === identity ? previous : { identity, value: snapshot() });
    return api.subscribeReads?.(event => {
      if (event.owner === owner && readAddress(event) === readAddress({ url })) {
        update({ identity, value: selectRef.current(event.data) });
      }
    });
  }, [identity, url, owner]);
  const setValue = useCallback(value => { if (currentIdentity.current === identity) update(previous => ({ identity, value: typeof value === 'function' ? value(previous.identity === identity ? previous.value : snapshot()) : value })); }, [identity]);
  return [state.identity === identity ? state.value : snapshot(), setValue];
}
export const setCachedData = () => { /* Successful reads are stored by the API adapter. */ };
export const invalidateCache = pattern => {
  if (!pattern) return;
  api.invalidateReadCache?.(typeof pattern === 'string' ? pattern : '');
};
export const fetchWithCache = async (url, { forceRefresh = false, params } = {}) =>
  (await api.get(url, { cache: !forceRefresh, params })).data;

export function useCachedFetch(url, { enabled = true, initialData = null, params } = {}) {
  const paramsKey = JSON.stringify(params || {});
  const owner = api.readOwner?.() || '';
  const [state, setState] = useState(() => ({ url, paramsKey, owner, data: enabled ? getCachedData(url, params) ?? initialData : initialData, loading: enabled && getCachedData(url, params) === null && initialData === null, error: null }));
  const generation = useRef(0);
  const published = useRef(0);
  const paramsRef = useRef(params); paramsRef.current = params;
  const run = useCallback(async (fresh = false) => {
    if (!enabled || !url) return;
    const request = ++generation.current;
    const revision = published.current;
    try {
      const response = await api.get(url, { params: paramsRef.current, cache: !fresh });
      if (generation.current === request && published.current === revision) setState({ url, paramsKey, owner, data: response.data, loading: false, error: null });
    } catch (error) {
      if (generation.current === request) setState(previous => ({ ...previous, url, paramsKey, owner, loading: false, error }));
    }
  }, [url, enabled, paramsKey, owner]);
  useEffect(() => {
    if (!enabled || !url) { setState({ url, paramsKey, owner, data: initialData, loading: false, error: null }); return; }
    const saved = getCachedData(url, paramsRef.current);
    setState({ url, paramsKey, owner, data: saved ?? initialData, loading: saved === null && initialData === null, error: null });
    const unsubscribe = api.subscribeReads?.(event => {
      if (event.owner !== owner) return;
      if (readAddress(event) === readAddress({ url, params: paramsRef.current })) {
        published.current++;
        setState({ url, paramsKey, owner, data: event.data, loading: false, error: null });
      } else if (event.invalidated !== undefined && (!event.invalidated || url.includes(event.invalidated))) run(true);
    });
    run();
    const focus = () => { if (document.visibilityState === 'visible') run(true); };
    window.addEventListener('online', focus); document.addEventListener('visibilitychange', focus);
    return () => { generation.current++; unsubscribe?.(); window.removeEventListener('online', focus); document.removeEventListener('visibilitychange', focus); };
  }, [url, enabled, paramsKey, owner, run]);
  const matching = state.url === url && state.paramsKey === paramsKey && state.owner === owner;
  const saved = matching ? null : getCachedData(url, paramsRef.current);
  return {
    data: matching ? state.data : saved ?? initialData,
    loading: matching ? state.loading : enabled && saved === null,
    error: matching ? state.error : null,
    refetch: () => run(true),
    mutate: (value, revalidate = true) => { setState(previous => ({ ...previous, data: value, loading: false })); if (revalidate) run(true); },
  };
}
