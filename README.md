# Ticketing API

A robust, full-stack REST API built with Next.js 16 App Router, TypeScript, Prisma, and Neon PostgreSQL. This service handles high-concurrency ticketing operations, featuring atomic transactions, per-IP rate limiting, and centralized configuration for standard response envelopes.

**Live Application:** [https://ticketing-api.vercel.app](https://ticketing-api.vercel.app) *(Placeholder for live URL)*  
**API Base URL:** `https://ticketing-api.vercel.app/api/v1`

---

## 1. Resource Design & Schema

The database is powered by Neon PostgreSQL. The schema is highly normalized with proper indexing to ensure fast queries across all resources.

| Model | Fields (Key fields & Types) | Constraints | Cardinality / Relations |
|-------|-----------------------------|-------------|-------------------------|
| **Venue** | `id` (String), `name` (String), `city` (String), `address` (String), `capacity` (Int) | `city` is indexed. | 1:M with `Event` |
| **Event** | `id` (String), `venueId` (String), `title` (String), `category` (Enum), `startsAt` (DateTime), `status` (Enum) | `venueId`, `startsAt`, `category` indexed. | M:1 with `Venue`, 1:M with `TicketTier` |
| **TicketTier** | `id` (String), `eventId` (String), `name` (String), `priceMinor` (Int), `quantityTotal` (Int), `quantitySold` (Int) | `eventId` is indexed. Prices in minor units (cents). | M:1 with `Event`, 1:M with `Booking` |
| **Booking** | `id` (String), `tierId` (String), `customerName` (String), `customerEmail` (String), `quantity` (Int), `reference` (String) | `reference` is unique. `tierId`, `customerEmail` indexed. | M:1 with `TicketTier` |

---

## 2. Design Decisions

### Why Deterministic IDs for Seeding vs. Generated IDs?
During database seeding (`prisma/seed.ts`), deterministic IDs (e.g., `event-0001`, `venue-001`) are used to ensure **upsert matching stability and seed idempotency**. This allows the seed script to be run multiple times safely without creating duplicate data or breaking foreign key relations. However, for runtime mutations (like `POST /api/v1/bookings`), **CUIDs/UUIDs** are strictly used to prevent sequential enumeration attacks and make resource IDs unpredictable to malicious actors.

### Envelope Shape: `{ data, meta }` and `{ error }`
The API uses strict JSON envelopes for all responses:
- **Success:** `{ "data": T, "meta"?: { "total": 100, "limit": 20, "offset": 0, "hasMore": true } }`
- **Error:** `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }`

This uniform shape simplifies client-side integration, allows global fetch interceptors to consistently parse meta/error states, and makes automated SDK generation drastically easier.

### Offset vs. Cursor Pagination Tradeoffs
We chose **Offset Pagination** (`limit` / `offset`) for this foundation. 
- **Pros:** It allows clients to jump to arbitrary pages (e.g., "Page 4") and easily calculate the total number of pages since a total count is provided.
- **Cons:** At extremely high scale, deep `OFFSET` queries in SQL can suffer performance degradation. 
- **Alternative:** *Cursor Pagination* provides consistent $O(1)$ indexed reads for infinite scroll use cases at massive scale, but sacrifices the ability to randomly jump to specific pages. For our current scope and UI requirements, Offset is the better fit.

---

## 3. API Endpoints

### 3.1. `GET /api/v1/events`
Returns a paginated list of events. Supports sorting and category filtering.

**Query Parameters:**
- `limit`: (Optional) max 100, default 20
- `offset`: (Optional) default 0
- `sortBy`: (Optional) `startsAt` (default) or `title`
- `sortDirection`: (Optional) `asc` (default) or `desc`
- `category`: (Optional) e.g., `CONCERT`, `COMEDY`

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/events?limit=2&offset=0&sortBy=startsAt&category=CONCERT"
```

**Example Response (200 OK):**
```json
{
  "data": [
    {
      "id": "event-0015",
      "venueId": "venue-003",
      "title": "Neon Symphony",
      "category": "CONCERT",
      "description": null,
      "startsAt": "2024-05-10T19:00:00.000Z",
      "endsAt": "2024-05-10T22:00:00.000Z",
      "status": "SCHEDULED",
      "createdAt": "2024-04-10T12:00:00.000Z",
      "updatedAt": "2024-04-10T12:00:00.000Z"
    }
  ],
  "meta": {
    "total": 45,
    "limit": 2,
    "offset": 0,
    "hasMore": true
  }
}
```

### 3.2. `GET /api/v1/events/:id`
Returns full details for a single event, including its venue and ticket tiers.

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/events/event-0015"
```

**Example Response (200 OK):**
```json
{
  "data": {
    "id": "event-0015",
    "title": "Neon Symphony",
    "category": "CONCERT",
    "startsAt": "2024-05-10T19:00:00.000Z",
    "endsAt": "2024-05-10T22:00:00.000Z",
    "status": "SCHEDULED",
    "venue": {
      "id": "venue-003",
      "name": "The Grand Arena",
      "city": "Uyo",
      "address": "123 Grand Ave",
      "capacity": 5000
    },
    "tiers": [
      {
        "id": "tier-0043",
        "name": "General Admission",
        "priceMinor": 1500000,
        "currency": "NGN",
        "quantityTotal": 2000,
        "quantitySold": 150,
        "salesEndAt": "2024-05-10T18:00:00.000Z"
      }
    ]
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Event not found"
  }
}
```

### 3.3. `GET /api/v1/venues`
Returns a paginated list of venues. Supports sorting and city filtering.

**Query Parameters:**
- `limit`, `offset`, `sortDirection` (same as events)
- `sortBy`: `name` (default) or `capacity`
- `city`: (Optional) e.g., `Lagos`

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/venues?city=Lagos&sortBy=capacity&sortDirection=desc&limit=1"
```

**Example Response (200 OK):**
```json
{
  "data": [
    {
      "id": "venue-001",
      "name": "Eko Convention Centre",
      "city": "Lagos",
      "address": "Victoria Island",
      "capacity": 6000,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 3,
    "limit": 1,
    "offset": 0,
    "hasMore": true
  }
}
```

### 3.4. `GET /api/v1/venues/:id`
Returns full details for a single venue, including all upcoming scheduled events.

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/v1/venues/venue-001"
```

**Example Response (200 OK):**
```json
{
  "data": {
    "id": "venue-001",
    "name": "Eko Convention Centre",
    "city": "Lagos",
    "address": "Victoria Island",
    "capacity": 6000,
    "events": [
      {
        "id": "event-0021",
        "title": "Lagos Tech Fest",
        "category": "CONFERENCE",
        "startsAt": "2024-08-15T09:00:00.000Z",
        "endsAt": "2024-08-15T17:00:00.000Z",
        "status": "SCHEDULED"
      }
    ]
  }
}
```

### 3.5. `POST /api/v1/bookings`
Creates a booking atomically. Enforces tier capacity limits safely using Prisma interactive transactions.

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/v1/bookings" \
     -H "Content-Type: application/json" \
     -d '{
           "tierId": "tier-0043",
           "customerName": "Alice Doe",
           "customerEmail": "alice@example.com",
           "quantity": 2
         }'
```

**Example Response (201 Created):**
```json
{
  "data": {
    "id": "cuid_xyz_123",
    "tierId": "tier-0043",
    "customerName": "Alice Doe",
    "customerEmail": "alice@example.com",
    "quantity": 2,
    "totalMinor": 3000000,
    "currency": "NGN",
    "status": "CONFIRMED",
    "reference": "BKG-2024-RANDOM",
    "createdAt": "2024-04-12T10:00:00.000Z",
    "updatedAt": "2024-04-12T10:00:00.000Z"
  }
}
```

**Error Validation (422 Unprocessable Entity):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "quantity: Number must be less than or equal to 10"
  }
}
```

**Error Capacity Exceeded (400 Bad Request):**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Insufficient capacity. Only 1 tickets remaining."
  }
}
```

---

## 4. Rate Limiting

To prevent abuse, the API applies per-IP rate limiting via a Next.js 16 Proxy layer (sliding window).

- **Limit:** 100 requests per minute per IP.
- **Headers Included on Responses:**
  - `X-RateLimit-Limit`: The configured max limit (100).
  - `X-RateLimit-Remaining`: Requests left in the current window.
  - `X-RateLimit-Reset`: Unix timestamp when the earliest request expires.

**Rate Limit Exceeded (429 Too Many Requests):**
When the limit is hit, the API returns a standard error envelope and a standard `Retry-After` header indicating how many seconds until the client should try again.
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later."
  }
}
```

---

## 5. Local Setup & Installation

### Requirements
- Node.js 18+
- PostgreSQL database (e.g., Neon Postgres)

### Step-by-Step Setup

1. **Clone the repository and install dependencies:**
   ```bash
   git clone <repository_url>
   cd ticketing-api
   npm install
   ```

2. **Setup environment variables:**
   Copy the example environment file and update your `DATABASE_URL` with a valid PostgreSQL connection string.
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` to ensure your Database URL is correct.*

3. **Initialize the database:**
   Push the Prisma schema to the database (creates tables) and seed the deterministic mock data.
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Test the UI & API:**
   - Open [http://localhost:3000](http://localhost:3000) to view the API consumer UI.
   - Ping the API at [http://localhost:3000/api/v1/events](http://localhost:3000/api/v1/events)

---
*Developed for the Advanced Agentic Coding Task 1.*
