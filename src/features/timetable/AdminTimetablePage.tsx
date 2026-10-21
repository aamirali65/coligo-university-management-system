import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Library, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { WeeklyTimetable, type TimetableItem } from "@/components/shared/weekly-timetable";
import { DataTable, type Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { FilterDropdown } from "@/components/tables/filter-dropdown";
import { Pagination } from "@/components/tables/pagination";
import { FormDialog } from "@/components/forms/form-dialog";
import { TextField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDatabase } from "@/hooks/useDatabase";
import { useActor } from "@/hooks/useActor";
import { useTableState } from "@/hooks/useTableState";
import { timetableService } from "@/services/timetableService";
import { notify } from "@/lib/notify";
import { formatTime } from "@/lib/format";
import { ACADEMIC_DAYS, DAY_NAMES } from "@/lib/constants";
import type { TimetableEntry } from "@/types";

const schema = z
  .object({
    offeringId: z.string().min(1, "Select a course offering."),
    teacherId: z.string().min(1, "Select a teacher."),
    dayOfWeek: z.coerce.number().int().min(1).max(6),
    startTime: z.string().min(1, "Start time is required."),
    endTime: z.string().min(1, "End time is required."),
    room: z.string().min(1, "Room is required."),
    section: z.string().min(1, "Section is required."),
  })
  .refine((values) => values.endTime > values.startTime, {
    message: "End time must be after the start time.",
    path: ["endTime"],
  });

type FormValues = z.infer<typeof schema>;

export function AdminTimetablePage() {
  const db = useDatabase();
  const actor = useActor();
  const table = useTableState();
  const [editing, setEditing] = useState<TimetableEntry | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<TimetableEntry | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      offeringId: "",
      teacherId: "",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:30",
      room: "",
      section: "",
    },
  });

  const result = timetableService.list(db, table.params);

  const openCreate = () => {
    setEditing(null);
    form.reset({
      offeringId: db.courseOfferings[0]?.id ?? "",
      teacherId: db.teachers[0]?.id ?? "",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "10:30",
      room: "",
      section: "",
    });
    setFormOpen(true);
  };

  const openEdit = (entry: TimetableEntry) => {
    setEditing(entry);
    form.reset({
      offeringId: entry.offeringId,
      teacherId: entry.teacherId,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room,
      section: entry.section,
    });
    setFormOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      if (editing) {
        await timetableService.update(editing.id, values, actor);
        notify.success("Timetable updated", "The entry was saved.");
      } else {
        await timetableService.create(values, actor);
        notify.success("Timetable entry added", "The entry was created.");
      }
      setFormOpen(false);
    } catch (error) {
      notify.error("Could not save entry", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await timetableService.remove(deleting.id, actor);
      notify.success("Entry deleted", "The timetable entry was removed.");
      setDeleting(null);
    } catch (error) {
      notify.error("Could not delete entry", error instanceof Error ? error.message : undefined);
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  };

  const weeklyItems: TimetableItem[] = timetableService.all(db).map((entry) => {
    const offering = db.courseOfferings.find((o) => o.id === entry.offeringId);
    const course = offering ? db.courses.find((c) => c.id === offering.courseId) : undefined;
    const teacher = db.teachers.find((t) => t.id === entry.teacherId);
    return {
      id: entry.id,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room,
      section: entry.section,
      courseCode: course?.code ?? "—",
      courseTitle: course?.title ?? "",
      teacherName: teacher?.fullName,
    };
  });

  const columns: Column<TimetableEntry>[] = [
    { key: "dayOfWeek", header: "Day", sortable: true, render: (entry) => <span className="text-sm font-medium">{DAY_NAMES[entry.dayOfWeek]}</span> },
    { key: "time", header: "Time", render: (entry) => <span className="text-sm text-muted-foreground">{formatTime(entry.startTime)} – {formatTime(entry.endTime)}</span> },
    {
      key: "offeringId",
      header: "Course",
      render: (entry) => {
        const offering = db.courseOfferings.find((o) => o.id === entry.offeringId);
        const course = offering ? db.courses.find((c) => c.id === offering.courseId) : undefined;
        return (
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{course?.code ?? "—"}</span>
            <span className="block truncate text-xs text-muted-foreground">{course?.title ?? ""}</span>
          </span>
        );
      },
    },
    { key: "teacherId", header: "Teacher", render: (entry) => <span className="text-sm text-muted-foreground">{db.teachers.find((t) => t.id === entry.teacherId)?.fullName ?? "—"}</span> },
    { key: "room", header: "Room", render: (entry) => <span className="text-sm text-muted-foreground">{entry.room}</span> },
    { key: "section", header: "Section", render: (entry) => <span className="text-sm text-muted-foreground">{entry.section}</span> },
    {
      key: "actions",
      header: "",
      headerClassName: "w-12",
      render: (entry) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Row actions">
              <span className="text-lg leading-none">⋯</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(entry)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(entry)}>
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
        title="Timetable"
        description="Schedule weekly classes. The system prevents teacher and room conflicts."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add class
          </Button>
        }
      />

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="weekly">Weekly view</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card>
            <TableToolbar
              actions={
                <>
                  <FilterDropdown label="Day" value={table.filters.dayOfWeek ?? ""} onChange={(v) => table.setFilter("dayOfWeek", v)} options={ACADEMIC_DAYS.map((d) => ({ value: String(d), label: DAY_NAMES[d] }))} />
                  <FilterDropdown label="Teacher" value={table.filters.teacherId ?? ""} onChange={(v) => table.setFilter("teacherId", v)} options={db.teachers.map((t) => ({ value: t.id, label: t.fullName }))} />
                  <FilterDropdown label="Room" value={table.filters.room ?? ""} onChange={(v) => table.setFilter("room", v)} options={[...new Set(db.timetable.map((t) => t.room))].map((r) => ({ value: r, label: r }))} />
                </>
              }
            >
              <SearchInput value={table.search} onChange={table.setSearch} placeholder="Search by course, teacher or room" className="w-full sm:max-w-xs" />
            </TableToolbar>
            <DataTable
              columns={columns}
              rows={result.items}
              rowKey={(entry) => entry.id}
              sortBy={table.sortBy}
              sortDir={table.sortDir}
              onSort={table.toggleSort}
              emptyState={
                <EmptyState
                  icon={Library}
                  title="No timetable entries"
                  description={table.hasActiveFilters ? "Try adjusting your filters." : "Schedule your first class."}
                  action={table.hasActiveFilters ? <Button variant="outline" onClick={table.resetFilters}>Clear filters</Button> : <Button onClick={openCreate}>Add class</Button>}
                />
              }
            />
            <div className="px-4">
              <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="weekly">
          <Card className="p-5">
            <WeeklyTimetable items={weeklyItems} />
          </Card>
        </TabsContent>
      </Tabs>

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Edit class" : "Add class"}
        description="Conflicts with the same teacher or room on the same day are blocked."
        submitLabel={editing ? "Save changes" : "Add class"}
        onSubmit={form.handleSubmit(onSubmit)}
        loading={saving}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="offeringId">Course offering <span className="text-destructive">*</span></label>
          <select id="offeringId" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("offeringId")}>
            <option value="">Select offering</option>
            {db.courseOfferings.map((o) => {
              const course = db.courses.find((c) => c.id === o.courseId);
              return <option key={o.id} value={o.id}>{course?.code} · Section {o.section}</option>;
            })}
          </select>
          {form.formState.errors.offeringId && <p className="text-xs font-medium text-destructive">{form.formState.errors.offeringId.message}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="teacherId">Teacher <span className="text-destructive">*</span></label>
            <select id="teacherId" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("teacherId")}>
              <option value="">Select teacher</option>
              {db.teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
            </select>
            {form.formState.errors.teacherId && <p className="text-xs font-medium text-destructive">{form.formState.errors.teacherId.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="dayOfWeek">Day</label>
            <select id="dayOfWeek" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("dayOfWeek")}>
              {ACADEMIC_DAYS.map((d) => <option key={d} value={d}>{DAY_NAMES[d]}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Start time" type="time" required error={form.formState.errors.startTime?.message} {...form.register("startTime")} />
          <TextField label="End time" type="time" required error={form.formState.errors.endTime?.message} {...form.register("endTime")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Room" required placeholder="Block A, Room 101" error={form.formState.errors.room?.message} {...form.register("room")} />
          <TextField label="Section" required placeholder="A" error={form.formState.errors.section?.message} {...form.register("section")} />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete timetable entry?"
        description="This will remove the class from the weekly schedule."
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={onDelete}
      />
    </div>
  );
}
