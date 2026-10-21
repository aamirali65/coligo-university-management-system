import type { ID, ListParams, Paginated, TimetableEntry } from "@/types";
import { AppError } from "@/types";
import { commit, delay, getDb, nextId } from "./mock/store";
import { applyList, matches } from "./mock/query";
import type { Actor } from "./types";

export interface TimetableInput {
  offeringId: ID;
  teacherId: ID;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  section: string;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export const timetableService = {
  list(db: ReturnType<typeof getDb>, params?: ListParams): Paginated<TimetableEntry> {
    const { search, dayOfWeek, offeringId, teacherId, room } = params?.filters ?? {};
    const q = search ?? params?.search ?? "";
    const filtered = db.timetable.filter((entry) => {
      const offering = db.courseOfferings.find((o) => o.id === entry.offeringId);
      const course = offering ? db.courses.find((c) => c.id === offering.courseId) : undefined;
      const teacher = db.teachers.find((t) => t.id === entry.teacherId);
      if (!matches(q, [course?.code, course?.title, entry.room, teacher?.fullName])) return false;
      if (dayOfWeek && String(entry.dayOfWeek) !== dayOfWeek) return false;
      if (offeringId && entry.offeringId !== offeringId) return false;
      if (teacherId && entry.teacherId !== teacherId) return false;
      if (room && entry.room !== room) return false;
      return true;
    });
    return applyList(filtered, params);
  },

  all(db: ReturnType<typeof getDb>): TimetableEntry[] {
    return db.timetable;
  },

  forTeacher(db: ReturnType<typeof getDb>, teacherId: ID): TimetableEntry[] {
    return db.timetable.filter((e) => e.teacherId === teacherId);
  },

  forStudent(db: ReturnType<typeof getDb>, studentId: ID): TimetableEntry[] {
    const offeringIds = new Set(
      db.enrollments.filter((e) => e.studentId === studentId && e.status === "active").map((e) => e.offeringId),
    );
    return db.timetable.filter((e) => offeringIds.has(e.offeringId));
  },

  forOffering(db: ReturnType<typeof getDb>, offeringId: ID): TimetableEntry[] {
    return db.timetable.filter((e) => e.offeringId === offeringId);
  },

  findConflicts(input: TimetableInput, ignoreId?: ID): TimetableEntry[] {
    const db = getDb();
    return db.timetable.filter((e) => {
      if (e.id === ignoreId) return false;
      if (e.dayOfWeek !== input.dayOfWeek) return false;
      if (!overlaps(input.startTime, input.endTime, e.startTime, e.endTime)) return false;
      const sameTeacher = e.teacherId === input.teacherId;
      const sameRoom = e.room.toLowerCase() === input.room.trim().toLowerCase();
      return sameTeacher || sameRoom;
    });
  },

  validate(input: TimetableInput, ignoreId?: ID) {
    const db = getDb();
    if (!db.courseOfferings.some((o) => o.id === input.offeringId)) {
      throw new AppError("invalid_offering", "Select a valid course offering.");
    }
    if (!db.teachers.some((t) => t.id === input.teacherId)) {
      throw new AppError("invalid_teacher", "Select a valid teacher.");
    }
    if (input.dayOfWeek < 1 || input.dayOfWeek > 6) throw new AppError("invalid_day", "Select a valid day.");
    if (!input.room.trim()) throw new AppError("required", "Room is required.");
    if (input.endTime <= input.startTime) throw new AppError("invalid_time", "End time must be after the start time.");
    const conflicts = this.findConflicts(input, ignoreId);
    if (conflicts.length > 0) {
      throw new AppError("conflict", "This entry conflicts with an existing class for the same teacher or room.");
    }
  },

  async create(input: TimetableInput, actor: Actor): Promise<TimetableEntry> {
    await delay();
    this.validate(input);
    return commit(
      (draft) => {
        const entry: TimetableEntry = {
          id: nextId("tt", draft.timetable.map((t) => t.id)),
          ...input,
          room: input.room.trim(),
          section: input.section.trim().toUpperCase(),
        };
        draft.timetable.push(entry);
        return entry;
      },
      { actorId: actor.id, actorName: actor.name, action: "create", entityType: "Timetable", entityId: "new", description: "Added a timetable entry." },
    );
  },

  async update(id: ID, input: TimetableInput, actor: Actor): Promise<TimetableEntry> {
    await delay();
    const db = getDb();
    if (!db.timetable.some((t) => t.id === id)) throw new AppError("not_found", "Timetable entry not found.");
    this.validate(input, id);
    return commit(
      (draft) => {
        const entry = draft.timetable.find((t) => t.id === id)!;
        Object.assign(entry, { ...input, room: input.room.trim(), section: input.section.trim().toUpperCase() });
        return entry;
      },
      { actorId: actor.id, actorName: actor.name, action: "update", entityType: "Timetable", entityId: id, description: "Updated a timetable entry." },
    );
  },

  async remove(id: ID, actor: Actor): Promise<void> {
    await delay();
    if (!getDb().timetable.some((t) => t.id === id)) throw new AppError("not_found", "Timetable entry not found.");
    commit(
      (draft) => {
        draft.timetable = draft.timetable.filter((t) => t.id !== id);
      },
      { actorId: actor.id, actorName: actor.name, action: "delete", entityType: "Timetable", entityId: id, description: "Deleted a timetable entry." },
    );
  },
};
