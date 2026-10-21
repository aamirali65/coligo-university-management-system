import type { Course } from "@/types";
import { DEPT_IDS } from "./helpers";

export const courses: Course[] = [
  {
    id: "crs-1",
    code: "CS101",
    title: "Introduction to Programming",
    description:
      "Foundations of programming using a high-level language: variables, control flow, functions, arrays and an introduction to problem solving.",
    departmentId: DEPT_IDS.cs,
    creditHours: 3,
    level: "100",
    prerequisiteIds: [],
    status: "active",
  },
  {
    id: "crs-2",
    code: "CS201",
    title: "Data Structures & Algorithms",
    description:
      "Linear and non-linear data structures, sorting, searching, complexity analysis and algorithm design techniques.",
    departmentId: DEPT_IDS.cs,
    creditHours: 4,
    level: "200",
    prerequisiteIds: ["crs-1"],
    status: "active",
  },
  {
    id: "crs-3",
    code: "CS301",
    title: "Database Systems",
    description:
      "Relational model, SQL, normalisation, transactions, indexing and database design for real-world applications.",
    departmentId: DEPT_IDS.cs,
    creditHours: 3,
    level: "300",
    prerequisiteIds: ["crs-2"],
    status: "active",
  },
  {
    id: "crs-4",
    code: "CS401",
    title: "Operating Systems",
    description:
      "Processes, scheduling, memory management, file systems, concurrency and inter-process communication.",
    departmentId: DEPT_IDS.cs,
    creditHours: 3,
    level: "400",
    prerequisiteIds: ["crs-2"],
    status: "active",
  },
  {
    id: "crs-5",
    code: "EE101",
    title: "Circuit Analysis",
    description:
      "Ohm's and Kirchhoff's laws, network theorems, transient and steady-state analysis of AC/DC circuits.",
    departmentId: DEPT_IDS.ee,
    creditHours: 3,
    level: "100",
    prerequisiteIds: [],
    status: "active",
  },
  {
    id: "crs-6",
    code: "EE201",
    title: "Digital Logic Design",
    description:
      "Boolean algebra, combinational and sequential logic, minimisation techniques and digital system design.",
    departmentId: DEPT_IDS.ee,
    creditHours: 4,
    level: "200",
    prerequisiteIds: ["crs-5"],
    status: "active",
  },
  {
    id: "crs-7",
    code: "BA101",
    title: "Principles of Management",
    description:
      "Management functions, organisational behaviour, planning, leading and controlling in modern enterprises.",
    departmentId: DEPT_IDS.ba,
    creditHours: 3,
    level: "100",
    prerequisiteIds: [],
    status: "active",
  },
  {
    id: "crs-8",
    code: "BA201",
    title: "Financial Accounting",
    description:
      "Recording transactions, preparing financial statements and interpreting accounting information for decisions.",
    departmentId: DEPT_IDS.ba,
    creditHours: 3,
    level: "200",
    prerequisiteIds: ["crs-7"],
    status: "active",
  },
  {
    id: "crs-9",
    code: "MA101",
    title: "Calculus I",
    description:
      "Limits, continuity, differentiation, integration and applications of the calculus of a single variable.",
    departmentId: DEPT_IDS.ma,
    creditHours: 4,
    level: "100",
    prerequisiteIds: [],
    status: "active",
  },
  {
    id: "crs-10",
    code: "PH101",
    title: "Physics I",
    description:
      "Mechanics, waves, thermodynamics and an introduction to modern physics with laboratory work.",
    departmentId: DEPT_IDS.ph,
    creditHours: 3,
    level: "100",
    prerequisiteIds: [],
    status: "inactive",
  },
];
