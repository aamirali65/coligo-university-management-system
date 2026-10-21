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
import { CheckCircle2, Download, GraduationCap, Send } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ChartCard } from "@/components/charts/chart-card";
import { SelectField } from "@/components/forms/field";
import { DataTable, type Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { FilterDropdown } from "@/components/tables/filter-dropdown";
import { Pagination } from "@/components/tables/pagination";
import { useDatabase } from "@/hooks/useDatabase";
import { useActor } from "@/hooks/useActor";
import { useTableState } from "@/hooks/useTableState";
import { resultService } from "@/services/resultService";
import { reportService } from "@/services/reportService";
import { academicService } from "@/services/academicService";
import { courseService } from "@/services/courseService";
import { notify } from "@/lib/notify";
import { exportToCsv } from "@/lib/csv";
import { RESULT_STATUS_LABELS } from "@/lib/constants";
import { AppError, type Result, type ResultStatus } from "@/types";

const chartTooltipStyle = {
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  fontSize: 12,
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
};

const STATUS_OPTIONS = (Object.keys(RESULT_STATUS_LABELS) as ResultStatus[]).map((value) => ({
  value,
  label: RESULT_STATUS_LABELS[value],
}));

type RowDecision = Extract<ResultStatus, "approved" | "published">;

export function ExamResultsPage() {
  const db = useDatabase();
  const actor = useActor();
  const table = useTableState();

  const [batchOffering, setBatchOffering] = useState("");
  const [confirmBatch, setConfirmBatch] = useState(false);
  const [rowTarget, setRowTarget] = useState<{ id: string; status: RowDecision } | null>(null);
  const [working, setWorking] = useState(false);

  const data = resultService.list(db, table.params);
  const allFiltered = resultService.list(db, { ...table.params, page: 1, pageSize: 1000 }).items;

  const semesterOptions = academicService
    .allSemesters(db)
    .map((semester) => ({ value: semester.id, label: semester.name }));

  const offeringOptions = academicService.allOfferings(db).map((offering) => {
    const course = courseService.byId(db, offering.courseId);
    return {
      value: offering.id,
      label: `${course?.code ?? offering.id} — ${course?.title ?? "Course"} (Sec ${offering.section})`,
    };
  });

  const offeringInfo = (
    offeringId: string,
  ): { code: string; title: string; semester: string } => {
    const offering = academicService.offeringById(db, offeringId);
    const course = offering ? courseService.byId(db, offering.courseId) : undefined;
    const semester = offering ? db.semesters.find((item) => item.id === offering.semesterId) : undefined;
    return {
      code: course?.code ?? "—",
      title: course?.title ?? "—",
      semester: semester?.name ?? "—",
    };
  };

  const studentName = (studentId: string): string =>
    db.students.find((student) => student.id === studentId)?.fullName ?? studentId;

  const gradeData = reportService.gradeDistribution(db);
  const gradeEmpty = gradeData.every((entry) => entry.value === 0);

  const offeringSummary = [...new Set(allFiltered.map((result) => result.offeringId))].map(
    (offeringId) => {
      const rows = resultService.forOffering(db, offeringId);
      const published = rows.filter((row) => row.status === "published").length;
      const approved = rows.filter((row) => row.status === "approved").length;
      const pending = rows.filter(
        (row) =>
          row.status !== "published" && row.status !== "approved",
      ).length;
      return { offeringId, published, approved, pending };
    },
  );

  async function handleBatchPublish() {
    if (!batchOffering) return;
    setWorking(true);
    try {
      const count = await resultService.decideOffering(batchOffering, "published", actor);
      notify.success("Results published", `${count} result(s) are now visible to students.`);
      setConfirmBatch(false);
    } catch (error) {
      notify.error(
        "Could not publish results",
        error instanceof AppError ? error.message : "Please try again.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleRowDecide() {
    if (!rowTarget) return;
    setWorking(true);
    try {
      await resultService.decide(rowTarget.id, rowTarget.status, actor);
      notify.success("Result updated", `Moved to ${RESULT_STATUS_LABELS[rowTarget.status]}.`);
      setRowTarget(null);
    } catch (error) {
      notify.error(
        "Could not update result",
        error instanceof AppError ? error.message : "Please try again.",
      );
    } finally {
      setWorking(false);
    }
  }

  function handleExport() {
    if (allFiltered.length === 0) {
      notify.error("Nothing to export", "There are no results to export yet.");
      return;
    }
    const rows = allFiltered.map((result) => {
      const info = offeringInfo(result.offeringId);
      return {
        Student: studentName(result.studentId),
        Course: info.title,
        Code: info.code,
        Semester: info.semester,
        Total: result.totalScore ?? "",
        Grade: result.grade ?? "",
        "Grade point": result.gradePoint ?? "",
        Status: RESULT_STATUS_LABELS[result.status],
      };
    });
    exportToCsv("exam-results.csv", rows);
    notify.success("Export ready", `${rows.length} row(s) exported.`);
  }

  const columns: Column<Result>[] = [
    {
      key: "student",
      header: "Student",
      render: (row) => <span className="text-sm font-medium">{studentName(row.studentId)}</span>,
    },
    {
      key: "course",
      header: "Course",
      render: (row) => {
        const info = offeringInfo(row.offeringId);
        return (
          <div className="min-w-0">
            <p className="truncate text-sm">{info.title}</p>
            <p className="truncate text-xs text-muted-foreground">{info.code}</p>
          </div>
        );
      },
    },
    {
      key: "semester",
      header: "Semester",
      className: "hidden lg:table-cell",
      render: (row) => (
        <span className="text-sm text-muted-foreground">{offeringInfo(row.offeringId).semester}</span>
      ),
    },
    {
      key: "total",
      header: "Total",
      sortable: true,
      render: (row) => (
        <span className="text-sm">{row.totalScore === null ? "—" : row.totalScore}</span>
      ),
    },
    {
      key: "grade",
      header: "Grade",
      render: (row) => <span className="text-sm font-medium">{row.grade ?? "—"}</span>,
    },
    {
      key: "gradePoint",
      header: "Grade point",
      className: "hidden md:table-cell",
      render: (row) => (
        <span className="text-sm text-muted-foreground">{row.gradePoint ?? "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status} label={RESULT_STATUS_LABELS[row.status]} />,
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {(row.status === "submitted" || row.status === "under_review") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRowTarget({ id: row.id, status: "approved" })}
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>
          )}
          {(row.status === "approved" || row.status === "under_review") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRowTarget({ id: row.id, status: "published" })}
            >
              <Send className="h-4 w-4" />
              Publish
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Results"
        description="Approve and publish results. Unpublished results are never visible to students."
        actions={
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Grade distribution"
          description="Published results by letter grade"
          className="lg:col-span-2"
          empty={gradeEmpty}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={gradeData} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="value" fill="#16A34A" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader className="space-y-0">
            <CardTitle>Batch publish</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SelectField
              label="Course offering"
              value={batchOffering}
              onChange={setBatchOffering}
              options={offeringOptions}
              placeholder="Select an offering"
            />
            <Button
              className="w-full"
              disabled={!batchOffering}
              onClick={() => setConfirmBatch(true)}
            >
              <Send className="h-4 w-4" />
              Publish approved results
            </Button>
            <p className="text-xs text-muted-foreground">
              Publishes every approved or under-review result for the selected offering.
            </p>
          </CardContent>
        </Card>
      </div>

      {offeringSummary.length > 0 && (
        <Card>
          <CardHeader className="space-y-0">
            <CardTitle>Offering summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {offeringSummary.map((summary) => {
              const info = offeringInfo(summary.offeringId);
              return (
                <div key={summary.offeringId} className="rounded-md border border-border p-3">
                  <p className="truncate text-sm font-medium">{info.code}</p>
                  <p className="truncate text-xs text-muted-foreground">{info.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="success">Published {summary.published}</Badge>
                    <Badge variant="info">Approved {summary.approved}</Badge>
                    <Badge variant="warning">Pending {summary.pending}</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <TableToolbar
          actions={
            <>
              <FilterDropdown
                label="Offering"
                value={table.filters.offeringId ?? ""}
                onChange={(value) => table.setFilter("offeringId", value)}
                options={offeringOptions}
                allLabel="All"
              />
              <FilterDropdown
                label="Semester"
                value={table.filters.semesterId ?? ""}
                onChange={(value) => table.setFilter("semesterId", value)}
                options={semesterOptions}
                allLabel="All"
              />
              <FilterDropdown
                label="Status"
                value={table.filters.status ?? ""}
                onChange={(value) => table.setFilter("status", value)}
                options={STATUS_OPTIONS}
                allLabel="All"
              />
            </>
          }
        >
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search student or course"
            className="w-full sm:max-w-xs"
          />
        </TableToolbar>

        <DataTable
          columns={columns}
          rows={data.items}
          rowKey={(row) => row.id}
          sortBy={table.sortBy}
          sortDir={table.sortDir}
          onSort={table.toggleSort}
          emptyState={
            <EmptyState
              icon={GraduationCap}
              title="No results found"
              description="No results match the current search and filters."
            />
          }
        />

        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          pageSize={table.pageSize}
          onPageChange={table.setPage}
          onPageSizeChange={table.setPageSize}
        />
      </Card>

      <p className="text-xs text-muted-foreground">
        Note: only published results are visible to students. Approved and pending results remain
        internal until published.
      </p>

      <ConfirmDialog
        open={confirmBatch}
        onOpenChange={setConfirmBatch}
        title="Publish results for this offering?"
        description="All approved or under-review results for the selected offering will be published and become visible to students."
        confirmLabel="Publish results"
        loading={working}
        onConfirm={handleBatchPublish}
      />

      <ConfirmDialog
        open={Boolean(rowTarget)}
        onOpenChange={(open) => !open && setRowTarget(null)}
        title={rowTarget?.status === "published" ? "Publish this result?" : "Approve this result?"}
        description={
          rowTarget?.status === "published"
            ? "The result will become visible to the student."
            : "The result will be marked approved and become eligible for publication."
        }
        confirmLabel={rowTarget?.status === "published" ? "Publish" : "Approve"}
        loading={working}
        onConfirm={handleRowDecide}
      />
    </div>
  );
}
