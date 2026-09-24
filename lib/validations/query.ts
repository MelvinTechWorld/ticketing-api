import { z } from "zod";
import { config } from "@/lib/config";

// ── Sort directions (shared) ───────────────────────────────────────────

const sortDirections = ["asc", "desc"] as const;
export type SortDirection = (typeof sortDirections)[number];

// ── Base pagination schema (no sortBy – each resource adds its own) ────

/**
 * Base pagination schema with limit clamping, offset validation,
 * and sort direction. Each resource extends this with its own `sortBy`.
 *
 * Behaviour:
 *   • `limit` defaults to 20, clamped to max 100.
 *   • `offset` defaults to 0, rejects negative values.
 *   • `sortDirection` must be "asc" or "desc".
 */
export const basePaginationSchema = z.object({
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

  sortDirection: z
    .enum(sortDirections, {
      error: "sortDirection must be one of: asc, desc",
    })
    .default("asc"),
});

// ── Event sort fields & query schema ───────────────────────────────────

const eventSortFields = ["startsAt", "title", "createdAt"] as const;
export type EventSortField = (typeof eventSortFields)[number];

const eventCategories = [
  "CONCERT",
  "COMEDY",
  "CONFERENCE",
  "SPORTS",
  "THEATRE",
] as const;

export const eventsQuerySchema = basePaginationSchema.extend({
  sortBy: z
    .enum(eventSortFields, {
      error: `sortBy must be one of: ${eventSortFields.join(", ")}`,
    })
    .default("startsAt"),

  category: z
    .enum(eventCategories, {
      error: `category must be one of: ${eventCategories.join(", ")}`,
    })
    .optional(),

  venueId: z.string().min(1, { message: "venueId must not be empty" }).optional(),
});

export type EventsQuery = z.infer<typeof eventsQuerySchema>;

// ── Venue sort fields & query schema ───────────────────────────────────

const venueSortFields = ["name", "capacity", "createdAt"] as const;
export type VenueSortField = (typeof venueSortFields)[number];

export const venuesQuerySchema = basePaginationSchema.extend({
  sortBy: z
    .enum(venueSortFields, {
      error: `sortBy must be one of: ${venueSortFields.join(", ")}`,
    })
    .default("name"),

  city: z.string().min(1, { message: "city must not be empty" }).optional(),
});

export type VenuesQuery = z.infer<typeof venuesQuerySchema>;
