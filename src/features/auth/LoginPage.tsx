import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BarChart3,
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/shared/logo";
import { useAuth } from "@/features/auth/AuthContext";
import { demoCredentials } from "@/data/seed";
import { APP_NAME, APP_TAGLINE, ROLE_HOME, ROLE_LABELS } from "@/lib/constants";

const schema = z.object({
  email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

const HIGHLIGHTS = [
  { icon: Users, title: "Five role-based portals", text: "Tailored workspaces for admins, HODs, teachers, students and exam officers." },
  { icon: BookOpen, title: "Everything academics", text: "Departments, courses, offerings, attendance, assessments and results in one place." },
  { icon: BarChart3, title: "Insightful analytics", text: "Live dashboards and reports derived directly from your academic records." },
];

export function LoginPage() {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: true },
  });

  useEffect(() => {
    if (isAuthenticated && role) {
      navigate(from ?? ROLE_HOME[role], { replace: true });
    }
  }, [isAuthenticated, role, from, navigate]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const session = await login(values.email, values.password, Boolean(values.remember));
      navigate(from ?? ROLE_HOME[session.role], { replace: true });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Unable to sign in.");
    }
  };

  const selectDemo = (email: string, password: string) => {
    setServerError(null);
    form.setValue("email", email);
    form.setValue("password", password);
    form.clearErrors();
  };

  const { errors, isSubmitting } = form.formState;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy p-10 text-white lg:flex">
        <div className="absolute inset-0 opacity-25" aria-hidden="true">
          <div className="absolute -left-16 top-24 h-72 w-72 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary-hover blur-3xl" />
        </div>

        <div className="relative">
          <Logo className="[&_span:last-child]:text-white" size="lg" />
          <h1 className="mt-12 max-w-md text-3xl font-semibold leading-tight">
            Welcome to {APP_NAME}
          </h1>
          <p className="mt-3 max-w-md text-sm text-white/70">
            {APP_TAGLINE} Manage your entire university — from admissions to results — through a single,
            calm and connected platform.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <item.icon className="h-4.5 w-4.5" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className="block text-sm text-white/60">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-10">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Demonstration build — authentication is simulated locally.
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo size="lg" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              Enter your credentials or choose a demo account below.
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-card p-3">
            <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">Demo accounts</p>
            <div className="flex flex-wrap gap-1.5">
              {demoCredentials.map((credential) => (
                <button
                  key={credential.email}
                  type="button"
                  onClick={() => selectDemo(credential.email, credential.password)}
                  className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-primary"
                >
                  {ROLE_LABELS[credential.role]}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            {serverError && (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {serverError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@coligo.demo"
                  className="pl-9"
                  aria-invalid={Boolean(errors.email)}
                  {...form.register("email")}
                />
              </div>
              {errors.email && <p className="text-xs font-medium text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() =>
                    setServerError(
                      "Password recovery will be implemented in the backend phase. For this demo, use one of the demo accounts above.",
                    )
                  }
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  aria-invalid={Boolean(errors.password)}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs font-medium text-destructive">{errors.password.message}</p>}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={form.watch("remember")}
                onCheckedChange={(checked) => form.setValue("remember", checked === true)}
              />
              <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
                Keep me signed in on this device
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <GraduationCap className="h-4 w-4" />
                  Sign in to {APP_NAME}
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            This is a demonstration. A production system would authenticate securely on the server.{" "}
            <Link to="/" className="font-medium text-primary hover:underline">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
