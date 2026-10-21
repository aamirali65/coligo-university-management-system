import type { Examination } from "@/types";

export const examinations: Examination[] = [
  { id: "exam-1", offeringId: "off-1", type: "final", date: "2026-12-15", startTime: "09:00", endTime: "12:00", venue: "Examination Hall A", status: "scheduled" },
  { id: "exam-2", offeringId: "off-2", type: "final", date: "2026-12-16", startTime: "09:00", endTime: "12:00", venue: "Examination Hall B", status: "scheduled" },
  { id: "exam-3", offeringId: "off-3", type: "final", date: "2026-12-17", startTime: "09:00", endTime: "12:00", venue: "Examination Hall A", status: "scheduled" },
  { id: "exam-4", offeringId: "off-4", type: "final", date: "2026-12-18", startTime: "09:00", endTime: "12:00", venue: "Examination Hall C", status: "scheduled" },
  { id: "exam-5", offeringId: "off-5", type: "midterm", date: "2026-10-20", startTime: "10:00", endTime: "12:00", venue: "Examination Hall B", status: "scheduled" },
  { id: "exam-6", offeringId: "off-6", type: "midterm", date: "2026-10-21", startTime: "10:00", endTime: "12:00", venue: "Examination Hall C", status: "scheduled" },
  { id: "exam-7", offeringId: "off-11", type: "final", date: "2026-05-15", startTime: "09:00", endTime: "12:00", venue: "Examination Hall A", status: "completed" },
  { id: "exam-8", offeringId: "off-12", type: "final", date: "2026-05-16", startTime: "09:00", endTime: "12:00", venue: "Examination Hall D", status: "completed" },
];
