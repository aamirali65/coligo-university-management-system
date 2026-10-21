import { useState } from "react";
import { CalendarDays, Mail, Phone, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
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
import { teacherService } from "@/services/teacherService";
import type { Teacher } from "@/types";
import { formatDate } from "@/lib/format";
import { DESIGNATIONS } from "@/lib/constants";

export function HodTeachersPage() {
  const db = useDatabase();
  const { user } = useAuth();
  const departmentId = user?.departmentId ?? "";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const table = useTableState({ departmentId });
  const data = teacherService.list(db, table.params);

  const designationOptions = DESIGNATIONS.map((designation) => ({ value: designation, label: designation }));
  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];

  const selected = selectedId ? teacherService.byId(db, selectedId) ?? null : null;
  const offerings = selected ? teacherService.offeringsFor(db, selected.id) : [];

  const columns: Column<Teacher>[] = [
    {
      key: "fullName",
      header: "Teacher",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={row.fullName} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{row.employeeNumber}</p>
          </div>
        </div>
      ),
    },
    {
      key: "designation",
      header: "Designation",
      sortable: true,
      render: (row) => <span className="text-sm text-muted-foreground">{row.designation}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      className: "hidden md:table-cell",
      render: (row) => <span className="text-sm text-muted-foreground">{row.email}</span>,
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
      render: (row) => (
        <span className="text-sm font-medium">{teacherService.offeringsFor(db, row.id).length}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department teachers"
        description="Faculty members in your department. Open a row to review their assigned offerings."
      />

      <Card>
        <TableToolbar
          actions={
            <>
              <FilterDropdown
                label="Designation"
                value={table.filters.designation ?? ""}
                onChange={(value) => table.setFilter("designation", value)}
                options={designationOptions}
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
            placeholder="Search name, employee number or email"
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
            <EmptyState icon={Users} title="No teachers found" description="No teachers match the current search and filters." />
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
              <div className="flex items-center gap-3">
                <UserAvatar name={selected.fullName} size="lg" />
                <div>
                  <DialogTitle>{selected.fullName}</DialogTitle>
                  <DialogDescription>{selected.designation}</DialogDescription>
                </div>
                <div className="ml-auto mr-6">
                  <StatusBadge status={selected.status} />
                </div>
              </div>
            </DialogHeader>

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
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Employee number</p>
                <p className="mt-1 text-sm">{selected.employeeNumber}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Hired</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {formatDate(selected.hireDate)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Assigned offerings</p>
              {offerings.length === 0 ? (
                <EmptyState icon={Users} title="No offerings" description="This teacher has no assigned course offerings." />
              ) : (
                offerings.map((offering) => {
                  const course = db.courses.find((c) => c.id === offering.courseId);
                  const semester = db.semesters.find((s) => s.id === offering.semesterId);
                  const enrolled = db.enrollments.filter(
                    (enrollment) => enrollment.offeringId === offering.id && enrollment.status === "active",
                  ).length;
                  return (
                    <div key={offering.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {course?.code} — {course?.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {semester?.name ?? "—"} · Section {offering.section}
                        </p>
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
