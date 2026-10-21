import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Role, Session, User } from "@/types";
import { authService } from "@/services/authService";
import { useDatabase } from "@/hooks/useDatabase";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<Session>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const db = useDatabase();
  const [session, setSession] = useState<Session | null>(() => authService.getSession());

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const next = await authService.login(email, password, remember);
    setSession(next);
    return next;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user = session ? db.users.find((u) => u.id === session.userId) ?? null : null;
    return {
      session: user ? session : null,
      user,
      role: user ? user.role : null,
      isAuthenticated: Boolean(user),
      login,
      logout,
    };
  }, [session, db.users, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
