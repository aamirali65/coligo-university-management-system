import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Power, Trash2, UserSquare2 } from "lucide-react";
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
import { userService } from "@/services/userService";
import { notify } from "@/lib/notify";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/constants";
import type { Role, User } from "@/types";

const schema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().optional(),
  role: z.enum(["admin", "hod", "teacher", "student", "examination"]),
  departmentId: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type FormValues = z.infer<typeof schema>;

const ROLES: Role[] = ["admin", "hod", "teacher", "student", "examination"];

export function UsersPage() {
  const db = useDatabase();
  const actor = useActor();
  const table = useTableState();
  const [editing, setEditing] = useState<User | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", phone: "", role: "teacher", departmentId: "", status: "active" },
  });

  const result = userService.list(db, table.params);
  const roles = userService.roles(db);

  const openCreate = () => {
    setEditing(null);
    form.reset({ fullName: "", email: "", phone: "", role: "teacher", departmentId: "", status: "active" });
    setFormOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    form.reset({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      departmentId: user.departmentId ?? "",
      status: user.status,
    });
    setFormOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const input = {
      fullName: values.fullName,
      email: values.email,
      phone: values.phone ?? "",
      role: values.role,
      departmentId: values.departmentId || null,
      status: values.status,
    };
    setSaving(true);
    try {
      if (editing) {
        await userService.update(editing.id, input, actor);
        notify.success("User updated", `${values.fullName} was saved.`);
      } else {
        await userService.create(input, actor);
        notify.success("User created", `${values.fullName} was added.`);
      }
      setFormOpen(false);
    } catch (error) {
      notify.error("Could not save user", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user: User) => {
    const next = user.status === "active" ? "inactive" : "active";
    try {
      await userService.setStatus(user.id, next, actor);
      notify.success(`Account ${next === "active" ? "activated" : "deactivated"}`, `${user.fullName} is now ${next}.`);
    } catch (error) {
      notify.error("Could not change status", error instanceof Error ? error.message : undefined);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await userService.remove(deleting.id, actor);
      notify.success("User deleted", `${deleting.fullName} was removed.`);
      setDeleting(null);
    } catch (error) {
      notify.error("Could not delete user", error instanceof Error ? error.message : undefined);
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<User>[] = [
    {
      key: "fullName",
      header: "User",
      sortable: true,
      render: (user) => (
        <span className="flex items-center gap-3">
          <UserAvatar name={user.fullName} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{user.fullName}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
        </span>
      ),
    },
    { key: "role", header: "Role", sortable: true, render: (user) => <span className="text-sm text-muted-foreground">{ROLE_LABELS[user.role]}</span> },
    {
      key: "departmentId",
      header: "Department",
      render: (user) => (
        <span className="text-sm text-muted-foreground">
          {user.departmentId ? db.departments.find((d) => d.id === user.departmentId)?.code ?? "—" : "—"}
        </span>
      ),
    },
    { key: "phone", header: "Phone", render: (user) => <span className="text-sm text-muted-foreground">{user.phone || "—"}</span> },
    { key: "createdAt", header: "Created", sortable: true, render: (user) => <span className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</span> },
    { key: "status", header: "Status", render: (user) => <StatusBadge status={user.status} /> },
    {
      key: "actions",
      header: "",
      headerClassName: "w-12",
      render: (user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Row actions">
              <span className="text-lg leading-none">⋯</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(user)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleStatus(user)}>
              <Power className="h-4 w-4" />
              {user.status === "active" ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(user)}>
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
        title="Users"
        description="Manage application accounts, roles and access."
        actions={
          <Button onClick={openCreate}>
            <UserSquare2 className="h-4 w-4" />
            Add user
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ROLES.map((r) => (
          <Card key={r} className="p-4">
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[r]}</p>
            <p className="mt-1 text-xl font-semibold">{roles[r] ?? 0}</p>
          </Card>
        ))}
      </div>

      <Card>
        <TableToolbar
          actions={
            <>
              <FilterDropdown label="Role" value={table.filters.role ?? ""} onChange={(v) => table.setFilter("role", v)} options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
              <FilterDropdown label="Status" value={table.filters.status ?? ""} onChange={(v) => table.setFilter("status", v)} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
            </>
          }
        >
          <SearchInput value={table.search} onChange={table.setSearch} placeholder="Search by name, email or phone" className="w-full sm:max-w-xs" />
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={result.items}
          rowKey={(user) => user.id}
          sortBy={table.sortBy}
          sortDir={table.sortDir}
          onSort={table.toggleSort}
          emptyState={
            <EmptyState
              icon={UserSquare2}
              title="No users found"
              description={table.hasActiveFilters ? "Try adjusting your search or filters." : "Add your first user to get started."}
              action={table.hasActiveFilters ? <Button variant="outline" onClick={table.resetFilters}>Clear filters</Button> : <Button onClick={openCreate}>Add user</Button>}
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
        title={editing ? "Edit user" : "Add user"}
        description="Accounts are used for demonstration sign-in. Passwords are handled by the backend in production."
        submitLabel={editing ? "Save changes" : "Create user"}
        onSubmit={form.handleSubmit(onSubmit)}
        loading={saving}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Full name" required error={form.formState.errors.fullName?.message} {...form.register("fullName")} />
          <TextField label="Email" type="email" required error={form.formState.errors.email?.message} {...form.register("email")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Phone" placeholder="+92 300 0000000" {...form.register("phone")} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="role">Role</label>
            <select id="role" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("role")}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="departmentId">Department</label>
            <select id="departmentId" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("departmentId")}>
              <option value="">Not applicable</option>
              {db.departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
            </select>
          </div>
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
        title="Delete user?"
        description={`This will permanently remove the account for ${deleting?.fullName}.`}
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={onDelete}
      />
    </div>
  );
}
