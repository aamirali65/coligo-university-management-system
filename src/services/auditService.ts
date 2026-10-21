import type { AuditLog, ListParams, Paginated } from "@/types";
import { getDb } from "./mock/store";
import { applyList, matches } from "./mock/query";

export const auditService = {
  list(db: ReturnType<typeof getDb>, params?: ListParams): Paginated<AuditLog> {
    const { search, action, entityType, date } = params?.filters ?? {};
    const q = search ?? params?.search ?? "";
    const filtered = db.auditLogs.filter((log) => {
      if (!matches(q, [log.actorName, log.description, log.entityType, log.entityId])) return false;
      if (action && log.action !== action) return false;
      if (entityType && log.entityType !== entityType) return false;
      if (date && !log.timestamp.startsWith(date)) return false;
      return true;
    });
    return applyList(filtered, params);
  },

  recent(db: ReturnType<typeof getDb>, count = 8): AuditLog[] {
    return [...db.auditLogs]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, count);
  },

  entityTypes(db: ReturnType<typeof getDb>): string[] {
    return [...new Set(db.auditLogs.map((l) => l.entityType))].sort();
  },
};
