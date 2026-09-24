import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Next.js 16 Proxy (formerly Middleware).
 *
 * Applies per-IP rate limiting to all `/api/` routes.
 * On every allowed request it sets standard rate-limit headers.
 * When the limit is exceeded it returns 429 with the standard error envelope.
 */
export function proxy(request: NextRequest) {
  // ── Extract client IP ────────────────────────────────────────────────
  const forwarded = request.headers.get("x-forwarded-for");
  const clientIp = forwarded
    ? forwarded.split(",")[0].trim()
    : "127.0.0.1";

  // ── Check the rate limit ─────────────────────────────────────────────
  const result = checkRateLimit(clientIp);

  if (!result.allowed) {
    // 429 Too Many Requests
    return Response.json(
      {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfterSeconds),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.resetAt),
        },
      },
    );
  }

  // ── Allowed — continue with rate-limit headers ───────────────────────
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.resetAt));

  return response;
}

// Only apply rate limiting to API routes
export const config = {
  matcher: "/api/:path*",
};
