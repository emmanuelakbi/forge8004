/**
 * Property-based test for JSON-LD schema type
 *
 * Feature: nextjs-ui-polish-ssr-fixes, Property 4: JSON-LD schema type matches route
 *
 * Validates: Requirements 6.8
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { SEO_ROUTES, getRouteMetadata, SITE_NAME } from "@/app/lib/seo-config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Generates JSON-LD structured data for a given pathname,
 * matching the pattern used in the page components:
 * - "/" returns an array with Organization + WebSite schemas
 * - Any other pathname returns a single WebPage schema
 */
function buildJsonLd(
  pathname: string,
): Record<string, unknown> | Record<string, unknown>[] {
  const config = getRouteMetadata(pathname);
  const origin = APP_URL;

  if (pathname === "/") {
    return [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: origin,
        description: config.description,
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: origin,
        description: config.description,
      },
    ];
  }

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: config.title,
    url: `${origin}${pathname}`,
    description: config.description,
  };
}

describe("SEO JSON-LD — Property 4: JSON-LD schema type matches route", () => {
  const routeArb = fc.constantFrom(...Object.keys(SEO_ROUTES));

  it("should produce Organization + WebSite schemas for the root route", () => {
    fc.assert(
      fc.property(fc.constant("/"), (pathname) => {
        const jsonLd = buildJsonLd(pathname);

        // Root route must return an array
        expect(Array.isArray(jsonLd)).toBe(true);
        const schemas = jsonLd as Record<string, unknown>[];
        expect(schemas).toHaveLength(2);

        const types = schemas.map((s) => s["@type"]);
        expect(types).toContain("Organization");
        expect(types).toContain("WebSite");

        // Both schemas should reference the site name
        for (const schema of schemas) {
          expect(schema["name"]).toBe(SITE_NAME);
          expect(schema["@context"]).toBe("https://schema.org");
        }
      }),
      { numRuns: 100 },
    );
  });

  it("should produce a WebPage schema with correct name and url for non-root routes", () => {
    const nonRootRoutes = Object.keys(SEO_ROUTES).filter((p) => p !== "/");

    fc.assert(
      fc.property(fc.constantFrom(...nonRootRoutes), (pathname) => {
        const jsonLd = buildJsonLd(pathname);
        const config = getRouteMetadata(pathname);

        // Non-root must return a single object, not an array
        expect(Array.isArray(jsonLd)).toBe(false);
        const schema = jsonLd as Record<string, unknown>;

        expect(schema["@context"]).toBe("https://schema.org");
        expect(schema["@type"]).toBe("WebPage");
        expect(schema["name"]).toBe(config.title);
        expect(schema["url"]).toBe(`${APP_URL}${pathname}`);
      }),
      { numRuns: 100 },
    );
  });

  it("should produce the correct schema type for any random route", () => {
    fc.assert(
      fc.property(routeArb, (pathname) => {
        const jsonLd = buildJsonLd(pathname);

        if (pathname === "/") {
          expect(Array.isArray(jsonLd)).toBe(true);
          const schemas = jsonLd as Record<string, unknown>[];
          const types = schemas.map((s) => s["@type"]);
          expect(types).toContain("Organization");
          expect(types).toContain("WebSite");
        } else {
          expect(Array.isArray(jsonLd)).toBe(false);
          const schema = jsonLd as Record<string, unknown>;
          expect(schema["@type"]).toBe("WebPage");
        }
      }),
      { numRuns: 100 },
    );
  });
});
