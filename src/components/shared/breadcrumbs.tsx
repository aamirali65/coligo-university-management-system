import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  admin: "Administration",
  hod: "Department",
  teacher: "Teaching",
  student: "Student",
  examinations: "Examinations",
  dashboard: "Dashboard",
  departments: "Departments",
  users: "Users",
  students: "Students",
  teachers: "Teachers",
  courses: "Courses",
  semesters: "Semesters",
  "academic-sessions": "Academic Sessions",
  enrollments: "Enrollments",
  "course-offerings": "Course Offerings",
  timetable: "Timetable",
  announcements: "Announcements",
  reports: "Reports",
  "audit-logs": "Audit Logs",
  settings: "Settings",
  profile: "Profile",
  department: "Department Overview",
  attendance: "Attendance",
  performance: "Performance",
  assessments: "Assessments",
  marks: "Marks",
  "marks-review": "Marks Review",
  results: "Results",
  schedule: "Examination Schedule",
};

function isId(segment: string): boolean {
  return /^(off|stu|tch|crs|dept|sess|sem|enr|asg|exam|res|ann|log|cls)-/.test(segment) ||
    /^[0-9a-f-]{8,}$/.test(segment);
}

export function Breadcrumbs({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((segment, index) => ({
    label: isId(segment) ? "Details" : LABELS[segment] ?? segment.replace(/-/g, " "),
    href: `/${segments.slice(0, index + 1).join("/")}`,
    isLast: index === segments.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <Link to="/" className="inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground">
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only">Home</span>
      </Link>
      {crumbs.map((crumb) => (
        <Fragment key={crumb.href}>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
          {crumb.isLast ? (
            <span className="truncate px-1 py-0.5 font-medium capitalize text-foreground">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.href}
              className="truncate rounded px-1 py-0.5 capitalize transition-colors hover:text-foreground"
            >
              {crumb.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
