import { useState } from "react";
import { AlertTriangle, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { FilterDropdown } from "@/components/tables/filter-dropdown";
import { Pagination } from "@/components/tables/pagination";
import { useDatabase } from "@/hooks/useDatabase";
import { useTableState } from "@/hooks/useTableState";
import { assessmentService } from "@/services/assessmentService";
import { marksService } from "@/services/marksService";
import { enrollmentService } from "@/services/enrollmentService";
import { courseService } from "@/services/courseService";
import { academicService } from "@/services/academicService";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { Assessment, AssessmentStatus, AssessmentType } from "@/types";

const TYPE_OPTIONS = (Object.keys(ASSESSMENT_TYPE_LABELS) as AssessmentType[]).map((value) => ({
  value,
  label: ASSESSMENT_TYPE_LABELS[value],
}));

const STATUS_OPTIONS: { value: AssessmentStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

interface MarkRow {
  id: string;
  student: string;
  registration: string;
  score: number | null;
}

export function ExamAssessmentsPage() {
  const db = useDatabase();
  const table = useTableState();
  const [selected, setSelected] = useState<Assessment | null>(null);

  const data = assessmentService.list(db, table.params);

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

  const weightWarnings = [...new Set(db.assessments.map((assessment) => assessment.offeringId))]
    .map((offeringId) => ({ offeringId, weight: assessmentService.totalWeight(db, offeringId) }))
    .filter((entry) => entry.weight !== 100);

  const stats = selected ? marksService.stats(db, selected.id) : null;
  const markRows: MarkRow[] = selected
    ? enrollmentService.studentsForOffering(db, selected.offeringId).map((student) => {
        const mark = marksService
          .forAssessment(db, selected.id)
          .find((item) => item.studentId === student.id);
        return {
          id: student.id,
          student: student.fullName,
          registration: student.registrationNumber,
          score: mark ? mark.score : null,
        };
      })
    : [];

  const columns: Column<Assessment>[] = [
    {
      key: "course",
      header: "Course",
      render: (row) => {
        const course = courseLabel(row.offeringId);
        return (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{course.title}</p>
            <p className="truncate text-xs text-muted-foreground">{course.code}</p>
          </div>
        );
      },
    },
    {
      key: "title",
      header: "Assessment",
      sortable: true,
      render: (row) => <span className="text-sm font-medium">{row.title}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (row) => <span className="text-sm">{ASSESSMENT_TYPE_LABELS[row.type]}</span>,
    },
    {
      key: "maxMarks",
      header: "Max marks",
      className: "hidden md:table-cell",
      render: (row) => <span className="text-sm">{row.maxMarks}</span>,
    },
    {
      key: "weight",
      header: "Weight",
      sortable: true,
      render: (row) => <span className="text-sm">{row.weight}%</span>,
    },
    {
      key: "offeringWeight",
      header: "Offering total",
      render: (row) => {
        const total = assessmentService.totalWeight(db, row.offeringId);
        return (
          <Badge variant={total === 100 ? "success" : "warning"}>
            {total}%
          </Badge>
        );
      },
    },
    {
      key: "dueDate",
      header: "Due date",
      sortable: true,
      render: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.dueDate)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const markColumns: Column<MarkRow>[] = [
    {
      key: "student",
      header: "Student",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.student}</p>
          <p className="truncate text-xs text-muted-foreground">{row.registration}</p>
        </div>
      ),
    },
    {
      key: "score",
      header: "Score",
      className: "text-right",
      headerClassName: "text-right",
      render: (row) => (
        <span className="text-sm font-medium">
          {row.score === null ? "—" : `${row.score} / ${selected?.maxMarks ?? 0}`}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment review"
        description="Read-only review of assessments across all offerings, with weight checks and recorded marks."
      />

      {weightWarnings.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-warning" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">
              {weightWarnings.length} offering(s) have assessment weights that do not total 100%.
            </p>
            <p className="text-xs text-muted-foreground">
              {weightWarnings
                .slice(0, 4)
                .map((entry) => `${courseLabel(entry.offeringId).code} (${entry.weight}%)`)
                .join(", ")}
              {weightWarnings.length > 4 ? " and more" : ""}
            </p>
          </div>
        </div>
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
                label="Type"
                value={table.filters.type ?? ""}
                onChange={(value) => table.setFilter("type", value)}
                options={TYPE_OPTIONS}
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
            placeholder="Search assessment title"
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
          onRowClick={(row) => setSelected(row)}
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title="No assessments found"
              description="No assessments match the current search and filters."
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

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selected.title}</DialogTitle>
              <DialogDescription>
                {courseLabel(selected.offeringId).code} · {ASSESSMENT_TYPE_LABELS[selected.type]} · Max{" "}
                {selected.maxMarks} · Weight {selected.weight}% · Due {formatDate(selected.dueDate)}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Recorded</p>
                <p className="text-lg font-semibold">{stats?.count ?? 0}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Average</p>
                <p className="text-lg font-semibold">{stats?.average ?? "—"}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Highest</p>
                <p className="text-lg font-semibold">{stats?.highest ?? "—"}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Lowest</p>
                <p className="text-lg font-semibold">{stats?.lowest ?? "—"}</p>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto scrollbar-thin">
              <DataTable
                columns={markColumns}
                rows={markRows}
                rowKey={(row) => row.id}
                emptyState={
                  <EmptyState
                    icon={ClipboardList}
                    title="No students"
                    description="No students are enrolled in this offering."
                  />
                }
              />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
