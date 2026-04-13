interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheStore {
  private store = new Map<string, CacheEntry<any>>();

  get<T>(key: string): { data: T; age: number } | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    const age = Date.now() - entry.timestamp;
    if (age < entry.ttl) {
      return { data: entry.data, age };
    }
    return null; // Expired — caller should fetch fresh
  }

  getStale<T>(key: string): T | null {
    const entry = this.store.get(key);
    return entry ? entry.data : null;
  }

  set<T>(key: string, data: T, ttl: number): void {
    this.store.set(key, { data, timestamp: Date.now(), ttl });
  }
}

// Singleton instance shared across all Route Handlers
export const cache = new CacheStore();

// TTL constants
export const CACHE_TTL = {
  MARKET: 30_000, // /api/market — 30s
  COIN_LIST: 15_000, // /api/market/coins — 15s
  COIN_DETAIL: 20_000, // /api/market/coins/[coinId] — 20s
  SIGNALS: 600_000, // /api/signals — 10 minutes
} as const;
