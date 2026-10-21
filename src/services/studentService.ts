import type { AttendanceStatus, ID, ListParams, Paginated, Student } from "@/types";
import { AppError } from "@/types";
import { commit, delay, getDb, nextId } from "./mock/store";
import { applyList, matches } from "./mock/query";
import type { Actor } from "./types";

export interface StudentInput {
  registrationNumber: string;
  fullName: string;
  email: string;
  phone: string;
  departmentId: ID;
  admissionDate: string;
  currentSemester: number;
  status: Student["status"];
}

function validate(db: ReturnType<typeof getDb>, input: StudentInput, ignoreId?: ID): void {
  if (!input.fullName.trim()) throw new AppError("required", "Full name is required.");
  if (!input.registrationNumber.trim()) throw new AppError("required", "Registration number is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new AppError("invalid_email", "Enter a valid email address.");
  }
  if (!db.departments.some((d) => d.id === input.departmentId)) {
    throw new AppError("invalid_department", "Select a valid department.");
  }
  if (input.currentSemester < 1 || input.currentSemester > 12) {
    throw new AppError("invalid_semester", "Current semester must be between 1 and 12.");
  }
  const dupReg = db.students.find(
    (s) => s.id !== ignoreId && s.registrationNumber.toLowerCase() === input.registrationNumber.trim().toLowerCase(),
  );
  if (dupReg) throw new AppError("duplicate_registration", "That registration number already exists.");
  const dupEmail = db.students.find(
    (s) => s.id !== ignoreId && s.email.toLowerCase() === input.email.trim().toLowerCase(),
  );
  if (dupEmail) throw new AppError("duplicate_email", "That email address already exists.");
}

export const studentService = {
  list(db: ReturnType<typeof getDb>, params?: ListParams): Paginated<Student> {
    const { search, departmentId, semester, status } = params?.filters ?? {};
    const q = search ?? params?.search ?? "";
    const filtered = db.students.filter((s) => {
      if (!matches(q, [s.fullName, s.registrationNumber, s.email, s.phone])) return false;
      if (departmentId && s.departmentId !== departmentId) return false;
      if (semester && String(s.currentSemester) !== semester) return false;
      if (status && s.status !== status) return false;
      return true;
    });
    return applyList(filtered, params);
  },

  all(db: ReturnType<typeof getDb>): Student[] {
    return db.students;
  },

  byId(db: ReturnType<typeof getDb>, id: ID): Student | undefined {
    return db.students.find((s) => s.id === id);
  },

  byUserId(db: ReturnType<typeof getDb>, userId: ID): Student | undefined {
    return db.students.find((s) => s.userId === userId);
  },

  byDepartment(db: ReturnType<typeof getDb>, departmentId: ID): Student[] {
    return db.students.filter((s) => s.departmentId === departmentId);
  },

  enrollmentsFor(db: ReturnType<typeof getDb>, studentId: ID) {
    return db.enrollments.filter((e) => e.studentId === studentId);
  },

  attendanceSummary(db: ReturnType<typeof getDb>, studentId: ID) {
    const records = db.attendance.filter((a) => a.studentId === studentId);
    const byStatus = records.reduce(
      (acc, r) => {
        acc[r.status] += 1;
        return acc;
      },
      { present: 0, absent: 0, late: 0, excused: 0 } as Record<AttendanceStatus, number>,
    );
    const counted = byStatus.present + byStatus.absent + byStatus.late + byStatus.excused;
    const attended = byStatus.present + byStatus.late;
    return {
      total: counted,
      byStatus,
      percentage: counted === 0 ? 0 : Math.round((attended / counted) * 1000) / 10,
    };
  },

  attendanceByCourse(db: ReturnType<typeof getDb>, studentId: ID) {
    const records = db.attendance.filter((a) => a.studentId === studentId);
    const grouping = new Map<string, { present: number; total: number }>();
    for (const record of records) {
      const current = grouping.get(record.offeringId) ?? { present: 0, total: 0 };
      current.total += 1;
      if (record.status === "present" || record.status === "late") current.present += 1;
      grouping.set(record.offeringId, current);
    }
    return [...grouping.entries()].map(([offeringId, value]) => ({
      offeringId,
      code: db.courseOfferings.find((o) => o.id === offeringId)?.courseId ?? "",
      percentage: value.total === 0 ? 0 : Math.round((value.present / value.total) * 1000) / 10,
      total: value.total,
    }));
  },

  resultsFor(db: ReturnType<typeof getDb>, studentId: ID, publishedOnly = false) {
    return db.results
      .filter((r) => r.studentId === studentId && (!publishedOnly || r.status === "published"))
      .map((r) => {
        const offering = db.courseOfferings.find((o) => o.id === r.offeringId);
        const course = offering ? db.courses.find((c) => c.id === offering.courseId) : undefined;
        const semester = offering ? db.semesters.find((s) => s.id === offering.semesterId) : undefined;
        return { result: r, offering, course, semester };
      })
      .filter((x) => x.offering && x.course);
  },

  academicHistory(db: ReturnType<typeof getDb>, studentId: ID) {
    return db.enrollments
      .filter((e) => e.studentId === studentId)
      .map((enrollment) => {
        const offering = db.courseOfferings.find((o) => o.id === enrollment.offeringId);
        const course = offering ? db.courses.find((c) => c.id === offering.courseId) : undefined;
        const semester = offering ? db.semesters.find((s) => s.id === offering.semesterId) : undefined;
        const result = db.results.find(
          (r) => r.studentId === studentId && r.offeringId === enrollment.offeringId,
        );
        return { enrollment, offering, course, semester, result };
      })
      .filter((x) => x.offering && x.course)
      .sort((a, b) => (b.semester?.startDate ?? "").localeCompare(a.semester?.startDate ?? ""));
  },

  async create(input: StudentInput, actor: Actor): Promise<Student> {
    await delay();
    validate(getDb(), input);
    return commit(
      (draft) => {
        const id = nextId("stu", draft.students.map((s) => s.id));
        const student: Student = {
          id,
          registrationNumber: input.registrationNumber.trim(),
          fullName: input.fullName.trim(),
          email: input.email.trim().toLowerCase(),
          phone: input.phone.trim(),
          departmentId: input.departmentId,
          admissionDate: input.admissionDate,
          currentSemester: input.currentSemester,
          status: input.status,
        };
        draft.students.push(student);
        const userId = nextId("user-student", draft.users.map((u) => u.id));
        student.userId = userId;
        draft.users.push({
          id: userId,
          fullName: student.fullName,
          email: student.email,
          phone: student.phone,
          role: "student",
          departmentId: student.departmentId,
          status: input.status === "active" ? "active" : "inactive",
          createdAt: student.admissionDate,
          studentId: id,
        });
        return student;
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "create",
        entityType: "Student",
        entityId: "new",
        description: `Created student ${input.fullName} (${input.registrationNumber}).`,
      },
    );
  },

  async update(id: ID, input: StudentInput, actor: Actor): Promise<Student> {
    await delay();
    const db = getDb();
    if (!db.students.some((s) => s.id === id)) throw new AppError("not_found", "Student not found.");
    validate(db, input, id);
    return commit(
      (draft) => {
        const student = draft.students.find((s) => s.id === id)!;
        student.registrationNumber = input.registrationNumber.trim();
        student.fullName = input.fullName.trim();
        student.email = input.email.trim().toLowerCase();
        student.phone = input.phone.trim();
        student.departmentId = input.departmentId;
        student.admissionDate = input.admissionDate;
        student.currentSemester = input.currentSemester;
        student.status = input.status;
        if (student.userId) {
          const user = draft.users.find((u) => u.id === student.userId);
          if (user) {
            user.fullName = student.fullName;
            user.email = student.email;
            user.phone = student.phone;
            user.departmentId = student.departmentId;
          }
        }
        return student;
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "update",
        entityType: "Student",
        entityId: id,
        description: `Updated student ${input.fullName}.`,
      },
    );
  },

  async setStatus(id: ID, status: Student["status"], actor: Actor): Promise<void> {
    await delay();
    const student = getDb().students.find((s) => s.id === id);
    if (!student) throw new AppError("not_found", "Student not found.");
    commit(
      (draft) => {
        const target = draft.students.find((s) => s.id === id)!;
        target.status = status;
        if (target.userId) {
          const user = draft.users.find((u) => u.id === target.userId);
          if (user) user.status = status === "active" ? "active" : "inactive";
        }
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: status === "active" ? "activate" : "deactivate",
        entityType: "Student",
        entityId: id,
        description: `Set status of ${student.fullName} to ${status}.`,
      },
    );
  },

  async remove(id: ID, actor: Actor): Promise<void> {
    await delay();
    const db = getDb();
    const student = db.students.find((s) => s.id === id);
    if (!student) throw new AppError("not_found", "Student not found.");
    commit(
      (draft) => {
        draft.students = draft.students.filter((s) => s.id !== id);
        draft.enrollments = draft.enrollments.filter((e) => e.studentId !== id);
        draft.attendance = draft.attendance.filter((a) => a.studentId !== id);
        draft.marks = draft.marks.filter((m) => m.studentId !== id);
        draft.results = draft.results.filter((r) => r.studentId !== id);
        if (student.userId) draft.users = draft.users.filter((u) => u.id !== student.userId);
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "delete",
        entityType: "Student",
        entityId: id,
        description: `Deleted student ${student.fullName} (${student.registrationNumber}).`,
      },
    );
  },
};
