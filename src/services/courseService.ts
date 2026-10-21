import type { Course, ID, ListParams, Paginated } from "@/types";
import { AppError } from "@/types";
import { commit, delay, getDb, nextId } from "./mock/store";
import { applyList, matches } from "./mock/query";
import type { Actor } from "./types";

export interface CourseInput {
  code: string;
  title: string;
  description: string;
  departmentId: ID;
  creditHours: number;
  level: string;
  prerequisiteIds: ID[];
  status: Course["status"];
}

function validate(db: ReturnType<typeof getDb>, input: CourseInput, ignoreId?: ID): void {
  if (!input.title.trim()) throw new AppError("required", "Course title is required.");
  if (!input.code.trim()) throw new AppError("required", "Course code is required.");
  if (!db.departments.some((d) => d.id === input.departmentId)) {
    throw new AppError("invalid_department", "Select a valid department.");
  }
  if (!Number.isFinite(input.creditHours) || input.creditHours <= 0) {
    throw new AppError("invalid_credits", "Credit hours must be a positive number.");
  }
  const dup = db.courses.find(
    (c) => c.id !== ignoreId && c.code.toLowerCase() === input.code.trim().toLowerCase(),
  );
  if (dup) throw new AppError("duplicate_code", `Course code “${input.code}” is already in use.`);
  if (ignoreId && input.prerequisiteIds.includes(ignoreId)) {
    throw new AppError("invalid_prerequisite", "A course cannot be its own prerequisite.");
  }
  for (const prereq of input.prerequisiteIds) {
    if (!db.courses.some((c) => c.id === prereq)) {
      throw new AppError("invalid_prerequisite", "One or more prerequisites do not reference a valid course.");
    }
  }
}

export const courseService = {
  list(db: ReturnType<typeof getDb>, params?: ListParams): Paginated<Course> {
    const { search, departmentId, status, level } = params?.filters ?? {};
    const q = search ?? params?.search ?? "";
    const filtered = db.courses.filter((c) => {
      if (!matches(q, [c.code, c.title, c.description])) return false;
      if (departmentId && c.departmentId !== departmentId) return false;
      if (status && c.status !== status) return false;
      if (level && c.level !== level) return false;
      return true;
    });
    return applyList(filtered, params);
  },

  all(db: ReturnType<typeof getDb>): Course[] {
    return [...db.courses].sort((a, b) => a.code.localeCompare(b.code));
  },

  byId(db: ReturnType<typeof getDb>, id: ID): Course | undefined {
    return db.courses.find((c) => c.id === id);
  },

  byDepartment(db: ReturnType<typeof getDb>, departmentId: ID): Course[] {
    return db.courses.filter((c) => c.departmentId === departmentId);
  },

  offeringsFor(db: ReturnType<typeof getDb>, courseId: ID) {
    return db.courseOfferings.filter((o) => o.courseId === courseId);
  },

  enrollmentCount(db: ReturnType<typeof getDb>, courseId: ID): number {
    const offeringIds = new Set(this.offeringsFor(db, courseId).map((o) => o.id));
    return db.enrollments.filter((e) => offeringIds.has(e.offeringId) && e.status === "active").length;
  },

  prerequisites(db: ReturnType<typeof getDb>, course: Course): Course[] {
    return course.prerequisiteIds
      .map((id) => db.courses.find((c) => c.id === id))
      .filter((c): c is Course => Boolean(c));
  },

  async create(input: CourseInput, actor: Actor): Promise<Course> {
    await delay();
    validate(getDb(), input);
    return commit(
      (draft) => {
        const course: Course = {
          id: nextId("crs", draft.courses.map((c) => c.id)),
          code: input.code.trim().toUpperCase(),
          title: input.title.trim(),
          description: input.description.trim(),
          departmentId: input.departmentId,
          creditHours: input.creditHours,
          level: input.level,
          prerequisiteIds: input.prerequisiteIds,
          status: input.status,
        };
        draft.courses.push(course);
        return course;
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "create",
        entityType: "Course",
        entityId: "new",
        description: `Created course ${input.code} — ${input.title}.`,
      },
    );
  },

  async update(id: ID, input: CourseInput, actor: Actor): Promise<Course> {
    await delay();
    const db = getDb();
    if (!db.courses.some((c) => c.id === id)) throw new AppError("not_found", "Course not found.");
    validate(db, input, id);
    return commit(
      (draft) => {
        const course = draft.courses.find((c) => c.id === id)!;
        course.code = input.code.trim().toUpperCase();
        course.title = input.title.trim();
        course.description = input.description.trim();
        course.departmentId = input.departmentId;
        course.creditHours = input.creditHours;
        course.level = input.level;
        course.prerequisiteIds = input.prerequisiteIds;
        course.status = input.status;
        return course;
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "update",
        entityType: "Course",
        entityId: id,
        description: `Updated course ${input.code}.`,
      },
    );
  },

  async remove(id: ID, actor: Actor): Promise<void> {
    await delay();
    const db = getDb();
    const course = db.courses.find((c) => c.id === id);
    if (!course) throw new AppError("not_found", "Course not found.");
    const offerings = db.courseOfferings.filter((o) => o.courseId === id);
    const usedAsPrereq = db.courses.some((c) => c.prerequisiteIds.includes(id));
    if (offerings.length > 0 || usedAsPrereq) {
      throw new AppError(
        "has_relations",
        "This course has offerings or is a prerequisite for other courses. Deactivate it instead.",
      );
    }
    commit(
      (draft) => {
        draft.courses = draft.courses.filter((c) => c.id !== id);
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "delete",
        entityType: "Course",
        entityId: id,
        description: `Deleted course ${course.code}.`,
      },
    );
  },
};
