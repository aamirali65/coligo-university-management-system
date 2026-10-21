import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { RoleGuard } from "@/features/auth/RoleGuard";
import { LandingPage } from "@/features/auth/LandingPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { UnauthorizedPage } from "@/features/auth/UnauthorizedPage";
import { NotFoundPage } from "@/features/auth/NotFoundPage";
import { AdminDashboard } from "@/features/dashboard/AdminDashboard";
import { HodDashboard } from "@/features/dashboard/HodDashboard";
import { TeacherDashboard } from "@/features/dashboard/TeacherDashboard";
import { StudentDashboard } from "@/features/dashboard/StudentDashboard";
import { ExaminationDashboard } from "@/features/dashboard/ExaminationDashboard";
import { DepartmentsPage } from "@/features/departments/DepartmentsPage";
import { DepartmentDetailPage } from "@/features/departments/DepartmentDetailPage";
import { UsersPage } from "@/features/users/UsersPage";
import { StudentsPage } from "@/features/students/StudentsPage";
import { StudentDetailPage } from "@/features/students/StudentDetailPage";
import { TeachersPage } from "@/features/teachers/TeachersPage";
import { TeacherDetailPage } from "@/features/teachers/TeacherDetailPage";
import { CoursesPage } from "@/features/courses/CoursesPage";
import { AcademicSessionsPage } from "@/features/academics/AcademicSessionsPage";
import { SemestersPage } from "@/features/academics/SemestersPage";
import { EnrollmentsPage } from "@/features/enrollments/EnrollmentsPage";
import { AdminTimetablePage } from "@/features/timetable/AdminTimetablePage";
import { AdminReportsPage } from "@/features/reports/AdminReportsPage";
import { AuditLogsPage } from "@/features/audit/AuditLogsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { AnnouncementsPage } from "@/features/announcements/AnnouncementsPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { DepartmentOverviewPage } from "@/features/hod/DepartmentOverviewPage";
import { HodStudentsPage } from "@/features/hod/HodStudentsPage";
import { HodTeachersPage } from "@/features/hod/HodTeachersPage";
import { HodCoursesPage } from "@/features/hod/HodCoursesPage";
import { HodCourseOfferingsPage } from "@/features/hod/HodCourseOfferingsPage";
import { HodAttendancePage } from "@/features/hod/HodAttendancePage";
import { HodPerformancePage } from "@/features/hod/HodPerformancePage";
import { HodReportsPage } from "@/features/hod/HodReportsPage";
import { TeacherCoursesPage } from "@/features/teacher/TeacherCoursesPage";
import { TeacherCourseDetailPage } from "@/features/teacher/TeacherCourseDetailPage";
import { TeacherStudentsPage } from "@/features/teacher/TeacherStudentsPage";
import { TeacherAttendancePage } from "@/features/teacher/TeacherAttendancePage";
import { TeacherAssessmentsPage } from "@/features/teacher/TeacherAssessmentsPage";
import { TeacherMarksPage } from "@/features/teacher/TeacherMarksPage";
import { TeacherTimetablePage } from "@/features/teacher/TeacherTimetablePage";
import { StudentCoursesPage } from "@/features/student/StudentCoursesPage";
import { StudentCourseDetailPage } from "@/features/student/StudentCourseDetailPage";
import { StudentAttendancePage } from "@/features/student/StudentAttendancePage";
import { StudentResultsPage } from "@/features/student/StudentResultsPage";
import { StudentTimetablePage } from "@/features/student/StudentTimetablePage";
import { ExaminationSchedulePage } from "@/features/examinations/ExaminationSchedulePage";
import { ExamAssessmentsPage } from "@/features/examinations/ExamAssessmentsPage";
import { ExamMarksReviewPage } from "@/features/examinations/ExamMarksReviewPage";
import { ExamResultsPage } from "@/features/examinations/ExamResultsPage";
import { ExamReportsPage } from "@/features/examinations/ExamReportsPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/not-found" element={<NotFoundPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<RoleGuard allow={["admin"]} />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/departments" element={<DepartmentsPage />} />
            <Route path="/admin/departments/:id" element={<DepartmentDetailPage />} />
            <Route path="/admin/courses" element={<CoursesPage />} />
            <Route path="/admin/academic-sessions" element={<AcademicSessionsPage />} />
            <Route path="/admin/semesters" element={<SemestersPage />} />
            <Route path="/admin/timetable" element={<AdminTimetablePage />} />
            <Route path="/admin/students" element={<StudentsPage />} />
            <Route path="/admin/students/:id" element={<StudentDetailPage />} />
            <Route path="/admin/teachers" element={<TeachersPage />} />
            <Route path="/admin/teachers/:id" element={<TeacherDetailPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/enrollments" element={<EnrollmentsPage />} />
            <Route path="/admin/announcements" element={<AnnouncementsPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Route>

          <Route element={<RoleGuard allow={["hod"]} />}>
            <Route path="/hod" element={<Navigate to="/hod/dashboard" replace />} />
            <Route path="/hod/dashboard" element={<HodDashboard />} />
            <Route path="/hod/department" element={<DepartmentOverviewPage />} />
            <Route path="/hod/students" element={<HodStudentsPage />} />
            <Route path="/hod/teachers" element={<HodTeachersPage />} />
            <Route path="/hod/courses" element={<HodCoursesPage />} />
            <Route path="/hod/course-offerings" element={<HodCourseOfferingsPage />} />
            <Route path="/hod/attendance" element={<HodAttendancePage />} />
            <Route path="/hod/performance" element={<HodPerformancePage />} />
            <Route path="/hod/reports" element={<HodReportsPage />} />
            <Route path="/hod/announcements" element={<AnnouncementsPage />} />
          </Route>

          <Route element={<RoleGuard allow={["teacher"]} />}>
            <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
            <Route path="/teacher/courses/:id" element={<TeacherCourseDetailPage />} />
            <Route path="/teacher/students" element={<TeacherStudentsPage />} />
            <Route path="/teacher/attendance" element={<TeacherAttendancePage />} />
            <Route path="/teacher/assessments" element={<TeacherAssessmentsPage />} />
            <Route path="/teacher/marks" element={<TeacherMarksPage />} />
            <Route path="/teacher/timetable" element={<TeacherTimetablePage />} />
            <Route path="/teacher/announcements" element={<AnnouncementsPage />} />
          </Route>

          <Route element={<RoleGuard allow={["student"]} />}>
            <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/profile" element={<ProfilePage />} />
            <Route path="/student/courses" element={<StudentCoursesPage />} />
            <Route path="/student/courses/:id" element={<StudentCourseDetailPage />} />
            <Route path="/student/attendance" element={<StudentAttendancePage />} />
            <Route path="/student/results" element={<StudentResultsPage />} />
            <Route path="/student/timetable" element={<StudentTimetablePage />} />
            <Route path="/student/announcements" element={<AnnouncementsPage />} />
          </Route>

          <Route element={<RoleGuard allow={["examination"]} />}>
            <Route path="/examinations" element={<Navigate to="/examinations/dashboard" replace />} />
            <Route path="/examinations/dashboard" element={<ExaminationDashboard />} />
            <Route path="/examinations/schedule" element={<ExaminationSchedulePage />} />
            <Route path="/examinations/assessments" element={<ExamAssessmentsPage />} />
            <Route path="/examinations/marks-review" element={<ExamMarksReviewPage />} />
            <Route path="/examinations/results" element={<ExamResultsPage />} />
            <Route path="/examinations/reports" element={<ExamReportsPage />} />
            <Route path="/examinations/profile" element={<ProfilePage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
