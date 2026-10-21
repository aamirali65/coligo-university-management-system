import type {
  AttendanceRecord,
  AttendanceStatus,
  ClassSession,
  ID,
} from "@/types";
import { AppError } from "@/types";
import { commit, delay, getDb, nextId } from "./mock/store";
import type { Actor } from "./types";

export interface AttendanceEntry {
  studentId: ID;
  status: AttendanceStatus;
}

export interface SessionInput {
  offeringId: ID;
  date: string;
  startTime: string;
  endTime: string;
  topic: string;
}

export const attendanceService = {
  sessionsForOffering(db: ReturnType<typeof getDb>, offeringId: ID): ClassSession[] {
    return db.classSessions
      .filter((s) => s.offeringId === offeringId)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  sessionById(db: ReturnType<typeof getDb>, id: ID): ClassSession | undefined {
    return db.classSessions.find((s) => s.id === id);
  },

  recordsForSession(db: ReturnType<typeof getDb>, sessionId: ID): AttendanceRecord[] {
    return db.attendance.filter((a) => a.classSessionId === sessionId);
  },

  offeringSummary(db: ReturnType<typeof getDb>, offeringId: ID) {
    const records = db.attendance.filter((a) => a.offeringId === offeringId);
    const present = records.filter((r) => r.status === "present").length;
    const late = records.filter((r) => r.status === "late").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const excused = records.filter((r) => r.status === "excused").length;
    const total = records.length;
    return {
      total,
      present,
      late,
      absent,
      excused,
      percentage: total === 0 ? 0 : Math.round(((present + late) / total) * 1000) / 10,
    };
  },

  studentSummary(db: ReturnType<typeof getDb>, studentId: ID, offeringId?: ID) {
    const records = db.attendance.filter(
      (a) => a.studentId === studentId && (!offeringId || a.offeringId === offeringId),
    );
    const present = records.filter((r) => r.status === "present").length;
    const late = records.filter((r) => r.status === "late").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const excused = records.filter((r) => r.status === "excused").length;
    const total = records.length;
    return {
      total,
      present,
      late,
      absent,
      excused,
      percentage: total === 0 ? 0 : Math.round(((present + late) / total) * 1000) / 10,
    };
  },

  async createSession(input: SessionInput, actor: Actor): Promise<ClassSession> {
    await delay();
    const db = getDb();
    if (!db.courseOfferings.some((o) => o.id === input.offeringId)) {
      throw new AppError("invalid_offering", "Select a valid course offering.");
    }
    if (!input.date) throw new AppError("required", "Class date is required.");
    if (input.endTime <= input.startTime) throw new AppError("invalid_time", "End time must be after the start time.");
    return commit(
      (draft) => {
        const session: ClassSession = {
          id: nextId("cls", draft.classSessions.map((s) => s.id)),
          offeringId: input.offeringId,
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime,
          topic: input.topic.trim() || "Class session",
          status: "scheduled",
        };
        draft.classSessions.push(session);
        return session;
      },
      { actorId: actor.id, actorName: actor.name, action: "create", entityType: "ClassSession", entityId: "new", description: `Created a class session on ${input.date}.` },
    );
  },

  /**
   * Save attendance for a class session. Existing records for the same student
   * and session are updated rather than duplicated, so a session can only ever
   * have one record per student.
   */
  async save(
    sessionId: ID,
    entries: AttendanceEntry[],
    finalize: boolean,
    actor: Actor,
  ): Promise<ClassSession> {
    await delay();
    const db = getDb();
    const session = db.classSessions.find((s) => s.id === sessionId);
    if (!session) throw new AppError("not_found", "Class session not found.");
    if (session.status === "finalized") {
      throw new AppError("finalized", "This attendance record has been finalized and is locked.");
    }
    if (entries.length === 0) throw new AppError("empty", "No students to save.");

    return commit(
      (draft) => {
        const target = draft.classSessions.find((s) => s.id === sessionId)!;
        const now = new Date().toISOString();
        for (const entry of entries) {
          const existing = draft.attendance.find(
            (a) => a.classSessionId === sessionId && a.studentId === entry.studentId,
          );
          if (existing) {
            existing.status = entry.status;
            existing.markedAt = now;
            existing.markedById = actor.id;
          } else {
            draft.attendance.push({
              id: nextId("att", draft.attendance.map((a) => a.id)),
              classSessionId: sessionId,
              studentId: entry.studentId,
              offeringId: target.offeringId,
              status: entry.status,
              markedById: actor.id,
              markedAt: now,
            });
          }
        }
        if (finalize) target.status = "finalized";
        return target;
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "update",
        entityType: "Attendance",
        entityId: sessionId,
        description: `${finalize ? "Finalized" : "Saved"} attendance for class session on ${session.date}.`,
      },
    );
  },

  async finalize(sessionId: ID, actor: Actor): Promise<void> {
    await delay();
    const db = getDb();
    const session = db.classSessions.find((s) => s.id === sessionId);
    if (!session) throw new AppError("not_found", "Class session not found.");
    if (db.attendance.every((a) => a.classSessionId !== sessionId)) {
      throw new AppError("empty", "Mark attendance before finalizing this session.");
    }
    commit(
      (draft) => {
        const target = draft.classSessions.find((s) => s.id === sessionId)!;
        target.status = "finalized";
      },
      { actorId: actor.id, actorName: actor.name, action: "update", entityType: "Attendance", entityId: sessionId, description: `Finalized attendance for ${session.date}.` },
    );
  },
};
