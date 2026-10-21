# Roles & Permissions

Coligo implements five roles. This document describes what each role can see and do, and how data is scoped.

> These rules are enforced client-side for demonstration and UX purposes. A production backend must enforce the same boundaries on every request.

---

## Role summary

| Role | Home | Scope |
| --- | --- | --- |
| **Administrator** (`admin`) | `/admin/dashboard` | Entire institution |
| **Head of Department** (`hod`) | `/hod/dashboard` | Own department only |
| **Teacher** (`teacher`) | `/teacher/dashboard` | Own assigned course offerings |
| **Student** (`student`) | `/student/dashboard` | Own enrollments and published results |
| **Examination Officer** (`examination`) | `/examinations/dashboard` | Institution-wide examinations and results |

Navigation is derived from `NAVIGATION` in `src/lib/navigation.ts`, so a role only sees routes it can use.

---

## Permission matrix

Legend: ✅ full access · 👁 read-only · 🔒 scoped/limited · — no access

| Capability | Admin | HOD | Teacher | Student | Exam Officer |
| --- | :---: | :---: | :---: | :---: | :---: |
| Dashboard analytics | ✅ | 🔒 dept | 🔒 courses | 🔒 personal | 🔒 exams |
| Departments | ✅ | 👁 own | — | — | — |
| Courses | ✅ | 🔒 dept | 👁 assigned | 👁 enrolled | 👁 all |
| Academic sessions | ✅ | 👁 | — | — | 👁 |
| Semesters | ✅ | 👁 | — | — | 👁 |
| Course offerings | ✅ | 🔒 dept | 👁 assigned | 👁 enrolled | 👁 all |
| Timetable | ✅ | 👁 dept | 👁 own | 👁 own | — |
| Students | ✅ | 🔒 dept | 🔒 enrolled | 👁 self | 👁 all |
| Teachers | ✅ | 🔒 dept | 👁 self | — | 👁 all |
| User accounts | ✅ | — | — | — | — |
| Enrollments | ✅ | 👁 dept | 👁 assigned | 👁 own | 👁 all |
| Attendance | ✅ | 👁 dept | ✅ mark | 👁 own | 👁 all |
| Assessments | ✅ | 👁 dept | ✅ manage | 👁 own | 👁 all |
| Marks | ✅ | 👁 dept | ✅ enter | 🔒 published only | 👁 all |
| Examinations | 👁 | 👁 | 👁 | 👁 own | ✅ manage |
| Results | ✅ | 👁 dept | 👁 draft/submit | 🔒 published only | ✅ review/publish |
| Announcements | ✅ CRUD | 👁 scoped | 👁 scoped | 👁 scoped | 👁 scoped |
| Reports | ✅ | 🔒 dept | 👁 courses | — | ✅ exams |
| Audit logs | ✅ | — | — | — | — |
| Settings | ✅ | — | — | — | — |
| Profile | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Scoping rules

### Administrator

Unrestricted access to every module. Admins can:

- create, edit, and delete departments, courses, sessions, semesters, offerings, students, teachers, users, and announcements;
- assign HODs and teaching teams;
- schedule the timetable and resolve conflicts;
- review audit logs and change institution settings, including the grading scale;
- reset the demo dataset.

Guard rails still apply: the last active administrator cannot be demoted or deactivated, and departments/courses/semesters with dependants cannot be deleted.

### Head of Department

Resolved from `user.departmentId`. The HOD only sees students, teachers, courses, offerings, attendance, and performance for that department.

- Can view detail pages for their staff and students.
- Can read departmental reports.
- Does not manage user accounts, settings, or audit logs.
- Announcements targeted at the department are visible.

### Teacher

Resolved from `user.teacherId` (`teacherService.byUserId`).

- Sees only course offerings where `offering.teacherIds` includes their teacher id.
- Can create and manage class sessions and attendance for those offerings.
- Can create assessments and enter marks.
- Submits results for review; cannot approve or publish them.
- Sees their own timetable and the students enrolled in their offerings.

### Student

Resolved from `user.studentId` (`studentService.byUserId`).

- Sees only their own enrollments, attendance history, timetable, and profile.
- **Results are filtered to `status === "published"`.** Draft, submitted, approved, and returned results are never exposed, even for their own courses.
- Can read announcements targeted at students and the university.

### Examination Officer

- Schedules examinations and receives conflict warnings for rooms/time slots.
- Reviews assessments and their uploaded marks.
- Runs the marks-review pipeline: start review, approve, return, publish.
- Can publish results per offering or individually.
- Produces examination reports and exports datasets.
- Cannot modify enrollments, attendance, or academic structure.

---

## Announcement audiences

Announcements are filtered by `announcementService.visibleFor(db, user)`:

| Audience | Visible to |
| --- | --- |
| `university` | Everyone |
| `department` | Users whose `departmentId` matches the announcement |
| `teachers` | Teachers and HODs |
| `students` | Students |
| `examination_staff` | Examination officers |

Admins see everything, including drafts and archived entries, in the management view. Other roles only see published, non-expired announcements in a read-only feed.

---

## Result visibility summary

| Result status | Student | Teacher | Exam Officer | Admin | HOD |
| --- | :---: | :---: | :---: | :---: | :---: |
| `draft` | — | 👁 own offerings | 👁 | 👁 | 👁 dept |
| `submitted` | — | 👁 | ✅ review | 👁 | 👁 dept |
| `under_review` | — | 👁 | ✅ decide | 👁 | 👁 dept |
| `approved` | — | 👁 | ✅ publish | 👁 | 👁 dept |
| `published` | 👁 own | 👁 | 👁 | 👁 | 👁 dept |
| `returned` | — | 👁 | ✅ resubmit | 👁 | 👁 dept |

---

## Implementing new rules

1. Prefer filtering in the **service selector** (e.g. `studentService.resultsFor(db, studentId, publishedOnly)`), not in the component.
2. Add a `RoleGuard` entry in `src/app/router.tsx` for any new route subtree.
3. Hide navigation items a role cannot use by updating `NAVIGATION` in `src/lib/navigation.ts`.
4. When the backend arrives, mirror these rules in server middleware and test them independently of the UI.
