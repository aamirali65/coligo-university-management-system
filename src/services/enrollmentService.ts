import type { Enrollment, ID, ListParams, Paginated, Student } from "@/types";
import { AppError } from "@/types";
import { commit, delay, getDb, nextId } from "./mock/store";
import { applyList } from "./mock/query";
import type { Actor } from "./types";

export const enrollmentService = {
  list(db: ReturnType<typeof getDb>, params?: ListParams): Paginated<Enrollment> {
    const { search, offeringId, studentId, status, semesterId } = params?.filters ?? {};
    const q = (search ?? params?.search ?? "").toLowerCase();
    const filtered = db.enrollments.filter((e) => {
      const student = db.students.find((s) => s.id === e.studentId);
      const offering = db.courseOfferings.find((o) => o.id === e.offeringId);
      const course = offering ? db.courses.find((c) => c.id === offering.courseId) : undefined;
      if (q) {
        const haystack = `${student?.fullName} ${student?.registrationNumber} ${course?.code} ${course?.title}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (offeringId && e.offeringId !== offeringId) return false;
      if (studentId && e.studentId !== studentId) return false;
      if (status && e.status !== status) return false;
      if (semesterId && offering?.semesterId !== semesterId) return false;
      return true;
    });
    return applyList(filtered, params);
  },

  byOffering(db: ReturnType<typeof getDb>, offeringId: ID): Enrollment[] {
    return db.enrollments.filter((e) => e.offeringId === offeringId);
  },

  studentsForOffering(db: ReturnType<typeof getDb>, offeringId: ID): Student[] {
    return db.enrollments
      .filter((e) => e.offeringId === offeringId && e.status !== "dropped")
      .map((e) => db.students.find((s) => s.id === e.studentId))
      .filter((s): s is Student => Boolean(s));
  },

  async enroll(studentId: ID, offeringId: ID, actor: Actor): Promise<Enrollment> {
    await delay();
    const db = getDb();
    const student = db.students.find((s) => s.id === studentId);
    if (!student) throw new AppError("invalid_student", "Select a valid student.");
    if (student.status !== "active") throw new AppError("inactive_student", "Only active students can be enrolled.");
    const offering = db.courseOfferings.find((o) => o.id === offeringId);
    if (!offering) throw new AppError("invalid_offering", "Select a valid course offering.");
    if (offering.status !== "active") throw new AppError("inactive_offering", "This offering is not open for enrollment.");

    const existing = db.enrollments.find(
      (e) => e.studentId === studentId && e.offeringId === offeringId && e.status === "active",
    );
    if (existing) throw new AppError("duplicate_enrollment", "This student already has an active enrollment in this offering.");

    const count = db.enrollments.filter((e) => e.offeringId === offeringId && e.status === "active").length;
    if (count >= offering.capacity) {
      throw new AppError("capacity_full", `This offering is at full capacity (${offering.capacity}).`);
    }

    return commit(
      (draft) => {
        const enrollment: Enrollment = {
          id: nextId("enr", draft.enrollments.map((e) => e.id)),
          studentId,
          offeringId,
          enrolledAt: new Date().toISOString().slice(0, 10),
          status: "active",
        };
        draft.enrollments.push(enrollment);
        return enrollment;
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "create",
        entityType: "Enrollment",
        entityId: "new",
        description: `Enrolled ${student.fullName} in an offering.`,
      },
    );
  },

  async setStatus(id: ID, status: Enrollment["status"], actor: Actor): Promise<void> {
    await delay();
    const db = getDb();
    const enrollment = db.enrollments.find((e) => e.id === id);
    if (!enrollment) throw new AppError("not_found", "Enrollment not found.");
    commit(
      (draft) => {
        const target = draft.enrollments.find((e) => e.id === id)!;
        target.status = status;
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "update",
        entityType: "Enrollment",
        entityId: id,
        description: `Marked an enrollment as ${status}.`,
      },
    );
  },

  async remove(id: ID, actor: Actor): Promise<void> {
    await delay();
    const enrollment = getDb().enrollments.find((e) => e.id === id);
    if (!enrollment) throw new AppError("not_found", "Enrollment not found.");
    commit(
      (draft) => {
        draft.enrollments = draft.enrollments.filter((e) => e.id !== id);
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "delete",
        entityType: "Enrollment",
        entityId: id,
        description: "Removed an enrollment record.",
      },
    );
  },
};
