import type { Department, ID, ListParams, Paginated } from "@/types";
import { AppError } from "@/types";
import { commit, delay, getDb, nextId } from "./mock/store";
import { applyList, matches, paginate } from "./mock/query";
import type { Actor } from "./types";

export interface DepartmentInput {
  code: string;
  name: string;
  description: string;
  hodId: ID | null;
  officeLocation: string;
  contactEmail: string;
  status: Department["status"];
}

function validate(db: ReturnType<typeof getDb>, input: DepartmentInput, ignoreId?: ID): void {
  if (!input.name.trim()) throw new AppError("required", "Department name is required.");
  if (!input.code.trim()) throw new AppError("required", "Department code is required.");
  const duplicate = db.departments.find(
    (d) => d.id !== ignoreId && d.code.toLowerCase() === input.code.trim().toLowerCase(),
  );
  if (duplicate) throw new AppError("duplicate_code", `Department code “${input.code}” is already in use.`);
  if (input.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail)) {
    throw new AppError("invalid_email", "Enter a valid contact email address.");
  }
  if (input.hodId) {
    const hod = db.users.find((u) => u.id === input.hodId);
    if (!hod || (hod.role !== "hod" && hod.role !== "teacher")) {
      throw new AppError("invalid_hod", "The selected HOD must be a teacher or head of department.");
    }
  }
}

export const departmentService = {
  all(db: ReturnType<typeof getDb>): Department[] {
    return [...db.departments].sort((a, b) => a.name.localeCompare(b.name));
  },

  list(db: ReturnType<typeof getDb>, params?: ListParams): Paginated<Department> {
    const { search, status } = params?.filters ?? {};
    const filtered = db.departments.filter((d) => {
      if (!matches(search ?? params?.search ?? "", [d.name, d.code, d.contactEmail, d.officeLocation])) return false;
      if (status && d.status !== status) return false;
      return true;
    });
    return applyList(filtered, params);
  },

  byId(db: ReturnType<typeof getDb>, id: ID): Department | undefined {
    return db.departments.find((d) => d.id === id);
  },

  counts(db: ReturnType<typeof getDb>, id: ID) {
    return {
      students: db.students.filter((s) => s.departmentId === id).length,
      teachers: db.teachers.filter((t) => t.departmentId === id).length,
      courses: db.courses.filter((c) => c.departmentId === id).length,
      offerings: db.courseOfferings.filter(
        (o) => db.courses.find((c) => c.id === o.courseId)?.departmentId === id,
      ).length,
    };
  },

  studentStatusBreakdown(db: ReturnType<typeof getDb>, id: ID) {
    const students = db.students.filter((s) => s.departmentId === id);
    return {
      active: students.filter((s) => s.status === "active").length,
      inactive: students.filter((s) => s.status === "inactive").length,
      graduated: students.filter((s) => s.status === "graduated").length,
      suspended: students.filter((s) => s.status === "suspended").length,
    };
  },

  async create(input: DepartmentInput, actor: Actor): Promise<Department> {
    await delay();
    validate(getDb(), input);
    return commit(
      (draft) => {
        const department: Department = {
          id: nextId("dept", draft.departments.map((d) => d.id)),
          code: input.code.trim().toUpperCase(),
          name: input.name.trim(),
          description: input.description.trim(),
          hodId: input.hodId,
          officeLocation: input.officeLocation.trim(),
          contactEmail: input.contactEmail.trim(),
          status: input.status,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        draft.departments.push(department);
        return department;
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "create",
        entityType: "Department",
        entityId: "new",
        description: `Created department ${input.name}.`,
      },
    );
  },

  async update(id: ID, input: DepartmentInput, actor: Actor): Promise<Department> {
    await delay();
    const db = getDb();
    if (!db.departments.some((d) => d.id === id)) throw new AppError("not_found", "Department not found.");
    validate(db, input, id);
    return commit(
      (draft) => {
        const department = draft.departments.find((d) => d.id === id)!;
        department.code = input.code.trim().toUpperCase();
        department.name = input.name.trim();
        department.description = input.description.trim();
        department.hodId = input.hodId;
        department.officeLocation = input.officeLocation.trim();
        department.contactEmail = input.contactEmail.trim();
        department.status = input.status;
        return department;
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "update",
        entityType: "Department",
        entityId: id,
        description: `Updated department ${input.name}.`,
      },
    );
  },

  async remove(id: ID, actor: Actor): Promise<void> {
    await delay();
    const db = getDb();
    const department = db.departments.find((d) => d.id === id);
    if (!department) throw new AppError("not_found", "Department not found.");
    const counts = this.counts(db, id);
    if (counts.students || counts.teachers || counts.courses) {
      throw new AppError(
        "has_relations",
        "This department has related students, teachers or courses. Reassign or archive them first, or deactivate the department instead.",
      );
    }
    commit(
      (draft) => {
        draft.departments = draft.departments.filter((d) => d.id !== id);
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "delete",
        entityType: "Department",
        entityId: id,
        description: `Deleted department ${department.name}.`,
      },
    );
  },

  options(db: ReturnType<typeof getDb>) {
    return db.departments.map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` }));
  },
};

export { paginate };
