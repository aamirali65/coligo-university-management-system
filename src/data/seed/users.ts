import type { DemoCredential, User } from "@/types";
import { DEMO_IDS, DEPT_IDS } from "./helpers";
import { teachers } from "./teachers";
import { students } from "./students";

const HOD_USER_IDS: Record<string, string> = {
  [DEMO_IDS.hodTeacher]: DEPT_IDS.cs,
  "tch-2": DEPT_IDS.ee,
  "tch-3": DEPT_IDS.ba,
  "tch-4": DEPT_IDS.ma,
  "tch-5": DEPT_IDS.ph,
};

function buildUsers(): User[] {
  const users: User[] = [
    {
      id: DEMO_IDS.adminUser,
      fullName: "Ahmed Khan",
      email: "admin@coligo.demo",
      phone: "+92 300 100 0001",
      role: "admin",
      departmentId: null,
      status: "active",
      createdAt: "2019-07-15",
    },
    {
      id: DEMO_IDS.examUser,
      fullName: "Fatima Noor",
      email: "exams@coligo.demo",
      phone: "+92 300 100 0002",
      role: "examination",
      departmentId: null,
      status: "active",
      createdAt: "2020-03-02",
    },
  ];

  for (const teacher of teachers) {
    const isHod = Boolean(HOD_USER_IDS[teacher.id]);
    users.push({
      id: teacher.userId ?? `user-${teacher.id}`,
      fullName: teacher.fullName,
      email: teacher.email,
      phone: teacher.phone,
      role: isHod ? "hod" : "teacher",
      departmentId: teacher.departmentId,
      status: teacher.status,
      createdAt: teacher.hireDate,
      teacherId: teacher.id,
    });
  }

  for (const student of students) {
    users.push({
      id: student.userId ?? `user-${student.id}`,
      fullName: student.fullName,
      email: student.email,
      phone: student.phone,
      role: "student",
      departmentId: student.departmentId,
      status: student.status === "active" ? "active" : "inactive",
      createdAt: student.admissionDate,
      studentId: student.id,
    });
  }

  return users;
}

export const users: User[] = buildUsers();

/** Maps each department to the userId of its Head of Department. */
export const departmentHods: Record<string, string> = {
  [DEPT_IDS.cs]: DEMO_IDS.hodUser,
  [DEPT_IDS.ee]: "user-teacher-t2",
  [DEPT_IDS.ba]: "user-teacher-t3",
  [DEPT_IDS.ma]: "user-teacher-t4",
  [DEPT_IDS.ph]: "user-teacher-t5",
};

/**
 * Demo credentials for this local demonstration only.
 *
 * These are validated in-memory by the mock auth service and are NEVER written
 * to localStorage. Real authentication, password hashing and authorization must
 * be implemented on the Express + PostgreSQL backend in a later phase.
 */
export const demoCredentials: DemoCredential[] = [
  { role: "admin", email: "admin@coligo.demo", password: "Admin123!", name: "Ahmed Khan", userId: DEMO_IDS.adminUser },
  { role: "hod", email: "hod@coligo.demo", password: "Hod123!", name: "Sara Ahmed", userId: DEMO_IDS.hodUser },
  { role: "teacher", email: "teacher@coligo.demo", password: "Teacher123!", name: "Ali Raza", userId: DEMO_IDS.teacherUser },
  { role: "student", email: "student@coligo.demo", password: "Student123!", name: "Hamza Malik", userId: DEMO_IDS.studentUser },
  { role: "examination", email: "exams@coligo.demo", password: "Exams123!", name: "Fatima Noor", userId: DEMO_IDS.examUser },
];
