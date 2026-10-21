import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  FileCheck2,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { useAuth } from "@/features/auth/AuthContext";
import { APP_NAME, APP_TAGLINE, ROLE_HOME, ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@/types";

const FEATURES = [
  { icon: BookOpen, title: "Academic management", text: "Departments, courses, offerings, semesters and academic sessions kept consistent." },
  { icon: ClipboardCheck, title: "Attendance & assessments", text: "Mark attendance, create assessments and capture marks with validation." },
  { icon: FileCheck2, title: "Results & GPA", text: "A complete review and publication workflow with calculated grades and GPA." },
  { icon: CalendarClock, title: "Timetables & examinations", text: "Weekly schedules and examination planning with conflict detection." },
  { icon: BarChart3, title: "Reports & analytics", text: "Dashboards and exportable reports derived from your real records." },
  { icon: ShieldCheck, title: "Role-based access", text: "Purpose-built portals for every member of the university community." },
];

const ROLES: Role[] = ["admin", "hod", "teacher", "student", "examination"];

export function LandingPage() {
  const { isAuthenticated, role } = useAuth();

  if (isAuthenticated && role) {
    return <Navigate to={ROLE_HOME[role]} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 lg:px-8">
          <Logo size="lg" />
          <Button asChild>
            <Link to="/login">
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-accent to-background" aria-hidden="true" />
          <div className="mx-auto w-full max-w-6xl px-4 py-20 text-center lg:px-8 lg:py-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <GraduationCap className="h-3.5 w-3.5 text-primary" />
              University Management System
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {APP_NAME} — {APP_TAGLINE}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground">
              A modern, connected platform for running a university. Manage academics, people and
              results across five role-based portals, with dashboards and reports that stay in sync.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/login">
                  Sign in to the demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/login">Explore demo accounts</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-16 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-4.5 w-4.5" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 lg:px-8">
            <h2 className="text-center text-2xl font-semibold tracking-tight">Five portals, one platform</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Each role signs in to a workspace designed for exactly what they need.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {ROLES.map((r) => (
                <span
                  key={r}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm"
                >
                  {ROLE_LABELS[r]}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row lg:px-8">
          <span>© {new Date().getFullYear()} {APP_NAME}. Demonstration build.</span>
          <span>Advanced Database Systems course project.</span>
        </div>
      </footer>
    </div>
  );
}
