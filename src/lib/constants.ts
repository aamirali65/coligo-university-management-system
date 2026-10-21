import type {
  AssessmentType,
  AttendanceStatus,
  AnnouncementAudience,
  GradeBand,
  PeriodStatus,
  ResultStatus,
  Role,
} from "@/types";

export const APP_NAME = "Coligo";
export const APP_TAGLINE = "Your University, Connected.";
export const SCHEMA_VERSION = 1;

export const STORAGE_PREFIX = "coligo";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  hod: "Head of Department",
  teacher: "Teacher",
  student: "Student",
  examination: "Examination Officer",
};

export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin/dashboard",
  hod: "/hod/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
  examination: "/examinations/dashboard",
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Academic week is Monday (1) through Saturday (6). */
export const ACADEMIC_DAYS = [1, 2, 3, 4, 5, 6];

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  assignment: "Assignment",
  quiz: "Quiz",
  midterm: "Midterm",
  final: "Final Examination",
  project: "Project",
  practical: "Practical",
};

export const RESULT_STATUS_LABELS: Record<ResultStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  published: "Published",
  returned: "Returned",
};

export const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  university: "University-wide",
  department: "Department",
  teachers: "Teachers",
  students: "Students",
  examination_staff: "Examination Staff",
};

export const PERIOD_STATUS_LABELS: Record<PeriodStatus, string> = {
  active: "Active",
  upcoming: "Upcoming",
  completed: "Completed",
  inactive: "Inactive",
};

export const STUDENT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  graduated: "Graduated",
  suspended: "Suspended",
};

export const DESIGNATIONS = [
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Lecturer",
  "Lab Instructor",
  "Visiting Faculty",
];

export const COURSE_LEVELS = ["100", "200", "300", "400", "500", "600"];

/**
 * Documented demo grading scale.
 *
 * Course totals are calculated as the weighted sum of assessment marks:
 *   total% = sum over assessments of (score / maxMarks * weight)
 * The total percentage is then converted to a letter grade and grade points
 * using this table. GPA is the credit-weighted average of course grade points:
 *   GPA = sum(gradePoints * creditHours) / sum(creditHours)
 */
export const DEFAULT_GRADING_SCALE: GradeBand[] = [
  { grade: "A", min: 90, max: 100, points: 4.0 },
  { grade: "A-", min: 85, max: 89.99, points: 3.7 },
  { grade: "B+", min: 80, max: 84.99, points: 3.3 },
  { grade: "B", min: 75, max: 79.99, points: 3.0 },
  { grade: "B-", min: 70, max: 74.99, points: 2.7 },
  { grade: "C+", min: 65, max: 69.99, points: 2.3 },
  { grade: "C", min: 60, max: 64.99, points: 2.0 },
  { grade: "D", min: 50, max: 59.99, points: 1.0 },
  { grade: "F", min: 0, max: 49.99, points: 0.0 },
];

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  login: "Logged in",
  logout: "Logged out",
  submit: "Submitted",
  approve: "Approved",
  publish: "Published",
  return: "Returned",
  activate: "Activated",
  deactivate: "Deactivated",
  reset: "Reset demo data",
};
