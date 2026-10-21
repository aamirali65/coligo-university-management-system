import { useState, type FormEvent } from "react";
import {
  Ban,
  CalendarDays,
  Download,
  List,
  Pencil,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SelectField, TextField } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { DataTable, type Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { FilterDropdown } from "@/components/tables/filter-dropdown";
import { Pagination } from "@/components/tables/pagination";
import { useDatabase } from "@/hooks/useDatabase";
import { useActor } from "@/hooks/useActor";
import { useTableState } from "@/hooks/useTableState";
import { examinationService, type ExaminationInput } from "@/services/examinationService";
import { academicService } from "@/services/academicService";
import { courseService } from "@/services/courseService";
import { notify } from "@/lib/notify";
import { exportToCsv } from "@/lib/csv";
import { formatDate, formatTime } from "@/lib/format";
import { AppError, type Examination, type ExaminationStatus, type ExaminationType } from "@/types";

const EXAM_TYPE_LABELS: Record<ExaminationType, string> = {
  midterm: "Midterm",
  final: "Final",
  quiz: "Quiz",
  practical: "Practical",
};

const EXAM_STATUS_LABELS: Record<ExaminationStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

const TYPE_OPTIONS = (Object.keys(EXAM_TYPE_LABELS) as ExaminationType[]).map((value) => ({
  value,
  label: EXAM_TYPE_LABELS[value],
}));

const STATUS_OPTIONS = (Object.keys(EXAM_STATUS_LABELS) as ExaminationStatus[]).map((value) => ({
  value,
  label: EXAM_STATUS_LABELS[value],
}));

interface ExamForm {
  offeringId: string;
  type: ExaminationType;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  status: ExaminationStatus;
}

const EMPTY_FORM: ExamForm = {
  offeringId: "",
  type: "midterm",
  date: new Date().toISOString().slice(0, 10),
  startTime: "09:00",
  endTime: "11:00",
  venue: "",
  status: "scheduled",
};

export function ExaminationSchedulePage() {
  const db = useDatabase();
  const actor = useActor();
  const table = useTableState();

  const [view, setView] = useState("table");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Examination | null>(null);
  const [form, setForm] = useState<ExamForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Examination | null>(null);
  const [cancelling, setCancelling] = useState(false);

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

  const listing = examinationService.list(db, {
    search: table.search,
    page: 1,
    pageSize: 1000,
    sortBy: table.sortBy,
    sortDir: table.sortDir,
    filters: {
      offeringId: table.filters.offeringId,
      type: table.filters.type,
      status: table.filters.status,
    },
  });

  const ranged = listing.items.filter((exam) => {
    if (dateFrom && exam.date < dateFrom) return false;
    if (dateTo && exam.date > dateTo) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(ranged.length / table.pageSize));
  const currentPage = Math.min(table.page, totalPages);
  const pageRows = ranged.slice((currentPage - 1) * table.pageSize, currentPage * table.pageSize);

  const grouped = ranged.reduce<Record<string, Examination[]>>((acc, exam) => {
    if (!acc[exam.date]) acc[exam.date] = [];
    acc[exam.date].push(exam);
    return acc;
  }, {});
  const groupedDates = Object.keys(grouped).sort();

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(exam: Examination) {
    setEditing(exam);
    setForm({
      offeringId: exam.offeringId,
      type: exam.type,
      date: exam.date,
      startTime: exam.startTime,
      endTime: exam.endTime,
      venue: exam.venue,
      status: exam.status,
    });
    setErrors({});
    setDialogOpen(true);
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!form.offeringId) next.offeringId = "Select a course offering.";
    if (!form.date) next.date = "Date is required.";
    if (!form.startTime) next.startTime = "Start time is required.";
    if (!form.endTime) next.endTime = "End time is required.";
    else if (form.startTime && form.endTime <= form.startTime) {
      next.endTime = "End time must be after the start time.";
    }
    if (!form.venue.trim()) next.venue = "Venue is required.";
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    const input: ExaminationInput = {
      offeringId: form.offeringId,
      type: form.type,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      venue: form.venue.trim(),
      status: form.status,
    };
    setSaving(true);
    try {
      if (editing) {
        await examinationService.update(editing.id, input, actor);
        notify.success("Examination updated");
      } else {
        await examinationService.create(input, actor);
        notify.success("Examination scheduled");
      }
      setDialogOpen(false);
    } catch (error) {
      notify.error(
        "Could not save examination",
        error instanceof AppError ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await examinationService.cancel(cancelTarget.id, actor);
      notify.success("Examination cancelled");
      setCancelTarget(null);
    } catch (error) {
      notify.error(
        "Could not cancel examination",
        error instanceof AppError ? error.message : "Please try again.",
      );
    } finally {
      setCancelling(false);
    }
  }

  function handleExport() {
    if (ranged.length === 0) {
      notify.error("Nothing to export", "There are no examinations to export yet.");
      return;
    }
    const rows = ranged.map((exam) => {
      const course = courseLabel(exam.offeringId);
      return {
        Course: course.title,
        Code: course.code,
        Type: EXAM_TYPE_LABELS[exam.type],
        Date: exam.date,
        Start: exam.startTime,
        End: exam.endTime,
        Venue: exam.venue,
        Status: EXAM_STATUS_LABELS[exam.status],
      };
    });
    exportToCsv("examination-schedule.csv", rows);
    notify.success("Export ready", `${rows.length} row(s) exported.`);
  }

  const columns: Column<Examination>[] = [
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
      key: "type",
      header: "Type",
      sortable: true,
      render: (row) => <span className="text-sm">{EXAM_TYPE_LABELS[row.type]}</span>,
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (row) => <span className="text-sm">{formatDate(row.date)}</span>,
    },
    {
      key: "time",
      header: "Time",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatTime(row.startTime)} – {formatTime(row.endTime)}
        </span>
      ),
    },
    {
      key: "venue",
      header: "Venue",
      className: "hidden md:table-cell",
      render: (row) => <span className="text-sm text-muted-foreground">{row.venue}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" aria-label="Edit examination" onClick={() => openEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cancel examination"
            className="text-destructive hover:text-destructive"
            disabled={row.status === "cancelled"}
            onClick={() => setCancelTarget(row)}
          >
            <Ban className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examination schedule"
        description="Plan examinations, detect venue or offering conflicts and export the schedule."
        actions={
          <>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New examination
            </Button>
          </>
        }
      />

      <Tabs value={view} onValueChange={setView}>
        <TabsList className="no-print">
          <TabsTrigger value="table">
            <List className="mr-1.5 h-3.5 w-3.5" />
            Table
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
            Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table">
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
                placeholder="Search course or venue"
                className="w-full sm:max-w-xs"
              />
              <DateRangeFilter
                from={dateFrom}
                to={dateTo}
                onFromChange={setDateFrom}
                onToChange={setDateTo}
                fromLabel="Exam from"
                toLabel="Exam to"
              />
            </TableToolbar>

            <DataTable
              columns={columns}
              rows={pageRows}
              rowKey={(row) => row.id}
              sortBy={table.sortBy}
              sortDir={table.sortDir}
              onSort={table.toggleSort}
              emptyState={
                <EmptyState
                  icon={CalendarDays}
                  title="No examinations found"
                  description="No examinations match the current search and filters."
                />
              }
            />

            <Pagination
              page={currentPage}
              totalPages={totalPages}
              total={ranged.length}
              pageSize={table.pageSize}
              onPageChange={table.setPage}
              onPageSizeChange={table.setPageSize}
            />
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <div className="space-y-4">
            {groupedDates.length === 0 ? (
              <Card>
                <EmptyState
                  icon={CalendarDays}
                  title="Nothing scheduled"
                  description="No examinations fall within the current filters."
                />
              </Card>
            ) : (
              groupedDates.map((date) => (
                <Card key={date}>
                  <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <p className="text-sm font-semibold">{formatDate(date)}</p>
                    <Badge variant="muted">{grouped[date].length} examination(s)</Badge>
                  </div>
                  <div className="divide-y divide-border">
                    {grouped[date].map((exam) => {
                      const course = courseLabel(exam.offeringId);
                      return (
                        <div
                          key={exam.id}
                          className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{course.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {course.code} · {EXAM_TYPE_LABELS[exam.type]} · {exam.venue}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-primary">
                              {formatTime(exam.startTime)} – {formatTime(exam.endTime)}
                            </span>
                            <StatusBadge status={exam.status} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit examination" : "New examination"}
        description="Conflicting venue or offering bookings on the same date are rejected."
        submitLabel={editing ? "Save changes" : "Schedule examination"}
        loading={saving}
        onSubmit={handleSubmit}
      >
        <SelectField
          label="Course offering"
          value={form.offeringId}
          onChange={(value) => setForm({ ...form, offeringId: value })}
          options={offeringOptions}
          placeholder="Select an offering"
          error={errors.offeringId}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Type"
            value={form.type}
            onChange={(value) => setForm({ ...form, type: value as ExaminationType })}
            options={TYPE_OPTIONS}
          />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(value) => setForm({ ...form, status: value as ExaminationStatus })}
            options={STATUS_OPTIONS}
          />
          <TextField
            label="Date"
            name="date"
            type="date"
            required
            value={form.date}
            error={errors.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
          />
          <TextField
            label="Venue"
            name="venue"
            required
            value={form.venue}
            error={errors.venue}
            onChange={(event) => setForm({ ...form, venue: event.target.value })}
          />
          <TextField
            label="Start time"
            name="startTime"
            type="time"
            required
            value={form.startTime}
            error={errors.startTime}
            onChange={(event) => setForm({ ...form, startTime: event.target.value })}
          />
          <TextField
            label="End time"
            name="endTime"
            type="time"
            required
            value={form.endTime}
            error={errors.endTime}
            onChange={(event) => setForm({ ...form, endTime: event.target.value })}
          />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel examination?"
        description={
          cancelTarget
            ? `The examination for ${courseLabel(cancelTarget.offeringId).code} on ${formatDate(cancelTarget.date)} will be cancelled.`
            : undefined
        }
        confirmLabel="Cancel examination"
        destructive
        loading={cancelling}
        onConfirm={handleCancel}
      />
    </div>
  );
}
