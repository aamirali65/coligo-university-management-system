import type { Assessment } from "@/types";

/**
 * Assessments are defined per course offering. Weights within an offering must
 * sum to 100 so that weighted course totals are meaningful.
 */
export const assessments: Assessment[] = [
  // off-1 — CS301 Database Systems (Fall 2026)
  { id: "asg-1", offeringId: "off-1", title: "Assignment 1 — ER Modelling", type: "assignment", maxMarks: 20, weight: 10, dueDate: "2026-09-05", status: "closed" },
  { id: "asg-2", offeringId: "off-1", title: "Quiz 1 — Relational Algebra", type: "quiz", maxMarks: 10, weight: 10, dueDate: "2026-09-20", status: "closed" },
  { id: "asg-3", offeringId: "off-1", title: "Midterm Examination", type: "midterm", maxMarks: 50, weight: 25, dueDate: "2026-10-05", status: "closed" },
  { id: "asg-4", offeringId: "off-1", title: "Semester Project — Campus DB", type: "project", maxMarks: 50, weight: 20, dueDate: "2026-11-20", status: "open" },
  { id: "asg-5", offeringId: "off-1", title: "Final Examination", type: "final", maxMarks: 100, weight: 35, dueDate: "2026-12-15", status: "draft" },

  // off-2 — CS201 Data Structures (Fall 2026)
  { id: "asg-6", offeringId: "off-2", title: "Assignment 1 — Linked Lists", type: "assignment", maxMarks: 25, weight: 15, dueDate: "2026-09-08", status: "closed" },
  { id: "asg-7", offeringId: "off-2", title: "Quiz 1 — Complexity", type: "quiz", maxMarks: 15, weight: 10, dueDate: "2026-09-25", status: "closed" },
  { id: "asg-8", offeringId: "off-2", title: "Midterm Examination", type: "midterm", maxMarks: 50, weight: 25, dueDate: "2026-10-08", status: "closed" },
  { id: "asg-9", offeringId: "off-2", title: "Final Examination", type: "final", maxMarks: 100, weight: 50, dueDate: "2026-12-16", status: "draft" },

  // off-3 — CS101 Intro to Programming (Fall 2026)
  { id: "asg-10", offeringId: "off-3", title: "Assignment 1 — Loops & Functions", type: "assignment", maxMarks: 20, weight: 20, dueDate: "2026-09-10", status: "closed" },
  { id: "asg-11", offeringId: "off-3", title: "Quiz 1 — Basics", type: "quiz", maxMarks: 10, weight: 10, dueDate: "2026-09-28", status: "closed" },
  { id: "asg-12", offeringId: "off-3", title: "Midterm Examination", type: "midterm", maxMarks: 60, weight: 30, dueDate: "2026-10-10", status: "closed" },
  { id: "asg-13", offeringId: "off-3", title: "Final Examination", type: "final", maxMarks: 100, weight: 40, dueDate: "2026-12-17", status: "draft" },

  // off-4 — CS401 Operating Systems (Fall 2026)
  { id: "asg-14", offeringId: "off-4", title: "Midterm Examination", type: "midterm", maxMarks: 60, weight: 40, dueDate: "2026-10-12", status: "closed" },
  { id: "asg-15", offeringId: "off-4", title: "Final Examination", type: "final", maxMarks: 100, weight: 60, dueDate: "2026-12-18", status: "draft" },

  // off-11 — CS301 Database Systems (Spring 2026, completed)
  { id: "asg-16", offeringId: "off-11", title: "Assignment 1 — SQL Practice", type: "assignment", maxMarks: 20, weight: 20, dueDate: "2026-03-01", status: "closed" },
  { id: "asg-17", offeringId: "off-11", title: "Midterm Examination", type: "midterm", maxMarks: 50, weight: 30, dueDate: "2026-04-01", status: "closed" },
  { id: "asg-18", offeringId: "off-11", title: "Final Examination", type: "final", maxMarks: 100, weight: 50, dueDate: "2026-05-15", status: "closed" },

  // off-12 — MA101 Calculus I (Spring 2026, completed)
  { id: "asg-19", offeringId: "off-12", title: "Midterm Examination", type: "midterm", maxMarks: 50, weight: 40, dueDate: "2026-04-02", status: "closed" },
  { id: "asg-20", offeringId: "off-12", title: "Final Examination", type: "final", maxMarks: 100, weight: 60, dueDate: "2026-05-16", status: "closed" },
];
