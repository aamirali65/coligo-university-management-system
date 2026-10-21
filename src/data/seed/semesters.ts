import type { Semester } from "@/types";

export const semesters: Semester[] = [
  {
    id: "sem-fall25",
    name: "Fall 2025",
    sessionId: "sess-2025",
    startDate: "2025-08-25",
    endDate: "2025-12-20",
    status: "completed",
  },
  {
    id: "sem-spring26",
    name: "Spring 2026",
    sessionId: "sess-2025",
    startDate: "2026-01-15",
    endDate: "2026-05-30",
    status: "completed",
  },
  {
    id: "sem-fall26",
    name: "Fall 2026",
    sessionId: "sess-2026",
    startDate: "2026-08-24",
    endDate: "2026-12-19",
    status: "active",
  },
  {
    id: "sem-spring27",
    name: "Spring 2027",
    sessionId: "sess-2026",
    startDate: "2027-01-14",
    endDate: "2027-05-29",
    status: "upcoming",
  },
];
