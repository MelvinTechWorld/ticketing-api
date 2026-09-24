import { z } from "zod";
import { config } from "@/lib/config";

// ── Allowed sort fields & directions ───────────────────────────────────

const eventSortFields = ["startsAt", "title", "createdAt"] as const;
export type EventSortField = (typeof eventSortFields)[number];

const sortDirections = ["asc", "desc"] as const;
export type SortDirection = (typeof sortDirections)[number];

// ── Shared pagination schema ───────────────────────────────────────────

/**
 * Reusable pagination + sorting query schema.
 *
 * Behaviour:
 *   • `limit` is coerced to a number, defaults to 20, and is **clamped**
 *     to `config.pagination.maxLimit` (values above 100 → 100).
 *   • `offset` is coerced to a number, defaults to 0, and **rejects**
 *     negative values with a descriptive error.
 *   • `sortBy` must be one of the allowed enum values; unknown values
 *     produce a clear 400 message.
 *   • `sortDirection` must be "asc" or "desc".
 */
export const paginationSchema = z.object({
  limit: z.coerce
    .number()
    .int({ message: "limit must be an integer" })
    .min(1, { message: "limit must be at least 1" })
    .default(config.pagination.defaultLimit)
    .transform((val) => Math.min(val, config.pagination.maxLimit)),

  offset: z.coerce
    .number()
    .int({ message: "offset must be an integer" })
    .min(0, { message: "offset must not be negative" })
    .default(config.pagination.defaultOffset),

  sortBy: z
    .enum(eventSortFields, {
      error: `sortBy must be one of: ${eventSortFields.join(", ")}`,
    })
    .default("startsAt"),

  sortDirection: z
    .enum(sortDirections, {
      error: "sortDirection must be one of: asc, desc",
    })
    .default("asc"),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

// ── Event-specific filters ─────────────────────────────────────────────

const eventCategories = [
  "CONCERT",
  "COMEDY",
  "CONFERENCE",
  "SPORTS",
  "THEATRE",
] as const;

export const eventsQuerySchema = paginationSchema.extend({
  category: z
    .enum(eventCategories, {
      error: `category must be one of: ${eventCategories.join(", ")}`,
    })
    .optional(),

  venueId: z.string().min(1, { message: "venueId must not be empty" }).optional(),
});

export type EventsQuery = z.infer<typeof eventsQuerySchema>;
