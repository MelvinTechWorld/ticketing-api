import { config as appConfig } from "@/lib/config";

/**
 * In-memory sliding-window rate limiter.
 *
 * Each client IP gets a bucket that stores individual request timestamps.
 * When a request arrives the limiter:
 *   1. Evicts timestamps older than the current window.
 *   2. Checks whether the remaining count exceeds the configured limit.
 *   3. If under the limit, records the timestamp and returns `allowed: true`.
 *   4. If at/over the limit, returns `allowed: false` with retry info.
 *
 * A periodic cleanup removes buckets that have been idle for > 2× the window
 * to prevent unbounded memory growth.
 */

const { limit: MAX_REQUESTS, windowMs: WINDOW_MS } = appConfig.rateLimit;

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

// ── Periodic cleanup (runs every 2× window) ───────────────────────────
const CLEANUP_INTERVAL_MS = WINDOW_MS * 2;

setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [ip, bucket] of buckets) {
    // Remove all expired timestamps
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
    // Delete the bucket entirely if it's now empty
    if (bucket.timestamps.length === 0) {
      buckets.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();

// ── Public interface ───────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  /** Configured maximum requests per window */
  limit: number;
  /** Requests remaining in the current window */
  remaining: number;
  /** Unix timestamp (seconds) when the earliest request in the window expires */
  resetAt: number;
  /** Seconds until the window resets (for Retry-After header) */
  retryAfterSeconds: number;
}

export function checkRateLimit(clientIp: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Get or create the bucket for this IP
  let bucket = buckets.get(clientIp);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(clientIp, bucket);
  }

  // Evict expired timestamps
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);

  const currentCount = bucket.timestamps.length;

  if (currentCount >= MAX_REQUESTS) {
    // Rate limited — find the earliest timestamp to determine reset
    const earliest = bucket.timestamps[0];
    const resetAtMs = earliest + WINDOW_MS;
    const resetAt = Math.ceil(resetAtMs / 1000);
    const retryAfterSeconds = Math.ceil((resetAtMs - now) / 1000);

    return {
      allowed: false,
      limit: MAX_REQUESTS,
      remaining: 0,
      resetAt,
      retryAfterSeconds: Math.max(retryAfterSeconds, 1),
    };
  }

  // Allowed — record this request
  bucket.timestamps.push(now);

  const remaining = MAX_REQUESTS - bucket.timestamps.length;
  const earliest = bucket.timestamps[0];
  const resetAt = Math.ceil((earliest + WINDOW_MS) / 1000);
  const retryAfterSeconds = Math.ceil(((earliest + WINDOW_MS) - now) / 1000);

  return {
    allowed: true,
    limit: MAX_REQUESTS,
    remaining,
    resetAt,
    retryAfterSeconds: Math.max(retryAfterSeconds, 1),
  };
}
