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
  Activity,
  AlertTriangle,
  BookOpen,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  Megaphone,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { departmentService } from "@/services/departmentService";
import { studentService } from "@/services/studentService";
import { teacherService } from "@/services/teacherService";
import { attendanceService } from "@/services/attendanceService";
import { announcementService } from "@/services/announcementService";
import { auditService } from "@/services/auditService";
import { reportService } from "@/services/reportService";
import { academicService } from "@/services/academicService";
import { fromNow, pct } from "@/lib/format";
import { AUDIT_ACTION_LABELS } from "@/lib/constants";

const chartTooltipStyle = {
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  fontSize: 12,
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
};

export function HodDashboard() {
  const db = useDatabase();
  const { user } = useAuth();
  const departmentId = user?.departmentId ?? "";
  const department = departmentId ? departmentService.byId(db, departmentId) : undefined;
  const currentSemester = academicService.activeSemester(db);
  const counts = departmentService.counts(db, departmentId);
  const threshold = db.settings.attendanceThreshold;

  const deptOfferings = db.courseOfferings.filter(
    (offering) => db.courses.find((course) => course.id === offering.courseId)?.departmentId === departmentId,
  );
  const deptOfferingIds = new Set(deptOfferings.map((offering) => offering.id));
  const activeOfferings = deptOfferings.filter((offering) => offering.status === "active");

  const deptAttendance = db.attendance.filter((record) => deptOfferingIds.has(record.offeringId));
  const attended = deptAttendance.filter(
    (record) => record.status === "present" || record.status === "late",
  ).length;
  const attendanceRate =
    deptAttendance.length === 0 ? 0 : Math.round((attended / deptAttendance.length) * 1000) / 10;

  const performance = reportService.departmentPerformance(db, departmentId);

  const deptStudents = studentService.byDepartment(db, departmentId);
  const attention = deptStudents
    .filter((student) => student.status === "active")
    .map((student) => {
      const attendance = attendanceService.studentSummary(db, student.id);
      const published = db.results.filter(
        (result) =>
          result.studentId === student.id && result.status === "published" && result.totalScore !== null,
      );
      const average =
        published.length === 0
          ? null
          : Math.round(
              (published.reduce((sum, result) => sum + (result.totalScore ?? 0), 0) / published.length) * 10,
            ) / 10;
      return { student, attendance: attendance.percentage, attendanceTotal: attendance.total, average };
    })
    .filter(
      (row) =>
        (row.attendanceTotal > 0 && row.attendance < threshold) ||
        (row.average !== null && row.average < 50),
    )
    .sort((a, b) => a.attendance - b.attendance);

  const teacherAssignments = teacherService
    .byDepartment(db, departmentId)
    .map((teacher) => ({
      teacher,
      offerings: teacherService.offeringsFor(db, teacher.id).length,
      students: teacherService.studentCount(db, teacher.id),
    }))
    .sort((a, b) => b.offerings - a.offerings);

  const enrollmentData = activeOfferings
    .map((offering) => {
      const course = db.courses.find((c) => c.id === offering.courseId);
      const enrolled = db.enrollments.filter(
        (enrollment) => enrollment.offeringId === offering.id && enrollment.status === "active",
      ).length;
      return { name: `${course?.code ?? offering.id}-${offering.section}`, enrolled };
    })
    .sort((a, b) => b.enrolled - a.enrolled)
    .slice(0, 8);

  const attendanceData = activeOfferings
    .map((offering) => {
      const course = db.courses.find((c) => c.id === offering.courseId);
      const summary = attendanceService.offeringSummary(db, offering.id);
      return { name: `${course?.code ?? offering.id}-${offering.section}`, rate: summary.percentage };
    })
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 8);

  const announcements = announcementService.visibleFor(db, user).slice(0, 4);
  const recentLogs = auditService.recent(db, 6);

  const quickLinks = [
    { label: "Department", href: "/hod/department", icon: Building2 },
    { label: "Students", href: "/hod/students", icon: GraduationCap },
    { label: "Teachers", href: "/hod/teachers", icon: Users },
    { label: "Courses", href: "/hod/courses", icon: BookOpen },
    { label: "Attendance", href: "/hod/attendance", icon: ClipboardCheck },
    { label: "Reports", href: "/hod/reports", icon: FileBarChart },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Head of Department Dashboard"
        description={`Overview of ${department?.name ?? "your department"} for ${currentSemester?.name ?? "the current semester"}.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/hod/reports">
                <TrendingUp className="h-4 w-4" />
                Reports
              </Link>
            </Button>
            <Button asChild>
              <Link to="/hod/students">
                <GraduationCap className="h-4 w-4" />
                View students
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Department students"
          value={counts.students}
          icon={GraduationCap}
          hint={`${attention.length} need attention`}
        />
        <StatCard
          label="Department teachers"
          value={counts.teachers}
          icon={Users}
          tone="success"
          hint={`${counts.courses} courses`}
        />
        <StatCard
          label="Active offerings"
          value={activeOfferings.length}
          icon={ClipboardList}
          tone="warning"
          hint={`${counts.offerings} total offerings`}
        />
        <StatCard
          label="Attendance rate"
          value={pct(attendanceRate)}
          icon={ClipboardCheck}
          tone="muted"
          hint={`${deptAttendance.length} records`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Course enrollment"
          description="Active enrollments by offering"
          className="lg:col-span-2"
          empty={enrollmentData.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={enrollmentData} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="enrolled" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Academic performance"
          description="Average published result"
          empty={performance.count === 0}
        >
          <div className="flex h-[260px] flex-col items-center justify-center gap-2">
            <p className="text-4xl font-semibold tracking-tight text-foreground">{pct(performance.average)}</p>
            <p className="text-xs text-muted-foreground">Across {performance.count} published results</p>
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="Attendance by course"
        description="Attendance rate per active offering"
        empty={attendanceData.length === 0}
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={attendanceData} margin={{ left: -20, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
            <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" domain={[0, 100]} />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Bar dataKey="rate" fill="#16A34A" radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Students requiring academic attention</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/hod/performance">Performance</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {attention.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="No students flagged"
                description="Students below the attendance threshold or averaging under 50% will appear here."
              />
            ) : (
              attention.slice(0, 6).map((row) => (
                <div key={row.student.id} className="flex items-center gap-3 rounded-md border border-border p-2">
                  <UserAvatar name={row.student.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.student.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.student.registrationNumber}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={row.attendance < threshold ? "destructive" : "muted"}>
                      {pct(row.attendance)} att.
                    </Badge>
                    {row.average !== null && (
                      <Badge variant={row.average < 50 ? "destructive" : "muted"}>{pct(row.average)} avg.</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Teacher assignments</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/hod/teachers">All teachers</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {teacherAssignments.length === 0 ? (
              <EmptyState icon={UserCheck} title="No teachers" description="Teachers assigned to this department will appear here." />
            ) : (
              teacherAssignments.slice(0, 6).map((row) => (
                <div key={row.teacher.id} className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/60">
                  <UserAvatar name={row.teacher.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.teacher.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.teacher.designation}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{row.offerings} offerings</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{row.students} students</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent announcements</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/hod/announcements">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.length === 0 ? (
              <EmptyState icon={Megaphone} title="No announcements" description="Published announcements will appear here." />
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

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {quickLinks.map((action) => (
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

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent activity</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-3">
          {recentLogs.length === 0 ? (
            <EmptyState icon={Activity} title="No recent activity" description="Audit entries will appear here." />
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{log.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {log.actorName} · {AUDIT_ACTION_LABELS[log.action] ?? log.action} · {fromNow(log.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
