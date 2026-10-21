import type { GradeBand } from "@/types";

export interface GradeResult {
  grade: string | null;
  points: number | null;
  band: GradeBand | null;
}

/**
 * Convert a course total percentage (0-100) into a letter grade and grade
 * points using the configured grading scale.
 */
export function gradeForPercent(total: number, scale: GradeBand[]): GradeResult {
  const band = scale.find((b) => total >= b.min && total <= b.max) ?? null;
  return {
    grade: band?.grade ?? null,
    points: band?.points ?? null,
    band,
  };
}

/**
 * Weighted course total from assessment marks.
 *
 * @param entries each assessment's earned fraction and configured weight
 * @returns percentage 0-100, or null when no weight has been recorded
 */
export function weightedTotal(
  entries: { earned: number; max: number; weight: number }[],
): number | null {
  const usable = entries.filter((e) => e.max > 0 && e.weight > 0);
  if (usable.length === 0) return null;
  const total = usable.reduce((sum, e) => sum + (e.earned / e.max) * e.weight, 0);
  return Math.round(total * 100) / 100;
}

export interface GpaCourse {
  gradePoint: number | null;
  creditHours: number;
}

/**
 * Credit-weighted GPA. Courses without a grade point (pending) are ignored.
 */
export function calculateGpa(courses: GpaCourse[]): number | null {
  const graded = courses.filter((c) => c.gradePoint !== null && c.creditHours > 0);
  if (graded.length === 0) return null;
  const totalCredits = graded.reduce((sum, c) => sum + c.creditHours, 0);
  const totalPoints = graded.reduce((sum, c) => sum + (c.gradePoint ?? 0) * c.creditHours, 0);
  return Math.round((totalPoints / totalCredits) * 100) / 100;
}
