import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Megaphone,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { useDatabase } from "@/hooks/useDatabase";
import { reportService } from "@/services/reportService";
import { announcementService } from "@/services/announcementService";
import { auditService } from "@/services/auditService";
import { academicService } from "@/services/academicService";
import { fromNow } from "@/lib/format";
import { AUDIT_ACTION_LABELS } from "@/lib/constants";
import { useAuth } from "@/features/auth/AuthContext";

const PIE_COLORS = ["#2563EB", "#16A34A", "#D97706", "#DC2626", "#64748B", "#172554"];

const chartTooltipStyle = {
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  fontSize: 12,
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
};

export function AdminDashboard() {
  const db = useDatabase();
  const { user } = useAuth();
  const totals = reportService.adminTotals(db);
  const currentSemester = academicService.activeSemester(db);
  const departmentDistribution = reportService.studentsByDepartment(db);
  const enrollmentTrend = reportService.enrollmentTrend(db);
  const attendance = reportService.attendanceOverview(db);
  const statusDistribution = reportService.studentStatusDistribution(db);
  const announcements = announcementService.visibleFor(db, user).slice(0, 4);
  const recentLogs = auditService.recent(db, 6);
  const recentStudents = [...db.students]
    .sort((a, b) => b.admissionDate.localeCompare(a.admissionDate))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrator Dashboard"
        description={`Overview of ${db.settings.universityName} for ${currentSemester?.name ?? "the current semester"}.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/admin/reports">
                <TrendingUp className="h-4 w-4" />
                Reports
              </Link>
            </Button>
            <Button asChild>
              <Link to="/admin/students">
                <Plus className="h-4 w-4" />
                Add student
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total students" value={totals.students} icon={GraduationCap} hint={`${totals.activeEnrollments} active enrollments`} />
        <StatCard label="Total teachers" value={totals.teachers} icon={Users} tone="success" hint="Across all departments" />
        <StatCard label="Departments" value={totals.departments} icon={Building2} tone="warning" hint={`${totals.courses} courses`} />
        <StatCard label="Active offerings" value={totals.activeOfferings} icon={ClipboardList} tone="muted" hint={`${totals.examinations} scheduled exams`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Enrollment trend"
          description="New enrollments per month"
          className="lg:col-span-2"
          empty={enrollmentTrend.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={enrollmentTrend} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="enrollFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="enrollments" stroke="#2563EB" strokeWidth={2} fill="url(#enrollFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Attendance overview" description="Across all recorded sessions" empty={db.attendance.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={attendance} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {attendance.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3">
            {attendance.map((entry, index) => (
              <span key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                {entry.name} · {entry.rate}%
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Students by department" description="Distribution across departments" className="lg:col-span-2" empty={departmentDistribution.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={departmentDistribution} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Student status" description="Current academic standing" empty={false}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusDistribution} dataKey="value" nameKey="name" outerRadius={90} label={false}>
                {statusDistribution.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3">
            {statusDistribution.map((entry, index) => (
              <span key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                {entry.name} · {entry.value}
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent registrations</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/students">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentStudents.map((student) => {
              const dept = db.departments.find((d) => d.id === student.departmentId);
              return (
                <Link
                  key={student.id}
                  to={`/admin/students/${student.id}`}
                  className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/60"
                >
                  <UserAvatar name={student.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{student.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {student.registrationNumber} · {dept?.code}
                    </p>
                  </div>
                  <StatusBadge status={student.status} />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              { label: "Departments", href: "/admin/departments", icon: Building2 },
              { label: "Courses", href: "/admin/courses", icon: BookOpen },
              { label: "Semesters", href: "/admin/semesters", icon: CalendarDays },
              { label: "Enrollments", href: "/admin/enrollments", icon: ClipboardList },
              { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
              { label: "Audit logs", href: "/admin/audit-logs", icon: Activity },
            ].map((action) => (
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
            <CardTitle>Recent announcements</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/announcements">Manage</Link>
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
            <CardTitle>Recent activity</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/audit-logs">Audit logs</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{log.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {log.actorName} · {AUDIT_ACTION_LABELS[log.action] ?? log.action} · {fromNow(log.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
