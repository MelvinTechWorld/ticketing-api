import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventsQuerySchema } from "@/lib/validations/query";
import {
  paginatedResponse,
  errorResponse,
} from "@/lib/api-response";

/**
 * GET /api/v1/events
 *
 * Returns a paginated, sortable, filterable list of events.
 *
 * Query parameters (all optional):
 *   limit          – items per page (default 20, max 100)
 *   offset         – pagination offset (default 0, must be ≥ 0)
 *   sortBy         – sort field: startsAt | title | createdAt
 *   sortDirection  – asc | desc
 *   category       – filter by EventCategory enum value
 *   venueId        – filter by venue ID
 */
export async function GET(request: NextRequest) {
  // ── 1. Parse & validate query params ─────────────────────────────────
  const searchParams = request.nextUrl.searchParams;
  const raw = Object.fromEntries(searchParams.entries());

  const parsed = eventsQuerySchema.safeParse(raw);

  if (!parsed.success) {
    // Collect all Zod issues into a readable message
    const messages = parsed.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );

    return errorResponse(400, "VALIDATION_ERROR", messages.join("; "));
  }

  const { limit, offset, sortBy, sortDirection, category, venueId } =
    parsed.data;

  // ── 2. Build Prisma `where` filter ───────────────────────────────────
  const where: Record<string, unknown> = {};

  if (category) {
    where.category = category;
  }

  if (venueId) {
    where.venueId = venueId;
  }

  // ── 3. Query database (data + total count in parallel) ───────────────
  try {
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { [sortBy]: sortDirection },
        skip: offset,
        take: limit,
        include: {
          venue: {
            select: { id: true, name: true, city: true },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    // ── 4. Return paginated envelope ───────────────────────────────────
    return paginatedResponse(events, {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("[GET /api/v1/events] Database error:", error);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "An unexpected error occurred while fetching events.",
    );
  }
}
