import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ChartCard } from "@/components/charts/chart-card";
import { Button } from "@/components/ui/button";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { courseService } from "@/services/courseService";
import { attendanceService } from "@/services/attendanceService";
import { teacherService } from "@/services/teacherService";
import { exportToCsv } from "@/lib/csv";
import { notify } from "@/lib/notify";

const chartTooltipStyle = {
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  fontSize: 12,
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
};

export function HodReportsPage() {
  const db = useDatabase();
  const { user } = useAuth();
  const departmentId = user?.departmentId ?? "";

  const deptOfferings = db.courseOfferings.filter(
    (offering) => db.courses.find((course) => course.id === offering.courseId)?.departmentId === departmentId,
  );

  const enrollmentRows = deptOfferings
    .filter((offering) => offering.status === "active")
    .map((offering) => {
      const course = db.courses.find((c) => c.id === offering.courseId);
      const enrolled = db.enrollments.filter(
        (e) => e.offeringId === offering.id && e.status === "active",
      ).length;
      const rate = offering.capacity === 0 ? 0 : Math.round((enrolled / offering.capacity) * 100);
      return {
        Course: `${course?.code ?? offering.id}-${offering.section}`,
        Title: course?.title ?? "",
        Enrolled: enrolled,
        Capacity: offering.capacity,
        "Fill %": rate,
      };
    })
    .sort((a, b) => (b.Enrolled as number) - (a.Enrolled as number));

  const attendanceRows = deptOfferings.map((offering) => {
    const course = db.courses.find((c) => c.id === offering.courseId);
    const summary = attendanceService.offeringSummary(db, offering.id);
    return {
      Course: course?.code ?? offering.id,
      Section: offering.section,
      Present: summary.present,
      Absent: summary.absent,
      Late: summary.late,
      Excused: summary.excused,
      "Rate %": summary.percentage,
    };
  });

  const performanceRows = deptOfferings
    .map((offering) => {
      const course = db.courses.find((c) => c.id === offering.courseId);
      const published = db.results.filter(
        (r) => r.offeringId === offering.id && r.status === "published" && r.totalScore !== null,
      );
      const average =
        published.length === 0
          ? null
          : Math.round(
              (published.reduce((sum, r) => sum + (r.totalScore ?? 0), 0) / published.length) * 10,
            ) / 10;
      return {
        Course: course?.code ?? offering.id,
        Section: offering.section,
        Average: (average ?? 0) as number,
        Results: published.length,
      };
    })
    .filter((row) => row.Results > 0)
    .sort((a, b) => b.Average - a.Average);

  const assignmentRows = teacherService
    .byDepartment(db, departmentId)
    .map((teacher) => ({
      Teacher: teacher.fullName,
      Designation: teacher.designation,
      Courses: teacherService.offeringsFor(db, teacher.id).length,
      Students: teacherService.studentCount(db, teacher.id),
    }))
    .sort((a, b) => b.Courses - a.Courses);

  const departmentCourses = courseService.byDepartment(db, departmentId).length;

  const runExport = (filename: string, rows: Record<string, unknown>[]) => {
    if (rows.length === 0) {
      notify.error("Nothing to export", "There are no rows to export yet.");
      return;
    }
    exportToCsv(filename, rows);
    notify.success("Export ready", `${rows.length} row(s) exported.`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department reports"
        description="Enrollment, attendance, performance and staffing reports. Export the displayed rows as CSV."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Enrollment summary"
          description="Active enrollments against capacity"
          empty={enrollmentRows.length === 0}
          action={
            <Button variant="outline" size="sm" onClick={() => runExport("department-enrollment.csv", enrollmentRows)}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={enrollmentRows} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="Course" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="Enrolled" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Capacity" fill="#94A3B8" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-3 text-xs text-muted-foreground">{departmentCourses} courses in the department.</p>
        </ChartCard>

        <ChartCard
          title="Course-wise attendance"
          description="Attendance rate per offering"
          empty={attendanceRows.length === 0}
          action={
            <Button variant="outline" size="sm" onClick={() => runExport("department-attendance.csv", attendanceRows)}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={attendanceRows} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="Course" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" domain={[0, 100]} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="Rate %" fill="#16A34A" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-3 text-xs text-muted-foreground">Threshold is {db.settings.attendanceThreshold}%.</p>
        </ChartCard>

        <ChartCard
          title="Academic performance"
          description="Average published result by offering"
          empty={performanceRows.length === 0}
          action={
            <Button variant="outline" size="sm" onClick={() => runExport("department-performance.csv", performanceRows)}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={performanceRows} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="Course" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" domain={[0, 100]} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="Average" fill="#D97706" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-3 text-xs text-muted-foreground">
            {performanceRows.length} offerings with published results.
          </p>
        </ChartCard>

        <ChartCard
          title="Teacher course assignments"
          description="Offerings and students per teacher"
          empty={assignmentRows.length === 0}
          action={
            <Button variant="outline" size="sm" onClick={() => runExport("department-teachers.csv", assignmentRows)}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={assignmentRows} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="Teacher" tickLine={false} axisLine={false} fontSize={11} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="Courses" fill="#172554" radius={[6, 6, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Students" fill="#0EA5E9" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-3 text-xs text-muted-foreground">
            {assignmentRows.length} teachers in the department.
          </p>
        </ChartCard>
      </div>
    </div>
  );
}
