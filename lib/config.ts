/**
 * Centralized application configuration.
 * All magic numbers live here — route handlers import from this file.
 */

export const config = {
  pagination: {
    /** Default number of items per page */
    defaultLimit: 20,
    /** Maximum allowed items per page (values above this are clamped) */
    maxLimit: 100,
    /** Default offset for pagination */
    defaultOffset: 0,
  },

  rateLimit: {
    /** Maximum number of requests per window */
    limit: 100,
    /** Rate-limit window duration in milliseconds (1 minute) */
    windowMs: 60_000,
  },
} as const;
