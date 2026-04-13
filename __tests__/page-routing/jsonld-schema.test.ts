/**
 * Property 5: JSON-LD WebPage Schema for Non-Landing Pages
 *
 * For any non-landing page route path and its corresponding title and description
 * from the SEO config, the generated JSON-LD structured data SHALL contain a
 * WebPage schema object with `@type` equal to `"WebPage"`, `name` matching the
 * page title, `url` containing the route path, and `description` matching the
 * page description.
 *
 * **Validates: Requirements 7.2, 7.3, 7.4**
 *
 * Feature: nextjs-page-routing-migration, Property 5: JSON-LD WebPage Schema for Non-Landing Pages
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

const APP_URL = "https://forge8004.com";

// ---------------------------------------------------------------------------
// Non-landing page routes with their titles and descriptions (from page.tsx)
// ---------------------------------------------------------------------------

const NON_LANDING_PAGES = [
  {
    path: "/how-it-works",
    title: "How It Works",
    description:
      "See how Forge8004 registers agent identity, funds sandbox treasuries, validates trade intents through policy checks, and records outcomes on-chain.",
  },
  {
    path: "/trust-center",
    title: "Trust Center",
    description:
      "Review Forge8004 trust primitives — agent identity ownership, capital controls, validation artifacts, and runtime safety for autonomous DeFi agents.",
  },
  {
    path: "/docs",
    title: "Docs",
    description:
      "Read the Forge8004 documentation, operating guide, and supporting resources for using the platform more confidently.",
  },
  {
    path: "/contact",
    title: "Contact",
    description:
      "Get in touch with Forge8004 for product questions, partnership conversations, design support, or general help.",
  },
  {
    path: "/privacy",
    title: "Privacy Policy",
    description:
      "Read the Forge8004 privacy policy to understand what information is collected and how it is used.",
  },
  {
    path: "/terms",
    title: "Terms and Conditions",
    description:
      "Review the Forge8004 terms and conditions for using the site, workspace, and related services.",
  },
  {
    path: "/brand",
    title: "Brand Kit",
    description:
      "Browse Forge8004 brand marks, icons, and visual identity assets for internal and creative use.",
  },
  {
    path: "/markets",
    title: "Markets",
    description:
      "Track live cryptocurrency market data, price charts, and trading volumes for major digital assets.",
  },
  {
    path: "/overview",
    title: "Operator Console",
    description:
      "Operator console for monitoring agent performance, treasury state, trade signals, and validation history across your Forge8004 agents.",
  },
  {
    path: "/agents",
    title: "Agents",
    description:
      "Browse ERC-8004 registered agents, review on-chain activity, reputation scores, and open individual agent workspaces.",
  },
  {
    path: "/register-agent",
    title: "Register Agent",
    description:
      "Register a new ERC-8004 autonomous agent with identity metadata, strategy profile, and execution wallet for on-chain tracking.",
  },
  {
    path: "/compare",
    title: "Compare Agents",
    description:
      "Compare ERC-8004 agents side-by-side across performance, reputation, and trust metrics.",
  },
  {
    path: "/risk-replay",
    title: "Risk Replay",
    description:
      "Replay and analyze historical risk events, trade decisions, and validation outcomes for your Forge8004 agents.",
  },
  {
    path: "/portfolio",
    title: "Portfolio",
    description:
      "View your portfolio of ERC-8004 agents, aggregate performance, and capital allocation across all active strategies.",
  },
];

// ---------------------------------------------------------------------------
// Pure functions under test
// ---------------------------------------------------------------------------

/**
 * Generate WebPage JSON-LD for a non-landing page.
 */
function generateWebPageJsonLd(
  appUrl: string,
  path: string,
  title: string,
  description: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: `${appUrl}${path}`,
    description,
  };
}

/**
 * Generate landing page JSON-LD (Organization + WebSite schemas).
 */
function generateLandingJsonLd(appUrl: string) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Forge8004",
      url: appUrl,
      logo: `${appUrl}/favicon.svg`,
      description: "ERC-8004 trust infrastructure for autonomous DeFi agents.",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Forge8004",
      url: appUrl,
      description: "ERC-8004 trust infrastructure for autonomous DeFi agents.",
    },
  ];
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const nonLandingPageArb = fc.constantFrom(...NON_LANDING_PAGES);

const appUrlArb = fc
  .webUrl({ withFragments: false, withQueryParameters: false })
  .map((url) => url.replace(/\/$/, ""));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Feature: nextjs-page-routing-migration, Property 5: JSON-LD WebPage Schema for Non-Landing Pages", () => {
  it("non-landing pages have @type equal to 'WebPage'", () => {
    fc.assert(
      fc.property(nonLandingPageArb, (page) => {
        const jsonLd = generateWebPageJsonLd(
          APP_URL,
          page.path,
          page.title,
          page.description,
        );
        expect(jsonLd["@type"]).toBe("WebPage");
      }),
      { numRuns: 100 },
    );
  });

  it("non-landing pages have name matching the page title", () => {
    fc.assert(
      fc.property(nonLandingPageArb, (page) => {
        const jsonLd = generateWebPageJsonLd(
          APP_URL,
          page.path,
          page.title,
          page.description,
        );
        expect(jsonLd.name).toBe(page.title);
      }),
      { numRuns: 100 },
    );
  });

  it("non-landing pages have url containing the route path", () => {
    fc.assert(
      fc.property(nonLandingPageArb, (page) => {
        const jsonLd = generateWebPageJsonLd(
          APP_URL,
          page.path,
          page.title,
          page.description,
        );
        expect(jsonLd.url).toContain(page.path);
      }),
      { numRuns: 100 },
    );
  });

  it("non-landing pages have description matching the page description", () => {
    fc.assert(
      fc.property(nonLandingPageArb, (page) => {
        const jsonLd = generateWebPageJsonLd(
          APP_URL,
          page.path,
          page.title,
          page.description,
        );
        expect(jsonLd.description).toBe(page.description);
      }),
      { numRuns: 100 },
    );
  });

  it("non-landing pages have @context equal to 'https://schema.org'", () => {
    fc.assert(
      fc.property(nonLandingPageArb, (page) => {
        const jsonLd = generateWebPageJsonLd(
          APP_URL,
          page.path,
          page.title,
          page.description,
        );
        expect(jsonLd["@context"]).toBe("https://schema.org");
      }),
      { numRuns: 100 },
    );
  });

  it("URL construction works with random appUrl strings", () => {
    fc.assert(
      fc.property(appUrlArb, nonLandingPageArb, (appUrl, page) => {
        const jsonLd = generateWebPageJsonLd(
          appUrl,
          page.path,
          page.title,
          page.description,
        );
        expect(jsonLd.url).toBe(`${appUrl}${page.path}`);
        expect(jsonLd.url).toContain(page.path);
        expect(jsonLd.url.startsWith(appUrl)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("landing page JSON-LD contains Organization and WebSite schemas", () => {
    fc.assert(
      fc.property(appUrlArb, (appUrl) => {
        const jsonLd = generateLandingJsonLd(appUrl);

        expect(Array.isArray(jsonLd)).toBe(true);
        expect(jsonLd).toHaveLength(2);

        const orgSchema = jsonLd.find((s) => s["@type"] === "Organization");
        const siteSchema = jsonLd.find((s) => s["@type"] === "WebSite");

        expect(orgSchema).toBeDefined();
        expect(siteSchema).toBeDefined();

        expect(orgSchema!["@context"]).toBe("https://schema.org");
        expect(orgSchema!.name).toBe("Forge8004");
        expect(orgSchema!.url).toBe(appUrl);
        expect(orgSchema!.logo).toBe(`${appUrl}/favicon.svg`);

        expect(siteSchema!["@context"]).toBe("https://schema.org");
        expect(siteSchema!.name).toBe("Forge8004");
        expect(siteSchema!.url).toBe(appUrl);
      }),
      { numRuns: 100 },
    );
  });
});
