import {
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
import { AlertTriangle, Award, ClipboardCheck, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/tables/data-table";
import { Pagination } from "@/components/tables/pagination";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { useTableState } from "@/hooks/useTableState";
import { reportService } from "@/services/reportService";
import { attendanceService } from "@/services/attendanceService";
import { studentService } from "@/services/studentService";
import type { Course, CourseOffering, Semester } from "@/types";
import { pct } from "@/lib/format";

const PIE_COLORS = ["#2563EB", "#16A34A", "#D97706", "#DC2626", "#64748B", "#172554", "#0EA5E9", "#7C3AED", "#F59E0B"];

const chartTooltipStyle = {
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  fontSize: 12,
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
};

interface PerformanceRow {
  offering: CourseOffering;
  course?: Course;
  semester?: Semester;
  average: number | null;
  count: number;
}

export function HodPerformancePage() {
  const db = useDatabase();
  const { user } = useAuth();
  const departmentId = user?.departmentId ?? "";
  const threshold = db.settings.attendanceThreshold;
  const table = useTableState();

  const deptOfferings = db.courseOfferings.filter(
    (offering) => db.courses.find((course) => course.id === offering.courseId)?.departmentId === departmentId,
  );
  const deptOfferingIds = new Set(deptOfferings.map((offering) => offering.id));

  const rows: PerformanceRow[] = deptOfferings
    .map((offering) => {
      const published = db.results.filter(
        (result) =>
          result.offeringId === offering.id && result.status === "published" && result.totalScore !== null,
      );
      const average =
        published.length === 0
          ? null
          : Math.round(
              (published.reduce((sum, result) => sum + (result.totalScore ?? 0), 0) / published.length) * 10,
            ) / 10;
      return {
        offering,
        course: db.courses.find((course) => course.id === offering.courseId),
        semester: db.semesters.find((semester) => semester.id === offering.semesterId),
        average,
        count: published.length,
      };
    })
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

  const performance = reportService.departmentPerformance(db, departmentId);
  const publishedInDept = db.results.filter(
    (result) => deptOfferingIds.has(result.offeringId) && result.status === "published" && result.totalScore !== null,
  );

  const gradeData = db.settings.gradingScale
    .map((band) => ({
      name: band.grade,
      value: publishedInDept.filter((result) => result.grade === band.grade).length,
    }))
    .filter((entry) => entry.value > 0);

  const attention = studentService
    .byDepartment(db, departmentId)
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
        (row.attendanceTotal > 0 && row.attendance < threshold) || (row.average !== null && row.average < 50),
    )
    .sort((a, b) => (a.average ?? 101) - (b.average ?? 101));

  const averageChartData = rows
    .filter((row) => row.average !== null)
    .map((row) => ({ name: `${row.course?.code ?? row.offering.id}-${row.offering.section}`, average: row.average }));

  const totalPages = Math.max(1, Math.ceil(rows.length / table.pageSize));
  const safePage = Math.min(table.page, totalPages);
  const pageRows = rows.slice((safePage - 1) * table.pageSize, safePage * table.pageSize);

  const columns: Column<PerformanceRow>[] = [
    {
      key: "course",
      header: "Course",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.course?.title ?? row.offering.id}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.course?.code} · Section {row.offering.section}
          </p>
        </div>
      ),
    },
    {
      key: "semester",
      header: "Semester",
      className: "hidden md:table-cell",
      render: (row) => <span className="text-sm text-muted-foreground">{row.semester?.name ?? "—"}</span>,
    },
    {
      key: "count",
      header: "Results",
      render: (row) => <span className="text-sm">{row.count}</span>,
    },
    {
      key: "average",
      header: "Average",
      render: (row) =>
        row.average === null ? (
          <span className="text-sm text-muted-foreground">—</span>
        ) : (
          <Badge variant={row.average < 50 ? "destructive" : row.average >= 70 ? "success" : "warning"}>
            {pct(row.average)}
          </Badge>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic performance"
        description="Published results and grade distribution across your department."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Department average"
          value={pct(performance.average)}
          icon={TrendingUp}
          hint={`${performance.count} results`}
        />
        <StatCard
          label="Published results"
          value={publishedInDept.length}
          icon={Award}
          tone="success"
          hint="Scored and published"
        />
        <StatCard
          label="Offerings graded"
          value={rows.filter((row) => row.count > 0).length}
          icon={ClipboardCheck}
          tone="warning"
          hint={`${rows.length} total offerings`}
        />
        <StatCard
          label="Needing attention"
          value={attention.length}
          icon={AlertTriangle}
          tone="destructive"
          hint="Low attendance or averages"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Grade distribution" description="Published results by grade" empty={gradeData.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={gradeData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {gradeData.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3">
            {gradeData.map((entry, index) => (
              <span key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                {entry.name} · {entry.value}
              </span>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Average by offering"
          description="Published result averages"
          className="lg:col-span-2"
          empty={averageChartData.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={averageChartData} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" domain={[0, 100]} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="average" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card>
        <div className="border-b border-border p-5">
          <p className="text-base font-semibold leading-none tracking-tight">Offerings performance</p>
          <p className="mt-1 text-sm text-muted-foreground">Average published result per offering.</p>
        </div>
        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(row) => row.offering.id}
          emptyState={
            <EmptyState
              icon={TrendingUp}
              title="No results yet"
              description="Published results will be summarised here."
            />
          }
        />
        <Pagination
          page={safePage}
          totalPages={totalPages}
          total={rows.length}
          pageSize={table.pageSize}
          onPageChange={table.setPage}
          onPageSizeChange={table.setPageSize}
        />
      </Card>

      <Card>
        <div className="border-b border-border p-5">
          <p className="text-base font-semibold leading-none tracking-tight">Students requiring attention</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Attendance below {threshold}% or an average under 50%.
          </p>
        </div>
        <div className="space-y-3 p-5">
          {attention.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No students flagged"
              description="All active students are meeting attendance and performance expectations."
            />
          ) : (
            attention.slice(0, 12).map((row) => (
              <div key={row.student.id} className="flex items-center gap-3 rounded-md border border-border p-3">
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
        </div>
      </Card>
    </div>
  );
}
