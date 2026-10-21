import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  Layers,
  MapPin,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { WeeklyTimetable, type TimetableItem } from "@/components/shared/weekly-timetable";
import { DataTable, type Column } from "@/components/tables/data-table";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { teacherService } from "@/services/teacherService";
import { academicService } from "@/services/academicService";
import { enrollmentService } from "@/services/enrollmentService";
import { attendanceService } from "@/services/attendanceService";
import { assessmentService } from "@/services/assessmentService";
import { examinationService } from "@/services/examinationService";
import { timetableService } from "@/services/timetableService";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatTime, pct, titleCase } from "@/lib/format";
import type { Student } from "@/types";

interface StudentRow {
  student: Student;
  attendance: number;
  department: string;
}

export function TeacherCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const db = useDatabase();
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");

  const teacher = user ? teacherService.byUserId(db, user.id) : undefined;
  const offering = id ? db.courseOfferings.find((item) => item.id === id) : undefined;

  if (!teacher || !offering || !offering.teacherIds.includes(teacher.id)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Course detail" description="Offering information." />
        <Card>
          <ErrorState
            title="Offering not available"
            description="This course offering does not exist or is not assigned to you."
          />
        </Card>
      </div>
    );
  }

  const course = db.courses.find((item) => item.id === offering.courseId);
  const semester = db.semesters.find((item) => item.id === offering.semesterId);
  const enrolled = academicService.offeringEnrollmentCount(db, offering.id);
  const rate = Math.min(100, Math.round((enrolled / offering.capacity) * 100));

  const students = enrollmentService.studentsForOffering(db, offering.id);
  const studentRows: StudentRow[] = students.map((student) => {
    const department = db.departments.find((item) => item.id === student.departmentId);
    return {
      student,
      attendance: attendanceService.studentSummary(db, student.id, offering.id).percentage,
      department: department?.code ?? "—",
    };
  });

  const assessments = assessmentService.forOffering(db, offering.id);
  const totalWeight = assessmentService.totalWeight(db, offering.id);
  const examinations = examinationService
    .forOffering(db, offering.id)
    .sort((a, b) => a.date.localeCompare(b.date));
  const sessions = attendanceService.sessionsForOffering(db, offering.id);
  const summary = attendanceService.offeringSummary(db, offering.id);

  const timetableItems: TimetableItem[] = timetableService
    .forOffering(db, offering.id)
    .map((entry) => ({
      id: entry.id,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room,
      section: entry.section,
      courseCode: course?.code ?? "",
      courseTitle: course?.title ?? "",
    }));

  const columns: Column<StudentRow>[] = [
    {
      key: "name",
      header: "Student",
      render: (row) => (
        <div className="flex items-center gap-2">
          <UserAvatar name={row.student.fullName} size="sm" />
          <span className="font-medium">{row.student.fullName}</span>
        </div>
      ),
    },
    { key: "registration", header: "Reg. no", render: (row) => row.student.registrationNumber },
    { key: "department", header: "Department", render: (row) => row.department },
    {
      key: "attendance",
      header: "Attendance",
      render: (row) => <span className="font-medium">{pct(row.attendance)}</span>,
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.student.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={course ? `${course.code} — ${course.title}` : offering.id}
        description={`Section ${offering.section} · ${semester?.name ?? "—"}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/teacher/attendance?offering=${offering.id}`}>
                <ClipboardCheck className="h-4 w-4" />
                Attendance
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/teacher/assessments?offering=${offering.id}`}>
                <ClipboardList className="h-4 w-4" />
                Assessments
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/teacher/marks?offering=${offering.id}`}>
                <FileCheck2 className="h-4 w-4" />
                Enter marks
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" /> Schedule
            </p>
            <p className="text-sm font-medium">{offering.schedule}</p>
          </div>
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Room
            </p>
            <p className="text-sm font-medium">{offering.room}</p>
          </div>
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="h-3.5 w-3.5" /> Section
            </p>
            <p className="text-sm font-medium">Section {offering.section}</p>
          </div>
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Enrollment
            </p>
            <Progress value={rate} />
            <p className="text-xs text-muted-foreground">
              {enrolled} / {offering.capacity} ({pct(rate)})
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="marks">Marks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Assessments</CardTitle>
                <Badge variant={totalWeight === 100 ? "success" : "warning"}>Total weight {totalWeight}%</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {assessments.length === 0 ? (
                  <EmptyState icon={ClipboardList} title="No assessments" />
                ) : (
                  assessments.map((assessment) => (
                    <div key={assessment.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{assessment.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {ASSESSMENT_TYPE_LABELS[assessment.type]} · {assessment.maxMarks} marks · {assessment.weight}%
                        </p>
                      </div>
                      <StatusBadge status={assessment.status} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Examinations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {examinations.length === 0 ? (
                  <EmptyState icon={CalendarDays} title="No examinations scheduled" />
                ) : (
                  examinations.map((exam) => (
                    <div key={exam.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{titleCase(exam.type)}</p>
                        <p className="text-xs text-muted-foreground">
                          {exam.venue} · {formatTime(exam.startTime)} – {formatTime(exam.endTime)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(exam.date)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Weekly timetable</CardTitle>
            </CardHeader>
            <CardContent>
              {timetableItems.length === 0 ? (
                <EmptyState icon={CalendarDays} title="No timetable entries" />
              ) : (
                <WeeklyTimetable items={timetableItems} showTeacher={false} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={columns}
                rows={studentRows}
                rowKey={(row) => row.student.id}
                emptyState={<EmptyState icon={Users} title="No students enrolled" />}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Attendance summary</CardTitle>
              <Badge variant={summary.percentage >= 75 ? "success" : "warning"}>
                {pct(summary.percentage)}
              </Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Present</p>
                <p className="text-lg font-semibold">{summary.present}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Late</p>
                <p className="text-lg font-semibold">{summary.late}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Absent</p>
                <p className="text-lg font-semibold">{summary.absent}</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Excused</p>
                <p className="text-lg font-semibold">{summary.excused}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Class sessions</CardTitle>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/teacher/attendance?offering=${offering.id}`}>Manage attendance</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {sessions.length === 0 ? (
                <EmptyState icon={ClipboardCheck} title="No class sessions" description="Create a session to record attendance." />
              ) : (
                <div className="divide-y divide-border">
                  {sessions.map((session) => {
                    const records = attendanceService.recordsForSession(db, session.id);
                    const present = records.filter(
                      (record) => record.status === "present" || record.status === "late",
                    ).length;
                    return (
                      <div key={session.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{session.topic}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(session.date)} · {formatTime(session.startTime)} – {formatTime(session.endTime)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {present}/{records.length} present
                          </span>
                          <StatusBadge status={session.status} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessments">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Assessments</CardTitle>
              <Badge variant={totalWeight === 100 ? "success" : "warning"}>Total weight {totalWeight}%</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {assessments.length === 0 ? (
                <EmptyState icon={ClipboardList} title="No assessments" description="Create assessments for this offering." />
              ) : (
                <div className="divide-y divide-border">
                  {assessments.map((assessment) => (
                    <div key={assessment.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{assessment.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {ASSESSMENT_TYPE_LABELS[assessment.type]} · Due {formatDate(assessment.dueDate)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {assessment.weight}% · {assessment.maxMarks} marks
                        </span>
                        <StatusBadge status={assessment.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marks">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Marks entry</CardTitle>
              <Button size="sm" asChild>
                <Link to={`/teacher/marks?offering=${offering.id}`}>
                  <FileCheck2 className="h-4 w-4" />
                  Open marks entry
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={BookOpen}
                title="Enter and review marks"
                description="Use the marks entry page to record scores, review class statistics and submit results for review."
                action={
                  <Button asChild>
                    <Link to={`/teacher/marks?offering=${offering.id}`}>Go to marks entry</Link>
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
