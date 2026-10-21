import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  Library,
  Megaphone,
  ScrollText,
  Settings,
  TrendingUp,
  Users,
  UserSquare2,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAVIGATION: Record<Role, NavGroup[]> = {
  admin: [
    {
      title: "Overview",
      items: [{ label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard }],
    },
    {
      title: "Academics",
      items: [
        { label: "Departments", href: "/admin/departments", icon: Building2 },
        { label: "Courses", href: "/admin/courses", icon: BookOpen },
        { label: "Academic Sessions", href: "/admin/academic-sessions", icon: CalendarRange },
        { label: "Semesters", href: "/admin/semesters", icon: CalendarDays },
        { label: "Timetable", href: "/admin/timetable", icon: Library },
      ],
    },
    {
      title: "People",
      items: [
        { label: "Students", href: "/admin/students", icon: GraduationCap },
        { label: "Teachers", href: "/admin/teachers", icon: Users },
        { label: "Users", href: "/admin/users", icon: UserSquare2 },
      ],
    },
    {
      title: "Operations",
      items: [
        { label: "Offerings & Enrollments", href: "/admin/enrollments", icon: ClipboardList },
        { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
        { label: "Reports", href: "/admin/reports", icon: BarChart3 },
        { label: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
        { label: "Settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ],
  hod: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/hod/dashboard", icon: LayoutDashboard },
        { label: "Department", href: "/hod/department", icon: Building2 },
      ],
    },
    {
      title: "Academics",
      items: [
        { label: "Students", href: "/hod/students", icon: GraduationCap },
        { label: "Teachers", href: "/hod/teachers", icon: Users },
        { label: "Courses", href: "/hod/courses", icon: BookOpen },
        { label: "Course Offerings", href: "/hod/course-offerings", icon: ClipboardList },
      ],
    },
    {
      title: "Monitoring",
      items: [
        { label: "Attendance", href: "/hod/attendance", icon: ClipboardCheck },
        { label: "Performance", href: "/hod/performance", icon: TrendingUp },
        { label: "Reports", href: "/hod/reports", icon: FileBarChart },
        { label: "Announcements", href: "/hod/announcements", icon: Megaphone },
      ],
    },
  ],
  teacher: [
    {
      title: "Teaching",
      items: [
        { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
        { label: "My Courses", href: "/teacher/courses", icon: BookOpen },
        { label: "Students", href: "/teacher/students", icon: GraduationCap },
        { label: "Attendance", href: "/teacher/attendance", icon: ClipboardCheck },
      ],
    },
    {
      title: "Assessment",
      items: [
        { label: "Assessments", href: "/teacher/assessments", icon: ClipboardList },
        { label: "Marks Entry", href: "/teacher/marks", icon: FileCheck2 },
        { label: "Timetable", href: "/teacher/timetable", icon: CalendarDays },
        { label: "Announcements", href: "/teacher/announcements", icon: Megaphone },
      ],
    },
  ],
  student: [
    {
      title: "My Studies",
      items: [
        { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
        { label: "My Profile", href: "/student/profile", icon: UserSquare2 },
        { label: "My Courses", href: "/student/courses", icon: BookOpen },
        { label: "Attendance", href: "/student/attendance", icon: ClipboardCheck },
        { label: "Results", href: "/student/results", icon: FileCheck2 },
        { label: "Timetable", href: "/student/timetable", icon: CalendarDays },
        { label: "Announcements", href: "/student/announcements", icon: Megaphone },
      ],
    },
  ],
  examination: [
    {
      title: "Examinations",
      items: [
        { label: "Dashboard", href: "/examinations/dashboard", icon: LayoutDashboard },
        { label: "Schedule", href: "/examinations/schedule", icon: CalendarDays },
        { label: "Assessments", href: "/examinations/assessments", icon: ClipboardList },
        { label: "Marks Review", href: "/examinations/marks-review", icon: FileCheck2 },
        { label: "Results", href: "/examinations/results", icon: GraduationCap },
        { label: "Reports", href: "/examinations/reports", icon: FileBarChart },
        { label: "Profile", href: "/examinations/profile", icon: Bell },
      ],
    },
  ],
};
