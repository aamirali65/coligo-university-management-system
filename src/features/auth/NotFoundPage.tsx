import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { useAuth } from "@/features/auth/AuthContext";
import { ROLE_HOME } from "@/lib/constants";

export function NotFoundPage() {
  const { role } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <Logo className="mb-8" />
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="h-7 w-7" />
      </span>
      <p className="text-4xl font-semibold text-primary">404</p>
      <h1 className="mt-2 text-xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page you are looking for does not exist or may have been moved.
      </p>
      <div className="mt-6 flex gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Go back
        </Button>
        <Button asChild>
          <Link to={role ? ROLE_HOME[role] : "/"}>Home</Link>
        </Button>
      </div>
    </div>
  );
}
