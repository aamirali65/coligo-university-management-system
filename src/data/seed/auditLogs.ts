import type { AuditLog } from "@/types";
import { DEMO_IDS } from "./helpers";

export const auditLogs: AuditLog[] = [
  { id: "log-1", actorId: DEMO_IDS.adminUser, actorName: "Ahmed Khan", action: "create", entityType: "Student", entityId: "stu-31", description: "Created student record for a new Computer Science admission.", timestamp: "2026-10-15T08:05:00.000Z" },
  { id: "log-2", actorId: DEMO_IDS.teacherUser, actorName: "Ali Raza", action: "update", entityType: "Attendance", entityId: "cls-1", description: "Marked attendance for CS301 Database Systems (Sep 7).", timestamp: "2026-10-15T07:50:00.000Z" },
  { id: "log-3", actorId: DEMO_IDS.examUser, actorName: "Fatima Noor", action: "approve", entityType: "Result", entityId: "res-enr-41", description: "Approved Spring 2026 results for CS301 Database Systems.", timestamp: "2026-10-14T14:35:00.000Z" },
  { id: "log-4", actorId: DEMO_IDS.examUser, actorName: "Fatima Noor", action: "publish", entityType: "Result", entityId: "res-enr-41", description: "Published Spring 2026 results for CS301 Database Systems.", timestamp: "2026-10-14T14:40:00.000Z" },
  { id: "log-5", actorId: DEMO_IDS.teacherUser, actorName: "Ali Raza", action: "create", entityType: "Assessment", entityId: "asg-5", description: "Created Final Examination assessment for CS301.", timestamp: "2026-10-13T10:10:00.000Z" },
  { id: "log-6", actorId: DEMO_IDS.adminUser, actorName: "Ahmed Khan", action: "update", entityType: "Teacher", entityId: "tch-8", description: "Updated contact details for Rabia Javed.", timestamp: "2026-10-13T09:20:00.000Z" },
  { id: "log-7", actorId: DEMO_IDS.adminUser, actorName: "Ahmed Khan", action: "create", entityType: "Course", entityId: "crs-10", description: "Created course PH101 Physics I.", timestamp: "2026-10-12T15:00:00.000Z" },
  { id: "log-8", actorId: DEMO_IDS.hodUser, actorName: "Sara Ahmed", action: "submit", entityType: "Result", entityId: "res-enr-42", description: "Submitted CS201 Data Structures results for review.", timestamp: "2026-10-12T13:15:00.000Z" },
  { id: "log-9", actorId: DEMO_IDS.teacherUser, actorName: "Ali Raza", action: "update", entityType: "Mark", entityId: "mrk-12", description: "Updated marks for Assignment 1 — ER Modelling.", timestamp: "2026-10-11T16:20:00.000Z" },
  { id: "log-10", actorId: DEMO_IDS.adminUser, actorName: "Ahmed Khan", action: "deactivate", entityType: "User", entityId: "user-teacher-t10", description: "Deactivated account for Mahnoor Butt.", timestamp: "2026-10-11T11:00:00.000Z" },
  { id: "log-11", actorId: DEMO_IDS.examUser, actorName: "Fatima Noor", action: "create", entityType: "Examination", entityId: "exam-1", description: "Scheduled final examination for CS301 Database Systems.", timestamp: "2026-10-10T09:30:00.000Z" },
  { id: "log-12", actorId: DEMO_IDS.adminUser, actorName: "Ahmed Khan", action: "update", entityType: "Department", entityId: "dept-ba", description: "Updated office location for Business Administration.", timestamp: "2026-10-09T14:00:00.000Z" },
  { id: "log-13", actorId: DEMO_IDS.hodUser, actorName: "Sara Ahmed", action: "create", entityType: "Announcement", entityId: "ann-3", description: "Published Database Systems project deadline announcement.", timestamp: "2026-10-10T09:15:00.000Z" },
  { id: "log-14", actorId: DEMO_IDS.adminUser, actorName: "Ahmed Khan", action: "update", entityType: "Course", entityId: "crs-3", description: "Updated prerequisite for CS301 Database Systems.", timestamp: "2026-10-08T10:45:00.000Z" },
  { id: "log-15", actorId: DEMO_IDS.adminUser, actorName: "Ahmed Khan", action: "update", entityType: "Settings", entityId: "settings", description: "Updated attendance threshold to 75%.", timestamp: "2026-10-07T08:00:00.000Z" },
];
