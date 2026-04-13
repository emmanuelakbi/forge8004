import { NextRequest, NextResponse } from "next/server";

interface WindowEntry {
  timestamps: number[];
}

const windows = new Map<string, WindowEntry>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function checkRateLimit(request: NextRequest): NextResponse | null {
  const ip = getClientIp(request);
  const now = Date.now();

  let entry = windows.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    windows.set(ip, entry);
  }

  // Prune expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > now - WINDOW_MS);

  const resetTime =
    entry.timestamps.length > 0
      ? Math.ceil((entry.timestamps[0] + WINDOW_MS) / 1000)
      : Math.ceil((now + WINDOW_MS) / 1000);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many AI requests. Please wait." },
      {
        status: 429,
        headers: {
          "RateLimit-Limit": String(MAX_REQUESTS),
          "RateLimit-Remaining": "0",
          "RateLimit-Reset": String(resetTime),
        },
      },
    );
  }

  entry.timestamps.push(now);
  // Rate limit headers are added by the Route Handler to successful responses
  return null; // Not rate limited
}

export function getRateLimitHeaders(
  request: NextRequest,
): Record<string, string> {
  const ip = getClientIp(request);
  const now = Date.now();
  const entry = windows.get(ip);
  const count = entry
    ? entry.timestamps.filter((t) => t > now - WINDOW_MS).length
    : 0;
  const resetTime =
    entry && entry.timestamps.length > 0
      ? Math.ceil((entry.timestamps[0] + WINDOW_MS) / 1000)
      : Math.ceil((now + WINDOW_MS) / 1000);

  return {
    "RateLimit-Limit": String(MAX_REQUESTS),
    "RateLimit-Remaining": String(Math.max(0, MAX_REQUESTS - count)),
    "RateLimit-Reset": String(resetTime),
  };
}
