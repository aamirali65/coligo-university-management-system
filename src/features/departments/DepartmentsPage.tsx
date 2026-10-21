import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Eye, Pencil, Plus, Trash2 } from "lucide-react";
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
import { TextField, TextareaField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDatabase } from "@/hooks/useDatabase";
import { useActor } from "@/hooks/useActor";
import { useTableState } from "@/hooks/useTableState";
import { departmentService } from "@/services/departmentService";
import { userService } from "@/services/userService";
import { notify } from "@/lib/notify";
import { formatDate } from "@/lib/format";
import type { Department } from "@/types";

const schema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters."),
  name: z.string().min(2, "Department name is required."),
  description: z.string().optional(),
  hodId: z.string().optional(),
  officeLocation: z.string().optional(),
  contactEmail: z.string().email("Enter a valid email.").or(z.literal("")),
  status: z.enum(["active", "inactive"]),
});

type FormValues = z.infer<typeof schema>;

export function DepartmentsPage() {
  const db = useDatabase();
  const actor = useActor();
  const table = useTableState();
  const [editing, setEditing] = useState<Department | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: "", name: "", description: "", hodId: "", officeLocation: "", contactEmail: "", status: "active" },
  });

  const result = departmentService.list(db, table.params);
  const hodOptions = userService
    .list(db, { pageSize: 999 })
    .items.filter((u) => u.role === "hod" || u.role === "teacher");

  const openCreate = () => {
    setEditing(null);
    form.reset({ code: "", name: "", description: "", hodId: "", officeLocation: "", contactEmail: "", status: "active" });
    setFormOpen(true);
  };

  const openEdit = (department: Department) => {
    setEditing(department);
    form.reset({
      code: department.code,
      name: department.name,
      description: department.description,
      hodId: department.hodId ?? "",
      officeLocation: department.officeLocation,
      contactEmail: department.contactEmail,
      status: department.status,
    });
    setFormOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const input = {
      code: values.code,
      name: values.name,
      description: values.description ?? "",
      hodId: values.hodId || null,
      officeLocation: values.officeLocation ?? "",
      contactEmail: values.contactEmail ?? "",
      status: values.status,
    };
    setSaving(true);
    try {
      if (editing) {
        await departmentService.update(editing.id, input, actor);
        notify.success("Department updated", `${values.name} was saved successfully.`);
      } else {
        await departmentService.create(input, actor);
        notify.success("Department created", `${values.name} was added successfully.`);
      }
      setFormOpen(false);
    } catch (error) {
      notify.error("Could not save department", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await departmentService.remove(deleting.id, actor);
      notify.success("Department deleted", `${deleting.name} was removed.`);
      setDeleting(null);
    } catch (error) {
      notify.error("Could not delete department", error instanceof Error ? error.message : undefined);
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Department>[] = [
    {
      key: "name",
      header: "Department",
      sortable: true,
      render: (department) => (
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
            {department.code}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{department.name}</p>
            <p className="truncate text-xs text-muted-foreground">{department.officeLocation || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "hodId",
      header: "Head of Department",
      render: (department) => {
        const hod = department.hodId ? db.users.find((u) => u.id === department.hodId) : undefined;
        return hod ? (
          <span className="flex items-center gap-2">
            <UserAvatar name={hod.fullName} size="sm" />
            <span className="text-sm">{hod.fullName}</span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        );
      },
    },
    {
      key: "counts",
      header: "Records",
      render: (department) => {
        const counts = departmentService.counts(db, department.id);
        return (
          <span className="text-xs text-muted-foreground">
            {counts.students} students · {counts.teachers} teachers · {counts.courses} courses
          </span>
        );
      },
    },
    { key: "contactEmail", header: "Contact", render: (department) => <span className="text-sm text-muted-foreground">{department.contactEmail || "—"}</span> },
    { key: "createdAt", header: "Created", sortable: true, render: (department) => <span className="text-sm text-muted-foreground">{formatDate(department.createdAt)}</span> },
    { key: "status", header: "Status", render: (department) => <StatusBadge status={department.status} /> },
    {
      key: "actions",
      header: "",
      headerClassName: "w-12",
      render: (department) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Row actions">
              <span className="text-lg leading-none">⋯</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/admin/departments/${department.id}`}>
                <Eye className="h-4 w-4" />
                View details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(department)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(department)}>
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
        title="Departments"
        description="Create and manage academic departments across the university."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add department
          </Button>
        }
      />

      <Card>
        <TableToolbar
          actions={
            <FilterDropdown
              label="Status"
              value={table.filters.status ?? ""}
              onChange={(value) => table.setFilter("status", value)}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          }
        >
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search by name, code or email"
            className="w-full sm:max-w-xs"
          />
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={result.items}
          rowKey={(department) => department.id}
          sortBy={table.sortBy}
          sortDir={table.sortDir}
          onSort={table.toggleSort}
          emptyState={
            <EmptyState
              icon={Building2}
              title="No departments found"
              description={table.hasActiveFilters ? "Try adjusting your search or filters." : "Create your first department to get started."}
              action={
                table.hasActiveFilters ? (
                  <Button variant="outline" onClick={table.resetFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Button onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Add department
                  </Button>
                )
              }
            />
          }
        />
        <div className="px-4">
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            pageSize={result.pageSize}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
          />
        </div>
      </Card>

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit department" : "Add department"}
        description="Departments group students, teachers and courses."
        submitLabel={editing ? "Save changes" : "Create department"}
        onSubmit={form.handleSubmit(onSubmit)}
        loading={saving}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Code" required placeholder="CS" error={form.formState.errors.code?.message} {...form.register("code")} />
          <TextField label="Name" required placeholder="Computer Science" error={form.formState.errors.name?.message} {...form.register("name")} />
        </div>
        <TextareaField label="Description" placeholder="Short description of the department" {...form.register("description")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Office location" placeholder="Block A, Room 214" {...form.register("officeLocation")} />
          <TextField label="Contact email" type="email" placeholder="cs@coligo.demo" error={form.formState.errors.contactEmail?.message} {...form.register("contactEmail")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="hodId">Head of Department</label>
            <select
              id="hodId"
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...form.register("hodId")}
            >
              <option value="">Unassigned</option>
              {hodOptions.map((user) => (
                <option key={user.id} value={user.id}>{user.fullName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="status">Status</label>
            <select
              id="status"
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...form.register("status")}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete department?"
        description={`This will permanently remove ${deleting?.name}. Deletion is blocked if the department still has students, teachers or courses.`}
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={onDelete}
      />
    </div>
  );
}
