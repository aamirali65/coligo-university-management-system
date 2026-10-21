import type {
  Assessment,
  CourseOffering,
  Enrollment,
  Mark,
  Result,
  ResultHistoryEntry,
  ResultStatus,
} from "@/types";
import { DEFAULT_GRADING_SCALE } from "@/lib/constants";
import { gradeForPercent, weightedTotal } from "@/lib/grading";
import { DEMO_IDS, type Random } from "./helpers";

const COMPLETED_CYCLE: ResultStatus[] = [
  "published",
  "published",
  "published",
  "published",
  "approved",
  "published",
  "returned",
  "published",
];

const ACTIVE_CYCLE: ResultStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "draft",
  "submitted",
  "draft",
  "under_review",
];

function historyFor(status: ResultStatus, at: string, actorId: string): ResultHistoryEntry[] {
  const steps: ResultStatus[] = ["draft", "submitted", "under_review", "approved", "published"];
  const reached: ResultStatus[] =
    status === "returned" ? ["draft", "submitted", "returned"] : steps.slice(0, steps.indexOf(status) + 1);
  return reached.map((s) => ({ status: s, at, by: actorId, note: undefined }));
}

export function buildResults(
  enrollments: Enrollment[],
  offerings: CourseOffering[],
  assessments: Assessment[],
  marks: Mark[],
  rng: Random,
  teacherIds: string[],
): Result[] {
  const results: Result[] = [];
  const relevantOfferings = offerings.filter(
    (o) => assessments.some((a) => a.offeringId === o.id),
  );

  let completedIndex = 0;
  let activeIndex = 0;

  for (const enrollment of enrollments) {
    const offering = relevantOfferings.find((o) => o.id === enrollment.offeringId);
    if (!offering) continue;
    if (enrollment.status === "dropped") continue;

    const offeringAssessments = assessments.filter((a) => a.offeringId === offering.id);
    const entries = offeringAssessments
      .map((a) => {
        const mark = marks.find((m) => m.assessmentId === a.id && m.studentId === enrollment.studentId);
        return mark ? { earned: mark.score, max: a.maxMarks, weight: a.weight } : null;
      })
      .filter((e): e is { earned: number; max: number; weight: number } => e !== null);

    const total = weightedTotal(entries);
    const graded = total !== null ? gradeForPercent(total, DEFAULT_GRADING_SCALE) : null;

    const isCompleted = offering.status === "completed";
    const actorId = offering.teacherIds[0] ?? teacherIds[0];

    let status: ResultStatus;
    if (enrollment.studentId === DEMO_IDS.student && enrollment.offeringId === "off-11") {
      status = "published";
    } else if (isCompleted) {
      status = COMPLETED_CYCLE[completedIndex % COMPLETED_CYCLE.length];
      completedIndex += 1;
    } else {
      status = total === null ? "draft" : ACTIVE_CYCLE[activeIndex % ACTIVE_CYCLE.length];
      activeIndex += 1;
    }

    const isPublished = status === "published";
    const stamp = isCompleted ? "2026-06-10T09:00:00.000Z" : "2026-10-14T09:00:00.000Z";

    results.push({
      id: `res-${enrollment.id}`,
      studentId: enrollment.studentId,
      offeringId: offering.id,
      status,
      totalScore: status === "draft" && total === null ? null : total,
      grade: status === "draft" && total === null ? null : graded?.grade ?? null,
      gradePoint: status === "draft" && total === null ? null : graded?.points ?? null,
      submittedAt: status !== "draft" ? stamp : undefined,
      reviewedAt: ["under_review", "approved", "published"].includes(status) ? stamp : undefined,
      approvedAt: ["approved", "published"].includes(status) ? stamp : undefined,
      publishedAt: isPublished ? stamp : undefined,
      history: historyFor(status, stamp, actorId),
    });
  }

  void rng;
  return results;
}
