import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
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
import { TextField, TextareaField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { useActor } from "@/hooks/useActor";
import { useTableState } from "@/hooks/useTableState";
import { announcementService } from "@/services/announcementService";
import { notify } from "@/lib/notify";
import { formatDate, fromNow } from "@/lib/format";
import { AUDIENCE_LABELS } from "@/lib/constants";
import type { Announcement } from "@/types";

const schema = z.object({
  title: z.string().min(3, "Title is required."),
  content: z.string().min(5, "Content is required."),
  audience: z.enum(["university", "department", "teachers", "students", "examination_staff"]),
  departmentId: z.string().optional(),
  expiresAt: z.string().optional(),
  status: z.enum(["published", "draft", "archived"]),
});

type FormValues = z.infer<typeof schema>;

export function AnnouncementsPage() {
  const db = useDatabase();
  const { user, role } = useAuth();
  const actor = useActor();
  const table = useTableState();
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);

  const isAdmin = role === "admin";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      content: "",
      audience: "university",
      departmentId: "",
      expiresAt: "",
      status: "published",
    },
  });

  const audience = form.watch("audience");
  const result = announcementService.list(db, table.params);
  const visible = announcementService.visibleFor(db, user);

  const openCreate = () => {
    setEditing(null);
    form.reset({
      title: "",
      content: "",
      audience: "university",
      departmentId: user?.departmentId ?? "",
      expiresAt: "",
      status: "published",
    });
    setFormOpen(true);
  };

  const openEdit = (announcement: Announcement) => {
    setEditing(announcement);
    form.reset({
      title: announcement.title,
      content: announcement.content,
      audience: announcement.audience,
      departmentId: announcement.departmentId ?? "",
      expiresAt: announcement.expiresAt ?? "",
      status: announcement.status,
    });
    setFormOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const input = {
      title: values.title,
      content: values.content,
      audience: values.audience,
      departmentId: values.audience === "department" ? values.departmentId || null : null,
      expiresAt: values.expiresAt || null,
      status: values.status,
    };
    setSaving(true);
    try {
      if (editing) {
        await announcementService.update(editing.id, input, actor);
        notify.success("Announcement updated", "The announcement was saved.");
      } else {
        await announcementService.create(input, actor);
        notify.success("Announcement created", "The announcement was published.");
      }
      setFormOpen(false);
    } catch (error) {
      notify.error("Could not save announcement", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await announcementService.remove(deleting.id, actor);
      notify.success("Announcement deleted", "The announcement was removed.");
      setDeleting(null);
    } catch (error) {
      notify.error("Could not delete announcement", error instanceof Error ? error.message : undefined);
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  };

  const markRead = async (announcement: Announcement) => {
    if (!user) return;
    try {
      await announcementService.markRead(announcement.id, user.id);
    } catch {
      notify.error("Could not mark as read");
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Announcements" description="Updates shared with you based on your role and department." />
        {visible.length === 0 ? (
          <Card>
            <EmptyState icon={Megaphone} title="No announcements" description="There are no announcements for you right now." />
          </Card>
        ) : (
          <div className="space-y-4">
            {visible.map((announcement) => {
              const isUnread = user ? !announcement.readBy.includes(user.id) : false;
              const author = db.users.find((u) => u.id === announcement.authorId);
              return (
                <Card key={announcement.id}>
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle>{announcement.title}</CardTitle>
                        {isUnread && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {AUDIENCE_LABELS[announcement.audience]} · {author?.fullName ?? "Administration"} · {fromNow(announcement.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={announcement.audience} label={AUDIENCE_LABELS[announcement.audience]} />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="whitespace-pre-line text-sm text-muted-foreground">{announcement.content}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {announcement.expiresAt ? `Expires ${formatDate(announcement.expiresAt)}` : "No expiry"}
                      </span>
                      {isUnread && (
                        <Button variant="outline" size="sm" onClick={() => markRead(announcement)}>
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const columns: Column<Announcement>[] = [
    {
      key: "title",
      header: "Announcement",
      sortable: true,
      render: (announcement) => (
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{announcement.title}</span>
          <span className="block truncate text-xs text-muted-foreground">{announcement.content}</span>
        </span>
      ),
    },
    { key: "audience", header: "Audience", render: (announcement) => <StatusBadge status={announcement.audience} label={AUDIENCE_LABELS[announcement.audience]} /> },
    { key: "departmentId", header: "Department", render: (announcement) => <span className="text-sm text-muted-foreground">{announcement.departmentId ? db.departments.find((d) => d.id === announcement.departmentId)?.code ?? "—" : "—"}</span> },
    { key: "createdAt", header: "Created", sortable: true, render: (announcement) => <span className="text-sm text-muted-foreground">{formatDate(announcement.createdAt)}</span> },
    { key: "expiresAt", header: "Expires", render: (announcement) => <span className="text-sm text-muted-foreground">{announcement.expiresAt ? formatDate(announcement.expiresAt) : "—"}</span> },
    { key: "status", header: "Status", render: (announcement) => <StatusBadge status={announcement.status} /> },
    {
      key: "actions",
      header: "",
      headerClassName: "w-12",
      render: (announcement) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Row actions">
              <span className="text-lg leading-none">⋯</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(announcement)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(announcement)}>
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
        title="Announcements"
        description="Publish announcements to the university, departments or specific audiences."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New announcement
          </Button>
        }
      />

      <Card>
        <TableToolbar
          actions={
            <>
              <FilterDropdown label="Audience" value={table.filters.audience ?? ""} onChange={(v) => table.setFilter("audience", v)} options={Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({ value, label }))} />
              <FilterDropdown label="Status" value={table.filters.status ?? ""} onChange={(v) => table.setFilter("status", v)} options={[{ value: "published", label: "Published" }, { value: "draft", label: "Draft" }, { value: "archived", label: "Archived" }]} />
              <FilterDropdown label="Department" value={table.filters.departmentId ?? ""} onChange={(v) => table.setFilter("departmentId", v)} options={db.departments.map((d) => ({ value: d.id, label: d.code }))} />
            </>
          }
        >
          <SearchInput value={table.search} onChange={table.setSearch} placeholder="Search announcements" className="w-full sm:max-w-xs" />
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={result.items}
          rowKey={(announcement) => announcement.id}
          sortBy={table.sortBy}
          sortDir={table.sortDir}
          onSort={table.toggleSort}
          emptyState={
            <EmptyState
              icon={Megaphone}
              title="No announcements"
              description={table.hasActiveFilters ? "Try adjusting your filters." : "Create your first announcement."}
              action={table.hasActiveFilters ? <Button variant="outline" onClick={table.resetFilters}>Clear filters</Button> : <Button onClick={openCreate}>New announcement</Button>}
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
        title={editing ? "Edit announcement" : "New announcement"}
        description="Published announcements appear to the selected audience immediately."
        submitLabel={editing ? "Save changes" : "Publish"}
        onSubmit={form.handleSubmit(onSubmit)}
        loading={saving}
        className="max-w-2xl"
      >
        <TextField label="Title" required error={form.formState.errors.title?.message} {...form.register("title")} />
        <TextareaField label="Content" required rows={5} error={form.formState.errors.content?.message} {...form.register("content")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="audience">Audience</label>
            <select id="audience" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("audience")}>
              {Object.entries(AUDIENCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="status">Status</label>
            <select id="status" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("status")}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {audience === "department" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="departmentId">Department</label>
              <select id="departmentId" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("departmentId")}>
                <option value="">Select department</option>
                {db.departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
              </select>
            </div>
          )}
          <TextField label="Expires on" type="date" hint="Optional" {...form.register("expiresAt")} />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete announcement?"
        description="This will permanently remove the announcement."
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={onDelete}
      />
    </div>
  );
}
