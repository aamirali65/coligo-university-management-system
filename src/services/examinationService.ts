import type { Examination, ID, ListParams, Paginated } from "@/types";
import { AppError } from "@/types";
import { commit, delay, getDb, nextId } from "./mock/store";
import { applyList, matches } from "./mock/query";
import type { Actor } from "./types";

export interface ExaminationInput {
  offeringId: ID;
  type: Examination["type"];
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  status: Examination["status"];
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export const examinationService = {
  list(db: ReturnType<typeof getDb>, params?: ListParams): Paginated<Examination> {
    const { search, offeringId, type, status, date } = params?.filters ?? {};
    const q = search ?? params?.search ?? "";
    const filtered = db.examinations.filter((e) => {
      const offering = db.courseOfferings.find((o) => o.id === e.offeringId);
      const course = offering ? db.courses.find((c) => c.id === offering.courseId) : undefined;
      if (!matches(q, [course?.code, course?.title, e.venue])) return false;
      if (offeringId && e.offeringId !== offeringId) return false;
      if (type && e.type !== type) return false;
      if (status && e.status !== status) return false;
      if (date && e.date !== date) return false;
      return true;
    });
    return applyList(filtered, params);
  },

  all(db: ReturnType<typeof getDb>): Examination[] {
    return [...db.examinations].sort((a, b) => a.date.localeCompare(b.date));
  },

  byId(db: ReturnType<typeof getDb>, id: ID): Examination | undefined {
    return db.examinations.find((e) => e.id === id);
  },

  forOffering(db: ReturnType<typeof getDb>, offeringId: ID): Examination[] {
    return db.examinations.filter((e) => e.offeringId === offeringId);
  },

  findConflicts(input: ExaminationInput, ignoreId?: ID): Examination[] {
    const db = getDb();
    return db.examinations.filter((e) => {
      if (e.id === ignoreId) return false;
      if (e.status === "cancelled") return false;
      if (e.date !== input.date) return false;
      if (!overlaps(input.startTime, input.endTime, e.startTime, e.endTime)) return false;
      const sameVenue = e.venue.toLowerCase() === input.venue.trim().toLowerCase();
      const sameOffering = e.offeringId === input.offeringId;
      return sameVenue || sameOffering;
    });
  },

  validate(input: ExaminationInput, ignoreId?: ID) {
    const db = getDb();
    if (!db.courseOfferings.some((o) => o.id === input.offeringId)) {
      throw new AppError("invalid_offering", "Select a valid course offering.");
    }
    if (!input.date) throw new AppError("required", "Examination date is required.");
    if (!input.venue.trim()) throw new AppError("required", "Venue is required.");
    if (input.endTime <= input.startTime) throw new AppError("invalid_time", "End time must be after the start time.");
    const conflicts = this.findConflicts(input, ignoreId);
    if (conflicts.length > 0) {
      throw new AppError("conflict", "This examination conflicts with an existing examination in the same venue or offering.");
    }
  },

  async create(input: ExaminationInput, actor: Actor): Promise<Examination> {
    await delay();
    this.validate(input);
    return commit(
      (draft) => {
        const examination: Examination = {
          id: nextId("exam", draft.examinations.map((e) => e.id)),
          offeringId: input.offeringId,
          type: input.type,
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime,
          venue: input.venue.trim(),
          status: input.status,
        };
        draft.examinations.push(examination);
        return examination;
      },
      { actorId: actor.id, actorName: actor.name, action: "create", entityType: "Examination", entityId: "new", description: `Scheduled a ${input.type} examination on ${input.date}.` },
    );
  },

  async update(id: ID, input: ExaminationInput, actor: Actor): Promise<Examination> {
    await delay();
    const db = getDb();
    if (!db.examinations.some((e) => e.id === id)) throw new AppError("not_found", "Examination not found.");
    this.validate(input, id);
    return commit(
      (draft) => {
        const examination = draft.examinations.find((e) => e.id === id)!;
        examination.offeringId = input.offeringId;
        examination.type = input.type;
        examination.date = input.date;
        examination.startTime = input.startTime;
        examination.endTime = input.endTime;
        examination.venue = input.venue.trim();
        examination.status = input.status;
        return examination;
      },
      { actorId: actor.id, actorName: actor.name, action: "update", entityType: "Examination", entityId: id, description: `Updated an examination scheduled on ${input.date}.` },
    );
  },

  async cancel(id: ID, actor: Actor): Promise<void> {
    await delay();
    const db = getDb();
    const examination = db.examinations.find((e) => e.id === id);
    if (!examination) throw new AppError("not_found", "Examination not found.");
    commit(
      (draft) => {
        const target = draft.examinations.find((e) => e.id === id)!;
        target.status = "cancelled";
      },
      { actorId: actor.id, actorName: actor.name, action: "update", entityType: "Examination", entityId: id, description: `Cancelled an examination scheduled on ${examination.date}.` },
    );
  },
};
