import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDatabase } from "@/hooks/useDatabase";
import { useActor } from "@/hooks/useActor";
import { useTableState } from "@/hooks/useTableState";
import { courseService } from "@/services/courseService";
import { notify } from "@/lib/notify";
import { COURSE_LEVELS } from "@/lib/constants";
import type { Course } from "@/types";

const schema = z.object({
  code: z.string().min(2, "Course code is required."),
  title: z.string().min(2, "Course title is required."),
  description: z.string().optional(),
  departmentId: z.string().min(1, "Select a department."),
  creditHours: z.coerce.number().int().min(1, "At least 1 credit hour.").max(12),
  level: z.string().min(1, "Select a level."),
  prerequisiteIds: z.array(z.string()),
  status: z.enum(["active", "inactive"]),
});

type FormValues = z.infer<typeof schema>;

export function CoursesPage() {
  const db = useDatabase();
  const actor = useActor();
  const table = useTableState();
  const [editing, setEditing] = useState<Course | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Course | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      title: "",
      description: "",
      departmentId: "",
      creditHours: 3,
      level: "100",
      prerequisiteIds: [],
      status: "active",
    },
  });

  const result = courseService.list(db, table.params);
  const prerequisites = form.watch("prerequisiteIds");
  const editingId = editing?.id;

  const openCreate = () => {
    setEditing(null);
    form.reset({
      code: "",
      title: "",
      description: "",
      departmentId: "",
      creditHours: 3,
      level: "100",
      prerequisiteIds: [],
      status: "active",
    });
    setFormOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditing(course);
    form.reset({
      code: course.code,
      title: course.title,
      description: course.description,
      departmentId: course.departmentId,
      creditHours: course.creditHours,
      level: course.level,
      prerequisiteIds: course.prerequisiteIds,
      status: course.status,
    });
    setFormOpen(true);
  };

  const togglePrerequisite = (id: string) => {
    const next = prerequisites.includes(id) ? prerequisites.filter((p) => p !== id) : [...prerequisites, id];
    form.setValue("prerequisiteIds", next);
  };

  const onSubmit = async (values: FormValues) => {
    const input = {
      code: values.code,
      title: values.title,
      description: values.description ?? "",
      departmentId: values.departmentId,
      creditHours: values.creditHours,
      level: values.level,
      prerequisiteIds: values.prerequisiteIds,
      status: values.status,
    };
    setSaving(true);
    try {
      if (editing) {
        await courseService.update(editing.id, input, actor);
        notify.success("Course updated", `${values.code} was saved.`);
      } else {
        await courseService.create(input, actor);
        notify.success("Course created", `${values.code} was added.`);
      }
      setFormOpen(false);
    } catch (error) {
      notify.error("Could not save course", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await courseService.remove(deleting.id, actor);
      notify.success("Course deleted", `${deleting.code} was removed.`);
      setDeleting(null);
    } catch (error) {
      notify.error("Could not delete course", error instanceof Error ? error.message : undefined);
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Course>[] = [
    {
      key: "code",
      header: "Course",
      sortable: true,
      render: (course) => (
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{course.code}</span>
          <span className="block truncate text-xs text-muted-foreground">{course.title}</span>
        </span>
      ),
    },
    {
      key: "departmentId",
      header: "Department",
      render: (course) => <span className="text-sm text-muted-foreground">{db.departments.find((d) => d.id === course.departmentId)?.code ?? "—"}</span>,
    },
    { key: "creditHours", header: "Credits", sortable: true, render: (course) => <span className="text-sm text-muted-foreground">{course.creditHours}</span> },
    { key: "level", header: "Level", render: (course) => <span className="text-sm text-muted-foreground">{course.level}</span> },
    { key: "prereqs", header: "Prerequisites", render: (course) => <span className="text-sm text-muted-foreground">{courseService.prerequisites(db, course).map((c) => c.code).join(", ") || "None"}</span> },
    { key: "enrolled", header: "Enrolled", render: (course) => <span className="text-sm text-muted-foreground">{courseService.enrollmentCount(db, course.id)}</span> },
    { key: "status", header: "Status", render: (course) => <StatusBadge status={course.status} /> },
    {
      key: "actions",
      header: "",
      headerClassName: "w-12",
      render: (course) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Row actions">
              <span className="text-lg leading-none">⋯</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(course)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(course)}>
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
        title="Courses"
        description="Manage the course catalogue, credit hours and prerequisites."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add course
          </Button>
        }
      />

      <Card>
        <TableToolbar
          actions={
            <>
              <FilterDropdown label="Department" value={table.filters.departmentId ?? ""} onChange={(v) => table.setFilter("departmentId", v)} options={db.departments.map((d) => ({ value: d.id, label: d.code }))} />
              <FilterDropdown label="Level" value={table.filters.level ?? ""} onChange={(v) => table.setFilter("level", v)} options={COURSE_LEVELS.map((l) => ({ value: l, label: l }))} />
              <FilterDropdown label="Status" value={table.filters.status ?? ""} onChange={(v) => table.setFilter("status", v)} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
            </>
          }
        >
          <SearchInput value={table.search} onChange={table.setSearch} placeholder="Search by code or title" className="w-full sm:max-w-xs" />
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={result.items}
          rowKey={(course) => course.id}
          sortBy={table.sortBy}
          sortDir={table.sortDir}
          onSort={table.toggleSort}
          emptyState={
            <EmptyState
              icon={BookOpen}
              title="No courses found"
              description={table.hasActiveFilters ? "Try adjusting your search or filters." : "Add your first course to get started."}
              action={table.hasActiveFilters ? <Button variant="outline" onClick={table.resetFilters}>Clear filters</Button> : <Button onClick={openCreate}>Add course</Button>}
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
        title={editing ? "Edit course" : "Add course"}
        description="Courses can be offered in multiple semesters and sections."
        submitLabel={editing ? "Save changes" : "Create course"}
        onSubmit={form.handleSubmit(onSubmit)}
        loading={saving}
        className="max-w-2xl"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Course code" required placeholder="CS101" error={form.formState.errors.code?.message} {...form.register("code")} />
          <TextField label="Title" required placeholder="Introduction to Programming" error={form.formState.errors.title?.message} {...form.register("title")} />
        </div>
        <TextareaField label="Description" placeholder="Short course description" {...form.register("description")} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="departmentId">Department <span className="text-destructive">*</span></label>
            <select id="departmentId" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("departmentId")}>
              <option value="">Select department</option>
              {db.departments.map((d) => <option key={d.id} value={d.id}>{d.code}</option>)}
            </select>
            {form.formState.errors.departmentId && <p className="text-xs font-medium text-destructive">{form.formState.errors.departmentId.message}</p>}
          </div>
          <TextField label="Credit hours" type="number" min={1} max={12} required error={form.formState.errors.creditHours?.message} {...form.register("creditHours")} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="level">Level</label>
            <select id="level" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("level")}>
              {COURSE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Prerequisites</label>
          <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-3">
            {db.courses.filter((c) => c.id !== editingId).length === 0 ? (
              <p className="text-xs text-muted-foreground">No other courses available.</p>
            ) : (
              db.courses
                .filter((c) => c.id !== editingId)
                .map((course) => (
                  <label key={course.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={prerequisites.includes(course.id)} onCheckedChange={() => togglePrerequisite(course.id)} />
                    <span className="font-medium">{course.code}</span>
                    <span className="text-muted-foreground">{course.title}</span>
                  </label>
                ))
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="status">Status</label>
          <select id="status" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("status")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete course?"
        description={`This will permanently remove ${deleting?.code} — ${deleting?.title}. Deletion is blocked if the course has offerings or enrollments.`}
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={onDelete}
      />
    </div>
  );
}
