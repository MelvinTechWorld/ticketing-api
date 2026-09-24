"use client";

import { useCallback, useEffect, useState } from "react";

// ── Types matching the API envelope ────────────────────────────────────

interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface EventVenue {
  id: string;
  name: string;
  city: string;
}

interface Event {
  id: string;
  title: string;
  category: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  venue: EventVenue;
}

interface ApiSuccess {
  data: Event[];
  meta: PaginationMeta;
}

interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// ── Constants ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "CONCERT", label: "Concert" },
  { value: "COMEDY", label: "Comedy" },
  { value: "CONFERENCE", label: "Conference" },
  { value: "SPORTS", label: "Sports" },
  { value: "THEATRE", label: "Theatre" },
] as const;

const PAGE_SIZE = 12;

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  COMPLETED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const CATEGORY_ICONS: Record<string, string> = {
  CONCERT: "🎵",
  COMEDY: "😂",
  CONFERENCE: "💼",
  SPORTS: "⚽",
  THEATRE: "🎭",
};

// ── Helpers ────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Component ──────────────────────────────────────────────────────────

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [category, setCategory] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (cat: string, off: number) => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(off),
      sortBy: "startsAt",
      sortDirection: "asc",
    });

    if (cat) {
      params.set("category", cat);
    }

    try {
      const res = await fetch(`/api/v1/events?${params.toString()}`);

      if (!res.ok) {
        const body = (await res.json()) as ApiError;
        throw new Error(body.error?.message ?? `Request failed (HTTP ${res.status})`);
      }

      const body = (await res.json()) as ApiSuccess;
      setEvents(body.data);
      setMeta(body.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setEvents([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when category/offset change
  useEffect(() => {
    fetchEvents(category, offset);
  }, [category, offset, fetchEvents]);

  // Reset offset to 0 when category changes
  function handleCategoryChange(newCategory: string) {
    setCategory(newCategory);
    setOffset(0);
  }

  const currentPage = meta ? Math.floor(meta.offset / meta.limit) + 1 : 1;
  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 1;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Events
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Browse upcoming events across all venues
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* ── Filters ────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleCategoryChange(value)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors
                ${
                  category === value
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-700"
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Loading State ──────────────────────────────────────── */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-3 h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="mb-2 h-3 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="mb-4 h-3 w-2/3 rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-5 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Error State ────────────────────────────────────────── */}
        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-8 text-center dark:border-red-900/50 dark:bg-red-950/30">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              {error}
            </p>
            <button
              onClick={() => fetchEvents(category, offset)}
              className="mt-3 rounded-full border border-red-300 bg-white px-4 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ── Empty State ────────────────────────────────────────── */}
        {!loading && !error && events.length === 0 && (
          <div className="rounded-lg border border-zinc-200 bg-white px-5 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-3xl">🔍</p>
            <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              No events found
              {category ? ` for "${CATEGORIES.find((c) => c.value === category)?.label}"` : ""}
            </p>
            {category && (
              <button
                onClick={() => handleCategoryChange("")}
                className="mt-3 text-sm font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-200"
              >
                Clear filter
              </button>
            )}
          </div>
        )}

        {/* ── Event Cards ────────────────────────────────────────── */}
        {!loading && !error && events.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <article
                  key={event.id}
                  className="group flex flex-col rounded-lg border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:shadow-zinc-800/40"
                >
                  {/* Title + Category icon */}
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h2 className="text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                      {event.title}
                    </h2>
                    <span className="shrink-0 text-lg" title={event.category}>
                      {CATEGORY_ICONS[event.category] ?? "📅"}
                    </span>
                  </div>

                  {/* Venue */}
                  <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {event.venue.name} · {event.venue.city}
                  </p>

                  {/* Date & Time */}
                  <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
                    {formatDate(event.startsAt)} · {formatTime(event.startsAt)} –{" "}
                    {formatTime(event.endsAt)}
                  </p>

                  {/* Badges */}
                  <div className="mt-auto flex flex-wrap gap-2">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[event.status] ?? "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {event.status}
                    </span>
                    <span className="inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {event.category}
                    </span>
                  </div>
                </article>
              ))}
            </div>

            {/* ── Pagination ────────────────────────────────────────── */}
            {meta && (
              <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Showing {meta.offset + 1}–{Math.min(meta.offset + meta.limit, meta.total)} of{" "}
                  {meta.total}
                </p>

                <div className="flex gap-2">
                  <button
                    disabled={meta.offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    className="rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    ← Previous
                  </button>
                  <span className="flex items-center px-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={!meta.hasMore}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    className="rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
