import { STORAGE_PREFIX } from "@/lib/constants";

/**
 * Centralised localStorage utility.
 *
 * All browser persistence in Coligo flows through here so that the mock data
 * layer has a single, replaceable access point. Reads never throw — corrupt or
 * unavailable storage degrades gracefully to the provided fallback.
 */
export const storage = {
  key(name: string): string {
    return `${STORAGE_PREFIX}:${name}`;
  },

  get<T>(name: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(this.key(name));
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  getRaw(name: string): string | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(this.key(name));
    } catch {
      return null;
    }
  },

  set<T>(name: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(this.key(name), JSON.stringify(value));
    } catch {
      /* storage may be full or disabled — mock state stays in memory */
    }
  },

  remove(name: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(this.key(name));
    } catch {
      /* ignore */
    }
  },
};
