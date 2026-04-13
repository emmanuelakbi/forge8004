/**
 * Property-based tests for app/lib/rate-limiter.ts
 *
 * Feature: nextjs-api-layer-migration
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";
import { checkRateLimit, getRateLimitHeaders } from "@/app/lib/rate-limiter";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Counter to ensure each property iteration gets a unique IP */
let ipCounter = 0;

function uniqueIp(): string {
  return `test-ip-${++ipCounter}-${Date.now()}`;
}

/**
 * Create a mock NextRequest with a given IP address.
 */
function createMockRequest(ip: string): any {
  const headersMap = new Map<string, string>();
  headersMap.set("x-forwarded-for", ip);
  return {
    headers: {
      get: (key: string) => headersMap.get(key) || null,
    },
  } as any;
}

// ---------------------------------------------------------------------------
// Property 7: Rate Limiter Sliding Window
// ---------------------------------------------------------------------------

describe("Feature: nextjs-api-layer-migration, Property 7: Rate Limiter Sliding Window", () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.3**
   */

  beforeEach(() => {
    ipCounter = 0;
  });

  it("allows the first 20 requests and blocks the 21st from the same IP", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (_seed) => {
        // Use a unique IP per iteration to avoid cross-contamination
        const ip = uniqueIp();
        const request = createMockRequest(ip);

        // First 20 requests should pass (return null)
        for (let i = 0; i < 20; i++) {
          const result = checkRateLimit(request);
          expect(result).toBeNull();
        }

        // 21st request should be rate limited (return 429 response)
        const blocked = checkRateLimit(request);
        expect(blocked).not.toBeNull();
        expect(blocked!.status).toBe(429);
      }),
      { numRuns: 100 },
    );
  });

  it("includes correct rate limit headers on 429 responses", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (_seed) => {
        const ip = uniqueIp();
        const request = createMockRequest(ip);

        // Exhaust the rate limit
        for (let i = 0; i < 20; i++) {
          checkRateLimit(request);
        }

        const blocked = checkRateLimit(request);
        expect(blocked).not.toBeNull();

        // Check headers on the 429 response
        const limitHeader = blocked!.headers.get("RateLimit-Limit");
        const remainingHeader = blocked!.headers.get("RateLimit-Remaining");
        const resetHeader = blocked!.headers.get("RateLimit-Reset");

        expect(limitHeader).toBe("20");
        expect(remainingHeader).toBe("0");
        expect(resetHeader).toBeTruthy();
        // Reset should be a valid unix timestamp (seconds)
        const resetTs = parseInt(resetHeader!, 10);
        expect(resetTs).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it("returns correct rate limit headers via getRateLimitHeaders after requests", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (requestCount) => {
        const ip = uniqueIp();
        const request = createMockRequest(ip);

        // Make requestCount requests
        for (let i = 0; i < requestCount; i++) {
          checkRateLimit(request);
        }

        const headers = getRateLimitHeaders(request);
        expect(headers["RateLimit-Limit"]).toBe("20");

        const remaining = parseInt(headers["RateLimit-Remaining"], 10);
        expect(remaining).toBe(Math.max(0, 20 - requestCount));

        const reset = parseInt(headers["RateLimit-Reset"], 10);
        expect(reset).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it("tracks different IPs independently", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (_seed) => {
        const ip1 = uniqueIp();
        const ip2 = uniqueIp();
        const req1 = createMockRequest(ip1);
        const req2 = createMockRequest(ip2);

        // Exhaust rate limit for ip1
        for (let i = 0; i < 20; i++) {
          checkRateLimit(req1);
        }

        // ip1 should be blocked
        const blocked = checkRateLimit(req1);
        expect(blocked).not.toBeNull();
        expect(blocked!.status).toBe(429);

        // ip2 should still be allowed
        const allowed = checkRateLimit(req2);
        expect(allowed).toBeNull();
      }),
      { numRuns: 100 },
    );
  });
});
