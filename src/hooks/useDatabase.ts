import { useSyncExternalStore } from "react";
import type { Database } from "@/types";
import { getDb, subscribe } from "@/services/mock/store";

/**
 * Subscribe a component to the mock database. Re-renders whenever any mutation
 * is committed, so selectors always read fresh data.
 */
export function useDatabase(): Database {
  return useSyncExternalStore(subscribe, getDb, getDb);
}
