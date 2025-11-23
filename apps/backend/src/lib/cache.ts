import NodeCache from 'node-cache';

// Create a cache instance with 1 hour TTL (3600 seconds)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

export const getCachedData = <T>(key: string): T | undefined => {
  return cache.get<T>(key);
};

export const setCachedData = <T>(key: string, data: T, ttl?: number): boolean => {
  if (ttl) {
    return cache.set(key, data, ttl);
  }
  return cache.set(key, data);
};

export const deleteCachedData = (key: string): number => {
  return cache.del(key);
};

export const clearCache = (): void => {
  cache.flushAll();
};

export default cache;
