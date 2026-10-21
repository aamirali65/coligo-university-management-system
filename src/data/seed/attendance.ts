import type {
  AttendanceRecord,
  AttendanceStatus,
  ClassSession,
  CourseOffering,
  Enrollment,
} from "@/types";
import type { Random } from "./helpers";

const WEIGHTED_STATUS: AttendanceStatus[] = [
  "present", "present", "present", "present", "present", "present", "present",
  "present", "present", "present", "present", "present", "present", "present",
  "absent", "late", "late", "excused",
];

export function buildAttendance(
  sessions: ClassSession[],
  enrollments: Enrollment[],
  offerings: CourseOffering[],
  rng: Random,
): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  let counter = 0;

  for (const session of sessions) {
    if (session.status !== "finalized") continue;

    const offering = offerings.find((o) => o.id === session.offeringId);
    const markedById = offering?.teacherIds[0] ?? null;
    const cohort = enrollments.filter(
      (e) => e.offeringId === session.offeringId && e.status === "active",
    );

    for (const enrollment of cohort) {
      counter += 1;
      records.push({
        id: `att-${counter}`,
        classSessionId: session.id,
        studentId: enrollment.studentId,
        offeringId: session.offeringId,
        status: rng.pick(WEIGHTED_STATUS),
        markedById,
        markedAt: `${session.date}T10:45:00.000Z`,
      });
    }
  }

  return records;
}
