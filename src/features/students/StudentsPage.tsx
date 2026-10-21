import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, GraduationCap, Pencil, Plus, Power, Trash2 } from "lucide-react";
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
import { studentService } from "@/services/studentService";
import { notify } from "@/lib/notify";
import { formatDate } from "@/lib/format";
import { STUDENT_STATUS_LABELS } from "@/lib/constants";
import type { Student } from "@/types";

const schema = z.object({
  registrationNumber: z.string().min(2, "Registration number is required."),
  fullName: z.string().min(2, "Full name is required."),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().optional(),
  departmentId: z.string().min(1, "Select a department."),
  admissionDate: z.string().min(1, "Admission date is required."),
  currentSemester: z.coerce.number().int().min(1).max(12),
  status: z.enum(["active", "inactive", "graduated", "suspended"]),
});

type FormValues = z.infer<typeof schema>;

export function StudentsPage() {
  const db = useDatabase();
  const actor = useActor();
  const table = useTableState();
  const [editing, setEditing] = useState<Student | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      registrationNumber: "",
      fullName: "",
      email: "",
      phone: "",
      departmentId: "",
      admissionDate: new Date().toISOString().slice(0, 10),
      currentSemester: 1,
      status: "active",
    },
  });

  const result = studentService.list(db, table.params);

  const openCreate = () => {
    setEditing(null);
    form.reset({
      registrationNumber: "",
      fullName: "",
      email: "",
      phone: "",
      departmentId: "",
      admissionDate: new Date().toISOString().slice(0, 10),
      currentSemester: 1,
      status: "active",
    });
    setFormOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditing(student);
    form.reset({
      registrationNumber: student.registrationNumber,
      fullName: student.fullName,
      email: student.email,
      phone: student.phone,
      departmentId: student.departmentId,
      admissionDate: student.admissionDate,
      currentSemester: student.currentSemester,
      status: student.status,
    });
    setFormOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const input = {
      registrationNumber: values.registrationNumber,
      fullName: values.fullName,
      email: values.email,
      phone: values.phone ?? "",
      departmentId: values.departmentId,
      admissionDate: values.admissionDate,
      currentSemester: values.currentSemester,
      status: values.status,
    };
    setSaving(true);
    try {
      if (editing) {
        await studentService.update(editing.id, input, actor);
        notify.success("Student updated", `${values.fullName} was saved.`);
      } else {
        await studentService.create(input, actor);
        notify.success("Student created", `${values.fullName} was added.`);
      }
      setFormOpen(false);
    } catch (error) {
      notify.error("Could not save student", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (student: Student) => {
    const next = student.status === "active" ? "inactive" : "active";
    try {
      await studentService.setStatus(student.id, next, actor);
      notify.success("Status updated", `${student.fullName} is now ${next}.`);
    } catch (error) {
      notify.error("Could not change status", error instanceof Error ? error.message : undefined);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await studentService.remove(deleting.id, actor);
      notify.success("Student deleted", `${deleting.fullName} was removed.`);
      setDeleting(null);
    } catch (error) {
      notify.error("Could not delete student", error instanceof Error ? error.message : undefined);
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Student>[] = [
    {
      key: "fullName",
      header: "Student",
      sortable: true,
      render: (student) => (
        <span className="flex items-center gap-3">
          <UserAvatar name={student.fullName} size="sm" />
          <span className="min-w-0">
            <Link to={`/admin/students/${student.id}`} className="block truncate text-sm font-medium hover:text-primary">
              {student.fullName}
            </Link>
            <span className="block truncate text-xs text-muted-foreground">{student.email}</span>
          </span>
        </span>
      ),
    },
    { key: "registrationNumber", header: "Registration", sortable: true, render: (student) => <span className="text-sm font-medium">{student.registrationNumber}</span> },
    {
      key: "departmentId",
      header: "Department",
      render: (student) => <span className="text-sm text-muted-foreground">{db.departments.find((d) => d.id === student.departmentId)?.code ?? "—"}</span>,
    },
    { key: "currentSemester", header: "Semester", sortable: true, render: (student) => <span className="text-sm text-muted-foreground">Semester {student.currentSemester}</span> },
    { key: "admissionDate", header: "Admitted", sortable: true, render: (student) => <span className="text-sm text-muted-foreground">{formatDate(student.admissionDate)}</span> },
    { key: "status", header: "Status", render: (student) => <StatusBadge status={student.status} label={STUDENT_STATUS_LABELS[student.status]} /> },
    {
      key: "actions",
      header: "",
      headerClassName: "w-12",
      render: (student) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Row actions">
              <span className="text-lg leading-none">⋯</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/admin/students/${student.id}`}>
                <Eye className="h-4 w-4" />
                View profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(student)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleStatus(student)}>
              <Power className="h-4 w-4" />
              {student.status === "active" ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(student)}>
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
        title="Students"
        description="Manage student records, enrollment status and academic placement."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add student
          </Button>
        }
      />

      <Card>
        <TableToolbar
          actions={
            <>
              <FilterDropdown label="Department" value={table.filters.departmentId ?? ""} onChange={(v) => table.setFilter("departmentId", v)} options={db.departments.map((d) => ({ value: d.id, label: d.code }))} />
              <FilterDropdown label="Status" value={table.filters.status ?? ""} onChange={(v) => table.setFilter("status", v)} options={Object.entries(STUDENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
            </>
          }
        >
          <SearchInput value={table.search} onChange={table.setSearch} placeholder="Search by name, registration or email" className="w-full sm:max-w-xs" />
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={result.items}
          rowKey={(student) => student.id}
          sortBy={table.sortBy}
          sortDir={table.sortDir}
          onSort={table.toggleSort}
          emptyState={
            <EmptyState
              icon={GraduationCap}
              title="No students found"
              description={table.hasActiveFilters ? "Try adjusting your search or filters." : "Add your first student to get started."}
              action={table.hasActiveFilters ? <Button variant="outline" onClick={table.resetFilters}>Clear filters</Button> : <Button onClick={openCreate}>Add student</Button>}
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
        title={editing ? "Edit student" : "Add student"}
        description="Student records feed enrollments, attendance and results."
        submitLabel={editing ? "Save changes" : "Create student"}
        onSubmit={form.handleSubmit(onSubmit)}
        loading={saving}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Full name" required error={form.formState.errors.fullName?.message} {...form.register("fullName")} />
          <TextField label="Registration number" required error={form.formState.errors.registrationNumber?.message} {...form.register("registrationNumber")} />
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
          <TextField label="Admission date" type="date" required error={form.formState.errors.admissionDate?.message} {...form.register("admissionDate")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Current semester" type="number" min={1} max={12} required error={form.formState.errors.currentSemester?.message} {...form.register("currentSemester")} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="status">Status</label>
            <select id="status" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("status")}>
              {Object.entries(STUDENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete student?"
        description={`This will permanently remove ${deleting?.fullName} and their record.`}
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={onDelete}
      />
    </div>
  );
}
