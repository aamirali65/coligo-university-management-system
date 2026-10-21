import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  Megaphone,
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
import { teacherService } from "@/services/teacherService";
import { enrollmentService } from "@/services/enrollmentService";
import { attendanceService } from "@/services/attendanceService";
import { assessmentService } from "@/services/assessmentService";
import { examinationService } from "@/services/examinationService";
import { timetableService } from "@/services/timetableService";
import { announcementService } from "@/services/announcementService";
import { resultService } from "@/services/resultService";
import { ASSESSMENT_TYPE_LABELS, DAY_NAMES } from "@/lib/constants";
import { formatDate, formatTime, fromNow, titleCase } from "@/lib/format";

const chartTooltipStyle = {
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  fontSize: 12,
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
};

const QUICK_ACTIONS = [
  { label: "Attendance", href: "/teacher/attendance", icon: ClipboardCheck },
  { label: "Assessments", href: "/teacher/assessments", icon: ClipboardList },
  { label: "Marks entry", href: "/teacher/marks", icon: FileCheck2 },
  { label: "My courses", href: "/teacher/courses", icon: BookOpen },
];

export function TeacherDashboard() {
  const db = useDatabase();
  const { user } = useAuth();
  const teacher = user ? teacherService.byUserId(db, user.id) : undefined;

  if (!teacher) {
    return (
      <div className="space-y-6">
        <PageHeader title="Teacher Dashboard" description="Your teaching overview." />
        <Card>
          <EmptyState
            icon={GraduationCap}
            title="No teacher profile"
            description="This account is not linked to a teacher record yet."
          />
        </Card>
      </div>
    );
  }

  const today = new Date();
  const todayDow = today.getDay();
  const todayIso = today.toISOString().slice(0, 10);

  const offerings = teacherService.offeringsFor(db, teacher.id);

  const studentIds = new Set<string>();
  for (const offering of offerings) {
    for (const student of enrollmentService.studentsForOffering(db, offering.id)) {
      studentIds.add(student.id);
    }
  }

  const teacherEntries = timetableService.forTeacher(db, teacher.id);
  const todayEntries = teacherEntries.filter((entry) => entry.dayOfWeek === todayDow);

  const assessments = offerings.flatMap((offering) => assessmentService.forOffering(db, offering.id));
  const pendingAssessments = assessments.filter(
    (assessment) => assessment.status === "open" || assessment.status === "draft",
  );
  const recentAssessments = [...assessments]
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
    .slice(0, 5);

  const attendanceTotals = offerings.reduce(
    (acc, offering) => {
      const summary = attendanceService.offeringSummary(db, offering.id);
      acc.total += summary.total;
      acc.attended += summary.present + summary.late;
      return acc;
    },
    { total: 0, attended: 0 },
  );
  const attendanceRate =
    attendanceTotals.total === 0
      ? 0
      : Math.round((attendanceTotals.attended / attendanceTotals.total) * 1000) / 10;

  const upcomingExams = offerings
    .flatMap((offering) => examinationService.forOffering(db, offering.id))
    .filter((exam) => exam.status !== "cancelled" && exam.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const announcements = announcementService.visibleFor(db, user).slice(0, 4);

  const courseLabel = (offeringId: string): string => {
    const offering = offerings.find((item) => item.id === offeringId);
    if (!offering) return offeringId;
    const course = db.courses.find((item) => item.id === offering.courseId);
    return course ? `${course.code} — ${course.title}` : offeringId;
  };

  const attendanceData = offerings.map((offering) => {
    const course = db.courses.find((item) => item.id === offering.courseId);
    return {
      name: `${course?.code ?? offering.id}-${offering.section}`,
      percentage: attendanceService.offeringSummary(db, offering.id).percentage,
    };
  });

  const performanceData = offerings.map((offering) => {
    const course = db.courses.find((item) => item.id === offering.courseId);
    const results = resultService
      .forOffering(db, offering.id)
      .filter((result) => result.totalScore !== null);
    const average =
      results.length === 0
        ? 0
        : Math.round(
            (results.reduce((sum, result) => sum + (result.totalScore ?? 0), 0) / results.length) * 10,
          ) / 10;
    return { name: `${course?.code ?? offering.id}-${offering.section}`, average };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${teacher.fullName}`}
        description={`Your teaching overview for ${DAY_NAMES[todayDow]}, ${formatDate(todayIso)}.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/teacher/timetable">
                <CalendarDays className="h-4 w-4" />
                Timetable
              </Link>
            </Button>
            <Button asChild>
              <Link to="/teacher/attendance">
                <ClipboardCheck className="h-4 w-4" />
                Take attendance
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Assigned courses" value={offerings.length} icon={BookOpen} hint="Active offerings" />
        <StatCard label="Total students" value={studentIds.size} icon={GraduationCap} tone="success" hint="Across your courses" />
        <StatCard label="Today's classes" value={todayEntries.length} icon={CalendarDays} tone="warning" hint={DAY_NAMES[todayDow]} />
        <StatCard label="Pending assessments" value={pendingAssessments.length} icon={ClipboardList} tone="muted" hint="Open or draft" />
        <StatCard label="Attendance" value={`${attendanceRate}%`} icon={ClipboardCheck} tone="primary" hint={`${attendanceTotals.total} records`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Attendance by course"
          description="Present and late rate per offering"
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
          title="Class performance"
          description="Average course total per offering"
          empty={performanceData.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={performanceData} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" domain={[0, 100]} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="average" fill="#16A34A" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Today's schedule</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/teacher/timetable">Full timetable</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayEntries.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No classes today" description="Enjoy the free day." />
            ) : (
              todayEntries
                .slice()
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{courseLabel(entry.offeringId)}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.room} · Section {entry.section}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-primary">
                      {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                    </span>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Quick actions</CardTitle>
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
            <CardTitle>Upcoming examinations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingExams.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No upcoming examinations" description="Scheduled exams will appear here." />
            ) : (
              upcomingExams.map((exam) => (
                <div key={exam.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{courseLabel(exam.offeringId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {titleCase(exam.type)} · {exam.venue} · {formatTime(exam.startTime)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(exam.date)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent assessments</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/teacher/assessments">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAssessments.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No assessments" description="Create an assessment to get started." />
            ) : (
              recentAssessments.map((assessment) => (
                <div key={assessment.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
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
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Announcements</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/teacher/announcements">View all</Link>
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
