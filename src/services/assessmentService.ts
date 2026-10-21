import type { Assessment, ID, ListParams, Paginated } from "@/types";
import { AppError } from "@/types";
import { commit, delay, getDb, nextId } from "./mock/store";
import { applyList, matches } from "./mock/query";
import type { Actor } from "./types";

export interface AssessmentInput {
  offeringId: ID;
  title: string;
  type: Assessment["type"];
  maxMarks: number;
  weight: number;
  dueDate: string;
  status: Assessment["status"];
}

export const assessmentService = {
  list(db: ReturnType<typeof getDb>, params?: ListParams): Paginated<Assessment> {
    const { search, offeringId, type, status } = params?.filters ?? {};
    const q = search ?? params?.search ?? "";
    const filtered = db.assessments.filter((a) => {
      if (!matches(q, [a.title])) return false;
      if (offeringId && a.offeringId !== offeringId) return false;
      if (type && a.type !== type) return false;
      if (status && a.status !== status) return false;
      return true;
    });
    return applyList(filtered, params);
  },

  forOffering(db: ReturnType<typeof getDb>, offeringId: ID): Assessment[] {
    return db.assessments.filter((a) => a.offeringId === offeringId);
  },

  byId(db: ReturnType<typeof getDb>, id: ID): Assessment | undefined {
    return db.assessments.find((a) => a.id === id);
  },

  totalWeight(db: ReturnType<typeof getDb>, offeringId: ID, ignoreId?: ID): number {
    return db.assessments
      .filter((a) => a.offeringId === offeringId && a.id !== ignoreId)
      .reduce((sum, a) => sum + a.weight, 0);
  },

  validate(input: AssessmentInput, ignoreId?: ID) {
    if (!input.title.trim()) throw new AppError("required", "Assessment title is required.");
    if (!Number.isFinite(input.maxMarks) || input.maxMarks <= 0) {
      throw new AppError("invalid_max", "Maximum marks must be a positive number.");
    }
    if (!Number.isFinite(input.weight) || input.weight <= 0 || input.weight > 100) {
      throw new AppError("invalid_weight", "Weight must be between 0 and 100.");
    }
    const others = this.totalWeight(getDb(), input.offeringId, ignoreId);
    if (others + input.weight > 100) {
      throw new AppError("weight_exceeded", `Assessments for this offering already total ${others}%. Adding ${input.weight}% would exceed 100%.`);
    }
  },

  async create(input: AssessmentInput, actor: Actor): Promise<Assessment> {
    await delay();
    this.validate(input);
    return commit(
      (draft) => {
        const assessment: Assessment = {
          id: nextId("asg", draft.assessments.map((a) => a.id)),
          offeringId: input.offeringId,
          title: input.title.trim(),
          type: input.type,
          maxMarks: input.maxMarks,
          weight: input.weight,
          dueDate: input.dueDate,
          status: input.status,
        };
        draft.assessments.push(assessment);
        return assessment;
      },
      { actorId: actor.id, actorName: actor.name, action: "create", entityType: "Assessment", entityId: "new", description: `Created assessment ${input.title}.` },
    );
  },

  async update(id: ID, input: AssessmentInput, actor: Actor): Promise<Assessment> {
    await delay();
    const db = getDb();
    if (!db.assessments.some((a) => a.id === id)) throw new AppError("not_found", "Assessment not found.");
    this.validate(input, id);
    return commit(
      (draft) => {
        const assessment = draft.assessments.find((a) => a.id === id)!;
        assessment.title = input.title.trim();
        assessment.type = input.type;
        assessment.maxMarks = input.maxMarks;
        assessment.weight = input.weight;
        assessment.dueDate = input.dueDate;
        assessment.status = input.status;
        return assessment;
      },
      { actorId: actor.id, actorName: actor.name, action: "update", entityType: "Assessment", entityId: id, description: `Updated assessment ${input.title}.` },
    );
  },

  async remove(id: ID, actor: Actor): Promise<void> {
    await delay();
    const db = getDb();
    const assessment = db.assessments.find((a) => a.id === id);
    if (!assessment) throw new AppError("not_found", "Assessment not found.");
    const hasMarks = db.marks.some((m) => m.assessmentId === id);
    if (hasMarks) throw new AppError("has_marks", "Marks have been entered for this assessment. Delete the marks first or set it to draft.");
    commit(
      (draft) => {
        draft.assessments = draft.assessments.filter((a) => a.id !== id);
      },
      { actorId: actor.id, actorName: actor.name, action: "delete", entityType: "Assessment", entityId: id, description: `Deleted assessment ${assessment.title}.` },
    );
  },
};
