/**
 * Property-based test for sitemap filtering
 *
 * Feature: nextjs-ui-polish-ssr-fixes, Property 5: Sitemap excludes internal routes and includes all public routes
 *
 * Validates: Requirements 6.7
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { SEO_ROUTES, isInternalRoute } from "@/app/lib/seo-config";
import sitemap from "@/app/sitemap";

const allRouteKeys = Object.keys(SEO_ROUTES);
const routeArb = fc.constantFrom(...allRouteKeys);

/** Routes that contain dynamic segments (e.g. /agents/[agentId]) */
function isDynamicRoute(pathname: string): boolean {
  return pathname.includes("[");
}

/** A route is public-static if it is NOT internal and NOT dynamic */
function isPublicStaticRoute(pathname: string): boolean {
  return !isInternalRoute(pathname) && !isDynamicRoute(pathname);
}

describe("SEO Sitemap — Property 5: Sitemap excludes internal routes and includes all public routes", () => {
  const entries = sitemap();
  const sitemapUrls = entries.map((e) => e.url);

  it("should exclude internal routes (noindex, nofollow) from the sitemap", () => {
    const internalRoutes = allRouteKeys.filter((p) => isInternalRoute(p));

    fc.assert(
      fc.property(fc.constantFrom(...internalRoutes), (pathname) => {
        const matchingUrl = sitemapUrls.find((url) => url.endsWith(pathname));
        expect(matchingUrl).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it("should exclude dynamic segment routes from the sitemap", () => {
    const dynamicRoutes = allRouteKeys.filter((p) => isDynamicRoute(p));

    fc.assert(
      fc.property(fc.constantFrom(...dynamicRoutes), (pathname) => {
        const matchingUrl = sitemapUrls.find((url) => url.endsWith(pathname));
        expect(matchingUrl).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it("should include all public static routes in the sitemap", () => {
    const publicStaticRoutes = allRouteKeys.filter((p) =>
      isPublicStaticRoute(p),
    );

    fc.assert(
      fc.property(fc.constantFrom(...publicStaticRoutes), (pathname) => {
        const matchingUrl = sitemapUrls.find(
          (url) =>
            url.endsWith(pathname) || (pathname === "/" && url.endsWith("/")),
        );
        expect(matchingUrl).toBeDefined();
      }),
      { numRuns: 100 },
    );
  });

  it("should produce absolute URLs (starting with http) for all entries", () => {
    fc.assert(
      fc.property(routeArb, (pathname) => {
        if (!isPublicStaticRoute(pathname)) return; // skip non-included routes

        const matchingUrl = sitemapUrls.find(
          (url) =>
            url.endsWith(pathname) || (pathname === "/" && url.endsWith("/")),
        );
        expect(matchingUrl).toBeDefined();
        expect(matchingUrl!.startsWith("http")).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("should set priority 1.0 for home route and 0.7 for all others", () => {
    fc.assert(
      fc.property(routeArb, (pathname) => {
        if (!isPublicStaticRoute(pathname)) return; // skip non-included routes

        const entry = entries.find(
          (e) =>
            e.url.endsWith(pathname) ||
            (pathname === "/" && e.url.endsWith("/")),
        );
        expect(entry).toBeDefined();

        if (pathname === "/") {
          expect(entry!.priority).toBe(1.0);
        } else {
          expect(entry!.priority).toBe(0.7);
        }
      }),
      { numRuns: 100 },
    );
  });
});
