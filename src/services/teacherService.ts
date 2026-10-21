import type { ID, ListParams, Paginated, Teacher } from "@/types";
import { AppError } from "@/types";
import { commit, delay, getDb, nextId } from "./mock/store";
import { applyList, matches } from "./mock/query";
import type { Actor } from "./types";

export interface TeacherInput {
  employeeNumber: string;
  fullName: string;
  email: string;
  phone: string;
  departmentId: ID;
  designation: string;
  hireDate: string;
  status: Teacher["status"];
}

function validate(db: ReturnType<typeof getDb>, input: TeacherInput, ignoreId?: ID): void {
  if (!input.fullName.trim()) throw new AppError("required", "Full name is required.");
  if (!input.employeeNumber.trim()) throw new AppError("required", "Employee number is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new AppError("invalid_email", "Enter a valid email address.");
  }
  if (!db.departments.some((d) => d.id === input.departmentId)) {
    throw new AppError("invalid_department", "Select a valid department.");
  }
  const dupEmp = db.teachers.find(
    (t) => t.id !== ignoreId && t.employeeNumber.toLowerCase() === input.employeeNumber.trim().toLowerCase(),
  );
  if (dupEmp) throw new AppError("duplicate_employee", "That employee number already exists.");
  const dupEmail = db.teachers.find(
    (t) => t.id !== ignoreId && t.email.toLowerCase() === input.email.trim().toLowerCase(),
  );
  if (dupEmail) throw new AppError("duplicate_email", "That email address already exists.");
}

export const teacherService = {
  list(db: ReturnType<typeof getDb>, params?: ListParams): Paginated<Teacher> {
    const { search, departmentId, status, designation } = params?.filters ?? {};
    const q = search ?? params?.search ?? "";
    const filtered = db.teachers.filter((t) => {
      if (!matches(q, [t.fullName, t.employeeNumber, t.email, t.phone])) return false;
      if (departmentId && t.departmentId !== departmentId) return false;
      if (status && t.status !== status) return false;
      if (designation && t.designation !== designation) return false;
      return true;
    });
    return applyList(filtered, params);
  },

  byId(db: ReturnType<typeof getDb>, id: ID): Teacher | undefined {
    return db.teachers.find((t) => t.id === id);
  },

  byUserId(db: ReturnType<typeof getDb>, userId: ID): Teacher | undefined {
    return db.teachers.find((t) => t.userId === userId);
  },

  byDepartment(db: ReturnType<typeof getDb>, departmentId: ID): Teacher[] {
    return db.teachers.filter((t) => t.departmentId === departmentId);
  },

  offeringsFor(db: ReturnType<typeof getDb>, teacherId: ID) {
    return db.courseOfferings.filter((o) => o.teacherIds.includes(teacherId));
  },

  studentCount(db: ReturnType<typeof getDb>, teacherId: ID): number {
    const offeringIds = new Set(this.offeringsFor(db, teacherId).map((o) => o.id));
    const studentIds = new Set(
      db.enrollments.filter((e) => offeringIds.has(e.offeringId) && e.status === "active").map((e) => e.studentId),
    );
    return studentIds.size;
  },

  async create(input: TeacherInput, actor: Actor): Promise<Teacher> {
    await delay();
    validate(getDb(), input);
    return commit(
      (draft) => {
        const id = nextId("tch", draft.teachers.map((t) => t.id));
        const teacher: Teacher = {
          id,
          employeeNumber: input.employeeNumber.trim(),
          fullName: input.fullName.trim(),
          email: input.email.trim().toLowerCase(),
          phone: input.phone.trim(),
          departmentId: input.departmentId,
          designation: input.designation,
          hireDate: input.hireDate,
          status: input.status,
        };
        draft.teachers.push(teacher);
        const userId = nextId("user-teacher", draft.users.map((u) => u.id));
        teacher.userId = userId;
        draft.users.push({
          id: userId,
          fullName: teacher.fullName,
          email: teacher.email,
          phone: teacher.phone,
          role: "teacher",
          departmentId: teacher.departmentId,
          status: input.status,
          createdAt: teacher.hireDate,
          teacherId: id,
        });
        return teacher;
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "create",
        entityType: "Teacher",
        entityId: "new",
        description: `Created teacher ${input.fullName} (${input.employeeNumber}).`,
      },
    );
  },

  async update(id: ID, input: TeacherInput, actor: Actor): Promise<Teacher> {
    await delay();
    const db = getDb();
    if (!db.teachers.some((t) => t.id === id)) throw new AppError("not_found", "Teacher not found.");
    validate(db, input, id);
    return commit(
      (draft) => {
        const teacher = draft.teachers.find((t) => t.id === id)!;
        teacher.employeeNumber = input.employeeNumber.trim();
        teacher.fullName = input.fullName.trim();
        teacher.email = input.email.trim().toLowerCase();
        teacher.phone = input.phone.trim();
        teacher.departmentId = input.departmentId;
        teacher.designation = input.designation;
        teacher.hireDate = input.hireDate;
        teacher.status = input.status;
        if (teacher.userId) {
          const user = draft.users.find((u) => u.id === teacher.userId);
          if (user) {
            user.fullName = teacher.fullName;
            user.email = teacher.email;
            user.phone = teacher.phone;
            user.departmentId = teacher.departmentId;
          }
        }
        return teacher;
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "update",
        entityType: "Teacher",
        entityId: id,
        description: `Updated teacher ${input.fullName}.`,
      },
    );
  },

  async setStatus(id: ID, status: Teacher["status"], actor: Actor): Promise<void> {
    await delay();
    const teacher = getDb().teachers.find((t) => t.id === id);
    if (!teacher) throw new AppError("not_found", "Teacher not found.");
    commit(
      (draft) => {
        const target = draft.teachers.find((t) => t.id === id)!;
        target.status = status;
        if (target.userId) {
          const user = draft.users.find((u) => u.id === target.userId);
          if (user) user.status = status;
        }
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: status === "active" ? "activate" : "deactivate",
        entityType: "Teacher",
        entityId: id,
        description: `Set status of ${teacher.fullName} to ${status}.`,
      },
    );
  },

  async remove(id: ID, actor: Actor): Promise<void> {
    await delay();
    const db = getDb();
    const teacher = db.teachers.find((t) => t.id === id);
    if (!teacher) throw new AppError("not_found", "Teacher not found.");
    commit(
      (draft) => {
        draft.teachers = draft.teachers.filter((t) => t.id !== id);
        draft.timetable = draft.timetable.filter((e) => e.teacherId !== id);
        for (const offering of draft.courseOfferings) {
          offering.teacherIds = offering.teacherIds.filter((teacherId) => teacherId !== id);
        }
        if (teacher.userId) draft.users = draft.users.filter((u) => u.id !== teacher.userId);
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "delete",
        entityType: "Teacher",
        entityId: id,
        description: `Deleted teacher ${teacher.fullName} (${teacher.employeeNumber}).`,
      },
    );
  },
};
