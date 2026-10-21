/**
 * Coligo — shared domain types.
 *
 * These types describe the shape of every record the frontend consumes. When
 * the Express + PostgreSQL backend is built, these interfaces should mirror the
 * API response contracts so the service layer can be swapped without touching
 * components.
 */

export type ID = string;

export type ISODate = string;

export type Role = "admin" | "hod" | "teacher" | "student" | "examination";

export type AccountStatus = "active" | "inactive";

export interface User {
  id: ID;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  departmentId: ID | null;
  status: AccountStatus;
  createdAt: ISODate;
  studentId?: ID;
  teacherId?: ID;
}

export interface DemoCredential {
  role: Role;
  email: string;
  password: string;
  name: string;
  userId: ID;
}

export interface Session {
  userId: ID;
  role: Role;
  name: string;
  email: string;
  issuedAt: ISODate;
  token: string;
}

export interface Department {
  id: ID;
  code: string;
  name: string;
  description: string;
  hodId: ID | null;
  officeLocation: string;
  contactEmail: string;
  status: AccountStatus;
  createdAt: ISODate;
}

export type StudentStatus = "active" | "inactive" | "graduated" | "suspended";

export interface Student {
  id: ID;
  registrationNumber: string;
  fullName: string;
  email: string;
  phone: string;
  departmentId: ID;
  admissionDate: ISODate;
  currentSemester: number;
  status: StudentStatus;
  userId?: ID;
}

export interface Teacher {
  id: ID;
  employeeNumber: string;
  fullName: string;
  email: string;
  phone: string;
  departmentId: ID;
  designation: string;
  hireDate: ISODate;
  status: AccountStatus;
  userId?: ID;
}

export interface Course {
  id: ID;
  code: string;
  title: string;
  description: string;
  departmentId: ID;
  creditHours: number;
  level: string;
  prerequisiteIds: ID[];
  status: AccountStatus;
}

export type PeriodStatus = "active" | "upcoming" | "completed" | "inactive";

export interface AcademicSession {
  id: ID;
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  status: PeriodStatus;
}

export interface Semester {
  id: ID;
  name: string;
  sessionId: ID;
  startDate: ISODate;
  endDate: ISODate;
  status: PeriodStatus;
}

export type OfferingStatus = "active" | "completed" | "inactive";

export interface CourseOffering {
  id: ID;
  courseId: ID;
  sessionId: ID;
  semesterId: ID;
  section: string;
  teacherIds: ID[];
  capacity: number;
  schedule: string;
  room: string;
  status: OfferingStatus;
}

export type EnrollmentStatus = "active" | "dropped" | "completed";

export interface Enrollment {
  id: ID;
  studentId: ID;
  offeringId: ID;
  enrolledAt: ISODate;
  status: EnrollmentStatus;
}

export type SessionStatus = "scheduled" | "finalized";

export interface ClassSession {
  id: ID;
  offeringId: ID;
  date: ISODate;
  startTime: string;
  endTime: string;
  topic: string;
  status: SessionStatus;
}

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceRecord {
  id: ID;
  classSessionId: ID;
  studentId: ID;
  offeringId: ID;
  status: AttendanceStatus;
  markedById: ID | null;
  markedAt: ISODate;
}

export type AssessmentType =
  | "assignment"
  | "quiz"
  | "midterm"
  | "final"
  | "project"
  | "practical";

export type AssessmentStatus = "draft" | "open" | "closed";

export interface Assessment {
  id: ID;
  offeringId: ID;
  title: string;
  type: AssessmentType;
  maxMarks: number;
  weight: number;
  dueDate: ISODate;
  status: AssessmentStatus;
}

export interface Mark {
  id: ID;
  assessmentId: ID;
  studentId: ID;
  offeringId: ID;
  score: number;
  enteredAt: ISODate;
}

export type ExaminationType = "midterm" | "final" | "quiz" | "practical";
export type ExaminationStatus = "scheduled" | "completed" | "cancelled";

export interface Examination {
  id: ID;
  offeringId: ID;
  type: ExaminationType;
  date: ISODate;
  startTime: string;
  endTime: string;
  venue: string;
  status: ExaminationStatus;
}

export type ResultStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "published"
  | "returned";

export interface ResultHistoryEntry {
  status: ResultStatus;
  at: ISODate;
  by: ID | null;
  note?: string;
}

export interface Result {
  id: ID;
  studentId: ID;
  offeringId: ID;
  status: ResultStatus;
  totalScore: number | null;
  grade: string | null;
  gradePoint: number | null;
  submittedAt?: ISODate;
  reviewedAt?: ISODate;
  approvedAt?: ISODate;
  publishedAt?: ISODate;
  history: ResultHistoryEntry[];
}

export interface TimetableEntry {
  id: ID;
  offeringId: ID;
  teacherId: ID;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  section: string;
}

export type AnnouncementAudience =
  | "university"
  | "department"
  | "teachers"
  | "students"
  | "examination_staff";

export type AnnouncementStatus = "published" | "draft" | "archived";

export interface Announcement {
  id: ID;
  title: string;
  content: string;
  audience: AnnouncementAudience;
  departmentId: ID | null;
  authorId: ID;
  createdAt: ISODate;
  expiresAt: ISODate | null;
  status: AnnouncementStatus;
  readBy: ID[];
}

export type NotificationType = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: ID;
  userId: ID;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: ISODate;
  link?: string;
}

export interface AuditLog {
  id: ID;
  actorId: ID;
  actorName: string;
  action: string;
  entityType: string;
  entityId: ID;
  description: string;
  timestamp: ISODate;
}

export interface GradeBand {
  grade: string;
  min: number;
  max: number;
  points: number;
}

export interface Settings {
  universityName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  gradingScale: GradeBand[];
  attendanceThreshold: number;
  defaultCapacity: number;
  dateFormat: string;
  theme: "light" | "dark";
}

export interface Database {
  schemaVersion: number;
  users: User[];
  departments: Department[];
  students: Student[];
  teachers: Teacher[];
  courses: Course[];
  academicSessions: AcademicSession[];
  semesters: Semester[];
  courseOfferings: CourseOffering[];
  enrollments: Enrollment[];
  classSessions: ClassSession[];
  attendance: AttendanceRecord[];
  assessments: Assessment[];
  marks: Mark[];
  examinations: Examination[];
  results: Result[];
  timetable: TimetableEntry[];
  announcements: Announcement[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  settings: Settings;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  filters?: Record<string, string | undefined>;
}

export class AppError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "AppError";
  }
}
