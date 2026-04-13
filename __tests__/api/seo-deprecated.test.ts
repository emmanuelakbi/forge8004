import { describe, it, expect } from "vitest";

// NOTE: robots.txt and sitemap.xml tests have been migrated to the Next.js
// Metadata API approach. See __tests__/ssr/seo-robots.test.ts and
// __tests__/ssr/seo-sitemap.test.ts for the current coverage.

// --- Deprecated agent routes ---
describe("Deprecated agent routes", () => {
  const expectedBody = {
    error: "AGENT_ROUTE_DEPRECATED",
    message:
      "This demo agent route has been retired. The app now reads agent data directly from the authenticated Firestore workspace.",
  };

  it("GET /api/agents returns 410 with correct body", async () => {
    const { GET } = await import("@/app/api/agents/route");
    const res = await GET();
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json).toEqual(expectedBody);
  });

  it("GET /api/agents/[agentId] returns 410 with correct body", async () => {
    const { GET } = await import("@/app/api/agents/[agentId]/route");
    const res = await GET();
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json).toEqual(expectedBody);
  });

  it("POST /api/agents/[agentId]/trade-intent returns 410 with correct body", async () => {
    const { POST } =
      await import("@/app/api/agents/[agentId]/trade-intent/route");
    const res = await POST();
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json).toEqual(expectedBody);
  });

  it("GET /api/agents/[agentId]/trade-history returns 410 with correct body", async () => {
    const { GET } =
      await import("@/app/api/agents/[agentId]/trade-history/route");
    const res = await GET();
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json).toEqual(expectedBody);
  });
});
