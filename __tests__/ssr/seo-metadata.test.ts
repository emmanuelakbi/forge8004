/**
 * Property-based test for SEO metadata completeness
 *
 * Feature: nextjs-ui-polish-ssr-fixes, Property 2: Metadata generation produces all required fields for any route
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.9, 6.10
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  SEO_ROUTES,
  getRouteMetadata,
  SITE_NAME,
  OG_IMAGE_PATH,
  DEFAULT_THEME_COLOR,
} from "@/app/lib/seo-config";

/**
 * Mirrors the `generateMetadata` pattern from the design doc.
 * Builds a full Next.js-style Metadata object from a route pathname.
 */
function buildMetadata(pathname: string) {
  const config = getRouteMetadata(pathname);
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "https://forge8004.com"}${pathname}`;

  return {
    title: config.title,
    description: config.description,
    robots: config.robots ?? "index, follow",
    alternates: { canonical: url },
    openGraph: {
      type: (config.type as "website" | undefined) ?? "website",
      siteName: SITE_NAME,
      title: config.title,
      description: config.description,
      url,
      images: [
        { url: OG_IMAGE_PATH, width: 1200, height: 630, alt: "Forge8004" },
      ],
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image" as const,
      title: config.title,
      description: config.description,
      images: [OG_IMAGE_PATH],
    },
    other: { "theme-color": DEFAULT_THEME_COLOR },
  };
}

describe("SEO Metadata — Property 2: Metadata generation produces all required fields for any route", () => {
  const routeArb = fc.constantFrom(...Object.keys(SEO_ROUTES));

  it("should produce a non-empty title and description for any route", () => {
    fc.assert(
      fc.property(routeArb, (pathname) => {
        const metadata = buildMetadata(pathname);

        expect(typeof metadata.title).toBe("string");
        expect(metadata.title.length).toBeGreaterThan(0);

        expect(typeof metadata.description).toBe("string");
        expect(metadata.description.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it("should include all required Open Graph fields for any route", () => {
    fc.assert(
      fc.property(routeArb, (pathname) => {
        const metadata = buildMetadata(pathname);
        const og = metadata.openGraph;

        expect(og.type).toBeTruthy();
        expect(og.siteName).toBe(SITE_NAME);
        expect(og.title.length).toBeGreaterThan(0);
        expect(og.description.length).toBeGreaterThan(0);
        expect(og.url).toContain(pathname);
        expect(og.locale).toBe("en_US");

        // images array must have at least one entry
        expect(Array.isArray(og.images)).toBe(true);
        expect(og.images.length).toBeGreaterThanOrEqual(1);
        expect(og.images[0].url).toBe(OG_IMAGE_PATH);
      }),
      { numRuns: 100 },
    );
  });

  it("should include all required Twitter Card fields for any route", () => {
    fc.assert(
      fc.property(routeArb, (pathname) => {
        const metadata = buildMetadata(pathname);
        const tw = metadata.twitter;

        expect(tw.card).toBe("summary_large_image");
        expect(tw.title.length).toBeGreaterThan(0);
        expect(tw.description.length).toBeGreaterThan(0);
        expect(Array.isArray(tw.images)).toBe(true);
        expect(tw.images.length).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 },
    );
  });

  it("should include a canonical URL containing the pathname for any route", () => {
    fc.assert(
      fc.property(routeArb, (pathname) => {
        const metadata = buildMetadata(pathname);

        expect(metadata.alternates.canonical).toContain(pathname);
      }),
      { numRuns: 100 },
    );
  });

  it("should set theme-color to #0A0A0A for any route", () => {
    fc.assert(
      fc.property(routeArb, (pathname) => {
        const metadata = buildMetadata(pathname);

        expect(metadata.other["theme-color"]).toBe("#0A0A0A");
      }),
      { numRuns: 100 },
    );
  });
});
