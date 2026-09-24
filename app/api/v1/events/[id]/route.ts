import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/api-response";

/**
 * GET /api/v1/events/[id]
 *
 * Returns a single event with its venue and ticket tiers.
 * Returns 404 if no event matches the given ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        venue: true,
        tiers: {
          orderBy: { priceMinor: "asc" },
        },
      },
    });

    if (!event) {
      return errorResponse(404, "NOT_FOUND", "Event not found");
    }

    return successResponse(event);
  } catch (error) {
    console.error(`[GET /api/v1/events/${id}] Database error:`, error);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "An unexpected error occurred while fetching the event.",
    );
  }
}
