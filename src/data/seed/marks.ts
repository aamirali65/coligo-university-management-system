import type { Assessment, Enrollment, Mark } from "@/types";
import type { Random } from "./helpers";

export function buildMarks(
  assessments: Assessment[],
  enrollments: Enrollment[],
  rng: Random,
): Mark[] {
  const marks: Mark[] = [];
  let counter = 0;

  for (const assessment of assessments) {
    if (assessment.status === "draft") continue;

    const cohort = enrollments.filter(
      (e) => e.offeringId === assessment.offeringId && e.status !== "dropped",
    );

    for (const enrollment of cohort) {
      if (assessment.status === "open" && rng.chance(0.35)) continue;

      const ratio = rng.float(0.45, 0.98);
      const score = Math.round(assessment.maxMarks * ratio * 10) / 10;
      counter += 1;
      marks.push({
        id: `mrk-${counter}`,
        assessmentId: assessment.id,
        studentId: enrollment.studentId,
        offeringId: assessment.offeringId,
        score,
        enteredAt: assessment.dueDate,
      });
    }
  }

  return marks;
}
