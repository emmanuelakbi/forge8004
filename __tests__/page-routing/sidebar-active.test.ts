/**
 * Property 2: Sidebar Active State Detection
 *
 * For any pathname string and any nav item from the sidebar navigation list,
 * the active state detection logic SHALL return `true` if and only if:
 * (a) the nav item path is `"/"` and the pathname is exactly `"/"`, or
 * (b) the nav item path is not `"/"` and the pathname equals the nav item path
 *     or starts with `{navItemPath}/`.
 * For all other combinations, it SHALL return `false`.
 *
 * **Validates: Requirements 3.3, 3.4**
 *
 * Feature: nextjs-page-routing-migration, Property 2: Sidebar Active State Detection
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Nav items matching the Sidebar component
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { name: "Home", path: "/" },
  { name: "How It Works", path: "/how-it-works" },
  { name: "Trust Center", path: "/trust-center" },
  { name: "Console", path: "/overview" },
  { name: "Agents", path: "/agents" },
  { name: "Compare", path: "/compare" },
  { name: "Risk Replay", path: "/risk-replay" },
  { name: "Portfolio", path: "/portfolio" },
  { name: "Markets", path: "/markets" },
  { name: "Docs", path: "/docs" },
  { name: "Contact", path: "/contact" },
];

const NON_HOME_ITEMS = NAV_ITEMS.filter((item) => item.path !== "/");

// ---------------------------------------------------------------------------
// Pure function extracted from Sidebar component
// ---------------------------------------------------------------------------

/**
 * Determines whether a nav item should be highlighted as active
 * given the current pathname. Mirrors the logic in Sidebar.tsx:
 *
 *   item.path === "/"
 *     ? pathname === item.path
 *     : pathname === item.path || pathname.startsWith(`${item.path}/`)
 */
function isNavItemActive(pathname: string, navItemPath: string): boolean {
  if (navItemPath === "/") return pathname === "/";
  return pathname === navItemPath || pathname.startsWith(`${navItemPath}/`);
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const navItemArb = fc.constantFrom(...NAV_ITEMS);
const nonHomeItemArb = fc.constantFrom(...NON_HOME_ITEMS);

/** Generates a valid pathname segment (lowercase alphanumeric + hyphens) */
const segmentArb = fc.stringMatching(/^[a-z][a-z0-9\-]{0,15}$/);

/** Generates a random pathname like /foo or /foo/bar/baz */
const randomPathnameArb = fc
  .array(segmentArb, { minLength: 1, maxLength: 4 })
  .map((segments) => `/${segments.join("/")}`);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Feature: nextjs-page-routing-migration, Property 2: Sidebar Active State Detection", () => {
  it("home (/) is active only when pathname is exactly /", () => {
    fc.assert(
      fc.property(randomPathnameArb, (pathname) => {
        // Random pathnames always have at least one segment, so never equal "/"
        expect(isNavItemActive(pathname, "/")).toBe(false);
      }),
      { numRuns: 100 },
    );

    // Explicit check: "/" should be active for "/"
    expect(isNavItemActive("/", "/")).toBe(true);
  });

  it("home is NOT active for any non-root path", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // paths like /foo
          randomPathnameArb,
          // paths that start with / but have trailing content
          randomPathnameArb.map((p) => `${p}/sub`),
        ),
        (pathname) => {
          expect(isNavItemActive(pathname, "/")).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("non-home items are active when pathname exactly matches", () => {
    fc.assert(
      fc.property(nonHomeItemArb, (item) => {
        expect(isNavItemActive(item.path, item.path)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("non-home items are active when pathname starts with {path}/", () => {
    fc.assert(
      fc.property(nonHomeItemArb, segmentArb, (item, suffix) => {
        const pathname = `${item.path}/${suffix}`;
        expect(isNavItemActive(pathname, item.path)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("non-home items are NOT active for unrelated paths", () => {
    fc.assert(
      fc.property(nonHomeItemArb, segmentArb, (item, randomSeg) => {
        // Build a pathname that doesn't match the item's path or start with it + "/"
        const unrelatedPath = `/unrelated-${randomSeg}`;
        // Guard: skip if the random path accidentally matches
        fc.pre(
          unrelatedPath !== item.path &&
            !unrelatedPath.startsWith(`${item.path}/`),
        );
        expect(isNavItemActive(unrelatedPath, item.path)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("non-home items are NOT active when pathname is a prefix but missing the trailing /", () => {
    fc.assert(
      fc.property(nonHomeItemArb, segmentArb, (item, extra) => {
        // e.g., for /docs, test /docs-extra (no slash separator)
        const pathname = `${item.path}${extra}`;
        // Guard: skip if it accidentally equals the item path or starts with item.path/
        fc.pre(pathname !== item.path && !pathname.startsWith(`${item.path}/`));
        expect(isNavItemActive(pathname, item.path)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("active state is mutually consistent: exactly one of the three conditions holds", () => {
    fc.assert(
      fc.property(navItemArb, randomPathnameArb, (item, pathname) => {
        const result = isNavItemActive(pathname, item.path);

        if (item.path === "/") {
          // Home: active iff pathname === "/"
          expect(result).toBe(pathname === "/");
        } else {
          // Non-home: active iff exact match or prefix match with /
          const expectedActive =
            pathname === item.path || pathname.startsWith(`${item.path}/`);
          expect(result).toBe(expectedActive);
        }
      }),
      { numRuns: 100 },
    );
  });
});
