import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { DataTable, type Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { FilterDropdown } from "@/components/tables/filter-dropdown";
import { Pagination } from "@/components/tables/pagination";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDatabase } from "@/hooks/useDatabase";
import { useTableState } from "@/hooks/useTableState";
import { auditService } from "@/services/auditService";
import { formatDateTime } from "@/lib/format";
import { AUDIT_ACTION_LABELS } from "@/lib/constants";
import type { AuditLog } from "@/types";

export function AuditLogsPage() {
  const db = useDatabase();
  const table = useTableState();
  const result = auditService.list(db, table.params);

  const columns: Column<AuditLog>[] = [
    {
      key: "actorName",
      header: "Actor",
      render: (log) => (
        <span className="flex items-center gap-2">
          <UserAvatar name={log.actorName} size="sm" />
          <span className="text-sm font-medium">{log.actorName}</span>
        </span>
      ),
    },
    { key: "action", header: "Action", render: (log) => <StatusBadge status={log.action} label={AUDIT_ACTION_LABELS[log.action] ?? log.action} /> },
    { key: "entityType", header: "Entity", render: (log) => <span className="text-sm text-muted-foreground">{log.entityType}</span> },
    { key: "description", header: "Description", render: (log) => <span className="text-sm text-muted-foreground">{log.description}</span> },
    { key: "timestamp", header: "When", sortable: true, render: (log) => <span className="text-sm text-muted-foreground">{formatDateTime(log.timestamp)}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit logs"
        description="A chronological record of every action performed in the system."
      />

      <Card>
        <TableToolbar
          actions={
            <>
              <FilterDropdown label="Action" value={table.filters.action ?? ""} onChange={(v) => table.setFilter("action", v)} options={Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label }))} />
              <FilterDropdown label="Entity" value={table.filters.entityType ?? ""} onChange={(v) => table.setFilter("entityType", v)} options={auditService.entityTypes(db).map((t) => ({ value: t, label: t }))} />
            </>
          }
        >
          <SearchInput value={table.search} onChange={table.setSearch} placeholder="Search by actor, entity or description" className="w-full sm:max-w-xs" />
        </TableToolbar>
        <DataTable
          columns={columns}
          rows={result.items}
          rowKey={(log) => log.id}
          sortBy={table.sortBy}
          sortDir={table.sortDir}
          onSort={table.toggleSort}
          emptyState={
            <EmptyState
              icon={ScrollText}
              title="No audit logs"
              description={table.hasActiveFilters ? "Try adjusting your filters." : "Actions will appear here as they are performed."}
              action={table.hasActiveFilters ? <Button variant="outline" onClick={table.resetFilters}>Clear filters</Button> : undefined}
            />
          }
        />
        <div className="px-4">
          <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} />
        </div>
      </Card>
    </div>
  );
}
