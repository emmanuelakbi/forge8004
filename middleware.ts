import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Let all requests through — AuthGate handles the sign-in UI client-side.
  // The middleware is kept for future server-side auth checks if needed.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/overview",
    "/agents",
    "/agents/:path*",
    "/register-agent",
    "/portfolio",
    "/compare",
    "/risk-replay",
  ],
};
