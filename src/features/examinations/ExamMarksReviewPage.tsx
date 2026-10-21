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
import { CheckCircle2, FileCheck2, RotateCcw, Send, Undo2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ChartCard } from "@/components/charts/chart-card";
import { DataTable, type Column } from "@/components/tables/data-table";
import { FilterDropdown } from "@/components/tables/filter-dropdown";
import { useDatabase } from "@/hooks/useDatabase";
import { useActor } from "@/hooks/useActor";
import { resultService } from "@/services/resultService";
import { reportService } from "@/services/reportService";
import { academicService } from "@/services/academicService";
import { courseService } from "@/services/courseService";
import { notify } from "@/lib/notify";
import { RESULT_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { AppError, type Result, type ResultStatus } from "@/types";

const chartTooltipStyle = {
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  fontSize: 12,
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
};

type DecisionStatus = Extract<ResultStatus, "under_review" | "approved" | "returned">;

const STATUS_FILTER_OPTIONS: { value: ResultStatus; label: string }[] = [
  { value: "submitted", label: RESULT_STATUS_LABELS.submitted },
  { value: "under_review", label: RESULT_STATUS_LABELS.under_review },
];

const PENDING_STATUSES: ResultStatus[] = ["submitted", "under_review"];

export function ExamMarksReviewPage() {
  const db = useDatabase();
  const actor = useActor();

  const [offeringFilter, setOfferingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [batchTarget, setBatchTarget] = useState<{ offeringId: string; status: DecisionStatus } | null>(null);
  const [rowTarget, setRowTarget] = useState<{ id: string; status: DecisionStatus } | null>(null);
  const [working, setWorking] = useState(false);

  const offeringOptions = academicService.allOfferings(db).map((offering) => {
    const course = courseService.byId(db, offering.courseId);
    return {
      value: offering.id,
      label: `${course?.code ?? offering.id} — ${course?.title ?? "Course"} (Sec ${offering.section})`,
    };
  });

  const courseLabel = (offeringId: string): { code: string; title: string } => {
    const offering = academicService.offeringById(db, offeringId);
    const course = offering ? courseService.byId(db, offering.courseId) : undefined;
    return { code: course?.code ?? "—", title: course?.title ?? "—" };
  };

  const pipeline = reportService.marksReviewPipeline(db);
  const pipelineEmpty = pipeline.every((entry) => entry.value === 0);

  const base = db.results.filter((result) => {
    if (!PENDING_STATUSES.includes(result.status)) return false;
    if (statusFilter && result.status !== statusFilter) return false;
    if (offeringFilter && result.offeringId !== offeringFilter) return false;
    return true;
  });

  const offeringIds = [...new Set(base.map((result) => result.offeringId))];

  const studentName = (studentId: string): string =>
    db.students.find((student) => student.id === studentId)?.fullName ?? studentId;

  function countsForOffering(offeringId: string): Record<ResultStatus, number> {
    const rows = resultService.forOffering(db, offeringId);
    const counts: Record<ResultStatus, number> = {
      draft: 0,
      submitted: 0,
      under_review: 0,
      approved: 0,
      published: 0,
      returned: 0,
    };
    for (const row of rows) counts[row.status] += 1;
    return counts;
  }

  async function handleBatchDecide() {
    if (!batchTarget) return;
    setWorking(true);
    try {
      const count = await resultService.decideOffering(batchTarget.offeringId, batchTarget.status, actor);
      notify.success(
        "Results updated",
        `${count} result(s) moved to ${RESULT_STATUS_LABELS[batchTarget.status]}.`,
      );
      setBatchTarget(null);
    } catch (error) {
      notify.error(
        "Could not update results",
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

  const columns: Column<Result>[] = [
    {
      key: "student",
      header: "Student",
      render: (row) => <span className="text-sm font-medium">{studentName(row.studentId)}</span>,
    },
    {
      key: "total",
      header: "Total",
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
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} label={RESULT_STATUS_LABELS[row.status]} />,
    },
    {
      key: "submitted",
      header: "Submitted",
      className: "hidden md:table-cell",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.submittedAt ? formatDate(row.submittedAt) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.status === "submitted" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRowTarget({ id: row.id, status: "under_review" })}
            >
              <Send className="h-4 w-4" />
              Review
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRowTarget({ id: row.id, status: "approved" })}
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setRowTarget({ id: row.id, status: "returned" })}
          >
            <Undo2 className="h-4 w-4" />
            Return
          </Button>
        </div>
      ),
    },
  ];

  const batchTitle =
    batchTarget?.status === "under_review"
      ? "Start review for this offering?"
      : batchTarget?.status === "approved"
        ? "Approve all reviewable results?"
        : "Return all reviewable results?";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marks review"
        description="Review submitted result batches, approve them or return them to teachers for correction."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Review pipeline"
          description="Results by workflow status"
          className="lg:col-span-2"
          empty={pipelineEmpty}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={pipeline} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader className="space-y-0">
            <CardTitle>Review queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FilterDropdown
              label="Offering"
              value={offeringFilter}
              onChange={setOfferingFilter}
              options={offeringOptions}
              allLabel="All"
            />
            <FilterDropdown
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_FILTER_OPTIONS}
              allLabel="All"
            />
            <p className="text-xs text-muted-foreground">
              {offeringIds.length} offering(s) with results awaiting review.
            </p>
          </CardContent>
        </Card>
      </div>

      {offeringIds.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileCheck2}
            title="Nothing awaiting review"
            description="There are no submitted or under-review results for the current filters."
          />
        </Card>
      ) : (
        offeringIds.map((offeringId) => {
          const course = courseLabel(offeringId);
          const counts = countsForOffering(offeringId);
          const rows = base.filter((result) => result.offeringId === offeringId);
          const canReview = counts.submitted > 0;
          const canApprove = counts.submitted + counts.under_review > 0;
          return (
            <Card key={offeringId}>
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                <div className="space-y-1">
                  <CardTitle>
                    {course.code} — {course.title}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge variant="muted">Submitted {counts.submitted}</Badge>
                    <Badge variant="warning">Under review {counts.under_review}</Badge>
                    <Badge variant="success">Approved {counts.approved}</Badge>
                    <Badge variant="info">Published {counts.published}</Badge>
                    <Badge variant="destructive">Returned {counts.returned}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canReview}
                    onClick={() => setBatchTarget({ offeringId, status: "under_review" })}
                  >
                    <Send className="h-4 w-4" />
                    Start review
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    disabled={!canApprove}
                    onClick={() => setBatchTarget({ offeringId, status: "approved" })}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canApprove}
                    onClick={() => setBatchTarget({ offeringId, status: "returned" })}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Return
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
              </CardContent>
            </Card>
          );
        })
      )}

      <ConfirmDialog
        open={Boolean(batchTarget)}
        onOpenChange={(open) => !open && setBatchTarget(null)}
        title={batchTitle}
        description="Reviewable results for this offering will be updated together. The service reports how many were affected."
        confirmLabel="Confirm"
        destructive={batchTarget?.status === "returned"}
        loading={working}
        onConfirm={handleBatchDecide}
      />

      <ConfirmDialog
        open={Boolean(rowTarget)}
        onOpenChange={(open) => !open && setRowTarget(null)}
        title={
          rowTarget?.status === "approved"
            ? "Approve this result?"
            : rowTarget?.status === "returned"
              ? "Return this result?"
              : "Move this result under review?"
        }
        description="This updates the result status and records the change in its history."
        confirmLabel="Confirm"
        destructive={rowTarget?.status === "returned"}
        loading={working}
        onConfirm={handleRowDecide}
      />
    </div>
  );
}
