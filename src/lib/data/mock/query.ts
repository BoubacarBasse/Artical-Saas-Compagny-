/**
 * Filtering, sorting and pagination for the mock provider.
 *
 * Pure on purpose. Two reasons:
 *
 *  1. These semantics have to match what Postgres does in the Supabase
 *     provider. If they drift, the "one switch" promise quietly breaks — an
 *     order sorts differently, a search misses a row — and nothing fails
 *     loudly. Pure code means the semantics can be asserted directly in tests
 *     rather than only through a browser.
 *
 *  2. It keeps the provider itself thin: read cookie, apply query, done.
 */

import { DEFAULT_PER_PAGE, type Order, type OrderQuery, type Page } from "../types";

/**
 * Null deadlines sort last in BOTH directions. "Whenever you can" is never the
 * most urgent thing on the list, and it is not the least urgent either — it is
 * simply not on the schedule. Mirrors `nullsFirst: false` in the Supabase
 * provider's deadline ordering.
 */
function compareDeadline(a: Order, b: Order, direction: 1 | -1): number {
  if (a.deadline === b.deadline) return 0;
  if (a.deadline === null) return 1;
  if (b.deadline === null) return -1;
  return a.deadline < b.deadline ? -direction : direction;
}

function compareString(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function applyOrderQuery(orders: Order[], query: OrderQuery = {}): Page<Order> {
  const page = Math.max(1, query.page ?? 1);
  const perPage = Math.min(100, Math.max(1, query.perPage ?? DEFAULT_PER_PAGE));

  let rows = orders;

  // Matches `title.ilike.%q%,brief.ilike.%q%` in the Supabase provider.
  const needle = query.search?.trim().toLowerCase();
  if (needle) {
    rows = rows.filter(
      (o) =>
        o.title.toLowerCase().includes(needle) ||
        o.brief.toLowerCase().includes(needle),
    );
  }

  // An empty array means "no filter", matching `.in()` only being applied when
  // stages are actually supplied.
  if (query.stages?.length) {
    const wanted = new Set(query.stages);
    rows = rows.filter((o) => wanted.has(o.stage));
  }

  const sort = query.sort ?? "created_desc";
  rows = [...rows].sort((a, b) => {
    switch (sort) {
      case "created_asc":
        return compareString(a.createdAt, b.createdAt);
      case "deadline_asc":
        return compareDeadline(a, b, 1);
      case "deadline_desc":
        return compareDeadline(a, b, -1);
      case "title_asc":
        return a.title.localeCompare(b.title);
      case "created_desc":
      default:
        return compareString(b.createdAt, a.createdAt);
    }
  });

  const total = rows.length;
  const start = (page - 1) * perPage;

  return {
    rows: rows.slice(start, start + perPage),
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}
