import type { Student, StudentStatus } from "@/types";
import { DEPT_IDS, DEMO_IDS, FIRST_NAMES, LAST_NAMES, makeRandom } from "./helpers";

const rng = makeRandom(20260101);

const STATUS_POOL: StudentStatus[] = [
  "active", "active", "active", "active", "active",
  "active", "active", "active", "active", "active",
  "active", "active", "active", "active", "active",
  "active", "active", "active", "active", "active",
  "active", "active", "active", "active", "active",
  "inactive", "active", "suspended", "active", "graduated",
];

const DEPT_PLAN: { dept: string; code: string; count: number }[] = [
  { dept: DEPT_IDS.cs, code: "CS", count: 10 },
  { dept: DEPT_IDS.ee, code: "EE", count: 6 },
  { dept: DEPT_IDS.ba, code: "BA", count: 6 },
  { dept: DEPT_IDS.ma, code: "MA", count: 4 },
  { dept: DEPT_IDS.ph, code: "PH", count: 4 },
];

function buildStudents(): Student[] {
  const list: Student[] = [];
  let index = 0;

  const usedNames = new Set<string>(["Hamza Malik"]);

  for (const plan of DEPT_PLAN) {
    for (let i = 0; i < plan.count; i += 1) {
      index += 1;
      const id = `stu-${index}`;

      let fullName: string;
      if (index === 1) {
        fullName = "Hamza Malik";
      } else {
        do {
          fullName = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
        } while (usedNames.has(fullName));
        usedNames.add(fullName);
      }

      const admissionYear = rng.int(2021, 2025);
      const currentSemester = Math.min(8, (2026 - admissionYear) * 2 + rng.int(1, 2));
      const registrationNumber = `${admissionYear}-${plan.code}-${String(index).padStart(3, "0")}`;

      list.push({
        id,
        registrationNumber,
        fullName,
        email: index === 1
          ? "student@coligo.demo"
          : `${fullName.toLowerCase().replace(/[^a-z]+/g, ".")}@coligo.demo`,
        phone: `+92 33${rng.int(1, 9)} ${rng.int(1000000, 9999999)}`,
        departmentId: plan.dept,
        admissionDate: `${admissionYear}-08-20`,
        currentSemester,
        status: STATUS_POOL[index - 1] ?? "active",
        userId: `user-student-${index}`,
      });
    }
  }

  return list;
}

export const students: Student[] = buildStudents();

export function findDemoStudent(): Student {
  return students.find((s) => s.id === DEMO_IDS.student) ?? students[0];
}
