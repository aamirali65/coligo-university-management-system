import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Building2,
  GraduationCap,
  Layers,
  Megaphone,
  Search,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/features/auth/AuthContext";
import { useDatabase } from "@/hooks/useDatabase";
import { announcementService } from "@/services/announcementService";
import { cn } from "@/lib/utils";
import type { Database, Role } from "@/types";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  path: string;
}

const ICONS: Record<string, typeof Users> = {
  Student: GraduationCap,
  Teacher: Users,
  Department: Building2,
  Course: BookOpen,
  "Course Offering": Layers,
  Announcement: Megaphone,
};

function resolvePath(role: Role, type: string, id: string): string | null {
  switch (type) {
    case "Student":
      if (role === "admin") return `/admin/students/${id}`;
      if (role === "hod") return "/hod/students";
      if (role === "teacher") return "/teacher/students";
      return "/student/profile";
    case "Teacher":
      if (role === "admin") return `/admin/teachers/${id}`;
      if (role === "hod") return "/hod/teachers";
      return "/teacher/profile";
    case "Department":
      if (role === "admin") return `/admin/departments/${id}`;
      return "/hod/department";
    case "Course":
      if (role === "admin") return "/admin/courses";
      if (role === "hod") return "/hod/courses";
      return "/student/courses";
    case "Course Offering":
      if (role === "teacher") return `/teacher/courses/${id}`;
      if (role === "student") return `/student/courses/${id}`;
      if (role === "admin") return "/admin/enrollments";
      return "/hod/course-offerings";
    case "Announcement":
      return `/${role === "examination" ? "examinations" : role}/announcements`;
    default:
      return null;
  }
}

function search(db: Database, role: Role, userId: string, query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const results: SearchResult[] = [];
  const push = (type: string, id: string, title: string, subtitle: string) => {
    const path = resolvePath(role, type, id);
    if (path) results.push({ type, id, title, subtitle, path });
  };

  const user = db.users.find((u) => u.id === userId);
  const inScope = (departmentId: string | null) =>
    role === "admin" || role === "examination" || !user?.departmentId || departmentId === user.departmentId;

  for (const student of db.students) {
    if (!inScope(student.departmentId)) continue;
    if (`${student.fullName} ${student.registrationNumber}`.toLowerCase().includes(q)) {
      push("Student", student.id, student.fullName, student.registrationNumber);
    }
  }

  if (role !== "student") {
    for (const teacher of db.teachers) {
      if (!inScope(teacher.departmentId)) continue;
      if (`${teacher.fullName} ${teacher.employeeNumber}`.toLowerCase().includes(q)) {
        push("Teacher", teacher.id, teacher.fullName, teacher.employeeNumber);
      }
    }
    for (const department of db.departments) {
      if (!inScope(department.id)) continue;
      if (`${department.name} ${department.code}`.toLowerCase().includes(q)) {
        push("Department", department.id, department.name, department.code);
      }
    }
    for (const course of db.courses) {
      if (!inScope(course.departmentId)) continue;
      if (`${course.code} ${course.title}`.toLowerCase().includes(q)) {
        push("Course", course.id, `${course.code} — ${course.title}`, `${course.creditHours} credit hours`);
      }
    }
    for (const offering of db.courseOfferings) {
      const course = db.courses.find((c) => c.id === offering.courseId);
      if (!course || !inScope(course.departmentId)) continue;
      if (role === "teacher" && !offering.teacherIds.includes(user?.teacherId ?? "")) continue;
      if (`${course.code} ${course.title} ${offering.section}`.toLowerCase().includes(q)) {
        push("Course Offering", offering.id, `${course.code} — Section ${offering.section}`, course.title);
      }
    }
  }

  for (const announcement of announcementService.visibleFor(db, user ?? null)) {
    if (announcement.title.toLowerCase().includes(q)) {
      push("Announcement", announcement.id, announcement.title, announcement.audience.replace("_", " "));
    }
  }

  return results.slice(0, 8);
}

export function GlobalSearch() {
  const db = useDatabase();
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 180);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const results = useMemo(
    () => (role && user ? search(db, role, user.id, debounced) : []),
    [db, role, user, debounced],
  );

  const select = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    navigate(result.path);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-64 items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent/50 md:flex lg:w-72"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search students, courses…</span>
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          Ctrl K
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
        aria-label="Search"
      >
        <Search className="h-4.5 w-4.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl gap-0 p-0">
          <DialogTitle className="sr-only">Global search</DialogTitle>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search records you can access…"
              className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin p-2">
            {debounced.trim().length < 2 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                Type at least two characters to search.
              </p>
            ) : results.length === 0 ? (
              <EmptyState icon={Search} title="No results" description={`No records match “${debounced}”.`} className="py-8" />
            ) : (
              <ul className="space-y-1">
                {results.map((result) => {
                  const Icon = ICONS[result.type] ?? Search;
                  return (
                    <li key={`${result.type}-${result.id}`}>
                      <button
                        type="button"
                        onClick={() => select(result)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent",
                        )}
                      >
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{result.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span>
                        </span>
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {result.type}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
