import { Link } from "react-router-dom";
import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Mail,
  MapPin,
  UserSquare2,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { departmentService } from "@/services/departmentService";
import { courseService } from "@/services/courseService";
import { formatDate } from "@/lib/format";
import { STUDENT_STATUS_LABELS } from "@/lib/constants";

export function DepartmentOverviewPage() {
  const db = useDatabase();
  const { user } = useAuth();
  const departmentId = user?.departmentId ?? "";
  const department = departmentId ? departmentService.byId(db, departmentId) : undefined;

  if (!department) {
    return (
      <div className="space-y-6">
        <PageHeader title="Department" description="Your department details." />
        <EmptyState
          icon={Building2}
          title="Department not found"
          description="No department is currently assigned to your account. Contact an administrator."
        />
      </div>
    );
  }

  const counts = departmentService.counts(db, department.id);
  const breakdown = departmentService.studentStatusBreakdown(db, department.id);
  const hod = department.hodId ? db.users.find((u) => u.id === department.hodId) : undefined;
  const courses = courseService.byDepartment(db, department.id);

  const statusEntries = [
    { status: "active", label: STUDENT_STATUS_LABELS.active, value: breakdown.active },
    { status: "inactive", label: STUDENT_STATUS_LABELS.inactive, value: breakdown.inactive },
    { status: "graduated", label: STUDENT_STATUS_LABELS.graduated, value: breakdown.graduated },
    { status: "suspended", label: STUDENT_STATUS_LABELS.suspended, value: breakdown.suspended },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={department.name}
        description={department.description}
        actions={
          <>
            <StatusBadge status={department.status} />
            <Button variant="outline" asChild>
              <Link to="/hod/courses">
                <BookOpen className="h-4 w-4" />
                Courses
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={counts.students} icon={GraduationCap} hint={`${breakdown.active} active`} />
        <StatCard label="Teachers" value={counts.teachers} icon={Users} tone="success" hint="Department faculty" />
        <StatCard label="Courses" value={counts.courses} icon={BookOpen} tone="warning" hint="Offered by department" />
        <StatCard label="Offerings" value={counts.offerings} icon={ClipboardList} tone="muted" hint="Across semesters" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Department details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Code</p>
                <p className="text-sm font-medium text-foreground">{department.code}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Created</p>
                <p className="flex items-center gap-1.5 text-sm text-foreground">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {formatDate(department.createdAt)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Office</p>
                <p className="flex items-center gap-1.5 text-sm text-foreground">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {department.officeLocation || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact</p>
                <p className="flex items-center gap-1.5 text-sm text-foreground">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {department.contactEmail || "—"}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              {hod ? (
                <>
                  <UserAvatar name={hod.fullName} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{hod.fullName}</p>
                    <p className="text-xs text-muted-foreground">Head of Department · {hod.email}</p>
                  </div>
                </>
              ) : (
                <>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <UserSquare2 className="h-4 w-4" />
                  </span>
                  <p className="text-sm text-muted-foreground">No head of department assigned.</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusEntries.map((entry) => (
              <div key={entry.status} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <StatusBadge status={entry.status} label={entry.label} />
                <span className="text-sm font-semibold text-foreground">{entry.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Department courses</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/hod/courses">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {courses.length === 0 ? (
            <EmptyState icon={BookOpen} title="No courses" description="Courses belonging to this department will appear here." />
          ) : (
            courses.map((course) => (
              <div key={course.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {course.code} — {course.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {course.creditHours} credit hours · Level {course.level}
                  </p>
                </div>
                <StatusBadge status={course.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
