import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ChartCard } from "@/components/charts/chart-card";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { useDatabase } from "@/hooks/useDatabase";
import { reportService } from "@/services/reportService";
import { exportToCsv } from "@/lib/csv";
import { notify } from "@/lib/notify";
import { formatDate } from "@/lib/format";

const chartTooltipStyle = {
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  fontSize: 12,
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
};

export function ExamReportsPage() {
  const db = useDatabase();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const examsInRange = db.examinations.filter((exam) => {
    if (dateFrom && exam.date < dateFrom) return false;
    if (dateTo && exam.date > dateTo) return false;
    return true;
  });

  const examScheduleRows = (() => {
    const map = new Map<
      string,
      { title: string; total: number; scheduled: number; completed: number; cancelled: number }
    >();
    for (const exam of examsInRange) {
      const offering = db.courseOfferings.find((item) => item.id === exam.offeringId);
      const course = offering ? db.courses.find((item) => item.id === offering.courseId) : undefined;
      const code = course?.code ?? "Unknown";
      const entry =
        map.get(code) ??
        { title: course?.title ?? "", total: 0, scheduled: 0, completed: 0, cancelled: 0 };
      entry.total += 1;
      entry[exam.status] += 1;
      map.set(code, entry);
    }
    return [...map.entries()].map(([code, value]) => ({ code, ...value }));
  })();

  const publishedInRange = db.results.filter((result) => {
    if (result.status !== "published") return false;
    const at = result.publishedAt ?? "";
    if (dateFrom && at < dateFrom) return false;
    if (dateTo && at > dateTo) return false;
    return true;
  });

  const publishedByCourseRows = (() => {
    const map = new Map<string, { title: string; count: number }>();
    for (const result of publishedInRange) {
      const offering = db.courseOfferings.find((item) => item.id === result.offeringId);
      const course = offering ? db.courses.find((item) => item.id === offering.courseId) : undefined;
      const code = course?.code ?? "Unknown";
      const entry = map.get(code) ?? { title: course?.title ?? "", count: 0 };
      entry.count += 1;
      map.set(code, entry);
    }
    return [...map.entries()]
      .map(([code, value]) => ({ code, title: value.title, count: value.count }))
      .sort((a, b) => b.count - a.count);
  })();

  const marksReviewRows = reportService.marksReviewPipeline(db).map((entry) => ({
    stage: entry.name,
    count: entry.value,
  }));
  const marksReviewEmpty = marksReviewRows.every((entry) => entry.count === 0);

  const gradeRows = reportService.gradeDistribution(db).map((entry) => ({
    grade: entry.name,
    count: entry.value,
  }));
  const gradeEmpty = gradeRows.every((entry) => entry.count === 0);

  function runExport(filename: string, rows: Record<string, unknown>[]) {
    if (rows.length === 0) {
      notify.error("Nothing to export", "There are no rows to export for this report.");
      return;
    }
    exportToCsv(filename, rows);
    notify.success("Export ready", `${rows.length} row(s) exported.`);
  }

  return (
    <div className="space-y-6">
      <div className="no-print space-y-4">
        <PageHeader
          title="Examination reports"
          description="Examination schedule, marks review, published results and grade distribution. Filter by date and export each dataset as CSV."
          actions={
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          }
        />

        <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <DateRangeFilter
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
            fromLabel="From"
            toLabel="To"
          />
          <p className="text-xs text-muted-foreground">
            {dateFrom || dateTo ? (
              <>
                Filtering examinations by date and results by publication date
                {dateFrom ? ` from ${formatDate(dateFrom)}` : ""}
                {dateTo ? ` to ${formatDate(dateTo)}` : ""}.
              </>
            ) : (
              "Showing all records across the institution."
            )}
          </p>
        </div>
      </div>

      <div className="print-area grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Examination schedules"
          description="Examinations per course with their status breakdown"
          empty={examScheduleRows.length === 0}
          action={
            <span className="no-print">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  runExport(
                    "examination-schedules.csv",
                    examScheduleRows.map((row) => ({
                      Code: row.code,
                      Course: row.title,
                      Total: row.total,
                      Scheduled: row.scheduled,
                      Completed: row.completed,
                      Cancelled: row.cancelled,
                    })),
                  )
                }
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={examScheduleRows.map((row) => ({ name: row.code, total: row.total }))}
              margin={{ left: -20, right: 8, top: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="total" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Marks review status"
          description="Results by workflow stage"
          empty={marksReviewEmpty}
          action={
            <span className="no-print">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  runExport(
                    "marks-review-status.csv",
                    marksReviewRows.map((row) => ({ Stage: row.stage, Count: row.count })),
                  )
                }
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={marksReviewRows} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="stage" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="count" fill="#D97706" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Published results by course"
          description="Published results per course within the selected range"
          empty={publishedByCourseRows.length === 0}
          action={
            <span className="no-print">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  runExport(
                    "published-results-by-course.csv",
                    publishedByCourseRows.map((row) => ({
                      Code: row.code,
                      Course: row.title,
                      Published: row.count,
                    })),
                  )
                }
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={publishedByCourseRows.map((row) => ({ name: row.code, count: row.count }))}
              margin={{ left: -20, right: 8, top: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="count" fill="#16A34A" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Grade distribution"
          description="Published results by letter grade"
          empty={gradeEmpty}
          action={
            <span className="no-print">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  runExport(
                    "grade-distribution.csv",
                    gradeRows.map((row) => ({ Grade: row.grade, Count: row.count })),
                  )
                }
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={gradeRows} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="grade" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="count" fill="#172554" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
