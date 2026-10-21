import type {
  AcademicSession,
  CourseOffering,
  ID,
  ListParams,
  Paginated,
  Semester,
} from "@/types";
import { AppError } from "@/types";
import { commit, delay, getDb, nextId } from "./mock/store";
import { applyList, matches } from "./mock/query";
import type { Actor } from "./types";

export interface SessionInput {
  name: string;
  startDate: string;
  endDate: string;
  status: AcademicSession["status"];
}

export interface SemesterInput {
  name: string;
  sessionId: ID;
  startDate: string;
  endDate: string;
  status: Semester["status"];
}

export interface OfferingInput {
  courseId: ID;
  sessionId: ID;
  semesterId: ID;
  section: string;
  teacherIds: ID[];
  capacity: number;
  schedule: string;
  room: string;
  status: CourseOffering["status"];
}

export const academicService = {
  /* ------------------------------ Sessions ------------------------------ */
  sessions(db: ReturnType<typeof getDb>, params?: ListParams): Paginated<AcademicSession> {
    const { search, status } = params?.filters ?? {};
    const q = search ?? params?.search ?? "";
    const filtered = db.academicSessions.filter((s) => {
      if (!matches(q, [s.name])) return false;
      if (status && s.status !== status) return false;
      return true;
    });
    return applyList(filtered, params);
  },

  allSessions(db: ReturnType<typeof getDb>): AcademicSession[] {
    return [...db.academicSessions].sort((a, b) => b.startDate.localeCompare(a.startDate));
  },

  async createSession(input: SessionInput, actor: Actor): Promise<AcademicSession> {
    await delay();
    if (!input.name.trim()) throw new AppError("required", "Session name is required.");
    if (input.endDate <= input.startDate) {
      throw new AppError("invalid_dates", "End date must be after the start date.");
    }
    return commit(
      (draft) => {
        const session: AcademicSession = {
          id: nextId("sess", draft.academicSessions.map((s) => s.id)),
          name: input.name.trim(),
          startDate: input.startDate,
          endDate: input.endDate,
          status: input.status,
        };
        draft.academicSessions.push(session);
        return session;
      },
      { actorId: actor.id, actorName: actor.name, action: "create", entityType: "AcademicSession", entityId: "new", description: `Created academic session ${input.name}.` },
    );
  },

  async updateSession(id: ID, input: SessionInput, actor: Actor): Promise<AcademicSession> {
    await delay();
    const db = getDb();
    if (!db.academicSessions.some((s) => s.id === id)) throw new AppError("not_found", "Session not found.");
    if (input.endDate <= input.startDate) throw new AppError("invalid_dates", "End date must be after the start date.");
    return commit(
      (draft) => {
        const session = draft.academicSessions.find((s) => s.id === id)!;
        Object.assign(session, {
          name: input.name.trim(),
          startDate: input.startDate,
          endDate: input.endDate,
          status: input.status,
        });
        return session;
      },
      { actorId: actor.id, actorName: actor.name, action: "update", entityType: "AcademicSession", entityId: id, description: `Updated academic session ${input.name}.` },
    );
  },

  async removeSession(id: ID, actor: Actor): Promise<void> {
    await delay();
    const db = getDb();
    const linked = db.semesters.some((s) => s.sessionId === id);
    if (linked) throw new AppError("has_relations", "This session has semesters. Remove them first.");
    commit(
      (draft) => {
        draft.academicSessions = draft.academicSessions.filter((s) => s.id !== id);
      },
      { actorId: actor.id, actorName: actor.name, action: "delete", entityType: "AcademicSession", entityId: id, description: "Deleted an academic session." },
    );
  },

  /* ------------------------------ Semesters ----------------------------- */
  semesters(db: ReturnType<typeof getDb>, params?: ListParams): Paginated<Semester> {
    const { search, status, sessionId } = params?.filters ?? {};
    const q = search ?? params?.search ?? "";
    const filtered = db.semesters.filter((s) => {
      if (!matches(q, [s.name])) return false;
      if (status && s.status !== status) return false;
      if (sessionId && s.sessionId !== sessionId) return false;
      return true;
    });
    return applyList(filtered, params);
  },

  allSemesters(db: ReturnType<typeof getDb>): Semester[] {
    return [...db.semesters].sort((a, b) => b.startDate.localeCompare(a.startDate));
  },

  activeSemester(db: ReturnType<typeof getDb>): Semester | undefined {
    return db.semesters.find((s) => s.status === "active") ?? db.semesters[0];
  },

  async createSemester(input: SemesterInput, actor: Actor): Promise<Semester> {
    await delay();
    const db = getDb();
    if (!input.name.trim()) throw new AppError("required", "Semester name is required.");
    const session = db.academicSessions.find((s) => s.id === input.sessionId);
    if (!session) throw new AppError("invalid_session", "Select a valid academic session.");
    if (input.endDate <= input.startDate) throw new AppError("invalid_dates", "End date must be after the start date.");
    if (input.startDate < session.startDate || input.endDate > session.endDate) {
      throw new AppError("out_of_range", `Semester dates must fall within ${session.name}.`);
    }
    return commit(
      (draft) => {
        const semester: Semester = {
          id: nextId("sem", draft.semesters.map((s) => s.id)),
          name: input.name.trim(),
          sessionId: input.sessionId,
          startDate: input.startDate,
          endDate: input.endDate,
          status: input.status,
        };
        draft.semesters.push(semester);
        return semester;
      },
      { actorId: actor.id, actorName: actor.name, action: "create", entityType: "Semester", entityId: "new", description: `Created semester ${input.name}.` },
    );
  },

  async updateSemester(id: ID, input: SemesterInput, actor: Actor): Promise<Semester> {
    await delay();
    const db = getDb();
    const existing = db.semesters.find((s) => s.id === id);
    if (!existing) throw new AppError("not_found", "Semester not found.");
    const session = db.academicSessions.find((s) => s.id === input.sessionId);
    if (!session) throw new AppError("invalid_session", "Select a valid academic session.");
    if (input.endDate <= input.startDate) throw new AppError("invalid_dates", "End date must be after the start date.");
    if (input.startDate < session.startDate || input.endDate > session.endDate) {
      throw new AppError("out_of_range", `Semester dates must fall within ${session.name}.`);
    }
    return commit(
      (draft) => {
        const semester = draft.semesters.find((s) => s.id === id)!;
        Object.assign(semester, {
          name: input.name.trim(),
          sessionId: input.sessionId,
          startDate: input.startDate,
          endDate: input.endDate,
          status: input.status,
        });
        return semester;
      },
      { actorId: actor.id, actorName: actor.name, action: "update", entityType: "Semester", entityId: id, description: `Updated semester ${input.name}.` },
    );
  },

  async removeSemester(id: ID, actor: Actor): Promise<void> {
    await delay();
    const db = getDb();
    const linked = db.courseOfferings.some((o) => o.semesterId === id);
    if (linked) throw new AppError("has_relations", "This semester has course offerings. Remove them first.");
    commit(
      (draft) => {
        draft.semesters = draft.semesters.filter((s) => s.id !== id);
      },
      { actorId: actor.id, actorName: actor.name, action: "delete", entityType: "Semester", entityId: id, description: "Deleted a semester." },
    );
  },

  /* ----------------------------- Offerings ------------------------------ */
  offerings(db: ReturnType<typeof getDb>, params?: ListParams): Paginated<CourseOffering> {
    const { search, semesterId, departmentId, status } = params?.filters ?? {};
    const q = search ?? params?.search ?? "";
    const filtered = db.courseOfferings.filter((o) => {
      const course = db.courses.find((c) => c.id === o.courseId);
      const teacherNames = o.teacherIds
        .map((t) => db.teachers.find((x) => x.id === t)?.fullName ?? "")
        .join(" ");
      if (!matches(q, [course?.code, course?.title, o.section, o.room, teacherNames])) return false;
      if (semesterId && o.semesterId !== semesterId) return false;
      if (departmentId && course?.departmentId !== departmentId) return false;
      if (status && o.status !== status) return false;
      return true;
    });
    return applyList(filtered, params);
  },

  allOfferings(db: ReturnType<typeof getDb>): CourseOffering[] {
    return db.courseOfferings;
  },

  offeringById(db: ReturnType<typeof getDb>, id: ID): CourseOffering | undefined {
    return db.courseOfferings.find((o) => o.id === id);
  },

  offeringEnrollmentCount(db: ReturnType<typeof getDb>, id: ID): number {
    return db.enrollments.filter((e) => e.offeringId === id && e.status === "active").length;
  },

  async createOffering(input: OfferingInput, actor: Actor): Promise<CourseOffering> {
    await delay();
    const db = getDb();
    if (!db.courses.some((c) => c.id === input.courseId)) throw new AppError("invalid_course", "Select a valid course.");
    if (!db.semesters.some((s) => s.id === input.semesterId)) throw new AppError("invalid_semester", "Select a valid semester.");
    if (!Number.isFinite(input.capacity) || input.capacity <= 0) throw new AppError("invalid_capacity", "Capacity must be a positive number.");
    if (input.teacherIds.length === 0) throw new AppError("missing_teacher", "Assign at least one teacher.");
    const duplicate = db.courseOfferings.find(
      (o) => o.courseId === input.courseId && o.semesterId === input.semesterId && o.section === input.section,
    );
    if (duplicate) throw new AppError("duplicate_offering", "An offering for this course, semester and section already exists.");
    return commit(
      (draft) => {
        const offering: CourseOffering = {
          id: nextId("off", draft.courseOfferings.map((o) => o.id)),
          ...input,
          section: input.section.trim().toUpperCase(),
        };
        draft.courseOfferings.push(offering);
        return offering;
      },
      { actorId: actor.id, actorName: actor.name, action: "create", entityType: "CourseOffering", entityId: "new", description: "Created a course offering." },
    );
  },

  async updateOffering(id: ID, input: OfferingInput, actor: Actor): Promise<CourseOffering> {
    await delay();
    const db = getDb();
    const existing = db.courseOfferings.find((o) => o.id === id);
    if (!existing) throw new AppError("not_found", "Course offering not found.");
    const enrolled = this.offeringEnrollmentCount(db, id);
    if (input.capacity < enrolled) {
      throw new AppError("capacity_too_low", `Capacity cannot be lower than the ${enrolled} students already enrolled.`);
    }
    if (input.teacherIds.length === 0) throw new AppError("missing_teacher", "Assign at least one teacher.");
    const duplicate = db.courseOfferings.find(
      (o) => o.id !== id && o.courseId === input.courseId && o.semesterId === input.semesterId && o.section === input.section,
    );
    if (duplicate) throw new AppError("duplicate_offering", "Another offering already uses this course, semester and section.");
    return commit(
      (draft) => {
        const offering = draft.courseOfferings.find((o) => o.id === id)!;
        Object.assign(offering, { ...input, section: input.section.trim().toUpperCase() });
        return offering;
      },
      { actorId: actor.id, actorName: actor.name, action: "update", entityType: "CourseOffering", entityId: id, description: "Updated a course offering." },
    );
  },

  async removeOffering(id: ID, actor: Actor): Promise<void> {
    await delay();
    const db = getDb();
    const enrolled = this.offeringEnrollmentCount(db, id);
    if (enrolled > 0) throw new AppError("has_relations", "This offering has active enrollments. Deactivate it instead.");
    commit(
      (draft) => {
        draft.courseOfferings = draft.courseOfferings.filter((o) => o.id !== id);
      },
      { actorId: actor.id, actorName: actor.name, action: "delete", entityType: "CourseOffering", entityId: id, description: "Deleted a course offering." },
    );
  },
};
