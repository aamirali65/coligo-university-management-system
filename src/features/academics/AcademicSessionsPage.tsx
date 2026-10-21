import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarRange, Pencil, Plus, Trash2 } from "lucide-react";
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
import type { AcademicSession } from "@/types";

const schema = z
  .object({
    name: z.string().min(2, "Session name is required."),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
    status: z.enum(["active", "upcoming", "completed", "inactive"]),
  })
  .refine((values) => values.endDate > values.startDate, {
    message: "End date must be after the start date.",
    path: ["endDate"],
  });

type FormValues = z.infer<typeof schema>;

export function AcademicSessionsPage() {
  const db = useDatabase();
  const actor = useActor();
  const table = useTableState();
  const [editing, setEditing] = useState<AcademicSession | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<AcademicSession | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", startDate: "", endDate: "", status: "upcoming" },
  });

  const result = academicService.sessions(db, table.params);

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", startDate: "", endDate: "", status: "upcoming" });
    setFormOpen(true);
  };

  const openEdit = (session: AcademicSession) => {
    setEditing(session);
    form.reset({ name: session.name, startDate: session.startDate, endDate: session.endDate, status: session.status });
    setFormOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      if (editing) {
        await academicService.updateSession(editing.id, values, actor);
        notify.success("Session updated", `${values.name} was saved.`);
      } else {
        await academicService.createSession(values, actor);
        notify.success("Session created", `${values.name} was added.`);
      }
      setFormOpen(false);
    } catch (error) {
      notify.error("Could not save session", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await academicService.removeSession(deleting.id, actor);
      notify.success("Session deleted", `${deleting.name} was removed.`);
      setDeleting(null);
    } catch (error) {
      notify.error("Could not delete session", error instanceof Error ? error.message : undefined);
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<AcademicSession>[] = [
    { key: "name", header: "Session", sortable: true, render: (session) => <span className="text-sm font-medium">{session.name}</span> },
    { key: "startDate", header: "Starts", sortable: true, render: (session) => <span className="text-sm text-muted-foreground">{formatDate(session.startDate)}</span> },
    { key: "endDate", header: "Ends", sortable: true, render: (session) => <span className="text-sm text-muted-foreground">{formatDate(session.endDate)}</span> },
    { key: "semesters", header: "Semesters", render: (session) => <span className="text-sm text-muted-foreground">{db.semesters.filter((s) => s.sessionId === session.id).length}</span> },
    { key: "offerings", header: "Offerings", render: (session) => <span className="text-sm text-muted-foreground">{db.courseOfferings.filter((o) => o.sessionId === session.id).length}</span> },
    { key: "status", header: "Status", render: (session) => <StatusBadge status={session.status} label={PERIOD_STATUS_LABELS[session.status]} /> },
    {
      key: "actions",
      header: "",
      headerClassName: "w-12",
      render: (session) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Row actions">
              <span className="text-lg leading-none">⋯</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(session)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(session)}>
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
        title="Academic sessions"
        description="Define academic years that group semesters and course offerings."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add session
          </Button>
        }
      />

      <Card>
        <TableToolbar
          actions={
            <FilterDropdown label="Status" value={table.filters.status ?? ""} onChange={(v) => table.setFilter("status", v)} options={Object.entries(PERIOD_STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
          }
        >
          <SearchInput value={table.search} onChange={table.setSearch} placeholder="Search sessions" className="w-full sm:max-w-xs" />
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={result.items}
          rowKey={(session) => session.id}
          sortBy={table.sortBy}
          sortDir={table.sortDir}
          onSort={table.toggleSort}
          emptyState={
            <EmptyState
              icon={CalendarRange}
              title="No sessions found"
              description={table.hasActiveFilters ? "Try adjusting your filters." : "Create your first academic session."}
              action={table.hasActiveFilters ? <Button variant="outline" onClick={table.resetFilters}>Clear filters</Button> : <Button onClick={openCreate}>Add session</Button>}
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
        title={editing ? "Edit session" : "Add session"}
        submitLabel={editing ? "Save changes" : "Create session"}
        onSubmit={form.handleSubmit(onSubmit)}
        loading={saving}
      >
        <TextField label="Session name" required placeholder="2026–2027" error={form.formState.errors.name?.message} {...form.register("name")} />
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
        title="Delete session?"
        description={`This will remove ${deleting?.name}. Deletion is blocked while semesters or offerings reference it.`}
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={onDelete}
      />
    </div>
  );
}
