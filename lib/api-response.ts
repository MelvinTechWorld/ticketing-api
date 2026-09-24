/**
 * Standard API response envelope helpers.
 *
 * Every endpoint returns one of two shapes:
 *   Success → { data: T, meta?: PaginationMeta }
 *   Error   → { error: { code: string, message: string } }
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface SuccessResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ErrorBody {
  error: {
    code: string;
    message: string;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Build a paginated success response with an honest 200 status.
 */
export function paginatedResponse<T>(
  data: T,
  meta: PaginationMeta,
): Response {
  const body: SuccessResponse<T> = { data, meta };
  return Response.json(body, { status: 200 });
}

/**
 * Build a success response (no pagination metadata).
 */
export function successResponse<T>(data: T, status = 200): Response {
  const body: SuccessResponse<T> = { data };
  return Response.json(body, { status });
}

/**
 * Build a standardised error response.
 *
 * @param status  HTTP status code (400, 404, 422, 500, …)
 * @param code    Machine-readable error code (e.g. "VALIDATION_ERROR")
 * @param message Human-readable explanation
 */
export function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  const body: ErrorBody = { error: { code, message } };
  return Response.json(body, { status });
}
