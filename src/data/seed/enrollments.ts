import type { Course, CourseOffering, Enrollment, Student } from "@/types";
import { DEMO_IDS, type Random } from "./helpers";

function courseDept(courses: Course[], offering: CourseOffering): string {
  return courses.find((c) => c.id === offering.courseId)?.departmentId ?? "";
}

export function buildEnrollments(
  courses: Course[],
  offerings: CourseOffering[],
  students: Student[],
  rng: Random,
): Enrollment[] {
  const enrollments: Enrollment[] = [];
  let counter = 0;

  const enroll = (studentId: string, offeringId: string, enrolledAt: string, status: Enrollment["status"]) => {
    counter += 1;
    enrollments.push({
      id: `enr-${counter}`,
      studentId,
      offeringId,
      enrolledAt,
      status,
    });
  };

  const fall = offerings.filter((o) => o.semesterId === "sem-fall26" && o.status === "active");
  const completed = offerings.filter((o) => o.status === "completed");

  for (const student of students) {
    const dept = student.departmentId;

    if (student.id === DEMO_IDS.student) {
      for (const id of ["off-1", "off-2", "off-3", "off-4"]) {
        enroll(student.id, id, "2026-08-20", "active");
      }
      enroll(student.id, "off-11", "2026-01-12", "completed");
      continue;
    }

    if (student.status === "inactive" || student.status === "suspended") continue;

    const deptFall = fall.filter((o) => courseDept(courses, o) === dept);
    const chosen = rng.pickMany(deptFall, Math.min(rng.int(2, 4), deptFall.length));
    for (const offering of chosen) {
      enroll(student.id, offering.id, "2026-08-21", "active");
    }

    if (rng.chance(0.5)) {
      const deptCompleted = completed.filter((o) => courseDept(courses, o) === dept);
      if (deptCompleted.length > 0) {
        enroll(student.id, rng.pick(deptCompleted).id, "2026-01-12", "completed");
      }
    }
  }

  return enrollments;
}
