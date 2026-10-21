import { useState } from "react";
import { CalendarDays, ClipboardList, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { WeeklyTimetable, type TimetableItem } from "@/components/shared/weekly-timetable";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { FilterDropdown } from "@/components/tables/filter-dropdown";
import { Pagination } from "@/components/tables/pagination";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { useTableState } from "@/hooks/useTableState";
import { academicService } from "@/services/academicService";
import { timetableService } from "@/services/timetableService";
import type { CourseOffering, Student } from "@/types";

export function HodCourseOfferingsPage() {
  const db = useDatabase();
  const { user } = useAuth();
  const departmentId = user?.departmentId ?? "";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const table = useTableState({ departmentId });
  const data = academicService.offerings(db, table.params);

  const semesterOptions = academicService
    .allSemesters(db)
    .map((semester) => ({ value: semester.id, label: semester.name }));
  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "inactive", label: "Inactive" },
  ];

  const selected = selectedId ? academicService.offeringById(db, selectedId) ?? null : null;
  const selectedCourse = selected ? db.courses.find((c) => c.id === selected.courseId) : undefined;
  const enrolledStudents = selected
    ? db.enrollments
        .filter((enrollment) => enrollment.offeringId === selected.id && enrollment.status === "active")
        .map((enrollment) => db.students.find((student) => student.id === enrollment.studentId))
        .filter((student): student is Student => Boolean(student))
    : [];
  const timetableItems: TimetableItem[] = selected
    ? timetableService.forOffering(db, selected.id).map((entry) => {
        const course = db.courses.find((c) => c.id === selected.courseId);
        const teacher = db.teachers.find((t) => t.id === entry.teacherId);
        return {
          id: entry.id,
          dayOfWeek: entry.dayOfWeek,
          startTime: entry.startTime,
          endTime: entry.endTime,
          room: entry.room,
          section: entry.section,
          courseCode: course?.code ?? "",
          courseTitle: course?.title ?? "",
          teacherName: teacher?.fullName,
        };
      })
    : [];

  const columns: Column<CourseOffering>[] = [
    {
      key: "course",
      header: "Course",
      render: (row) => {
        const course = db.courses.find((c) => c.id === row.courseId);
        return (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{course?.title ?? row.courseId}</p>
            <p className="truncate text-xs text-muted-foreground">{course?.code}</p>
          </div>
        );
      },
    },
    {
      key: "semester",
      header: "Semester",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {db.semesters.find((s) => s.id === row.semesterId)?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "section",
      header: "Section",
      sortable: true,
      render: (row) => <span className="text-sm">Section {row.section}</span>,
    },
    {
      key: "teachers",
      header: "Teachers",
      className: "hidden lg:table-cell",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.teacherIds
            .map((id) => db.teachers.find((t) => t.id === id)?.fullName ?? "")
            .filter(Boolean)
            .join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "enrollment",
      header: "Enrollment",
      render: (row) => (
        <span className="text-sm font-medium">
          {academicService.offeringEnrollmentCount(db, row.id)}/{row.capacity}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Course offerings"
        description="Read-only view of offerings delivered by your department. Open a row to review enrollments and the timetable."
      />

      <Card>
        <TableToolbar
          actions={
            <>
              <FilterDropdown
                label="Semester"
                value={table.filters.semesterId ?? ""}
                onChange={(value) => table.setFilter("semesterId", value)}
                options={semesterOptions}
              />
              <FilterDropdown
                label="Status"
                value={table.filters.status ?? ""}
                onChange={(value) => table.setFilter("status", value)}
                options={statusOptions}
              />
            </>
          }
        >
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search course, section or teacher"
            className="w-full sm:max-w-xs"
          />
        </TableToolbar>

        <DataTable
          columns={columns}
          rows={data.items}
          rowKey={(row) => row.id}
          sortBy={table.sortBy}
          sortDir={table.sortDir}
          onSort={table.toggleSort}
          onRowClick={(row) => setSelectedId(row.id)}
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title="No offerings found"
              description="No course offerings match the current search and filters."
            />
          }
        />

        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          pageSize={table.pageSize}
          onPageChange={table.setPage}
          onPageSizeChange={table.setPageSize}
        />
      </Card>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        {selected && (
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {selectedCourse?.code} — {selectedCourse?.title}
              </DialogTitle>
              <DialogDescription>
                Section {selected.section} · {db.semesters.find((s) => s.id === selected.semesterId)?.name ?? "—"} ·{" "}
                {selected.room}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Enrolled students</p>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {enrolledStudents.length}
                  </span>
                </div>
                {enrolledStudents.length === 0 ? (
                  <EmptyState icon={Users} title="No students" description="No active enrollments for this offering." />
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto scrollbar-thin pr-1">
                    {enrolledStudents.map((student) => (
                      <div key={student.id} className="flex items-center gap-3 rounded-md border border-border p-2">
                        <UserAvatar name={student.fullName} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{student.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">{student.registrationNumber}</p>
                        </div>
                        <StatusBadge status={student.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Weekly timetable
                </p>
                {timetableItems.length === 0 ? (
                  <EmptyState icon={CalendarDays} title="No scheduled classes" description="No timetable entries for this offering." />
                ) : (
                  <WeeklyTimetable items={timetableItems} showTeacher />
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
