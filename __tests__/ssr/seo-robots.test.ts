/**
 * Property-based test for robots directive classification
 *
 * Feature: nextjs-ui-polish-ssr-fixes, Property 3: Robots directive matches route classification
 *
 * Validates: Requirements 6.5
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  SEO_ROUTES,
  isInternalRoute,
  getRouteMetadata,
} from "@/app/lib/seo-config";

describe("SEO Robots — Property 3: Robots directive matches route classification", () => {
  const routeArb = fc.constantFrom(...Object.keys(SEO_ROUTES));

  it("should set 'noindex, nofollow' for internal routes and 'index, follow' for public routes", () => {
    fc.assert(
      fc.property(routeArb, (pathname) => {
        const config = getRouteMetadata(pathname);
        const robots = config.robots ?? "index, follow";

        if (isInternalRoute(pathname)) {
          expect(robots).toBe("noindex, nofollow");
        } else {
          expect(robots).toBe("index, follow");
        }
      }),
      { numRuns: 100 },
    );
  });

  it("should classify /brand, /pitch, /social-kit as internal routes", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("/brand", "/pitch", "/social-kit"),
        (pathname) => {
          expect(isInternalRoute(pathname)).toBe(true);

          const config = getRouteMetadata(pathname);
          expect(config.robots).toBe("noindex, nofollow");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("should classify all non-internal routes as public with 'index, follow'", () => {
    const publicRoutes = Object.keys(SEO_ROUTES).filter(
      (p) => !isInternalRoute(p),
    );

    fc.assert(
      fc.property(fc.constantFrom(...publicRoutes), (pathname) => {
        expect(isInternalRoute(pathname)).toBe(false);

        const config = getRouteMetadata(pathname);
        const robots = config.robots ?? "index, follow";
        expect(robots).toBe("index, follow");
      }),
      { numRuns: 100 },
    );
  });
});
