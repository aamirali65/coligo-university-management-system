import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ClipboardList, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDatabase } from "@/hooks/useDatabase";
import { useActor } from "@/hooks/useActor";
import { useTableState } from "@/hooks/useTableState";
import { academicService } from "@/services/academicService";
import { enrollmentService } from "@/services/enrollmentService";
import { notify } from "@/lib/notify";
import { formatDate } from "@/lib/format";
import type { CourseOffering, Enrollment } from "@/types";

const offeringSchema = z.object({
  courseId: z.string().min(1, "Select a course."),
  sessionId: z.string().min(1, "Select a session."),
  semesterId: z.string().min(1, "Select a semester."),
  section: z.string().min(1, "Section is required."),
  teacherIds: z.array(z.string()).min(1, "Assign at least one teacher."),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1."),
  schedule: z.string().optional(),
  room: z.string().optional(),
  status: z.enum(["active", "completed", "inactive"]),
});

type OfferingValues = z.infer<typeof offeringSchema>;

const enrollSchema = z.object({
  studentId: z.string().min(1, "Select a student."),
  offeringId: z.string().min(1, "Select a course offering."),
});

type EnrollValues = z.infer<typeof enrollSchema>;

export function EnrollmentsPage() {
  const db = useDatabase();
  const actor = useActor();

  const offeringTable = useTableState();
  const enrollmentTable = useTableState();

  const [editingOffering, setEditingOffering] = useState<CourseOffering | null>(null);
  const [offeringFormOpen, setOfferingFormOpen] = useState(false);
  const [deletingOffering, setDeletingOffering] = useState<CourseOffering | null>(null);

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [deletingEnrollment, setDeletingEnrollment] = useState<Enrollment | null>(null);

  const [saving, setSaving] = useState(false);

  const offeringForm = useForm<OfferingValues>({
    resolver: zodResolver(offeringSchema),
    defaultValues: {
      courseId: "",
      sessionId: "",
      semesterId: "",
      section: "",
      teacherIds: [],
      capacity: 30,
      schedule: "",
      room: "",
      status: "active",
    },
  });

  const enrollForm = useForm<EnrollValues>({
    resolver: zodResolver(enrollSchema),
    defaultValues: { studentId: "", offeringId: "" },
  });

  const offerings = academicService.offerings(db, offeringTable.params);
  const enrollments = enrollmentService.list(db, enrollmentTable.params);

  const selectedTeachers = offeringForm.watch("teacherIds");
  const toggleTeacher = (id: string) => {
    const next = selectedTeachers.includes(id) ? selectedTeachers.filter((t) => t !== id) : [...selectedTeachers, id];
    offeringForm.setValue("teacherIds", next);
  };

  const openCreateOffering = () => {
    setEditingOffering(null);
    offeringForm.reset({
      courseId: db.courses[0]?.id ?? "",
      sessionId: db.academicSessions[0]?.id ?? "",
      semesterId: academicService.activeSemester(db)?.id ?? db.semesters[0]?.id ?? "",
      section: "",
      teacherIds: [],
      capacity: db.settings.defaultCapacity,
      schedule: "",
      room: "",
      status: "active",
    });
    setOfferingFormOpen(true);
  };

  const openEditOffering = (offering: CourseOffering) => {
    setEditingOffering(offering);
    offeringForm.reset({
      courseId: offering.courseId,
      sessionId: offering.sessionId,
      semesterId: offering.semesterId,
      section: offering.section,
      teacherIds: offering.teacherIds,
      capacity: offering.capacity,
      schedule: offering.schedule,
      room: offering.room,
      status: offering.status,
    });
    setOfferingFormOpen(true);
  };

  const onSubmitOffering = async (values: OfferingValues) => {
    const input = { ...values, schedule: values.schedule ?? "", room: values.room ?? "" };
    setSaving(true);
    try {
      if (editingOffering) {
        await academicService.updateOffering(editingOffering.id, input, actor);
        notify.success("Offering updated", "The course offering was saved.");
      } else {
        await academicService.createOffering(input, actor);
        notify.success("Offering created", "The course offering was added.");
      }
      setOfferingFormOpen(false);
    } catch (error) {
      notify.error("Could not save offering", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const onDeleteOffering = async () => {
    if (!deletingOffering) return;
    setSaving(true);
    try {
      await academicService.removeOffering(deletingOffering.id, actor);
      notify.success("Offering deleted", "The course offering was removed.");
      setDeletingOffering(null);
    } catch (error) {
      notify.error("Could not delete offering", error instanceof Error ? error.message : undefined);
      setDeletingOffering(null);
    } finally {
      setSaving(false);
    }
  };

  const onSubmitEnroll = async (values: EnrollValues) => {
    setSaving(true);
    try {
      await enrollmentService.enroll(values.studentId, values.offeringId, actor);
      notify.success("Student enrolled", "The student was enrolled successfully.");
      setEnrollOpen(false);
      enrollForm.reset({ studentId: "", offeringId: "" });
    } catch (error) {
      notify.error("Could not enroll student", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const dropEnrollment = async (enrollment: Enrollment) => {
    try {
      await enrollmentService.setStatus(enrollment.id, "dropped", actor);
      notify.success("Enrollment dropped", "The enrollment was marked as dropped.");
    } catch (error) {
      notify.error("Could not drop enrollment", error instanceof Error ? error.message : undefined);
    }
  };

  const onDeleteEnrollment = async () => {
    if (!deletingEnrollment) return;
    setSaving(true);
    try {
      await enrollmentService.remove(deletingEnrollment.id, actor);
      notify.success("Enrollment deleted", "The enrollment was removed.");
      setDeletingEnrollment(null);
    } catch (error) {
      notify.error("Could not delete enrollment", error instanceof Error ? error.message : undefined);
      setDeletingEnrollment(null);
    } finally {
      setSaving(false);
    }
  };

  const offeringColumns: Column<CourseOffering>[] = [
    {
      key: "courseId",
      header: "Course",
      render: (offering) => {
        const course = db.courses.find((c) => c.id === offering.courseId);
        return (
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{course?.code ?? "—"}</span>
            <span className="block truncate text-xs text-muted-foreground">{course?.title ?? ""}</span>
          </span>
        );
      },
    },
    { key: "section", header: "Section", render: (offering) => <span className="text-sm text-muted-foreground">{offering.section}</span> },
    { key: "semesterId", header: "Semester", render: (offering) => <span className="text-sm text-muted-foreground">{db.semesters.find((s) => s.id === offering.semesterId)?.name ?? "—"}</span> },
    {
      key: "teacherIds",
      header: "Teachers",
      render: (offering) => (
        <span className="text-sm text-muted-foreground">
          {offering.teacherIds.map((id) => db.teachers.find((t) => t.id === id)?.fullName ?? "").filter(Boolean).join(", ") || "Unassigned"}
        </span>
      ),
    },
    { key: "schedule", header: "Schedule", render: (offering) => <span className="text-sm text-muted-foreground">{offering.schedule || "—"}</span> },
    { key: "enrolled", header: "Enrolled", render: (offering) => <span className="text-sm text-muted-foreground">{academicService.offeringEnrollmentCount(db, offering.id)}/{offering.capacity}</span> },
    { key: "status", header: "Status", render: (offering) => <StatusBadge status={offering.status} /> },
    {
      key: "actions",
      header: "",
      headerClassName: "w-12",
      render: (offering) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Row actions">
              <span className="text-lg leading-none">⋯</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditOffering(offering)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletingOffering(offering)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const enrollmentColumns: Column<Enrollment>[] = [
    {
      key: "studentId",
      header: "Student",
      render: (enrollment) => {
        const student = db.students.find((s) => s.id === enrollment.studentId);
        return (
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{student?.fullName ?? "—"}</span>
            <span className="block truncate text-xs text-muted-foreground">{student?.registrationNumber ?? ""}</span>
          </span>
        );
      },
    },
    {
      key: "offeringId",
      header: "Course offering",
      render: (enrollment) => {
        const offering = db.courseOfferings.find((o) => o.id === enrollment.offeringId);
        const course = offering ? db.courses.find((c) => c.id === offering.courseId) : undefined;
        return (
          <span className="text-sm text-muted-foreground">
            {course?.code ?? "—"} {offering ? `· Section ${offering.section}` : ""}
          </span>
        );
      },
    },
    { key: "enrolledAt", header: "Enrolled", sortable: true, render: (enrollment) => <span className="text-sm text-muted-foreground">{formatDate(enrollment.enrolledAt)}</span> },
    { key: "status", header: "Status", render: (enrollment) => <StatusBadge status={enrollment.status} /> },
    {
      key: "actions",
      header: "",
      headerClassName: "w-12",
      render: (enrollment) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Row actions">
              <span className="text-lg leading-none">⋯</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {enrollment.status === "active" && (
              <DropdownMenuItem onClick={() => dropEnrollment(enrollment)}>
                <Pencil className="h-4 w-4" />
                Drop enrollment
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletingEnrollment(enrollment)}>
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
        title="Offerings & Enrollments"
        description="Offer courses per semester and manage student enrollments."
        actions={
          <Button onClick={openCreateOffering}>
            <Plus className="h-4 w-4" />
            Add offering
          </Button>
        }
      />

      <Tabs defaultValue="offerings">
        <TabsList>
          <TabsTrigger value="offerings">Offerings ({offerings.total})</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments ({enrollments.total})</TabsTrigger>
        </TabsList>

        <TabsContent value="offerings">
          <Card>
            <TableToolbar
              actions={
                <>
                  <FilterDropdown label="Semester" value={offeringTable.filters.semesterId ?? ""} onChange={(v) => offeringTable.setFilter("semesterId", v)} options={db.semesters.map((s) => ({ value: s.id, label: s.name }))} />
                  <FilterDropdown label="Department" value={offeringTable.filters.departmentId ?? ""} onChange={(v) => offeringTable.setFilter("departmentId", v)} options={db.departments.map((d) => ({ value: d.id, label: d.code }))} />
                  <FilterDropdown label="Status" value={offeringTable.filters.status ?? ""} onChange={(v) => offeringTable.setFilter("status", v)} options={[{ value: "active", label: "Active" }, { value: "completed", label: "Completed" }, { value: "inactive", label: "Inactive" }]} />
                </>
              }
            >
              <SearchInput value={offeringTable.search} onChange={offeringTable.setSearch} placeholder="Search by course, section or teacher" className="w-full sm:max-w-xs" />
            </TableToolbar>
            <DataTable
              columns={offeringColumns}
              rows={offerings.items}
              rowKey={(offering) => offering.id}
              emptyState={
                <EmptyState
                  icon={ClipboardList}
                  title="No course offerings"
                  description={offeringTable.hasActiveFilters ? "Try adjusting your filters." : "Create your first course offering."}
                  action={offeringTable.hasActiveFilters ? <Button variant="outline" onClick={offeringTable.resetFilters}>Clear filters</Button> : <Button onClick={openCreateOffering}>Add offering</Button>}
                />
              }
            />
            <div className="px-4">
              <Pagination page={offerings.page} totalPages={offerings.totalPages} total={offerings.total} pageSize={offerings.pageSize} onPageChange={offeringTable.setPage} onPageSizeChange={offeringTable.setPageSize} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="enrollments">
          <Card>
            <TableToolbar
              actions={
                <>
                  <FilterDropdown label="Offering" value={enrollmentTable.filters.offeringId ?? ""} onChange={(v) => enrollmentTable.setFilter("offeringId", v)} options={db.courseOfferings.map((o) => ({ value: o.id, label: `${db.courses.find((c) => c.id === o.courseId)?.code ?? ""} · ${o.section}` }))} />
                  <FilterDropdown label="Status" value={enrollmentTable.filters.status ?? ""} onChange={(v) => enrollmentTable.setFilter("status", v)} options={[{ value: "active", label: "Active" }, { value: "dropped", label: "Dropped" }, { value: "completed", label: "Completed" }]} />
                  <Button onClick={() => { enrollForm.reset({ studentId: "", offeringId: "" }); setEnrollOpen(true); }}>
                    <UserPlus className="h-4 w-4" />
                    Enroll student
                  </Button>
                </>
              }
            >
              <SearchInput value={enrollmentTable.search} onChange={enrollmentTable.setSearch} placeholder="Search enrollments" className="w-full sm:max-w-xs" />
            </TableToolbar>
            <DataTable
              columns={enrollmentColumns}
              rows={enrollments.items}
              rowKey={(enrollment) => enrollment.id}
              emptyState={
                <EmptyState
                  icon={ClipboardList}
                  title="No enrollments"
                  description={enrollmentTable.hasActiveFilters ? "Try adjusting your filters." : "Enroll students into course offerings."}
                  action={enrollmentTable.hasActiveFilters ? <Button variant="outline" onClick={enrollmentTable.resetFilters}>Clear filters</Button> : <Button onClick={() => setEnrollOpen(true)}>Enroll student</Button>}
                />
              }
            />
            <div className="px-4">
              <Pagination page={enrollments.page} totalPages={enrollments.totalPages} total={enrollments.total} pageSize={enrollments.pageSize} onPageChange={enrollmentTable.setPage} onPageSizeChange={enrollmentTable.setPageSize} />
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <FormDialog
        open={offeringFormOpen}
        onOpenChange={setOfferingFormOpen}
        title={editingOffering ? "Edit course offering" : "Add course offering"}
        description="Offerings connect a course to a semester, section and teaching team."
        submitLabel={editingOffering ? "Save changes" : "Create offering"}
        onSubmit={offeringForm.handleSubmit(onSubmitOffering)}
        loading={saving}
        className="max-w-2xl"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="courseId">Course <span className="text-destructive">*</span></label>
            <select id="courseId" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...offeringForm.register("courseId")}>
              <option value="">Select course</option>
              {db.courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
            </select>
            {offeringForm.formState.errors.courseId && <p className="text-xs font-medium text-destructive">{offeringForm.formState.errors.courseId.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="semesterId">Semester <span className="text-destructive">*</span></label>
            <select id="semesterId" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...offeringForm.register("semesterId")}>
              <option value="">Select semester</option>
              {db.semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {offeringForm.formState.errors.semesterId && <p className="text-xs font-medium text-destructive">{offeringForm.formState.errors.semesterId.message}</p>}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="sessionId">Session <span className="text-destructive">*</span></label>
            <select id="sessionId" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...offeringForm.register("sessionId")}>
              <option value="">Select session</option>
              {db.academicSessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <TextField label="Section" required placeholder="A" error={offeringForm.formState.errors.section?.message} {...offeringForm.register("section")} />
          <TextField label="Capacity" type="number" min={1} required error={offeringForm.formState.errors.capacity?.message} {...offeringForm.register("capacity")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Schedule" placeholder="Mon & Wed 09:00–10:30" {...offeringForm.register("schedule")} />
          <TextField label="Room" placeholder="Block A, Room 101" {...offeringForm.register("room")} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Teachers <span className="text-destructive">*</span></label>
          <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-3">
            {db.teachers.map((teacher) => (
              <label key={teacher.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={selectedTeachers.includes(teacher.id)} onCheckedChange={() => toggleTeacher(teacher.id)} />
                <span className="font-medium">{teacher.fullName}</span>
                <span className="text-muted-foreground">{teacher.designation}</span>
              </label>
            ))}
          </div>
          {offeringForm.formState.errors.teacherIds && <p className="text-xs font-medium text-destructive">{offeringForm.formState.errors.teacherIds.message}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="offering-status">Status</label>
          <select id="offering-status" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...offeringForm.register("status")}>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </FormDialog>

      <FormDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        title="Enroll student"
        description="Enroll an active student into a course offering."
        submitLabel="Enroll student"
        onSubmit={enrollForm.handleSubmit(onSubmitEnroll)}
        loading={saving}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="studentId">Student <span className="text-destructive">*</span></label>
          <select id="studentId" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...enrollForm.register("studentId")}>
            <option value="">Select student</option>
            {db.students.filter((s) => s.status === "active").map((s) => <option key={s.id} value={s.id}>{s.registrationNumber} — {s.fullName}</option>)}
          </select>
          {enrollForm.formState.errors.studentId && <p className="text-xs font-medium text-destructive">{enrollForm.formState.errors.studentId.message}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="offeringId">Course offering <span className="text-destructive">*</span></label>
          <select id="offeringId" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...enrollForm.register("offeringId")}>
            <option value="">Select offering</option>
            {db.courseOfferings.map((o) => {
              const course = db.courses.find((c) => c.id === o.courseId);
              return <option key={o.id} value={o.id}>{course?.code} · Section {o.section}</option>;
            })}
          </select>
          {enrollForm.formState.errors.offeringId && <p className="text-xs font-medium text-destructive">{enrollForm.formState.errors.offeringId.message}</p>}
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deletingOffering)}
        onOpenChange={(open) => !open && setDeletingOffering(null)}
        title="Delete course offering?"
        description="This will remove the offering. Deletion is blocked while enrollments or results reference it."
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={onDeleteOffering}
      />

      <ConfirmDialog
        open={Boolean(deletingEnrollment)}
        onOpenChange={(open) => !open && setDeletingEnrollment(null)}
        title="Delete enrollment?"
        description="This will permanently remove the enrollment record."
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={onDeleteEnrollment}
      />
    </div>
  );
}
