import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarDays, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { FilterDropdown } from "@/components/tables/filter-dropdown";
import { Pagination } from "@/components/tables/pagination";
import { FormDialog } from "@/components/forms/form-dialog";
import { TextField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDatabase } from "@/hooks/useDatabase";
import { useActor } from "@/hooks/useActor";
import { useTableState } from "@/hooks/useTableState";
import { academicService } from "@/services/academicService";
import { notify } from "@/lib/notify";
import { formatDate } from "@/lib/format";
import { PERIOD_STATUS_LABELS } from "@/lib/constants";
import type { Semester } from "@/types";

const schema = z
  .object({
    name: z.string().min(2, "Semester name is required."),
    sessionId: z.string().min(1, "Select an academic session."),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
    status: z.enum(["active", "upcoming", "completed", "inactive"]),
  })
  .refine((values) => values.endDate > values.startDate, {
    message: "End date must be after the start date.",
    path: ["endDate"],
  });

type FormValues = z.infer<typeof schema>;

export function SemestersPage() {
  const db = useDatabase();
  const actor = useActor();
  const table = useTableState();
  const [editing, setEditing] = useState<Semester | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Semester | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", sessionId: "", startDate: "", endDate: "", status: "upcoming" },
  });

  const result = academicService.semesters(db, table.params);
  const activeSemester = academicService.activeSemester(db);

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", sessionId: db.academicSessions[0]?.id ?? "", startDate: "", endDate: "", status: "upcoming" });
    setFormOpen(true);
  };

  const openEdit = (semester: Semester) => {
    setEditing(semester);
    form.reset({
      name: semester.name,
      sessionId: semester.sessionId,
      startDate: semester.startDate,
      endDate: semester.endDate,
      status: semester.status,
    });
    setFormOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      if (editing) {
        await academicService.updateSemester(editing.id, values, actor);
        notify.success("Semester updated", `${values.name} was saved.`);
      } else {
        await academicService.createSemester(values, actor);
        notify.success("Semester created", `${values.name} was added.`);
      }
      setFormOpen(false);
    } catch (error) {
      notify.error("Could not save semester", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await academicService.removeSemester(deleting.id, actor);
      notify.success("Semester deleted", `${deleting.name} was removed.`);
      setDeleting(null);
    } catch (error) {
      notify.error("Could not delete semester", error instanceof Error ? error.message : undefined);
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Semester>[] = [
    {
      key: "name",
      header: "Semester",
      sortable: true,
      render: (semester) => (
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium">{semester.name}</span>
          {activeSemester?.id === semester.id && <Star className="h-3.5 w-3.5 fill-warning text-warning" />}
        </span>
      ),
    },
    { key: "sessionId", header: "Session", render: (semester) => <span className="text-sm text-muted-foreground">{db.academicSessions.find((s) => s.id === semester.sessionId)?.name ?? "—"}</span> },
    { key: "startDate", header: "Starts", sortable: true, render: (semester) => <span className="text-sm text-muted-foreground">{formatDate(semester.startDate)}</span> },
    { key: "endDate", header: "Ends", sortable: true, render: (semester) => <span className="text-sm text-muted-foreground">{formatDate(semester.endDate)}</span> },
    { key: "offerings", header: "Offerings", render: (semester) => <span className="text-sm text-muted-foreground">{db.courseOfferings.filter((o) => o.semesterId === semester.id).length}</span> },
    { key: "status", header: "Status", render: (semester) => <StatusBadge status={semester.status} label={PERIOD_STATUS_LABELS[semester.status]} /> },
    {
      key: "actions",
      header: "",
      headerClassName: "w-12",
      render: (semester) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Row actions">
              <span className="text-lg leading-none">⋯</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(semester)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(semester)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Semesters"
        description="Manage semesters within academic sessions. The active semester drives the current term."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add semester
          </Button>
        }
      />

      {activeSemester && (
        <Card className="flex items-center gap-3 p-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
            <Star className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Active semester: {activeSemester.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(activeSemester.startDate)} – {formatDate(activeSemester.endDate)}
            </p>
          </div>
        </Card>
      )}

      <Card>
        <TableToolbar
          actions={
            <>
              <FilterDropdown label="Session" value={table.filters.sessionId ?? ""} onChange={(v) => table.setFilter("sessionId", v)} options={db.academicSessions.map((s) => ({ value: s.id, label: s.name }))} />
              <FilterDropdown label="Status" value={table.filters.status ?? ""} onChange={(v) => table.setFilter("status", v)} options={Object.entries(PERIOD_STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
            </>
          }
        >
          <SearchInput value={table.search} onChange={table.setSearch} placeholder="Search semesters" className="w-full sm:max-w-xs" />
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={result.items}
          rowKey={(semester) => semester.id}
          sortBy={table.sortBy}
          sortDir={table.sortDir}
          onSort={table.toggleSort}
          emptyState={
            <EmptyState
              icon={CalendarDays}
              title="No semesters found"
              description={table.hasActiveFilters ? "Try adjusting your filters." : "Create your first semester."}
              action={table.hasActiveFilters ? <Button variant="outline" onClick={table.resetFilters}>Clear filters</Button> : <Button onClick={openCreate}>Add semester</Button>}
            />
          }
        />
        <div className="px-4">
          <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} />
        </div>
      </Card>

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit semester" : "Add semester"}
        description="Setting a semester to Active makes it the current term across the system."
        submitLabel={editing ? "Save changes" : "Create semester"}
        onSubmit={form.handleSubmit(onSubmit)}
        loading={saving}
      >
        <TextField label="Semester name" required placeholder="Fall 2026" error={form.formState.errors.name?.message} {...form.register("name")} />
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="sessionId">Academic session <span className="text-destructive">*</span></label>
          <select id="sessionId" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("sessionId")}>
            <option value="">Select session</option>
            {db.academicSessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {form.formState.errors.sessionId && <p className="text-xs font-medium text-destructive">{form.formState.errors.sessionId.message}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Start date" type="date" required error={form.formState.errors.startDate?.message} {...form.register("startDate")} />
          <TextField label="End date" type="date" required error={form.formState.errors.endDate?.message} {...form.register("endDate")} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="status">Status</label>
          <select id="status" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("status")}>
            {Object.entries(PERIOD_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete semester?"
        description={`This will remove ${deleting?.name}. Deletion is blocked while course offerings reference it.`}
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={onDelete}
      />
    </div>
  );
}
