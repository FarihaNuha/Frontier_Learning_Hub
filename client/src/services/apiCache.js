import { useState, useEffect, useCallback, useRef } from "react";
import api from "./api";

// In-memory cache map
const memoryCache = new Map();
const CACHE_PREFIX = "uftb_swr_cache_";
const DEFAULT_TTL = 1000 * 60 * 15; // 15 minutes TTL by default

/**
 * Read cached item from memory or sessionStorage
 */
export const getCachedData = (key) => {
  if (!key) return null;
  
  // 1. Check in-memory Map
  if (memoryCache.has(key)) {
    const entry = memoryCache.get(key);
    if (Date.now() - entry.timestamp < DEFAULT_TTL) {
      return entry.data;
    } else {
      memoryCache.delete(key);
    }
  }

  // 2. Check sessionStorage fallback
  try {
    const stored = sessionStorage.getItem(CACHE_PREFIX + key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Date.now() - parsed.timestamp < DEFAULT_TTL) {
        // Hydrate memory cache
        memoryCache.set(key, parsed);
        return parsed.data;
      } else {
        sessionStorage.removeItem(CACHE_PREFIX + key);
      }
    }
  } catch (err) {
    console.error("Cache read error:", err);
  }

  return null;
};

/**
 * Store item into memory and sessionStorage
 */
export const setCachedData = (key, data) => {
  if (!key || data === undefined) return;
  const entry = { data, timestamp: Date.now() };

  // 1. Store in memory
  memoryCache.set(key, entry);

  // 2. Store in sessionStorage for tab/refresh resilience
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (err) {
    // If storage full or quota exceeded, swallow error
  }
};

/**
 * Invalidate cache by exact key or regex pattern match
 */
export const invalidateCache = (keyOrPattern) => {
  if (!keyOrPattern) return;

  // Clear memory cache entries
  for (const key of memoryCache.keys()) {
    if (typeof keyOrPattern === "string" ? key.includes(keyOrPattern) : keyOrPattern.test(key)) {
      memoryCache.delete(key);
    }
  }

  // Clear sessionStorage entries
  try {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        const rawKey = key.slice(CACHE_PREFIX.length);
        if (typeof keyOrPattern === "string" ? rawKey.includes(keyOrPattern) : keyOrPattern.test(rawKey)) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch (err) {
    console.error("Cache invalidation error:", err);
  }
};

/**
 * Helper for cached GET requests (Stale-While-Revalidate pattern)
 */
export const fetchWithCache = async (url, options = {}) => {
  const { ttl = DEFAULT_TTL, forceRefresh = false } = options;
  
  if (!forceRefresh) {
    const cached = getCachedData(url);
    if (cached !== null) {
      // Fire background revalidation
      api.get(url).then((res) => {
        setCachedData(url, res.data);
      }).catch(() => {});
      return cached;
    }
  }

  const res = await api.get(url);
  setCachedData(url, res.data);
  return res.data;
};

/**
 * Custom React Hook for Stale-While-Revalidate (SWR) fetching
 */
export function useCachedFetch(url, config = {}) {
  const { enabled = true, initialData = null } = config;
  const cacheKey = url;

  // Initialize state synchronously with cached data if available
  const [data, setData] = useState(() => {
    if (!enabled || !url) return initialData;
    const cached = getCachedData(cacheKey);
    return cached !== null ? cached : initialData;
  });

  const [loading, setLoading] = useState(() => {
    if (!enabled || !url) return false;
    const cached = getCachedData(cacheKey);
    // If cached data exists, loading is false (0ms load experience!)
    return cached === null;
  });

  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  const fetchData = useCallback(
    async (showLoadingIfNoCache = true) => {
      if (!url || !enabled) return;

      const cached = getCachedData(cacheKey);
      if (!cached && showLoadingIfNoCache) {
        setLoading(true);
      }

      try {
        const res = await api.get(url);
        const freshData = res.data;

        if (isMounted.current) {
          setData(freshData);
          setLoading(false);
          setError(null);
          setCachedData(cacheKey, freshData);
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err);
          setLoading(false);
        }
      }
    },
    [url, enabled, cacheKey]
  );

  useEffect(() => {
    isMounted.current = true;

    // Check sync cache again when URL changes
    const cached = getCachedData(cacheKey);
    if (cached !== null) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    fetchData(cached === null);

    return () => {
      isMounted.current = false;
    };
  }, [url, enabled, cacheKey, fetchData]);

  const mutate = useCallback(
    (newData, shouldRevalidate = true) => {
      setData(newData);
      setCachedData(cacheKey, newData);
      if (shouldRevalidate) {
        fetchData(false);
      }
    },
    [cacheKey, fetchData]
  );

  return { data, loading, error, refetch: () => fetchData(false), mutate };
}
