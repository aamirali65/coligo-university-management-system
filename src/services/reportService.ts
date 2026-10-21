import { format, parseISO } from "date-fns";
import { calculateGpa } from "@/lib/grading";

type Db = ReturnType<typeof import("./mock/store").getDb>;

export const reportService = {
  adminTotals(db: Db) {
    return {
      students: db.students.length,
      teachers: db.teachers.length,
      departments: db.departments.length,
      courses: db.courses.length,
      activeOfferings: db.courseOfferings.filter((o) => o.status === "active").length,
      activeEnrollments: db.enrollments.filter((e) => e.status === "active").length,
      examinations: db.examinations.filter((e) => e.status === "scheduled").length,
      publishedResults: db.results.filter((r) => r.status === "published").length,
    };
  },

  studentsByDepartment(db: Db) {
    return db.departments.map((dept) => ({
      name: dept.code,
      department: dept.name,
      value: db.students.filter((s) => s.departmentId === dept.id).length,
    }));
  },

  teachersByDepartment(db: Db) {
    return db.departments.map((dept) => ({
      name: dept.code,
      department: dept.name,
      value: db.teachers.filter((t) => t.departmentId === dept.id).length,
    }));
  },

  studentStatusDistribution(db: Db) {
    const statuses = ["active", "inactive", "graduated", "suspended"] as const;
    return statuses.map((status) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: db.students.filter((s) => s.status === status).length,
    }));
  },

  enrollmentTrend(db: Db, months = 8) {
    const buckets = new Map<string, number>();
    const sorted = [...db.enrollments].sort((a, b) => a.enrolledAt.localeCompare(b.enrolledAt));
    for (const enrollment of sorted) {
      const key = enrollment.enrolledAt.slice(0, 7);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-months)
      .map(([month, count]) => {
        const label = format(parseISO(`${month}-01`), "MMM yyyy");
        return { month: label, enrollments: count };
      });
  },

  courseEnrollment(db: Db) {
    return db.courseOfferings
      .filter((o) => o.status === "active")
      .map((offering) => {
        const course = db.courses.find((c) => c.id === offering.courseId);
        const enrolled = db.enrollments.filter((e) => e.offeringId === offering.id && e.status === "active").length;
        return {
          name: `${course?.code ?? offering.id}-${offering.section}`,
          title: course?.title ?? "",
          enrolled,
          capacity: offering.capacity,
          rate: offering.capacity === 0 ? 0 : Math.round((enrolled / offering.capacity) * 100),
        };
      })
      .sort((a, b) => b.enrolled - a.enrolled);
  },

  attendanceOverview(db: Db) {
    const records = db.attendance;
    const total = records.length || 1;
    return (["present", "absent", "late", "excused"] as const).map((status) => {
      const count = records.filter((r) => r.status === status).length;
      return {
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
        rate: Math.round((count / total) * 1000) / 10,
      };
    });
  },

  attendanceByDepartment(db: Db) {
    return db.departments.map((dept) => {
      const offeringIds = new Set(
        db.courseOfferings
          .filter((o) => db.courses.find((c) => c.id === o.courseId)?.departmentId === dept.id)
          .map((o) => o.id),
      );
      const records = db.attendance.filter((a) => offeringIds.has(a.offeringId));
      const present = records.filter((r) => r.status === "present" || r.status === "late").length;
      const rate = records.length === 0 ? 0 : Math.round((present / records.length) * 1000) / 10;
      return { name: dept.code, department: dept.name, rate, records: records.length };
    });
  },

  academicPerformance(db: Db) {
    return db.departments.map((dept) => {
      const offeringIds = new Set(
        db.courseOfferings
          .filter((o) => db.courses.find((c) => c.id === o.courseId)?.departmentId === dept.id)
          .map((o) => o.id),
      );
      const results = db.results.filter(
        (r) => offeringIds.has(r.offeringId) && r.status === "published" && r.totalScore !== null,
      );
      const average =
        results.length === 0
          ? 0
          : Math.round((results.reduce((sum, r) => sum + (r.totalScore ?? 0), 0) / results.length) * 10) / 10;
      return { name: dept.code, department: dept.name, average, results: results.length };
    });
  },

  gradeDistribution(db: Db) {
    const published = db.results.filter((r) => r.status === "published" && r.grade);
    const grades = ["A", "A-", "B+", "B", "B-", "C+", "C", "D", "F"];
    return grades.map((grade) => ({
      name: grade,
      value: published.filter((r) => r.grade === grade).length,
    }));
  },

  marksReviewPipeline(db: Db) {
    return [
      { name: "Draft", value: db.results.filter((r) => r.status === "draft").length },
      { name: "Submitted", value: db.results.filter((r) => r.status === "submitted").length },
      { name: "Under Review", value: db.results.filter((r) => r.status === "under_review").length },
      { name: "Approved", value: db.results.filter((r) => r.status === "approved").length },
      { name: "Published", value: db.results.filter((r) => r.status === "published").length },
    ];
  },

  departmentPerformance(db: Db, departmentId: string) {
    const offeringIds = new Set(
      db.courseOfferings
        .filter((o) => db.courses.find((c) => c.id === o.courseId)?.departmentId === departmentId)
        .map((o) => o.id),
    );
    const results = db.results.filter((r) => offeringIds.has(r.offeringId) && r.totalScore !== null);
    const average =
      results.length === 0
        ? 0
        : Math.round((results.reduce((sum, r) => sum + (r.totalScore ?? 0), 0) / results.length) * 10) / 10;
    return { average, count: results.length };
  },

  teacherCoursePerformance(db: Db, teacherId: string) {
    return db.courseOfferings
      .filter((o) => o.teacherIds.includes(teacherId))
      .map((offering) => {
        const course = db.courses.find((c) => c.id === offering.courseId);
        const results = db.results.filter((r) => r.offeringId === offering.id && r.totalScore !== null);
        const average =
          results.length === 0
            ? 0
            : Math.round((results.reduce((sum, r) => sum + (r.totalScore ?? 0), 0) / results.length) * 10) / 10;
        return {
          offeringId: offering.id,
          name: `${course?.code ?? offering.id}-${offering.section}`,
          title: course?.title ?? "",
          average,
          students: db.enrollments.filter((e) => e.offeringId === offering.id && e.status === "active").length,
        };
      });
  },

  studentGpa(db: Db, studentId: string) {
    const courses = db.results
      .filter((r) => r.studentId === studentId && r.status === "published")
      .map((r) => {
        const offering = db.courseOfferings.find((o) => o.id === r.offeringId);
        const course = offering ? db.courses.find((c) => c.id === offering.courseId) : undefined;
        return { gradePoint: r.gradePoint, creditHours: course?.creditHours ?? 3 };
      });
    return calculateGpa(courses);
  },
};
