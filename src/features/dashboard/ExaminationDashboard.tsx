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
  CalendarClock,
  CalendarDays,
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
import { reportService } from "@/services/reportService";
import { resultService } from "@/services/resultService";
import { announcementService } from "@/services/announcementService";
import { auditService } from "@/services/auditService";
import { formatDate, formatTime, fromNow } from "@/lib/format";
import { AUDIT_ACTION_LABELS } from "@/lib/constants";

const chartTooltipStyle = {
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  fontSize: 12,
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
};

const QUICK_LINKS = [
  { label: "Schedule", href: "/examinations/schedule", icon: CalendarDays },
  { label: "Assessments", href: "/examinations/assessments", icon: ClipboardList },
  { label: "Marks review", href: "/examinations/marks-review", icon: FileCheck2 },
  { label: "Results", href: "/examinations/results", icon: GraduationCap },
];

export function ExaminationDashboard() {
  const db = useDatabase();
  const { user } = useAuth();

  const todayIso = new Date().toISOString().slice(0, 10);
  const counts = resultService.countsByStatus(db);
  const scheduledExams = db.examinations.filter((exam) => exam.status === "scheduled").length;
  const assessmentsCount = db.assessments.length;
  const awaitingApproval = counts.submitted + counts.under_review;

  const pipeline = reportService.marksReviewPipeline(db);
  const pipelineEmpty = pipeline.every((entry) => entry.value === 0);

  const examByCourse = (() => {
    const map = new Map<string, number>();
    for (const exam of db.examinations) {
      const offering = db.courseOfferings.find((item) => item.id === exam.offeringId);
      const course = offering ? db.courses.find((item) => item.id === offering.courseId) : undefined;
      const key = course?.code ?? "Unknown";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  })();

  const upcoming = db.examinations
    .filter((exam) => exam.status !== "cancelled" && exam.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const publicationLogs = auditService
    .recent(db, 30)
    .filter((log) => log.action === "approve" || log.action === "publish")
    .slice(0, 5);

  const announcements = announcementService.visibleFor(db, user).slice(0, 4);

  const offeringLabel = (offeringId: string): string => {
    const offering = db.courseOfferings.find((item) => item.id === offeringId);
    const course = offering ? db.courses.find((item) => item.id === offering.courseId) : undefined;
    return course ? `${course.code} — ${course.title}` : offeringId;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examination Dashboard"
        description={`Examination, assessment and result review overview for ${db.settings.universityName}.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/examinations/reports">
                <Activity className="h-4 w-4" />
                Reports
              </Link>
            </Button>
            <Button asChild>
              <Link to="/examinations/schedule">
                <CalendarClock className="h-4 w-4" />
                Schedule exam
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Scheduled examinations"
          value={scheduledExams}
          icon={CalendarClock}
          hint="Awaiting completion"
        />
        <StatCard
          label="Assessments"
          value={assessmentsCount}
          icon={ClipboardList}
          tone="success"
          hint="Across all offerings"
        />
        <StatCard
          label="Marks awaiting approval"
          value={awaitingApproval}
          icon={FileCheck2}
          tone="warning"
          hint={`${counts.submitted} submitted · ${counts.under_review} under review`}
        />
        <StatCard
          label="Published results"
          value={counts.published}
          icon={GraduationCap}
          tone="primary"
          hint="Visible to students"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Marks review pipeline"
          description="Result submissions across the workflow"
          empty={pipelineEmpty}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pipeline} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Examinations by course"
          description="Scheduled and completed examinations per course"
          empty={examByCourse.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={examByCourse} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="value" fill="#16A34A" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Upcoming examinations</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/examinations/schedule">Full schedule</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No upcoming examinations"
                description="Scheduled examinations will appear here."
              />
            ) : (
              upcoming.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{offeringLabel(exam.offeringId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {exam.venue} · {formatTime(exam.startTime)} – {formatTime(exam.endTime)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={exam.status} />
                    <span className="text-[11px] text-muted-foreground">{formatDate(exam.date)}</span>
                  </div>
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
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="flex flex-col items-center gap-2 rounded-lg border border-border bg-background px-3 py-4 text-center text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-primary"
              >
                <link.icon className="h-4.5 w-4.5" />
                {link.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent publication activity</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/examinations/results">Results</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {publicationLogs.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No publication activity"
                description="Approvals and publications will be logged here."
              />
            ) : (
              publicationLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{log.description}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {log.actorName} · {AUDIT_ACTION_LABELS[log.action] ?? log.action} ·{" "}
                      {fromNow(log.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {announcements.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="No announcements"
                description="Published announcements will appear here."
              />
            ) : (
              announcements.map((announcement) => (
                <div key={announcement.id} className="rounded-md border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{announcement.title}</p>
                    <StatusBadge status={announcement.audience} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{announcement.content}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/80">
                    {fromNow(announcement.createdAt)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
