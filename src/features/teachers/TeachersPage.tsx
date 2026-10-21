import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, Pencil, Plus, Power, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
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
import { teacherService } from "@/services/teacherService";
import { notify } from "@/lib/notify";
import { formatDate } from "@/lib/format";
import { DESIGNATIONS } from "@/lib/constants";
import type { Teacher } from "@/types";

const schema = z.object({
  employeeNumber: z.string().min(2, "Employee number is required."),
  fullName: z.string().min(2, "Full name is required."),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().optional(),
  departmentId: z.string().min(1, "Select a department."),
  designation: z.string().min(1, "Select a designation."),
  hireDate: z.string().min(1, "Hire date is required."),
  status: z.enum(["active", "inactive"]),
});

type FormValues = z.infer<typeof schema>;

export function TeachersPage() {
  const db = useDatabase();
  const actor = useActor();
  const table = useTableState();
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Teacher | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeNumber: "",
      fullName: "",
      email: "",
      phone: "",
      departmentId: "",
      designation: DESIGNATIONS[0],
      hireDate: new Date().toISOString().slice(0, 10),
      status: "active",
    },
  });

  const result = teacherService.list(db, table.params);

  const openCreate = () => {
    setEditing(null);
    form.reset({
      employeeNumber: "",
      fullName: "",
      email: "",
      phone: "",
      departmentId: "",
      designation: DESIGNATIONS[0],
      hireDate: new Date().toISOString().slice(0, 10),
      status: "active",
    });
    setFormOpen(true);
  };

  const openEdit = (teacher: Teacher) => {
    setEditing(teacher);
    form.reset({
      employeeNumber: teacher.employeeNumber,
      fullName: teacher.fullName,
      email: teacher.email,
      phone: teacher.phone,
      departmentId: teacher.departmentId,
      designation: teacher.designation,
      hireDate: teacher.hireDate,
      status: teacher.status,
    });
    setFormOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const input = {
      employeeNumber: values.employeeNumber,
      fullName: values.fullName,
      email: values.email,
      phone: values.phone ?? "",
      departmentId: values.departmentId,
      designation: values.designation,
      hireDate: values.hireDate,
      status: values.status,
    };
    setSaving(true);
    try {
      if (editing) {
        await teacherService.update(editing.id, input, actor);
        notify.success("Teacher updated", `${values.fullName} was saved.`);
      } else {
        await teacherService.create(input, actor);
        notify.success("Teacher created", `${values.fullName} was added.`);
      }
      setFormOpen(false);
    } catch (error) {
      notify.error("Could not save teacher", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (teacher: Teacher) => {
    const next = teacher.status === "active" ? "inactive" : "active";
    try {
      await teacherService.setStatus(teacher.id, next, actor);
      notify.success("Status updated", `${teacher.fullName} is now ${next}.`);
    } catch (error) {
      notify.error("Could not change status", error instanceof Error ? error.message : undefined);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await teacherService.remove(deleting.id, actor);
      notify.success("Teacher deleted", `${deleting.fullName} was removed.`);
      setDeleting(null);
    } catch (error) {
      notify.error("Could not delete teacher", error instanceof Error ? error.message : undefined);
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Teacher>[] = [
    {
      key: "fullName",
      header: "Teacher",
      sortable: true,
      render: (teacher) => (
        <span className="flex items-center gap-3">
          <UserAvatar name={teacher.fullName} size="sm" />
          <span className="min-w-0">
            <Link to={`/admin/teachers/${teacher.id}`} className="block truncate text-sm font-medium hover:text-primary">
              {teacher.fullName}
            </Link>
            <span className="block truncate text-xs text-muted-foreground">{teacher.email}</span>
          </span>
        </span>
      ),
    },
    { key: "employeeNumber", header: "Employee no.", sortable: true, render: (teacher) => <span className="text-sm font-medium">{teacher.employeeNumber}</span> },
    {
      key: "departmentId",
      header: "Department",
      render: (teacher) => <span className="text-sm text-muted-foreground">{db.departments.find((d) => d.id === teacher.departmentId)?.code ?? "—"}</span>,
    },
    { key: "designation", header: "Designation", render: (teacher) => <span className="text-sm text-muted-foreground">{teacher.designation}</span> },
    { key: "offerings", header: "Offerings", render: (teacher) => <span className="text-sm text-muted-foreground">{teacherService.offeringsFor(db, teacher.id).length}</span> },
    { key: "hireDate", header: "Hired", sortable: true, render: (teacher) => <span className="text-sm text-muted-foreground">{formatDate(teacher.hireDate)}</span> },
    { key: "status", header: "Status", render: (teacher) => <StatusBadge status={teacher.status} /> },
    {
      key: "actions",
      header: "",
      headerClassName: "w-12",
      render: (teacher) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Row actions">
              <span className="text-lg leading-none">⋯</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/admin/teachers/${teacher.id}`}>
                <Eye className="h-4 w-4" />
                View profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(teacher)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleStatus(teacher)}>
              <Power className="h-4 w-4" />
              {teacher.status === "active" ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(teacher)}>
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
        title="Teachers"
        description="Manage faculty records, designations and course assignments."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add teacher
          </Button>
        }
      />

      <Card>
        <TableToolbar
          actions={
            <>
              <FilterDropdown label="Department" value={table.filters.departmentId ?? ""} onChange={(v) => table.setFilter("departmentId", v)} options={db.departments.map((d) => ({ value: d.id, label: d.code }))} />
              <FilterDropdown label="Designation" value={table.filters.designation ?? ""} onChange={(v) => table.setFilter("designation", v)} options={DESIGNATIONS.map((d) => ({ value: d, label: d }))} />
              <FilterDropdown label="Status" value={table.filters.status ?? ""} onChange={(v) => table.setFilter("status", v)} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
            </>
          }
        >
          <SearchInput value={table.search} onChange={table.setSearch} placeholder="Search by name, employee no. or email" className="w-full sm:max-w-xs" />
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={result.items}
          rowKey={(teacher) => teacher.id}
          sortBy={table.sortBy}
          sortDir={table.sortDir}
          onSort={table.toggleSort}
          emptyState={
            <EmptyState
              icon={Users}
              title="No teachers found"
              description={table.hasActiveFilters ? "Try adjusting your search or filters." : "Add your first teacher to get started."}
              action={table.hasActiveFilters ? <Button variant="outline" onClick={table.resetFilters}>Clear filters</Button> : <Button onClick={openCreate}>Add teacher</Button>}
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
        title={editing ? "Edit teacher" : "Add teacher"}
        description="Teacher records link to course offerings and the timetable."
        submitLabel={editing ? "Save changes" : "Create teacher"}
        onSubmit={form.handleSubmit(onSubmit)}
        loading={saving}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Full name" required error={form.formState.errors.fullName?.message} {...form.register("fullName")} />
          <TextField label="Employee number" required error={form.formState.errors.employeeNumber?.message} {...form.register("employeeNumber")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Email" type="email" required error={form.formState.errors.email?.message} {...form.register("email")} />
          <TextField label="Phone" placeholder="+92 300 0000000" {...form.register("phone")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="departmentId">Department <span className="text-destructive">*</span></label>
            <select id="departmentId" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("departmentId")}>
              <option value="">Select department</option>
              {db.departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
            </select>
            {form.formState.errors.departmentId && <p className="text-xs font-medium text-destructive">{form.formState.errors.departmentId.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="designation">Designation</label>
            <select id="designation" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("designation")}>
              {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Hire date" type="date" required error={form.formState.errors.hireDate?.message} {...form.register("hireDate")} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="status">Status</label>
            <select id="status" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("status")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete teacher?"
        description={`This will remove ${deleting?.fullName}, unassign them from offerings and clear their timetable entries.`}
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={onDelete}
      />
    </div>
  );
}
