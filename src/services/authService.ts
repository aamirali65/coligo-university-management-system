import type { Session } from "@/types";
import { AppError } from "@/types";
import { demoCredentials } from "@/data/seed";
import { delay, getDb } from "./mock/store";
import { storage } from "@/lib/storage";

const SESSION_KEY = "session";
const REMEMBER_KEY = "remember";

/**
 * Demonstration authentication service.
 *
 * Credentials are validated in-memory against the seed demo accounts and a
 * lightweight session object (never a password) is persisted so the demo
 * survives a page refresh. Production authentication, hashing, token issuance
 * and authorization MUST be implemented by the Express + PostgreSQL backend.
 */
export const authService = {
  async login(email: string, password: string, remember: boolean): Promise<Session> {
    await delay(500);
    const normalised = email.trim().toLowerCase();
    const credential = demoCredentials.find((c) => c.email.toLowerCase() === normalised);

    if (!credential || credential.password !== password) {
      throw new AppError("invalid_credentials", "Invalid email or password. Try a demo account.");
    }

    const user = getDb().users.find((u) => u.id === credential.userId);
    if (!user || user.status !== "active") {
      throw new AppError("account_inactive", "This account is deactivated. Contact an administrator.");
    }

    const session: Session = {
      userId: user.id,
      role: user.role,
      name: user.fullName,
      email: user.email,
      issuedAt: new Date().toISOString(),
      token: `demo.${Math.random().toString(36).slice(2)}.${Date.now().toString(36)}`,
    };

    if (remember) {
      storage.set(SESSION_KEY, session);
      storage.set(REMEMBER_KEY, true);
    } else {
      storage.set(SESSION_KEY, session);
      storage.set(REMEMBER_KEY, false);
      try {
        window.sessionStorage.setItem(storage.key(SESSION_KEY), JSON.stringify(session));
      } catch {
        /* ignore */
      }
    }

    return session;
  },

  getSession(): Session | null {
    const remembered = storage.get<Session | null>(SESSION_KEY, null);
    if (remembered) return remembered;
    try {
      const raw = window.sessionStorage.getItem(storage.key(SESSION_KEY));
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  },

  logout(): void {
    storage.remove(SESSION_KEY);
    storage.remove(REMEMBER_KEY);
    try {
      window.sessionStorage.removeItem(storage.key(SESSION_KEY));
    } catch {
      /* ignore */
    }
  },
};
