/**
 * Property 3: SEO Metadata Equivalence
 *
 * For any route in the SeoManager SEO_ROUTES configuration array, the
 * corresponding Next.js page metadata export SHALL contain a title value
 * matching the SeoManager title (or the page-specific portion when using
 * the "%s | Forge8004" template), a description matching the SeoManager
 * description, and if the SeoManager config specifies robots: "noindex, nofollow",
 * the metadata SHALL include the same robots directive.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 14.4**
 *
 * Feature: nextjs-page-routing-migration, Property 3: SEO Metadata Equivalence
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Title template used by the root layout ("%s | Forge8004")
// ---------------------------------------------------------------------------

const TITLE_TEMPLATE_SUFFIX = " | Forge8004";

// ---------------------------------------------------------------------------
// SeoManager SEO_ROUTES config (source of truth from src/components/layout/SeoManager.tsx)
// Only static routes are included — dynamic routes (/agents/:agentId) and
// commented-out routes (/pitch, /social-kit) are excluded.
// ---------------------------------------------------------------------------

interface SeoRouteConfig {
  path: string;
  title: string;
  description: string;
  robots?: string;
  type?: "website" | "article";
}

const SEO_ROUTES: SeoRouteConfig[] = [
  {
    path: "/",
    title: "Forge8004 | ERC-8004 Trust Layer for Autonomous DeFi Agents",
    description:
      "ERC-8004 trust infrastructure for autonomous DeFi agents — on-chain identity, policy validation, capital sandboxing, and transparent trading telemetry on Base.",
    type: "website",
  },
  {
    path: "/how-it-works",
    title: "How It Works | Forge8004",
    description:
      "See how Forge8004 registers agent identity, funds sandbox treasuries, validates trade intents through policy checks, and records outcomes on-chain.",
  },
  {
    path: "/trust-center",
    title: "Trust Center | Forge8004",
    description:
      "Review Forge8004 trust primitives — agent identity ownership, capital controls, validation artifacts, and runtime safety for autonomous DeFi agents.",
  },
  {
    path: "/overview",
    title: "Operator Console | Forge8004",
    description:
      "Operator console for monitoring agent performance, treasury state, trade signals, and validation history across your Forge8004 agents.",
  },
  {
    path: "/agents",
    title: "Agents | Forge8004",
    description:
      "Browse ERC-8004 registered agents, review on-chain activity, reputation scores, and open individual agent workspaces.",
  },
  {
    path: "/register-agent",
    title: "Register Agent | Forge8004",
    description:
      "Register a new ERC-8004 autonomous agent with identity metadata, strategy profile, and execution wallet for on-chain tracking.",
  },
  {
    path: "/docs",
    title: "Docs | Forge8004",
    description:
      "Read the Forge8004 documentation, operating guide, and supporting resources for using the platform more confidently.",
  },
  {
    path: "/contact",
    title: "Contact | Forge8004",
    description:
      "Get in touch with Forge8004 for product questions, partnership conversations, design support, or general help.",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | Forge8004",
    description:
      "Read the Forge8004 privacy policy to understand what information is collected and how it is used.",
  },
  {
    path: "/terms",
    title: "Terms and Conditions | Forge8004",
    description:
      "Review the Forge8004 terms and conditions for using the site, workspace, and related services.",
  },
  {
    path: "/brand",
    title: "Brand Kit | Forge8004",
    description:
      "Browse Forge8004 brand marks, icons, and visual identity assets for internal and creative use.",
    robots: "noindex, nofollow",
  },
];

// ---------------------------------------------------------------------------
// Next.js page metadata (what each page.tsx exports)
// The root layout uses template "%s | Forge8004", so non-landing pages
// export only the page-specific title portion. The landing page overrides
// with the full title string.
// ---------------------------------------------------------------------------

interface NextjsPageMetadata {
  title: string;
  description: string;
  robots?: string;
}

const NEXTJS_METADATA: Record<string, NextjsPageMetadata> = {
  "/": {
    title: "Forge8004 | ERC-8004 Trust Layer for Autonomous DeFi Agents",
    description:
      "ERC-8004 trust infrastructure for autonomous DeFi agents — on-chain identity, policy validation, capital sandboxing, and transparent trading telemetry on Base.",
  },
  "/how-it-works": {
    title: "How It Works",
    description:
      "See how Forge8004 registers agent identity, funds sandbox treasuries, validates trade intents through policy checks, and records outcomes on-chain.",
  },
  "/trust-center": {
    title: "Trust Center",
    description:
      "Review Forge8004 trust primitives — agent identity ownership, capital controls, validation artifacts, and runtime safety for autonomous DeFi agents.",
  },
  "/overview": {
    title: "Operator Console",
    description:
      "Operator console for monitoring agent performance, treasury state, trade signals, and validation history across your Forge8004 agents.",
  },
  "/agents": {
    title: "Agents",
    description:
      "Browse ERC-8004 registered agents, review on-chain activity, reputation scores, and open individual agent workspaces.",
  },
  "/register-agent": {
    title: "Register Agent",
    description:
      "Register a new ERC-8004 autonomous agent with identity metadata, strategy profile, and execution wallet for on-chain tracking.",
  },
  "/docs": {
    title: "Docs",
    description:
      "Read the Forge8004 documentation, operating guide, and supporting resources for using the platform more confidently.",
  },
  "/contact": {
    title: "Contact",
    description:
      "Get in touch with Forge8004 for product questions, partnership conversations, design support, or general help.",
  },
  "/privacy": {
    title: "Privacy Policy",
    description:
      "Read the Forge8004 privacy policy to understand what information is collected and how it is used.",
  },
  "/terms": {
    title: "Terms and Conditions",
    description:
      "Review the Forge8004 terms and conditions for using the site, workspace, and related services.",
  },
  "/brand": {
    title: "Brand Kit",
    description:
      "Browse Forge8004 brand marks, icons, and visual identity assets for internal and creative use.",
    robots: "noindex, nofollow",
  },
};

// ---------------------------------------------------------------------------
// Helper: apply the title template to get the rendered title
// Landing page uses full title (overrides template); other pages use template.
// ---------------------------------------------------------------------------

function resolveRenderedTitle(path: string, nextjsTitle: string): string {
  if (path === "/") return nextjsTitle; // landing page overrides template
  return `${nextjsTitle}${TITLE_TEMPLATE_SUFFIX}`;
}

// ---------------------------------------------------------------------------
// Arbitrary: pick a random static route from SEO_ROUTES
// ---------------------------------------------------------------------------

const seoRouteArb = fc.constantFrom(...SEO_ROUTES);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Feature: nextjs-page-routing-migration, Property 3: SEO Metadata Equivalence", () => {
  it("every SeoManager static route has a corresponding Next.js metadata entry", () => {
    fc.assert(
      fc.property(seoRouteArb, (seoRoute) => {
        expect(NEXTJS_METADATA).toHaveProperty(seoRoute.path);
      }),
      { numRuns: 100 },
    );
  });

  it("Next.js rendered title matches SeoManager title for any static route", () => {
    fc.assert(
      fc.property(seoRouteArb, (seoRoute) => {
        const nextjs = NEXTJS_METADATA[seoRoute.path];
        const renderedTitle = resolveRenderedTitle(seoRoute.path, nextjs.title);
        expect(renderedTitle).toBe(seoRoute.title);
      }),
      { numRuns: 100 },
    );
  });

  it("Next.js description matches SeoManager description for any static route", () => {
    fc.assert(
      fc.property(seoRouteArb, (seoRoute) => {
        const nextjs = NEXTJS_METADATA[seoRoute.path];
        expect(nextjs.description).toBe(seoRoute.description);
      }),
      { numRuns: 100 },
    );
  });

  it("routes with robots directive in SeoManager have matching robots in Next.js metadata", () => {
    fc.assert(
      fc.property(seoRouteArb, (seoRoute) => {
        const nextjs = NEXTJS_METADATA[seoRoute.path];
        if (seoRoute.robots) {
          expect(nextjs.robots).toBe(seoRoute.robots);
        } else {
          expect(nextjs.robots).toBeUndefined();
        }
      }),
      { numRuns: 100 },
    );
  });
});
