import type { ID, Mark } from "@/types";
import { AppError } from "@/types";
import { commit, delay, getDb, nextId } from "./mock/store";
import type { Actor } from "./types";

export interface MarkEntry {
  studentId: ID;
  score: number | null;
}

export interface MarkInput {
  assessmentId: ID;
  studentId: ID;
  score: number;
}

export const marksService = {
  forAssessment(db: ReturnType<typeof getDb>, assessmentId: ID): Mark[] {
    return db.marks.filter((m) => m.assessmentId === assessmentId);
  },

  forOffering(db: ReturnType<typeof getDb>, offeringId: ID): Mark[] {
    return db.marks.filter((m) => m.offeringId === offeringId);
  },

  forStudent(db: ReturnType<typeof getDb>, studentId: ID): Mark[] {
    return db.marks.filter((m) => m.studentId === studentId);
  },

  forStudentOffering(db: ReturnType<typeof getDb>, studentId: ID, offeringId: ID): Mark[] {
    return db.marks.filter((m) => m.studentId === studentId && m.offeringId === offeringId);
  },

  /**
   * Upsert marks for an assessment. A student may only have one mark record per
   * assessment, and marks must fall within 0..maxMarks.
   */
  async saveMarks(assessmentId: ID, entries: MarkEntry[], actor: Actor): Promise<void> {
    await delay();
    const db = getDb();
    const assessment = db.assessments.find((a) => a.id === assessmentId);
    if (!assessment) throw new AppError("not_found", "Assessment not found.");

    for (const entry of entries) {
      if (entry.score === null) continue;
      if (!Number.isFinite(entry.score) || entry.score < 0) {
        throw new AppError("invalid_mark", "Marks cannot be negative.");
      }
      if (entry.score > assessment.maxMarks) {
        throw new AppError("mark_too_high", `A mark cannot exceed the maximum of ${assessment.maxMarks}.`);
      }
    }

    commit(
      (draft) => {
        const now = new Date().toISOString();
        for (const entry of entries) {
          const existing = draft.marks.find(
            (m) => m.assessmentId === assessmentId && m.studentId === entry.studentId,
          );
          if (entry.score === null) {
            if (existing) draft.marks = draft.marks.filter((m) => m.id !== existing.id);
            continue;
          }
          if (existing) {
            existing.score = entry.score;
            existing.enteredAt = now;
          } else {
            draft.marks.push({
              id: nextId("mrk", draft.marks.map((m) => m.id)),
              assessmentId,
              studentId: entry.studentId,
              offeringId: assessment.offeringId,
              score: entry.score,
              enteredAt: now,
            });
          }
        }
      },
      {
        actorId: actor.id,
        actorName: actor.name,
        action: "update",
        entityType: "Mark",
        entityId: assessmentId,
        description: `Entered marks for ${assessment.title}.`,
      },
    );
  },

  stats(db: ReturnType<typeof getDb>, assessmentId: ID) {
    const assessment = db.assessments.find((a) => a.id === assessmentId);
    const marks = this.forAssessment(db, assessmentId);
    if (!assessment || marks.length === 0) {
      return { count: 0, average: null as number | null, highest: null as number | null, lowest: null as number | null, max: assessment?.maxMarks ?? 0 };
    }
    const scores = marks.map((m) => m.score);
    return {
      count: marks.length,
      average: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
      max: assessment.maxMarks,
    };
  },
};
