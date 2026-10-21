import type { Database } from "@/types";
import { SCHEMA_VERSION } from "@/lib/constants";
import { departments } from "./departments";
import { academicSessions } from "./academicSessions";
import { semesters } from "./semesters";
import { courses } from "./courses";
import { teachers } from "./teachers";
import { students } from "./students";
import { departmentHods, users } from "./users";
import { courseOfferings } from "./courseOfferings";
import { buildEnrollments } from "./enrollments";
import { buildClassSessions } from "./classSessions";
import { buildAttendance } from "./attendance";
import { assessments } from "./assessments";
import { buildMarks } from "./marks";
import { examinations } from "./examinations";
import { buildResults } from "./results";
import { buildTimetable } from "./timetable";
import { announcements } from "./announcements";
import { notifications } from "./notifications";
import { auditLogs } from "./auditLogs";
import { settings } from "./settings";
import { makeRandom } from "./helpers";

export { demoCredentials } from "./users";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Assemble a fully consistent seed database.
 *
 * Every relationship is resolved in dependency order so the result contains no
 * orphaned records. Called both to initialise localStorage and to reset demo
 * data from the Admin settings page.
 */
export function buildSeedDatabase(): Database {
  const seedDepartments = clone(departments).map((dept) => ({
    ...dept,
    hodId: departmentHods[dept.id] ?? null,
  }));

  const seedOfferings = clone(courseOfferings);
  const seedStudents = clone(students);
  const seedTeachers = clone(teachers);
  const seedAssessments = clone(assessments);

  const enrollments = buildEnrollments(courses, seedOfferings, seedStudents, makeRandom(777));
  const classSessions = buildClassSessions(seedOfferings);
  const attendance = buildAttendance(classSessions, enrollments, seedOfferings, makeRandom(999));
  const marks = buildMarks(seedAssessments, enrollments, makeRandom(555));
  const results = buildResults(
    enrollments,
    seedOfferings,
    seedAssessments,
    marks,
    makeRandom(333),
    seedTeachers.map((t) => t.id),
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    users: clone(users),
    departments: seedDepartments,
    students: seedStudents,
    teachers: seedTeachers,
    courses: clone(courses),
    academicSessions: clone(academicSessions),
    semesters: clone(semesters),
    courseOfferings: seedOfferings,
    enrollments,
    classSessions,
    attendance,
    assessments: seedAssessments,
    marks,
    examinations: clone(examinations),
    results,
    timetable: buildTimetable(seedOfferings),
    announcements: clone(announcements),
    notifications: clone(notifications),
    auditLogs: clone(auditLogs),
    settings: clone(settings),
  };
}
