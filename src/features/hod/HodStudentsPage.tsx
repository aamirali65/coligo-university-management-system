import { useState } from "react";
import { GraduationCap, Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { FilterDropdown } from "@/components/tables/filter-dropdown";
import { Pagination } from "@/components/tables/pagination";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { useTableState } from "@/hooks/useTableState";
import { studentService } from "@/services/studentService";
import type { Student } from "@/types";
import { formatDate, pct } from "@/lib/format";
import { STUDENT_STATUS_LABELS } from "@/lib/constants";

export function HodStudentsPage() {
  const db = useDatabase();
  const { user } = useAuth();
  const departmentId = user?.departmentId ?? "";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const table = useTableState({ departmentId });
  const data = studentService.list(db, table.params);

  const departmentStudents = studentService.byDepartment(db, departmentId);
  const semesterOptions = [...new Set(departmentStudents.map((s) => s.currentSemester))]
    .sort((a, b) => a - b)
    .map((semester) => ({ value: String(semester), label: `Semester ${semester}` }));
  const statusOptions = Object.entries(STUDENT_STATUS_LABELS).map(([value, label]) => ({ value, label }));

  const selected = selectedId ? studentService.byId(db, selectedId) ?? null : null;
  const history = selected ? studentService.academicHistory(db, selected.id) : [];
  const attendance = selected ? studentService.attendanceSummary(db, selected.id) : null;
  const results = selected ? studentService.resultsFor(db, selected.id, true) : [];

  const columns: Column<Student>[] = [
    {
      key: "fullName",
      header: "Student",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={row.fullName} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{row.registrationNumber}</p>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      className: "hidden md:table-cell",
      render: (row) => <span className="text-sm text-muted-foreground">{row.email}</span>,
    },
    {
      key: "currentSemester",
      header: "Semester",
      sortable: true,
      render: (row) => <span className="text-sm">Semester {row.currentSemester}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status} label={STUDENT_STATUS_LABELS[row.status]} />,
    },
    {
      key: "attendance",
      header: "Attendance",
      render: (row) => {
        const summary = studentService.attendanceSummary(db, row.id);
        return <span className="text-sm font-medium">{pct(summary.percentage)}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department students"
        description="Students enrolled in your department. Open a row to review their academic record."
      />

      <Card>
        <TableToolbar
          actions={
            <>
              <FilterDropdown
                label="Semester"
                value={table.filters.semester ?? ""}
                onChange={(value) => table.setFilter("semester", value)}
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
            placeholder="Search name, registration or email"
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
              icon={GraduationCap}
              title="No students found"
              description="No students match the current search and filters."
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
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <UserAvatar name={selected.fullName} size="lg" />
                <div>
                  <DialogTitle>{selected.fullName}</DialogTitle>
                  <DialogDescription>{selected.registrationNumber}</DialogDescription>
                </div>
                <div className="ml-auto mr-6">
                  <StatusBadge status={selected.status} label={STUDENT_STATUS_LABELS[selected.status]} />
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="courses">Courses</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="results">Results</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {selected.email}
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Phone</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {selected.phone || "—"}
                    </p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Current semester</p>
                    <p className="mt-1 text-sm">Semester {selected.currentSemester}</p>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Admitted</p>
                    <p className="mt-1 text-sm">{formatDate(selected.admissionDate)}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="courses" className="space-y-2">
                {history.length === 0 ? (
                  <EmptyState icon={GraduationCap} title="No enrollments" description="This student has no course enrollments." />
                ) : (
                  history.map((entry) => (
                    <div key={entry.enrollment.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {entry.course?.code} — {entry.course?.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{entry.semester?.name ?? "—"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.result?.grade && <StatusBadge status="approved" label={entry.result.grade} />}
                        <StatusBadge status={entry.enrollment.status} />
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="attendance" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Overall attendance</span>
                    <span className="font-semibold">{pct(attendance?.percentage ?? 0)}</span>
                  </div>
                  <Progress value={attendance?.percentage ?? 0} />
                  <p className="text-xs text-muted-foreground">
                    {attendance?.total ?? 0} recorded sessions
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["present", "late", "absent", "excused"] as const).map((status) => (
                    <div key={status} className="rounded-md border border-border p-3">
                      <p className="text-xs capitalize text-muted-foreground">{status}</p>
                      <p className="mt-1 text-lg font-semibold">{attendance?.byStatus[status] ?? 0}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="results" className="space-y-2">
                {results.length === 0 ? (
                  <EmptyState icon={GraduationCap} title="No published results" description="Published results will appear here." />
                ) : (
                  results.map((entry) => (
                    <div key={entry.result.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {entry.course?.code} — {entry.course?.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{entry.semester?.name ?? "—"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{pct(entry.result.totalScore ?? 0)}</span>
                        {entry.result.grade && <StatusBadge status="approved" label={entry.result.grade} />}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
