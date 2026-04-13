/**
 * Property 1: Route Path to File Path Mapping
 *
 * For any active route path from the known route configuration (18 routes),
 * the mapping function that converts a React Router path (e.g., `/agents/:agentId`)
 * to an App Router file path (e.g., `app/(routes)/agents/[agentId]/page.tsx`)
 * SHALL produce a valid file path where: (a) the `(routes)` segment is present,
 * (b) React Router `:param` segments are converted to `[param]` segments, and
 * (c) the path ends with `/page.tsx`.
 *
 * **Validates: Requirements 1.1, 1.2**
 *
 * Feature: nextjs-page-routing-migration, Property 1: Route Path to File Path Mapping
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Known route map: React Router path → App Router file path
// ---------------------------------------------------------------------------

const ROUTE_MAP: Record<string, string> = {
  "/": "app/(routes)/page.tsx",
  "/overview": "app/(routes)/overview/page.tsx",
  "/how-it-works": "app/(routes)/how-it-works/page.tsx",
  "/trust-center": "app/(routes)/trust-center/page.tsx",
  "/agents": "app/(routes)/agents/page.tsx",
  "/agents/:agentId": "app/(routes)/agents/[agentId]/page.tsx",
  "/agents/:agentId/trust-report":
    "app/(routes)/agents/[agentId]/trust-report/page.tsx",
  "/compare": "app/(routes)/compare/page.tsx",
  "/risk-replay": "app/(routes)/risk-replay/page.tsx",
  "/portfolio": "app/(routes)/portfolio/page.tsx",
  "/register-agent": "app/(routes)/register-agent/page.tsx",
  "/contact": "app/(routes)/contact/page.tsx",
  "/privacy": "app/(routes)/privacy/page.tsx",
  "/terms": "app/(routes)/terms/page.tsx",
  "/brand": "app/(routes)/brand/page.tsx",
  "/docs": "app/(routes)/docs/page.tsx",
  "/markets": "app/(routes)/markets/page.tsx",
  "/markets/:coinId": "app/(routes)/markets/[coinId]/page.tsx",
};

// ---------------------------------------------------------------------------
// Pure mapping function under test
// ---------------------------------------------------------------------------

/**
 * Converts a React Router path to a Next.js App Router file path.
 * - Wraps in `app/(routes)/` route group
 * - Converts `:param` segments to `[param]`
 * - Appends `/page.tsx`
 */
function reactRouterToAppRouter(routerPath: string): string {
  if (routerPath === "/") return "app/(routes)/page.tsx";

  const segments = routerPath.split("/").filter(Boolean);
  const converted = segments.map((seg) =>
    seg.startsWith(":") ? `[${seg.slice(1)}]` : seg,
  );
  return `app/(routes)/${converted.join("/")}/page.tsx`;
}

// ---------------------------------------------------------------------------
// Arbitrary: pick a random route from the known map
// ---------------------------------------------------------------------------

const routePathArb = fc.constantFrom(...Object.keys(ROUTE_MAP));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Feature: nextjs-page-routing-migration, Property 1: Route Path to File Path Mapping", () => {
  it("maps every known route to its expected App Router file path", () => {
    fc.assert(
      fc.property(routePathArb, (routePath) => {
        const result = reactRouterToAppRouter(routePath);
        expect(result).toBe(ROUTE_MAP[routePath]);
      }),
      { numRuns: 100 },
    );
  });

  it("output always contains the (routes) segment", () => {
    fc.assert(
      fc.property(routePathArb, (routePath) => {
        const result = reactRouterToAppRouter(routePath);
        expect(result).toContain("(routes)");
      }),
      { numRuns: 100 },
    );
  });

  it("output always ends with /page.tsx", () => {
    fc.assert(
      fc.property(routePathArb, (routePath) => {
        const result = reactRouterToAppRouter(routePath);
        expect(result).toMatch(/\/page\.tsx$/);
      }),
      { numRuns: 100 },
    );
  });

  it("converts all :param segments to [param] segments", () => {
    fc.assert(
      fc.property(routePathArb, (routePath) => {
        const result = reactRouterToAppRouter(routePath);
        // No colon-prefixed segments should remain in the output
        expect(result).not.toMatch(/:[a-zA-Z]/);

        // Every :param in the input should appear as [param] in the output
        const paramMatches = routePath.match(/:([a-zA-Z]\w*)/g);
        if (paramMatches) {
          for (const param of paramMatches) {
            const paramName = param.slice(1);
            expect(result).toContain(`[${paramName}]`);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it("output never contains a colon character", () => {
    fc.assert(
      fc.property(routePathArb, (routePath) => {
        const result = reactRouterToAppRouter(routePath);
        expect(result).not.toContain(":");
      }),
      { numRuns: 100 },
    );
  });
});
