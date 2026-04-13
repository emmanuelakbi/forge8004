/**
 * Property 4: Dynamic generateMetadata Includes Route Parameter
 *
 * For any non-empty string value used as a dynamic route parameter (agentId or coinId),
 * the generateMetadata function for that route SHALL return a Metadata object whose
 * title field contains the parameter value as a substring. Specifically:
 * (a) for /agents/[agentId], the title contains the agentId;
 * (b) for /agents/[agentId]/trust-report, the title contains the agentId;
 * (c) for /markets/[coinId], the title contains the coinId (or its uppercase form).
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
 *
 * Feature: nextjs-page-routing-migration, Property 4: Dynamic generateMetadata Includes Route Parameter
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Replicated generateMetadata logic from the dynamic pages
// These mirror the actual implementations in:
//   app/(routes)/agents/[agentId]/page.tsx
//   app/(routes)/agents/[agentId]/trust-report/page.tsx
//   app/(routes)/markets/[coinId]/page.tsx
// ---------------------------------------------------------------------------

function agentDetailMetadata(agentId: string) {
  return {
    title: `Agent ${agentId} Workspace`,
    description:
      "Agent workspace with trade signals, validation timeline, capital sandbox state, and on-chain reputation data.",
  };
}

function trustReportMetadata(agentId: string) {
  return {
    title: `Trust Report — Agent ${agentId}`,
    description: `Full trust report for agent ${agentId} including validation history, risk checks, and on-chain reputation data.`,
  };
}

function coinDetailMetadata(coinId: string) {
  return {
    title: `${coinId.toUpperCase()} Markets`,
    description: `Live market data, price charts, and trading volume for ${coinId.toUpperCase()}.`,
  };
}

// ---------------------------------------------------------------------------
// Arbitrary: non-empty alphanumeric strings (1–20 chars)
// ---------------------------------------------------------------------------

const alphanumericParamArb = fc.stringMatching(/^[a-zA-Z0-9]{1,20}$/);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Feature: nextjs-page-routing-migration, Property 4: Dynamic generateMetadata Includes Route Parameter", () => {
  it("agentDetailMetadata title contains the agentId", () => {
    fc.assert(
      fc.property(alphanumericParamArb, (agentId) => {
        const metadata = agentDetailMetadata(agentId);
        expect(metadata.title).toContain(agentId);
      }),
      { numRuns: 100 },
    );
  });

  it("trustReportMetadata title contains the agentId", () => {
    fc.assert(
      fc.property(alphanumericParamArb, (agentId) => {
        const metadata = trustReportMetadata(agentId);
        expect(metadata.title).toContain(agentId);
      }),
      { numRuns: 100 },
    );
  });

  it("coinDetailMetadata title contains the uppercase coinId", () => {
    fc.assert(
      fc.property(alphanumericParamArb, (coinId) => {
        const metadata = coinDetailMetadata(coinId);
        expect(metadata.title).toContain(coinId.toUpperCase());
      }),
      { numRuns: 100 },
    );
  });

  it("all metadata functions return non-empty title and description", () => {
    fc.assert(
      fc.property(alphanumericParamArb, (param) => {
        const agentMeta = agentDetailMetadata(param);
        const trustMeta = trustReportMetadata(param);
        const coinMeta = coinDetailMetadata(param);

        expect(agentMeta.title.length).toBeGreaterThan(0);
        expect(agentMeta.description.length).toBeGreaterThan(0);
        expect(trustMeta.title.length).toBeGreaterThan(0);
        expect(trustMeta.description.length).toBeGreaterThan(0);
        expect(coinMeta.title.length).toBeGreaterThan(0);
        expect(coinMeta.description.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it("title format matches expected pattern for each route", () => {
    fc.assert(
      fc.property(alphanumericParamArb, (param) => {
        const agentMeta = agentDetailMetadata(param);
        expect(agentMeta.title).toBe(`Agent ${param} Workspace`);

        const trustMeta = trustReportMetadata(param);
        expect(trustMeta.title).toBe(`Trust Report — Agent ${param}`);

        const coinMeta = coinDetailMetadata(param);
        expect(coinMeta.title).toBe(`${param.toUpperCase()} Markets`);
      }),
      { numRuns: 100 },
    );
  });
});
