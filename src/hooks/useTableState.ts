import { useCallback, useMemo, useState } from "react";
import type { ListParams } from "@/types";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

export interface TableState {
  search: string;
  setSearch: (value: string) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  sortBy?: string;
  sortDir: "asc" | "desc";
  toggleSort: (key: string) => void;
  filters: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  resetFilters: () => void;
  params: ListParams;
  hasActiveFilters: boolean;
}

/** Shared list state (search, sort, filters, pagination) for data tables. */
export function useTableState(initialFilters: Record<string, string> = {}): TableState {
  const [search, setSearchRaw] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);

  const setSearch = useCallback((value: string) => {
    setSearchRaw(value);
    setPage(1);
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchRaw("");
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSort = useCallback(
    (key: string) => {
      if (sortBy === key) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(key);
        setSortDir("asc");
      }
    },
    [sortBy],
  );

  const params = useMemo<ListParams>(
    () => ({ search, page, pageSize, sortBy, sortDir, filters }),
    [search, page, pageSize, sortBy, sortDir, filters],
  );

  const hasActiveFilters =
    search.trim().length > 0 || Object.values(filters).some((value) => value && value !== "");

  return {
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    sortBy,
    sortDir,
    toggleSort,
    filters,
    setFilter,
    resetFilters,
    params,
    hasActiveFilters,
  };
}
