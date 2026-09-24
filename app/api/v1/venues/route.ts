import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { venuesQuerySchema } from "@/lib/validations/query";
import {
  paginatedResponse,
  errorResponse,
} from "@/lib/api-response";

/**
 * GET /api/v1/venues
 *
 * Returns a paginated, sortable, filterable list of venues.
 *
 * Query parameters (all optional):
 *   limit          – items per page (default 20, max 100)
 *   offset         – pagination offset (default 0, must be ≥ 0)
 *   sortBy         – sort field: name | capacity | createdAt
 *   sortDirection  – asc | desc
 *   city           – filter by city name (exact match)
 */
export async function GET(request: NextRequest) {
  // ── 1. Parse & validate query params ─────────────────────────────────
  const searchParams = request.nextUrl.searchParams;
  const raw = Object.fromEntries(searchParams.entries());

  const parsed = venuesQuerySchema.safeParse(raw);

  if (!parsed.success) {
    const messages = parsed.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );

    return errorResponse(400, "VALIDATION_ERROR", messages.join("; "));
  }

  const { limit, offset, sortBy, sortDirection, city } = parsed.data;

  // ── 2. Build Prisma `where` filter ───────────────────────────────────
  const where: Record<string, unknown> = {};

  if (city) {
    where.city = city;
  }

  // ── 3. Query database (data + total count in parallel) ───────────────
  try {
    const [venues, total] = await Promise.all([
      prisma.venue.findMany({
        where,
        orderBy: { [sortBy]: sortDirection },
        skip: offset,
        take: limit,
      }),
      prisma.venue.count({ where }),
    ]);

    // ── 4. Return paginated envelope ───────────────────────────────────
    return paginatedResponse(venues, {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("[GET /api/v1/venues] Database error:", error);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "An unexpected error occurred while fetching venues.",
    );
  }
}
