import type { Department } from "@/types";
import { DEPT_IDS } from "./helpers";

export const departments: Department[] = [
  {
    id: DEPT_IDS.cs,
    code: "CS",
    name: "Computer Science",
    description:
      "Software engineering, algorithms, databases, artificial intelligence and systems research.",
    hodId: null,
    officeLocation: "Block A, Level 2, Room 214",
    contactEmail: "cs@coligo.demo",
    status: "active",
    createdAt: "2019-08-01",
  },
  {
    id: DEPT_IDS.ee,
    code: "EE",
    name: "Electrical Engineering",
    description:
      "Power systems, electronics, signal processing, control and embedded systems.",
    hodId: null,
    officeLocation: "Block B, Level 1, Room 108",
    contactEmail: "ee@coligo.demo",
    status: "active",
    createdAt: "2019-08-01",
  },
  {
    id: DEPT_IDS.ba,
    code: "BA",
    name: "Business Administration",
    description:
      "Management, accounting, marketing, entrepreneurship and organisational studies.",
    hodId: null,
    officeLocation: "Block C, Level 3, Room 306",
    contactEmail: "ba@coligo.demo",
    status: "active",
    createdAt: "2020-01-15",
  },
  {
    id: DEPT_IDS.ma,
    code: "MA",
    name: "Mathematics",
    description:
      "Pure and applied mathematics, statistics, numerical analysis and operations research.",
    hodId: null,
    officeLocation: "Block A, Level 4, Room 412",
    contactEmail: "math@coligo.demo",
    status: "active",
    createdAt: "2019-08-01",
  },
  {
    id: DEPT_IDS.ph,
    code: "PH",
    name: "Physics",
    description:
      "Classical and modern physics, applied optics, materials and computational physics.",
    hodId: null,
    officeLocation: "Block D, Level 1, Room 121",
    contactEmail: "physics@coligo.demo",
    status: "active",
    createdAt: "2021-09-01",
  },
];
