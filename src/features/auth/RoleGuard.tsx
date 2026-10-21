import { Navigate, Outlet } from "react-router-dom";
import type { Role } from "@/types";
import { useAuth } from "./AuthContext";

/** Allows access only to the listed roles; others are sent to the 403 page. */
export function RoleGuard({ allow }: { allow: Role[] }) {
  const { role } = useAuth();

  if (!role) return <Navigate to="/login" replace />;
  if (!allow.includes(role)) return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
}
