import type { ID, ListParams, Paginated, Result, ResultStatus } from "@/types";
import { AppError } from "@/types";
import { commit, delay, getDb } from "./mock/store";
import { applyList } from "./mock/query";
import { gradeForPercent, weightedTotal } from "@/lib/grading";
import type { Actor } from "./types";

/** Compute a course total and grade from stored marks and assessment weights. */
export function computeTotal(
  db: ReturnType<typeof getDb>,
  offeringId: ID,
  studentId: ID,
): { total: number | null; grade: string | null; points: number | null } {
  const assessments = db.assessments.filter((a) => a.offeringId === offeringId);
  const entries = assessments
    .map((a) => {
      const mark = db.marks.find((m) => m.assessmentId === a.id && m.studentId === studentId);
      return mark ? { earned: mark.score, max: a.maxMarks, weight: a.weight } : null;
    })
    .filter((e): e is { earned: number; max: number; weight: number } => e !== null);
  const total = weightedTotal(entries);
  if (total === null) return { total: null, grade: null, points: null };
  const graded = gradeForPercent(total, db.settings.gradingScale);
  return { total, grade: graded.grade, points: graded.points };
}

function pushHistory(result: Result, status: ResultStatus, actor: Actor) {
  result.history = [...result.history, { status, at: new Date().toISOString(), by: actor.id }];
}

export const resultService = {
  list(db: ReturnType<typeof getDb>, params?: ListParams): Paginated<Result> {
    const { search, offeringId, studentId, status, semesterId } = params?.filters ?? {};
    const q = (search ?? params?.search ?? "").toLowerCase();
    const filtered = db.results.filter((r) => {
      const student = db.students.find((s) => s.id === r.studentId);
      const offering = db.courseOfferings.find((o) => o.id === r.offeringId);
      const course = offering ? db.courses.find((c) => c.id === offering.courseId) : undefined;
      if (q) {
        const haystack = `${student?.fullName} ${student?.registrationNumber} ${course?.code} ${course?.title}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (offeringId && r.offeringId !== offeringId) return false;
      if (studentId && r.studentId !== studentId) return false;
      if (status && r.status !== status) return false;
      if (semesterId && offering?.semesterId !== semesterId) return false;
      return true;
    });
    return applyList(filtered, params);
  },

  forOffering(db: ReturnType<typeof getDb>, offeringId: ID): Result[] {
    return db.results.filter((r) => r.offeringId === offeringId);
  },

  byId(db: ReturnType<typeof getDb>, id: ID): Result | undefined {
    return db.results.find((r) => r.id === id);
  },

  countsByStatus(db: ReturnType<typeof getDb>): Record<ResultStatus, number> {
    const base: Record<ResultStatus, number> = {
      draft: 0, submitted: 0, under_review: 0, approved: 0, published: 0, returned: 0,
    };
    for (const result of db.results) base[result.status] += 1;
    return base;
  },

  async submitOffering(offeringId: ID, actor: Actor): Promise<number> {
    await delay();
    const db = getDb();
    const offering = db.courseOfferings.find((o) => o.id === offeringId);
    if (!offering) throw new AppError("not_found", "Course offering not found.");
    const candidates = db.results.filter(
      (r) => r.offeringId === offeringId && (r.status === "draft" || r.status === "returned"),
    );
    if (candidates.length === 0) throw new AppError("nothing_to_submit", "There are no draft results to submit for this offering.");
    commit(
      (draft) => {
        for (const result of draft.results) {
          if (result.offeringId !== offeringId || (result.status !== "draft" && result.status !== "returned")) continue;
          const { total, grade, points } = computeTotal(draft, offeringId, result.studentId);
          result.totalScore = total;
          result.grade = grade;
          result.gradePoint = points;
          result.status = "submitted";
          result.submittedAt = new Date().toISOString();
          pushHistory(result, "submitted", actor);
        }
      },
      { actorId: actor.id, actorName: actor.name, action: "submit", entityType: "Result", entityId: offeringId, description: `Submitted ${candidates.length} result(s) for review.` },
    );
    return candidates.length;
  },

  async decide(id: ID, status: Extract<ResultStatus, "under_review" | "approved" | "published" | "returned">, actor: Actor): Promise<void> {
    await delay();
    const db = getDb();
    const result = db.results.find((r) => r.id === id);
    if (!result) throw new AppError("not_found", "Result not found.");
    const allowed: Record<string, ResultStatus[]> = {
      under_review: ["submitted"],
      approved: ["under_review", "submitted"],
      published: ["approved", "under_review"],
      returned: ["submitted", "under_review"],
    };
    if (!allowed[status].includes(result.status)) {
      throw new AppError("invalid_transition", `A result in “${result.status}” status cannot be moved to “${status}”.`);
    }
    commit(
      (draft) => {
        const target = draft.results.find((r) => r.id === id)!;
        target.status = status;
        const now = new Date().toISOString();
        if (status === "under_review") target.reviewedAt = now;
        if (status === "approved") target.approvedAt = now;
        if (status === "published") target.publishedAt = now;
        pushHistory(target, status, actor);
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: status === "published" ? "publish" : status === "approved" ? "approve" : "update",
        entityType: "Result",
        entityId: id,
        description: `Moved a result to ${status.replace("_", " ")}.`,
      },
    );
  },

  async decideOffering(offeringId: ID, status: Extract<ResultStatus, "approved" | "published" | "returned" | "under_review">, actor: Actor): Promise<number> {
    await delay();
    const db = getDb();
    const allowed: Record<string, ResultStatus[]> = {
      under_review: ["submitted"],
      approved: ["under_review", "submitted"],
      published: ["approved", "under_review"],
      returned: ["submitted", "under_review"],
    };
    const targets = db.results.filter((r) => r.offeringId === offeringId && allowed[status].includes(r.status));
    if (targets.length === 0) throw new AppError("nothing_to_do", `No results for this offering can be moved to ${status}.`);
    commit(
      (draft) => {
        for (const result of draft.results) {
          if (result.offeringId !== offeringId || !allowed[status].includes(result.status)) continue;
          result.status = status;
          const now = new Date().toISOString();
          if (status === "under_review") result.reviewedAt = now;
          if (status === "approved") result.approvedAt = now;
          if (status === "published") result.publishedAt = now;
          pushHistory(result, status, actor);
        }
      },
      { actorId: actor.id, actorName: actor.name, action: status === "published" ? "publish" : "approve", entityType: "Result", entityId: offeringId, description: `Moved ${targets.length} result(s) to ${status}.` },
    );
    return targets.length;
  },
};
