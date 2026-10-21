import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ClipboardCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { FilterDropdown } from "@/components/tables/filter-dropdown";
import { Pagination } from "@/components/tables/pagination";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { useTableState } from "@/hooks/useTableState";
import { attendanceService } from "@/services/attendanceService";
import { studentService } from "@/services/studentService";
import { courseService } from "@/services/courseService";
import { academicService } from "@/services/academicService";
import type { Course, CourseOffering, Semester } from "@/types";
import { pct } from "@/lib/format";

const chartTooltipStyle = {
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  fontSize: 12,
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
};

interface AttendanceRow {
  offering: CourseOffering;
  course?: Course;
  semester?: Semester;
  summary: ReturnType<typeof attendanceService.offeringSummary>;
}

export function HodAttendancePage() {
  const db = useDatabase();
  const { user } = useAuth();
  const departmentId = user?.departmentId ?? "";
  const threshold = db.settings.attendanceThreshold;
  const table = useTableState({ semester: "", course: "" });

  const deptOfferings = db.courseOfferings.filter(
    (offering) => db.courses.find((course) => course.id === offering.courseId)?.departmentId === departmentId,
  );

  const semesterFilter = table.filters.semester;
  const courseFilter = table.filters.course;

  const rows: AttendanceRow[] = deptOfferings
    .filter(
      (offering) =>
        (!semesterFilter || offering.semesterId === semesterFilter) &&
        (!courseFilter || offering.courseId === courseFilter),
    )
    .map((offering) => ({
      offering,
      course: db.courses.find((course) => course.id === offering.courseId),
      semester: db.semesters.find((semester) => semester.id === offering.semesterId),
      summary: attendanceService.offeringSummary(db, offering.id),
    }))
    .filter((row) => (table.search ? `${row.course?.code ?? ""} ${row.course?.title ?? ""}`.toLowerCase().includes(table.search.toLowerCase()) : true));

  const totalPages = Math.max(1, Math.ceil(rows.length / table.pageSize));
  const safePage = Math.min(table.page, totalPages);
  const pageRows = rows.slice((safePage - 1) * table.pageSize, safePage * table.pageSize);

  const deptRecords = db.attendance.filter((record) =>
    deptOfferings.some((offering) => offering.id === record.offeringId),
  );
  const attended = deptRecords.filter((record) => record.status === "present" || record.status === "late").length;
  const deptRate = deptRecords.length === 0 ? 0 : Math.round((attended / deptRecords.length) * 1000) / 10;

  const lowAttendance = studentService
    .byDepartment(db, departmentId)
    .filter((student) => student.status === "active")
    .map((student) => ({ student, summary: attendanceService.studentSummary(db, student.id) }))
    .filter((row) => row.summary.total > 0 && row.summary.percentage < threshold)
    .sort((a, b) => a.summary.percentage - b.summary.percentage);

  const chartData = rows.map((row) => ({
    name: `${row.course?.code ?? row.offering.id}-${row.offering.section}`,
    rate: row.summary.percentage,
  }));

  const semesterOptions = academicService
    .allSemesters(db)
    .map((semester) => ({ value: semester.id, label: semester.name }));
  const courseOptions = courseService
    .byDepartment(db, departmentId)
    .map((course) => ({ value: course.id, label: `${course.code} — ${course.title}` }));

  const columns: Column<AttendanceRow>[] = [
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
      key: "present",
      header: "Present",
      render: (row) => <span className="text-sm text-success">{row.summary.present}</span>,
    },
    {
      key: "late",
      header: "Late",
      render: (row) => <span className="text-sm text-warning">{row.summary.late}</span>,
    },
    {
      key: "absent",
      header: "Absent",
      render: (row) => <span className="text-sm text-destructive">{row.summary.absent}</span>,
    },
    {
      key: "excused",
      header: "Excused",
      className: "hidden lg:table-cell",
      render: (row) => <span className="text-sm text-muted-foreground">{row.summary.excused}</span>,
    },
    {
      key: "rate",
      header: "Rate",
      render: (row) => (
        <Badge variant={row.summary.percentage < threshold ? "destructive" : "success"}>
          {pct(row.summary.percentage)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department attendance"
        description="Attendance performance across your department's course offerings."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Department attendance" value={pct(deptRate)} icon={ClipboardCheck} hint={`${deptRecords.length} records`} />
        <StatCard label="Offerings tracked" value={deptOfferings.length} icon={Users} tone="success" hint={`${rows.length} shown`} />
        <StatCard
          label="Low attendance"
          value={lowAttendance.length}
          icon={AlertTriangle}
          tone="destructive"
          hint={`Below ${threshold}% threshold`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Attendance by course" description="Attendance rate per offering" className="lg:col-span-2" empty={chartData.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" domain={[0, 100]} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="rate" fill="#16A34A" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <p className="text-base font-semibold leading-none tracking-tight">Students with low attendance</p>
              <p className="mt-1 text-sm text-muted-foreground">Below {threshold}%</p>
            </div>
          </div>
          <div className="max-h-[280px] space-y-3 overflow-y-auto scrollbar-thin p-5">
            {lowAttendance.length === 0 ? (
              <EmptyState icon={ClipboardCheck} title="No low attendance" description="All active students are above the threshold." />
            ) : (
              lowAttendance.slice(0, 12).map((row) => (
                <div key={row.student.id} className="flex items-center gap-3">
                  <UserAvatar name={row.student.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.student.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.student.registrationNumber}</p>
                  </div>
                  <Badge variant="destructive">{pct(row.summary.percentage)}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <TableToolbar
          actions={
            <>
              <FilterDropdown
                label="Semester"
                value={semesterFilter}
                onChange={(value) => table.setFilter("semester", value)}
                options={semesterOptions}
              />
              <FilterDropdown
                label="Course"
                value={courseFilter}
                onChange={(value) => table.setFilter("course", value)}
                options={courseOptions}
              />
            </>
          }
        >
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search course"
            className="w-full sm:max-w-xs"
          />
        </TableToolbar>

        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(row) => row.offering.id}
          emptyState={
            <EmptyState
              icon={ClipboardCheck}
              title="No attendance records"
              description="No offerings match the current filters."
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
    </div>
  );
}
