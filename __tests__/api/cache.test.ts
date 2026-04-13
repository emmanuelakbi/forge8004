/**
 * Property-based tests for app/lib/cache.ts
 *
 * Feature: nextjs-api-layer-migration
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import * as fc from "fast-check";
import { CacheStore } from "@/app/lib/cache";

// ---------------------------------------------------------------------------
// Property 12: Cache TTL and Stale Fallback
// ---------------------------------------------------------------------------

describe("Feature: nextjs-api-layer-migration, Property 12: Cache TTL and Stale Fallback", () => {
  /**
   * **Validates: Requirements 10.5, 16.1, 16.2, 16.4, 16.5**
   *
   * get() returns data before TTL, null after TTL.
   * getStale() always returns data regardless of TTL expiry.
   */

  afterEach(() => {
    vi.useRealTimers();
  });

  it("get returns data with correct age before TTL expiry", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.jsonValue(),
        fc.integer({ min: 100, max: 10000 }),
        (key, value, ttl) => {
          vi.useFakeTimers();
          const store = new CacheStore();
          const now = Date.now();

          store.set(key, value, ttl);

          // Advance time to just before TTL
          const advanceBy = Math.floor(ttl / 2);
          vi.advanceTimersByTime(advanceBy);

          const result = store.get(key);
          expect(result).not.toBeNull();
          expect(result!.data).toEqual(value);
          expect(result!.age).toBeGreaterThanOrEqual(0);
          expect(result!.age).toBeLessThan(ttl);

          vi.useRealTimers();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("get returns null after TTL expiry", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.jsonValue(),
        fc.integer({ min: 100, max: 10000 }),
        (key, value, ttl) => {
          vi.useFakeTimers();
          const store = new CacheStore();

          store.set(key, value, ttl);

          // Advance time past TTL
          vi.advanceTimersByTime(ttl + 1);

          const result = store.get(key);
          expect(result).toBeNull();

          vi.useRealTimers();
        },
      ),
      { numRuns: 100 },
    );
  });

  it("getStale always returns data regardless of TTL expiry", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.jsonValue(),
        fc.integer({ min: 100, max: 10000 }),
        (key, value, ttl) => {
          vi.useFakeTimers();
          const store = new CacheStore();

          store.set(key, value, ttl);

          // Advance time well past TTL
          vi.advanceTimersByTime(ttl * 10);

          const staleResult = store.getStale(key);
          expect(staleResult).toEqual(value);

          // Also verify get returns null (expired)
          const freshResult = store.get(key);
          expect(freshResult).toBeNull();

          vi.useRealTimers();
        },
      ),
      { numRuns: 100 },
    );
  });
});
