import type { ClassSession, CourseOffering } from "@/types";

const FALL_DATES = ["2026-09-07", "2026-09-21", "2026-10-05", "2026-10-19"];
const TOPICS = [
  "Course orientation and overview",
  "Core concepts and worked examples",
  "Applied problem solving",
  "Group discussion and review",
];

export function buildClassSessions(offerings: CourseOffering[]): ClassSession[] {
  const sessions: ClassSession[] = [];
  let counter = 0;

  for (const offering of offerings) {
    if (offering.status !== "active") continue;

    FALL_DATES.forEach((date, i) => {
      counter += 1;
      const [start, end] = offering.schedule.match(/\d{2}:\d{2}-\d{2}:\d{2}/)?.[0].split("-") ?? [
        "09:00",
        "10:30",
      ];
      sessions.push({
        id: `cls-${counter}`,
        offeringId: offering.id,
        date,
        startTime: start,
        endTime: end,
        topic: TOPICS[i % TOPICS.length],
        status: i < 2 ? "finalized" : "scheduled",
      });
    });
  }

  return sessions;
}
