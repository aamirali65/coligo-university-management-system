import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Award, BookOpen, GraduationCap, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable, type Column } from "@/components/tables/data-table";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { studentService } from "@/services/studentService";
import { reportService } from "@/services/reportService";
import { formatDate, pct } from "@/lib/format";

const chartTooltipStyle = {
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  fontSize: 12,
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
};

type ResultRow = ReturnType<typeof studentService.resultsFor>[number];

function formatPoints(points: number): string {
  return points.toFixed(1);
}

export function StudentResultsPage() {
  const db = useDatabase();
  const { user } = useAuth();
  const student = user ? studentService.byUserId(db, user.id) : undefined;

  if (!student) {
    return (
      <div className="space-y-6">
        <PageHeader title="Results" description="Your published academic results." />
        <Card>
          <EmptyState
            icon={GraduationCap}
            title="No student profile"
            description="This account is not linked to a student record yet."
          />
        </Card>
      </div>
    );
  }

  const published = studentService.resultsFor(db, student.id, true);
  const gpa = reportService.studentGpa(db, student.id);
  const credits = published.reduce((sum, row) => sum + (row.course?.creditHours ?? 0), 0);
  const average =
    published.length === 0
      ? 0
      : Math.round(
          (published.reduce((sum, row) => sum + (row.result.totalScore ?? 0), 0) / published.length) * 10,
        ) / 10;

  const sorted = [...published].sort((a, b) =>
    (b.semester?.startDate ?? "").localeCompare(a.semester?.startDate ?? ""),
  );

  const groups = new Map<string, { semester: string; rows: ResultRow[] }>();
  for (const row of sorted) {
    const key = row.semester?.id ?? "unknown";
    const existing = groups.get(key);
    if (existing) existing.rows.push(row);
    else groups.set(key, { semester: row.semester?.name ?? "—", rows: [row] });
  }

  const gradeData = db.settings.gradingScale
    .map((band) => ({
      name: band.grade,
      value: published.filter((row) => row.result.grade === band.grade).length,
    }))
    .filter((entry) => entry.value > 0);

  const columns: Column<ResultRow>[] = [
    {
      key: "course",
      header: "Course",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.course?.title ?? row.offering?.id}</p>
          <p className="truncate text-xs text-muted-foreground">{row.course?.code}</p>
        </div>
      ),
    },
    { key: "credits", header: "Credits", render: (row) => row.course?.creditHours ?? "—" },
    { key: "total", header: "Total", render: (row) => pct(row.result.totalScore ?? 0) },
    { key: "grade", header: "Grade", render: (row) => row.result.grade ?? "—" },
    { key: "points", header: "Grade point", render: (row) => row.result.gradePoint ?? "—" },
    { key: "published", header: "Published", render: (row) => formatDate(row.result.publishedAt) },
  ];

  if (published.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Results" description="Your published academic results." />
        <Card>
          <EmptyState
            icon={GraduationCap}
            title="No published results yet"
            description="Once your results are published they will appear here."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Results" description="Your published academic results and standing." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="GPA" value={gpa ?? "—"} icon={Award} hint="Credit-weighted" />
        <StatCard label="Credits earned" value={credits} icon={BookOpen} tone="success" hint="Published courses" />
        <StatCard label="Average" value={pct(average)} icon={TrendingUp} tone="warning" hint={`${published.length} results`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Grade distribution" description="Your published results by grade" empty={gradeData.length === 0}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={gradeData} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle>Grading scale</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {db.settings.gradingScale.map((band) => (
                <div key={band.grade} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="text-sm font-medium">{band.grade}</span>
                  <span className="text-xs text-muted-foreground">
                    {band.min}% – {band.max}%
                  </span>
                  <span className="text-xs font-medium">{formatPoints(band.points)} points</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {[...groups.values()].map((group) => (
        <Card key={group.semester}>
          <CardHeader>
            <CardTitle>{group.semester}</CardTitle>
          </CardHeader>
          <DataTable columns={columns} rows={group.rows} rowKey={(row) => row.result.id} />
        </Card>
      ))}
    </div>
  );
}
