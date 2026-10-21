import type {
  AppNotification,
  AuditLog,
  Database,
  ID,
} from "@/types";
import { buildSeedDatabase } from "@/data/seed";
import { SCHEMA_VERSION } from "@/lib/constants";
import { storage } from "@/lib/storage";

const DB_KEY = "db";

let current: Database = initialise();
const listeners = new Set<() => void>();

function isDatabase(value: unknown): value is Database {
  if (!value || typeof value !== "object") return false;
  const db = value as Partial<Database>;
  if (db.schemaVersion !== SCHEMA_VERSION) return false;
  const collections: (keyof Database)[] = [
    "users",
    "departments",
    "students",
    "teachers",
    "courses",
    "academicSessions",
    "semesters",
    "courseOfferings",
    "enrollments",
    "classSessions",
    "attendance",
    "assessments",
    "marks",
    "examinations",
    "results",
    "timetable",
    "announcements",
    "notifications",
    "auditLogs",
  ];
  return (
    collections.every((key) => Array.isArray(db[key])) &&
    typeof db.settings === "object" &&
    db.settings !== null
  );
}

function initialise(): Database {
  const raw = storage.getRaw(DB_KEY);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isDatabase(parsed)) return parsed;
    } catch {
      /* fall through to reseed */
    }
  }
  const fresh = buildSeedDatabase();
  storage.set(DB_KEY, fresh);
  return fresh;
}

function persist(): void {
  storage.set(DB_KEY, current);
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDb(): Database {
  return current;
}

export function snapshot(): Database {
  return current;
}

/** Simulate a small amount of network latency for async service calls. */
export function delay(ms = 180): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface AuditInput {
  actorId: ID;
  actorName: string;
  action: string;
  entityType: string;
  entityId: ID;
  description: string;
}

function appendAudit(db: Database, input: AuditInput): void {
  const entry: AuditLog = {
    id: nextId("log", db.auditLogs.map((l) => l.id)),
    timestamp: new Date().toISOString(),
    ...input,
  };
  db.auditLogs = [entry, ...db.auditLogs];
}

/**
 * Apply a mutation to a cloned database, persist it and notify subscribers.
 * The mutator runs against a deep clone so a thrown error cannot corrupt the
 * live in-memory state.
 */
export function commit<T>(
  mutator: (draft: Database) => T,
  audit?: AuditInput,
): T {
  const draft = JSON.parse(JSON.stringify(current)) as Database;
  const result = mutator(draft);
  if (audit) appendAudit(draft, audit);
  current = draft;
  persist();
  emit();
  return result;
}

export function resetDatabase(): void {
  current = buildSeedDatabase();
  persist();
  emit();
}

/** Generate a unique, human-readable mock ID with a collection prefix. */
export function nextId(prefix: string, existing: ID[]): ID {
  let max = 0;
  for (const id of existing) {
    const match = id.match(/(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}-${max + 1}`;
}

/** Add a scoped notification for a user. */
export function pushNotification(
  db: Database,
  input: Omit<AppNotification, "id" | "createdAt" | "read">,
): void {
  const notification: AppNotification = {
    ...input,
    id: nextId("not", db.notifications.map((n) => n.id)),
    read: false,
    createdAt: new Date().toISOString(),
  };
  db.notifications = [notification, ...db.notifications];
}
