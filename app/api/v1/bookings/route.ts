import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createBookingSchema } from "@/lib/validations/booking";
import { errorResponse, successResponse } from "@/lib/api-response";

/**
 * POST /api/v1/bookings
 *
 * Creates a new ticket booking.
 *
 * Request body (JSON):
 *   tierId        – ID of the TicketTier to book against
 *   customerName  – full name of the customer
 *   customerEmail – email address of the customer
 *   quantity      – number of tickets (1–10)
 *
 * Business rules:
 *   • The tier must exist.
 *   • Sufficient capacity must be available (quantityTotal - quantitySold >= quantity).
 *   • totalMinor = tier.priceMinor * quantity.
 *   • Booking creation + tier update happen inside an interactive transaction.
 */
export async function POST(request: NextRequest) {
  // ── 1. Parse & validate request body ─────────────────────────────────
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(
      400,
      "BAD_REQUEST",
      "Request body must be valid JSON.",
    );
  }

  const parsed = createBookingSchema.safeParse(body);

  if (!parsed.success) {
    const messages = parsed.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );

    return errorResponse(422, "UNPROCESSABLE_ENTITY", messages.join("; "));
  }

  const { tierId, customerName, customerEmail, quantity } = parsed.data;

  // ── 2. Execute booking inside an interactive transaction ─────────────
  try {
    const booking = await prisma.$transaction(async (tx) => {
      // 2a. Fetch the tier (lock the row for the duration of the tx)
      const tier = await tx.ticketTier.findUnique({
        where: { id: tierId },
      });

      if (!tier) {
        throw new TierNotFoundError();
      }

      // 2b. Check capacity
      const available = tier.quantityTotal - tier.quantitySold;

      if (available < quantity) {
        throw new InsufficientCapacityError(available);
      }

      // 2c. Calculate total
      const totalMinor = tier.priceMinor * quantity;

      // 2d. Generate a unique booking reference
      const reference = `BK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      // 2e. Create the booking
      const newBooking = await tx.booking.create({
        data: {
          tierId,
          customerName,
          customerEmail,
          quantity,
          totalMinor,
          currency: tier.currency,
          reference,
        },
      });

      // 2f. Increment quantitySold on the tier
      await tx.ticketTier.update({
        where: { id: tierId },
        data: { quantitySold: { increment: quantity } },
      });

      return newBooking;
    });

    return successResponse(booking, 201);
  } catch (error) {
    if (error instanceof TierNotFoundError) {
      return errorResponse(
        404,
        "NOT_FOUND",
        `Ticket tier '${tierId}' not found.`,
      );
    }

    if (error instanceof InsufficientCapacityError) {
      return errorResponse(
        400,
        "INSUFFICIENT_CAPACITY",
        `Not enough tickets available. Only ${error.available} remaining.`,
      );
    }

    console.error("[POST /api/v1/bookings] Database error:", error);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "An unexpected error occurred while creating the booking.",
    );
  }
}

// ── Custom error classes for transaction control flow ───────────────────

class TierNotFoundError extends Error {
  constructor() {
    super("Tier not found");
    this.name = "TierNotFoundError";
  }
}

class InsufficientCapacityError extends Error {
  available: number;
  constructor(available: number) {
    super("Insufficient capacity");
    this.name = "InsufficientCapacityError";
    this.available = available;
  }
}
