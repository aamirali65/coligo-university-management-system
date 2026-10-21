import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, BookOpen, Building2, Download, GraduationCap, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDatabase } from "@/hooks/useDatabase";
import { reportService } from "@/services/reportService";
import { exportToCsv } from "@/lib/csv";
import { notify } from "@/lib/notify";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#0f172a", "#7c3aed", "#0891b2"];

export function AdminReportsPage() {
  const db = useDatabase();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const totals = reportService.adminTotals(db);
  const studentsByDept = reportService.studentsByDepartment(db);
  const statusDistribution = reportService.studentStatusDistribution(db);
  const enrollmentTrend = reportService.enrollmentTrend(db);
  const courseEnrollment = reportService.courseEnrollment(db);
  const attendanceOverview = reportService.attendanceOverview(db);
  const attendanceByDept = reportService.attendanceByDepartment(db);
  const performance = reportService.academicPerformance(db);
  const gradeDistribution = reportService.gradeDistribution(db);

  const exportEnrollment = () => {
    const rows = courseEnrollment.filter((row) => row.enrolled > 0);
    exportToCsv("course-enrollment", rows, [
      { key: "name", header: "Offering" },
      { key: "title", header: "Course" },
      { key: "enrolled", header: "Enrolled" },
      { key: "capacity", header: "Capacity" },
      { key: "rate", header: "Fill %" },
    ]);
    notify.success("Export started", "Course enrollment CSV downloaded.");
  };

  const exportPerformance = () => {
    exportToCsv("academic-performance", performance, [
      { key: "name", header: "Department" },
      { key: "department", header: "Name" },
      { key: "average", header: "Average %" },
      { key: "results", header: "Results" },
    ]);
    notify.success("Export started", "Academic performance CSV downloaded.");
  };

  const exportAttendance = () => {
    exportToCsv("attendance-by-department", attendanceByDept, [
      { key: "name", header: "Department" },
      { key: "rate", header: "Attendance %" },
      { key: "records", header: "Records" },
    ]);
    notify.success("Export started", "Attendance CSV downloaded.");
  };

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          title="Reports"
          description="University-wide analytics with exportable datasets."
          actions={
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="h-4 w-4" />
              Print report
            </Button>
          }
        />
      </div>

      <div className="no-print">
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </div>

      <div className="print-area space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Students" value={totals.students} icon={GraduationCap} />
          <StatCard label="Teachers" value={totals.teachers} icon={Users} tone="success" />
          <StatCard label="Active enrollments" value={totals.activeEnrollments} icon={BookOpen} tone="warning" />
          <StatCard label="Published results" value={totals.publishedResults} icon={BarChart3} tone="muted" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Students by department" description="Headcount per department." action={<Button variant="ghost" size="sm" onClick={exportPerformance}>Export</Button>}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={studentsByDept}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Bar dataKey="value" name="Students" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Student status distribution" description="Across all departments.">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {statusDistribution.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Enrollment trend" description="Enrollments recorded per month.">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={enrollmentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Line type="monotone" dataKey="enrollments" name="Enrollments" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Attendance overview" description="All attendance records by status.">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={attendanceOverview} dataKey="value" nameKey="name" outerRadius={100}>
                  {attendanceOverview.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Attendance rate by department" description="Present + late as a percentage." action={<Button variant="ghost" size="sm" onClick={exportAttendance}>Export</Button>}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={attendanceByDept}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" unit="%" />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Bar dataKey="rate" name="Attendance %" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Academic performance by department" description="Average published result score." action={<Button variant="ghost" size="sm" onClick={exportPerformance}>Export</Button>}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" unit="%" />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Bar dataKey="average" name="Average %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Grade distribution" description="Published results by letter grade.">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={gradeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Bar dataKey="value" name="Results" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Course enrollment"
            description="Top offerings by active enrollment."
            action={<Button variant="ghost" size="sm" onClick={exportEnrollment}>Export CSV</Button>}
            contentClassName="p-0"
          >
            <div className="max-h-[280px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Offering</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right">Enrolled</TableHead>
                    <TableHead className="text-right">Capacity</TableHead>
                    <TableHead className="text-right">Fill</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseEnrollment.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="text-sm font-medium">{row.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.title}</TableCell>
                      <TableCell className="text-right text-sm">{row.enrolled}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{row.capacity}</TableCell>
                      <TableCell className="text-right text-sm">{row.rate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ChartCard>
        </div>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Report range</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {from || to
              ? `Showing records${from ? ` from ${from}` : ""}${to ? ` up to ${to}` : ""}. The date range applies to exportable enrollment and attendance datasets.`
              : "No date range selected — showing all available records."}
          </p>
        </Card>
      </div>
    </div>
  );
}
