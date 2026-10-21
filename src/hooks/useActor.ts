import { useAuth } from "@/features/auth/AuthContext";
import type { Actor } from "@/services/types";

/** Returns the current user as an audit actor, or a fallback for safety. */
export function useActor(): Actor {
  const { user } = useAuth();
  return { id: user?.id ?? "system", name: user?.fullName ?? "System" };
}
