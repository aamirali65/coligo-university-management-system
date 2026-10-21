import type { CourseOffering, TimetableEntry } from "@/types";

const DAY_MAP: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Build the weekly timetable from each offering's schedule string, e.g.
 * "Mon/Wed 09:00-10:30". This keeps timetable entries consistent with the
 * course offerings they belong to.
 */
export function buildTimetable(offerings: CourseOffering[]): TimetableEntry[] {
  const entries: TimetableEntry[] = [];
  let counter = 0;

  for (const offering of offerings) {
    if (offering.status !== "active") continue;

    const match = offering.schedule.match(/^([A-Za-z/]+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if (!match) continue;
    const [, days, start, end] = match;

    for (const day of days.split("/")) {
      const dayOfWeek = DAY_MAP[day];
      if (!dayOfWeek) continue;
      counter += 1;
      entries.push({
        id: `tt-${counter}`,
        offeringId: offering.id,
        teacherId: offering.teacherIds[0],
        dayOfWeek,
        startTime: start,
        endTime: end,
        room: offering.room,
        section: offering.section,
      });
    }
  }

  return entries;
}
