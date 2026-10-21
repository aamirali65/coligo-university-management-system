import { useState } from "react";
import { GraduationCap, Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { DataTable, type Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { FilterDropdown } from "@/components/tables/filter-dropdown";
import { Pagination } from "@/components/tables/pagination";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { teacherService } from "@/services/teacherService";
import { enrollmentService } from "@/services/enrollmentService";
import { attendanceService } from "@/services/attendanceService";
import { computeTotal } from "@/services/resultService";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { formatDate, pct } from "@/lib/format";
import type { CourseOffering, Student } from "@/types";

interface TeacherStudentRow {
  student: Student;
  offerings: CourseOffering[];
  department: string;
  attendance: number;
}

export function TeacherStudentsPage() {
  const db = useDatabase();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [offeringId, setOfferingId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = useState<TeacherStudentRow | null>(null);

  const teacher = user ? teacherService.byUserId(db, user.id) : undefined;
  const offerings = teacher ? teacherService.offeringsFor(db, teacher.id) : [];
  const teacherOfferingIds = new Set(offerings.map((offering) => offering.id));

  const byStudent = new Map<string, { student: Student; offerings: CourseOffering[] }>();
  for (const offering of offerings) {
    for (const student of enrollmentService.studentsForOffering(db, offering.id)) {
      const entry = byStudent.get(student.id) ?? { student, offerings: [] };
      entry.offerings.push(offering);
      byStudent.set(student.id, entry);
    }
  }

  const scopeIds = offeringId ? new Set([offeringId]) : teacherOfferingIds;

  const rows: TeacherStudentRow[] = [...byStudent.values()].map(({ student, offerings: studentOfferings }) => {
    const department = db.departments.find((item) => item.id === student.departmentId);
    const records = db.attendance.filter(
      (record) => record.studentId === student.id && scopeIds.has(record.offeringId),
    );
    const attended = records.filter(
      (record) => record.status === "present" || record.status === "late",
    ).length;
    const attendance = records.length === 0 ? 0 : Math.round((attended / records.length) * 1000) / 10;
    return {
      student,
      offerings: studentOfferings,
      department: department?.code ?? "—",
      attendance,
    };
  });

  const filtered = rows.filter((row) => {
    if (offeringId && !row.offerings.some((offering) => offering.id === offeringId)) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const department = db.departments.find((item) => item.id === row.student.departmentId);
      const haystack = [
        row.student.fullName,
        row.student.registrationNumber,
        row.student.email,
        row.department,
        department?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const offeringOptions = offerings.map((offering) => {
    const course = db.courses.find((item) => item.id === offering.courseId);
    return { value: offering.id, label: `${course?.code ?? offering.id}-${offering.section}` };
  });

  const columns: Column<TeacherStudentRow>[] = [
    {
      key: "name",
      header: "Student",
      render: (row) => (
        <div className="flex items-center gap-2">
          <UserAvatar name={row.student.fullName} size="sm" />
          <span className="font-medium">{row.student.fullName}</span>
        </div>
      ),
    },
    { key: "registration", header: "Reg. no", render: (row) => row.student.registrationNumber },
    { key: "department", header: "Department", render: (row) => row.department },
    {
      key: "offerings",
      header: "Offerings",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.offerings.map((offering) => {
            const course = db.courses.find((item) => item.id === offering.courseId);
            return (
              <Badge key={offering.id} variant="outline">
                {course?.code ?? offering.id}-{offering.section}
              </Badge>
            );
          })}
        </div>
      ),
    },
    {
      key: "attendance",
      header: "Attendance",
      render: (row) => (
        <span className={row.attendance >= 75 ? "font-medium text-success" : "font-medium text-warning"}>
          {pct(row.attendance)}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.student.status} /> },
  ];

  const dialogSummary = selected ? attendanceService.studentSummary(db, selected.student.id) : null;
  const dialogDepartment = selected
    ? db.departments.find((item) => item.id === selected.student.departmentId)
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Students"
        description="Students enrolled across all of your course offerings."
      />

      <Card>
        <TableToolbar
          actions={
            <span className="text-xs text-muted-foreground">
              {total} {total === 1 ? "student" : "students"}
            </span>
          }
        >
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search students…"
            className="sm:w-64"
          />
          <FilterDropdown
            label="Offering"
            value={offeringId}
            onChange={(value) => {
              setOfferingId(value);
              setPage(1);
            }}
            options={offeringOptions}
            allLabel="All"
          />
        </TableToolbar>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            rows={paged}
            rowKey={(row) => row.student.id}
            onRowClick={(row) => setSelected(row)}
            emptyState={
              <EmptyState
                icon={GraduationCap}
                title="No students found"
                description="Adjust your search or filters, or enroll students into your offerings."
              />
            }
          />
        </CardContent>
        <div className="px-4 pb-4">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <UserAvatar name={selected.student.fullName} size="lg" />
                  <div className="min-w-0 space-y-1">
                    <DialogTitle className="truncate">{selected.student.fullName}</DialogTitle>
                    <DialogDescription className="truncate">
                      {selected.student.registrationNumber} · {dialogDepartment?.name ?? "—"}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="flex items-center gap-1.5 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {selected.student.email}
                  </p>
                </div>
                <div className="space-y-1 rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="flex items-center gap-1.5 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {selected.student.phone || "—"}
                  </p>
                </div>
                <div className="space-y-1 rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Current semester</p>
                  <p className="text-sm">Semester {selected.student.currentSemester}</p>
                </div>
                <div className="space-y-1 rounded-md border border-border p-3">
                  <p className="text-xs text-muted-foreground">Admitted</p>
                  <p className="text-sm">{formatDate(selected.student.admissionDate)}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-semibold">Attendance</p>
                {dialogSummary && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <div className="rounded-md border border-border p-2 text-center">
                      <p className="text-[11px] text-muted-foreground">Rate</p>
                      <p className="text-sm font-semibold">{pct(dialogSummary.percentage)}</p>
                    </div>
                    <div className="rounded-md border border-border p-2 text-center">
                      <p className="text-[11px] text-muted-foreground">Present</p>
                      <p className="text-sm font-semibold">{dialogSummary.present}</p>
                    </div>
                    <div className="rounded-md border border-border p-2 text-center">
                      <p className="text-[11px] text-muted-foreground">Late</p>
                      <p className="text-sm font-semibold">{dialogSummary.late}</p>
                    </div>
                    <div className="rounded-md border border-border p-2 text-center">
                      <p className="text-[11px] text-muted-foreground">Absent</p>
                      <p className="text-sm font-semibold">{dialogSummary.absent}</p>
                    </div>
                    <div className="rounded-md border border-border p-2 text-center">
                      <p className="text-[11px] text-muted-foreground">Excused</p>
                      <p className="text-sm font-semibold">{dialogSummary.excused}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Results in your offerings</p>
                {selected.offerings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No offerings.</p>
                ) : (
                  <div className="divide-y divide-border rounded-md border border-border">
                    {selected.offerings.map((offering) => {
                      const course = db.courses.find((item) => item.id === offering.courseId);
                      const computed = computeTotal(db, offering.id, selected.student.id);
                      return (
                        <div key={offering.id} className="flex items-center justify-between gap-3 px-3 py-2">
                          <span className="truncate text-sm">
                            {course?.code ?? offering.id}-{offering.section}
                          </span>
                          <span className="shrink-0 text-sm text-muted-foreground">
                            {computed.total === null
                              ? "No marks"
                              : `${computed.total}% · ${computed.grade ?? "—"}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
