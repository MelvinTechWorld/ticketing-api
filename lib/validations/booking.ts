import { z } from "zod";

/**
 * Zod schema for the POST /api/v1/bookings request body.
 *
 * Validation rules:
 *   • `tierId` – required non-empty string.
 *   • `customerName` – required non-empty string.
 *   • `customerEmail` – required valid email.
 *   • `quantity` – required positive integer, min 1, max 10.
 */
export const createBookingSchema = z.object({
  tierId: z
    .string({ error: "tierId is required" })
    .min(1, { message: "tierId must not be empty" }),

  customerName: z
    .string({ error: "customerName is required" })
    .min(1, { message: "customerName must not be empty" }),

  customerEmail: z
    .string({ error: "customerEmail is required" })
    .email({ message: "customerEmail must be a valid email address" }),

  quantity: z
    .number({ error: "quantity is required and must be a number" })
    .int({ message: "quantity must be an integer" })
    .min(1, { message: "quantity must be at least 1" })
    .max(10, { message: "quantity must be at most 10 per booking" }),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
