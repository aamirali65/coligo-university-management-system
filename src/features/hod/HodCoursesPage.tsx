import { useState } from "react";
import { BookOpen, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
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
import { courseService } from "@/services/courseService";
import type { Course } from "@/types";

export function HodCoursesPage() {
  const db = useDatabase();
  const { user } = useAuth();
  const departmentId = user?.departmentId ?? "";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const table = useTableState({ departmentId });
  const data = courseService.list(db, table.params);

  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  const selected = selectedId ? courseService.byId(db, selectedId) ?? null : null;
  const prerequisites = selected ? courseService.prerequisites(db, selected) : [];
  const offerings = selected ? courseService.offeringsFor(db, selected.id) : [];

  const columns: Column<Course>[] = [
    {
      key: "code",
      header: "Code",
      sortable: true,
      render: (row) => <span className="text-sm font-semibold">{row.code}</span>,
    },
    {
      key: "title",
      header: "Course",
      sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.title}</p>
          <p className="truncate text-xs text-muted-foreground md:hidden">{row.code}</p>
        </div>
      ),
    },
    {
      key: "creditHours",
      header: "Credits",
      sortable: true,
      render: (row) => <span className="text-sm">{row.creditHours}</span>,
    },
    {
      key: "level",
      header: "Level",
      sortable: true,
      render: (row) => <span className="text-sm text-muted-foreground">Level {row.level}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "offerings",
      header: "Offerings",
      render: (row) => <span className="text-sm font-medium">{courseService.offeringsFor(db, row.id).length}</span>,
    },
    {
      key: "enrolled",
      header: "Enrolled",
      render: (row) => <span className="text-sm font-medium">{courseService.enrollmentCount(db, row.id)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department courses"
        description="Courses owned by your department. Open a row to review prerequisites and offerings."
      />

      <Card>
        <TableToolbar
          actions={
            <FilterDropdown
              label="Status"
              value={table.filters.status ?? ""}
              onChange={(value) => table.setFilter("status", value)}
              options={statusOptions}
            />
          }
        >
          <SearchInput
            value={table.search}
            onChange={table.setSearch}
            placeholder="Search code or title"
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
            <EmptyState icon={BookOpen} title="No courses found" description="No courses match the current search and filters." />
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selected.code} — {selected.title}
              </DialogTitle>
              <DialogDescription>{selected.description || "No description provided."}</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Credits</p>
                <p className="mt-1 text-sm font-medium">{selected.creditHours}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Level</p>
                <p className="mt-1 text-sm font-medium">{selected.level}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                <p className="mt-1">
                  <StatusBadge status={selected.status} />
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Prerequisites</p>
              {prerequisites.length === 0 ? (
                <p className="text-sm text-muted-foreground">No prerequisites.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {prerequisites.map((course) => (
                    <span key={course.id} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      {course.code} — {course.title}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Offerings</p>
              {offerings.length === 0 ? (
                <EmptyState icon={GraduationCap} title="No offerings" description="This course has not been offered yet." />
              ) : (
                offerings.map((offering) => {
                  const semester = db.semesters.find((s) => s.id === offering.semesterId);
                  const enrolled = db.enrollments.filter(
                    (enrollment) => enrollment.offeringId === offering.id && enrollment.status === "active",
                  ).length;
                  return (
                    <div key={offering.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{semester?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">Section {offering.section} · {offering.room}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {enrolled}/{offering.capacity}
                        </span>
                        <StatusBadge status={offering.status} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
