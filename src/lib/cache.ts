/**
 * Simple server-side in-memory cache with TTL.
 *
 * Used by Pipedrive API route handlers to avoid hammering the
 * Pipedrive API on every page load / refresh. Each entry expires
 * after `ttl` milliseconds (default 5 minutes).
 *
 * NOTE: This lives in the Node.js module scope so it persists
 * across requests within the same server process, but is cleared
 * on server restart / hot-reload.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/** Default TTL: 5 minutes */
const DEFAULT_TTL = 5 * 60 * 1000;

/**
 * Get a cached value, or compute it via `fn` and store the result.
 *
 * @param key   Unique cache key (e.g. `"pipelines"`, `"deals:42"`)
 * @param fn    Async function that produces the fresh value
 * @param ttl   Time-to-live in milliseconds (default 5 min)
 */
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = DEFAULT_TTL,
): Promise<T> {
  const now = Date.now();
  const existing = store.get(key) as CacheEntry<T> | undefined;

  if (existing && existing.expiresAt > now) {
    return existing.data;
  }

  const data = await fn();
  store.set(key, { data, expiresAt: now + ttl });
  return data;
}

/**
 * Invalidate a specific cache key or all keys matching a prefix.
 */
export function invalidateCache(keyOrPrefix?: string): void {
  if (!keyOrPrefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix + ':')) {
      store.delete(key);
    }
  }
}

/**
 * Get cache stats (useful for debugging).
 */
export function cacheStats(): { size: number; keys: string[] } {
  return { size: store.size, keys: [...store.keys()] };
}
