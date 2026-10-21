import type { ListParams, Paginated } from "@/types";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

export function matches(query: string, fields: (string | number | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => String(field ?? "").toLowerCase().includes(q));
}

export function sortItems<T>(
  items: T[],
  sortBy: string | undefined,
  sortDir: "asc" | "desc" = "asc",
): T[] {
  if (!sortBy) return items;
  const dir = sortDir === "desc" ? -1 : 1;
  return [...items].sort((a, b) => {
    const av = (a as Record<string, unknown>)[sortBy];
    const bv = (b as Record<string, unknown>)[sortBy];
    if (av === bv) return 0;
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

export function paginate<T>(items: T[], page = 1, pageSize = DEFAULT_PAGE_SIZE): Paginated<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export function applyList<T>(
  items: T[],
  params: ListParams | undefined,
  sortable?: (item: T, key: string) => unknown,
): Paginated<T> {
  const p = params ?? {};
  const sorted = p.sortBy
    ? [...items].sort((a, b) => {
        const dir = p.sortDir === "desc" ? -1 : 1;
        const av = sortable ? sortable(a, p.sortBy!) : (a as Record<string, unknown>)[p.sortBy!];
        const bv = sortable ? sortable(b, p.sortBy!) : (b as Record<string, unknown>)[p.sortBy!];
        if (av === bv) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      })
    : items;
  return paginate(sorted, p.page, p.pageSize);
}
