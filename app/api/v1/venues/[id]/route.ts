import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/api-response";

/**
 * GET /api/v1/venues/[id]
 *
 * Returns a single venue with its upcoming events.
 * Returns 404 if no venue matches the given ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        events: {
          where: {
            startsAt: { gte: new Date() },
            status: "SCHEDULED",
          },
          orderBy: { startsAt: "asc" },
          select: {
            id: true,
            title: true,
            category: true,
            startsAt: true,
            endsAt: true,
            status: true,
          },
        },
      },
    });

    if (!venue) {
      return errorResponse(404, "NOT_FOUND", "Venue not found");
    }

    return successResponse(venue);
  } catch (error) {
    console.error(`[GET /api/v1/venues/${id}] Database error:`, error);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "An unexpected error occurred while fetching the venue.",
    );
  }
}
