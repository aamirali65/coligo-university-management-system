import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarX2, Clock, ShieldCheck, TrendingUp, UserCheck, UserX } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { DataTable, type Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { studentService } from "@/services/studentService";
import { ATTENDANCE_LABELS } from "@/lib/constants";
import { formatDate, pct } from "@/lib/format";
import type { AttendanceStatus } from "@/types";

const chartTooltipStyle = {
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  fontSize: 12,
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
};

interface HistoryRow {
  id: string;
  date: string;
  code: string;
  topic: string;
  status: AttendanceStatus;
}

export function StudentAttendancePage() {
  const db = useDatabase();
  const { user } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const student = user ? studentService.byUserId(db, user.id) : undefined;

  if (!student) {
    return (
      <div className="space-y-6">
        <PageHeader title="Attendance" description="Your attendance record." />
        <Card>
          <EmptyState
            icon={CalendarX2}
            title="No student profile"
            description="This account is not linked to a student record yet."
          />
        </Card>
      </div>
    );
  }

  const summary = studentService.attendanceSummary(db, student.id);

  const byCourse = studentService.attendanceByCourse(db, student.id).map((row) => {
    const course = db.courses.find((item) => item.id === row.code);
    return {
      offeringId: row.offeringId,
      code: course?.code ?? row.offeringId,
      title: course?.title ?? "",
      percentage: row.percentage,
      total: row.total,
    };
  });

  const history: HistoryRow[] = db.attendance
    .filter((record) => record.studentId === student.id)
    .flatMap((record) => {
      const session = db.classSessions.find((item) => item.id === record.classSessionId);
      if (!session) return [];
      const offering = db.courseOfferings.find((item) => item.id === record.offeringId);
      const course = offering ? db.courses.find((item) => item.id === offering.courseId) : undefined;
      return [
        {
          id: record.id,
          date: session.date,
          code: course?.code ?? "",
          topic: session.topic || "Class session",
          status: record.status,
        },
      ];
    })
    .filter((row) => (from ? row.date >= from : true) && (to ? row.date <= to : true))
    .sort((a, b) => b.date.localeCompare(a.date));

  const columns: Column<HistoryRow>[] = [
    { key: "date", header: "Date", render: (row) => formatDate(row.date) },
    { key: "course", header: "Course", render: (row) => row.code || "—" },
    { key: "topic", header: "Topic", render: (row) => row.topic },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} label={ATTENDANCE_LABELS[row.status]} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Your attendance across all enrolled courses." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Present" value={summary.byStatus.present} icon={UserCheck} tone="success" hint={`${summary.total} records`} />
        <StatCard label="Absent" value={summary.byStatus.absent} icon={UserX} tone="destructive" hint="Missed sessions" />
        <StatCard label="Late" value={summary.byStatus.late} icon={Clock} tone="warning" hint="Arrived late" />
        <StatCard label="Excused" value={summary.byStatus.excused} icon={ShieldCheck} tone="muted" hint="Approved absences" />
        <StatCard label="Attendance rate" value={pct(summary.percentage)} icon={TrendingUp} tone="primary" hint="Present and late" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Attendance by course"
          description="Attendance rate per course"
          empty={byCourse.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byCourse} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="code" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" domain={[0, 100]} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="percentage" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle>Course breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {byCourse.length === 0 ? (
              <EmptyState
                icon={CalendarX2}
                title="No attendance records"
                description="Attendance per course will appear here."
              />
            ) : (
              byCourse.map((row) => (
                <div key={row.offeringId} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium">
                      {row.code}
                      {row.title ? ` — ${row.title}` : ""}
                    </span>
                    <span className="text-xs font-medium">{pct(row.percentage)}</span>
                  </div>
                  <Progress value={row.percentage} />
                  <p className="text-[11px] text-muted-foreground">{row.total} recorded sessions</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <TableToolbar
          actions={
            <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
          }
        >
          <p className="text-sm font-medium">Attendance history</p>
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={history}
          rowKey={(row) => row.id}
          emptyState={
            <EmptyState
              icon={CalendarX2}
              title="No attendance records"
              description="No records match the selected date range."
            />
          }
        />
      </Card>
    </div>
  );
}
