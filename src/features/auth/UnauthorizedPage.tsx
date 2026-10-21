import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { useAuth } from "@/features/auth/AuthContext";
import { ROLE_HOME } from "@/lib/constants";

export function UnauthorizedPage() {
  const { role } = useAuth();
  const home = role ? ROLE_HOME[role] : "/login";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <Logo className="mb-8" />
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-7 w-7" />
      </span>
      <h1 className="text-2xl font-semibold">Access denied</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Your account does not have permission to view this page. If you believe this is a mistake,
        contact your administrator.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild>
          <Link to={home}>Go to dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/login">Switch account</Link>
        </Button>
      </div>
    </div>
  );
}
