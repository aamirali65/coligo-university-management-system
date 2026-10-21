import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Award,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  Megaphone,
  UserSquare2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { studentService } from "@/services/studentService";
import { assessmentService } from "@/services/assessmentService";
import { timetableService } from "@/services/timetableService";
import { announcementService } from "@/services/announcementService";
import { reportService } from "@/services/reportService";
import { academicService } from "@/services/academicService";
import { ASSESSMENT_TYPE_LABELS, DAY_NAMES } from "@/lib/constants";
import { formatDate, formatTime, fromNow, pct } from "@/lib/format";
import type { CourseOffering } from "@/types";

const chartTooltipStyle = {
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  fontSize: 12,
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
};

const QUICK_ACTIONS = [
  { label: "My Courses", href: "/student/courses", icon: BookOpen },
  { label: "Attendance", href: "/student/attendance", icon: ClipboardCheck },
  { label: "Results", href: "/student/results", icon: FileCheck2 },
  { label: "Timetable", href: "/student/timetable", icon: CalendarDays },
  { label: "Profile", href: "/student/profile", icon: UserSquare2 },
  { label: "Announcements", href: "/student/announcements", icon: Megaphone },
];

export function StudentDashboard() {
  const db = useDatabase();
  const { user } = useAuth();
  const student = user ? studentService.byUserId(db, user.id) : undefined;

  if (!student) {
    return (
      <div className="space-y-6">
        <PageHeader title="Student Dashboard" description="Your academic overview." />
        <Card>
          <EmptyState
            icon={GraduationCap}
            title="No student profile"
            description="This account is not linked to a student record yet."
          />
        </Card>
      </div>
    );
  }

  const activeSemester = academicService.activeSemester(db);
  const enrollments = studentService.enrollmentsFor(db, student.id).filter((e) => e.status === "active");
  const offerings: CourseOffering[] = enrollments
    .map((enrollment) => db.courseOfferings.find((offering) => offering.id === enrollment.offeringId))
    .filter((offering): offering is CourseOffering => Boolean(offering));

  const attendance = studentService.attendanceSummary(db, student.id);
  const gpa = reportService.studentGpa(db, student.id);
  const publishedResults = studentService.resultsFor(db, student.id, true);

  const attendanceData = studentService.attendanceByCourse(db, student.id).map((row) => {
    const course = db.courses.find((c) => c.id === row.code);
    return { name: course?.code ?? row.offeringId, percentage: row.percentage };
  });

  const progressData = publishedResults.map((row) => ({
    name: row.course?.code ?? "",
    total: row.result.totalScore ?? 0,
  }));

  const today = new Date();
  const todayDow = today.getDay();
  const todayIso = today.toISOString().slice(0, 10);

  const upcomingClasses = timetableService
    .forStudent(db, student.id)
    .filter((entry) => entry.dayOfWeek >= todayDow)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
    .slice(0, 6);

  const upcomingAssessments = offerings
    .flatMap((offering) => assessmentService.forOffering(db, offering.id))
    .filter((assessment) => assessment.status !== "closed" && assessment.dueDate >= todayIso)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  const recentResults = [...publishedResults]
    .sort((a, b) => (b.result.publishedAt ?? "").localeCompare(a.result.publishedAt ?? ""))
    .slice(0, 4);

  const announcements = announcementService.visibleFor(db, user).slice(0, 4);

  const courseLabel = (offeringId: string): string => {
    const offering = db.courseOfferings.find((item) => item.id === offeringId);
    const course = offering ? db.courses.find((item) => item.id === offering.courseId) : undefined;
    return course ? `${course.code} — ${course.title}` : offeringId;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${student.fullName}`}
        description={`Your academic overview for ${activeSemester?.name ?? "the current semester"}.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/student/timetable">
                <CalendarDays className="h-4 w-4" />
                Timetable
              </Link>
            </Button>
            <Button asChild>
              <Link to="/student/results">
                <FileCheck2 className="h-4 w-4" />
                My results
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Current semester"
          value={activeSemester?.name ?? `Semester ${student.currentSemester}`}
          icon={CalendarDays}
          hint={student.registrationNumber}
        />
        <StatCard label="Enrolled courses" value={offerings.length} icon={BookOpen} tone="success" hint="Active this term" />
        <StatCard
          label="Attendance"
          value={pct(attendance.percentage)}
          icon={ClipboardCheck}
          tone="warning"
          hint={`${attendance.total} records`}
        />
        <StatCard
          label="Published GPA"
          value={gpa ?? "—"}
          icon={Award}
          tone="muted"
          hint={`${publishedResults.length} published results`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Attendance by course"
          description="Present and late rate per course"
          empty={attendanceData.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={attendanceData} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" domain={[0, 100]} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="percentage" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Course progress"
          description="Published course totals"
          empty={progressData.length === 0}
          emptyMessage="No published results yet."
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={progressData} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" domain={[0, 100]} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="total" fill="#16A34A" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Upcoming classes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/student/timetable">Full timetable</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingClasses.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No upcoming classes" description="Your scheduled classes will appear here." />
            ) : (
              upcomingClasses.map((entry) => {
                const teacher = db.teachers.find((item) => item.id === entry.teacherId);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{courseLabel(entry.offeringId)}</p>
                      <p className="text-xs text-muted-foreground">
                        {DAY_NAMES[entry.dayOfWeek]} · {entry.room} · Section {entry.section}
                        {teacher ? ` · ${teacher.fullName}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-primary">
                      {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                to={action.href}
                className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background px-3 py-4 text-center text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-primary"
              >
                <action.icon className="h-4.5 w-4.5" />
                {action.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Upcoming assessments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingAssessments.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No upcoming assessments" description="Due assessments will appear here." />
            ) : (
              upcomingAssessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{assessment.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {courseLabel(assessment.offeringId)} · {ASSESSMENT_TYPE_LABELS[assessment.type]}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={assessment.status} />
                    <span className="text-[11px] text-muted-foreground">{formatDate(assessment.dueDate)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent results</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/student/results">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentResults.length === 0 ? (
              <EmptyState icon={FileCheck2} title="No published results" description="Your published results will appear here." />
            ) : (
              recentResults.map((row) => (
                <div
                  key={row.result.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.course?.title ?? row.offering?.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.course?.code} · {row.semester?.name ?? "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">{pct(row.result.totalScore ?? 0)}</span>
                    <StatusBadge status={row.result.grade ?? "published"} label={row.result.grade ?? "—"} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Announcements</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/student/announcements">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {announcements.length === 0 ? (
            <div className="sm:col-span-2">
              <EmptyState icon={Megaphone} title="No announcements" description="Published announcements will appear here." />
            </div>
          ) : (
            announcements.map((announcement) => (
              <div key={announcement.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{announcement.title}</p>
                  <StatusBadge status={announcement.audience} />
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{announcement.content}</p>
                <p className="mt-1 text-[11px] text-muted-foreground/80">{fromNow(announcement.createdAt)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
