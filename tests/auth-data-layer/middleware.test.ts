// Feature: nextjs-auth-data-layer, Property 3: Middleware passes all requests through
// Auth is now handled client-side by AuthGate component
// **Validates: Requirements 5.3**

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function createMockRequest(path: string, withCookie = false): NextRequest {
  const url = new URL(path, "http://localhost:3000");
  const req = new NextRequest(url);
  if (withCookie) {
    req.cookies.set("forge8004-auth-status", "authenticated");
  }
  return req;
}

const protectedRouteArb: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom(
    "/overview",
    "/agents",
    "/register-agent",
    "/portfolio",
    "/compare",
    "/risk-replay",
  ),
  fc
    .stringMatching(/^[a-zA-Z0-9_-]{1,40}$/)
    .map((segment) => `/agents/${segment}`),
);

describe("Property 3: Middleware passes requests through for client-side auth", () => {
  it("allows unauthenticated requests through (AuthGate handles sign-in UI)", () => {
    fc.assert(
      fc.property(protectedRouteArb, (path) => {
        const req = createMockRequest(path, false);
        const response = middleware(req);

        expect(response.status).toBe(200);
        expect(response.headers.get("location")).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it("allows authenticated requests through on protected routes", () => {
    fc.assert(
      fc.property(protectedRouteArb, (path) => {
        const req = createMockRequest(path, true);
        const response = middleware(req);

        expect(response.status).toBe(200);
        expect(response.headers.get("location")).toBeNull();
      }),
      { numRuns: 100 },
    );
  });
});
