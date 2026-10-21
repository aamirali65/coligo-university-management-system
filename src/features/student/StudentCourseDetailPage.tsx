import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, CalendarDays, ClipboardCheck, ClipboardList, Layers, MapPin, User } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { studentService } from "@/services/studentService";
import { attendanceService } from "@/services/attendanceService";
import { assessmentService } from "@/services/assessmentService";
import { marksService } from "@/services/marksService";
import { ASSESSMENT_TYPE_LABELS, ATTENDANCE_LABELS } from "@/lib/constants";
import { formatDate, formatTime, pct } from "@/lib/format";

export function StudentCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const db = useDatabase();
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");

  const student = user ? studentService.byUserId(db, user.id) : undefined;
  const offering = id ? db.courseOfferings.find((item) => item.id === id) : undefined;
  const enrolled =
    student && offering
      ? db.enrollments.some(
          (item) => item.studentId === student.id && item.offeringId === offering.id && item.status !== "dropped",
        )
      : false;

  if (!student || !offering || !enrolled) {
    return (
      <div className="space-y-6">
        <PageHeader title="Course detail" description="Course information." />
        <Card>
          <ErrorState
            title="Course not available"
            description="This course offering does not exist or you are not enrolled in it."
          />
        </Card>
      </div>
    );
  }

  const course = db.courses.find((item) => item.id === offering.courseId);
  const semester = db.semesters.find((item) => item.id === offering.semesterId);
  const teachers = offering.teacherIds
    .map((teacherId) => db.teachers.find((item) => item.id === teacherId)?.fullName)
    .filter((name): name is string => Boolean(name));

  const assessments = assessmentService.forOffering(db, offering.id);
  const marks = marksService.forStudentOffering(db, student.id, offering.id);
  const marksByAssessment = new Map(marks.map((mark) => [mark.assessmentId, mark]));
  const sessions = attendanceService.sessionsForOffering(db, offering.id);
  const summary = attendanceService.studentSummary(db, student.id, offering.id);
  const publishedResult = db.results.find(
    (item) => item.studentId === student.id && item.offeringId === offering.id && item.status === "published",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={course ? `${course.code} — ${course.title}` : offering.id}
        description={`Section ${offering.section} · ${semester?.name ?? "—"}`}
        actions={
          <Button variant="outline" asChild>
            <Link to="/student/courses">
              <BookOpen className="h-4 w-4" />
              My courses
            </Link>
          </Button>
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
              <Layers className="h-3.5 w-3.5" /> Credits
            </p>
            <p className="text-sm font-medium">{course?.creditHours ?? "—"} credit hours</p>
          </div>
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" /> Teacher
            </p>
            <p className="text-sm font-medium">{teachers.length > 0 ? teachers.join(", ") : "Not assigned"}</p>
          </div>
          {course?.description && (
            <div className="space-y-1 sm:col-span-2 lg:col-span-4">
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="text-sm">{course.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Assessments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {assessments.length === 0 ? (
                <EmptyState icon={ClipboardList} title="No assessments" description="This course has no assessments yet." />
              ) : (
                <div className="divide-y divide-border">
                  {assessments.map((assessment) => {
                    const mark = marksByAssessment.get(assessment.id);
                    return (
                      <div key={assessment.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{assessment.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {ASSESSMENT_TYPE_LABELS[assessment.type]} · {assessment.weight}% · Max {assessment.maxMarks} ·
                            Due {formatDate(assessment.dueDate)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {publishedResult ? (
                            <span className="text-sm font-medium">
                              {mark ? `${mark.score} / ${assessment.maxMarks}` : "—"}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not published yet</span>
                          )}
                          <StatusBadge status={assessment.status} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Attendance summary</CardTitle>
              <StatusBadge
                status={summary.percentage >= 75 ? "present" : "absent"}
                label={pct(summary.percentage)}
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={summary.percentage} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Class sessions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {sessions.length === 0 ? (
                <EmptyState icon={ClipboardCheck} title="No class sessions" description="Attendance will appear once classes are recorded." />
              ) : (
                <div className="divide-y divide-border">
                  {sessions.map((session) => {
                    const record = attendanceService
                      .recordsForSession(db, session.id)
                      .find((item) => item.studentId === student.id);
                    return (
                      <div key={session.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{session.topic || "Class session"}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(session.date)} · {formatTime(session.startTime)} – {formatTime(session.endTime)}
                          </p>
                        </div>
                        {record ? (
                          <StatusBadge status={record.status} label={ATTENDANCE_LABELS[record.status]} />
                        ) : (
                          <span className="text-xs text-muted-foreground">Not recorded</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Course result</CardTitle>
            </CardHeader>
            <CardContent>
              {!publishedResult ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Pending publication"
                  description="Your result for this course has not been published yet."
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-md border border-border p-4">
                    <p className="text-xs text-muted-foreground">Total score</p>
                    <p className="text-2xl font-semibold">{pct(publishedResult.totalScore ?? 0)}</p>
                  </div>
                  <div className="rounded-md border border-border p-4">
                    <p className="text-xs text-muted-foreground">Grade</p>
                    <p className="text-2xl font-semibold">{publishedResult.grade ?? "—"}</p>
                  </div>
                  <div className="rounded-md border border-border p-4">
                    <p className="text-xs text-muted-foreground">Grade point</p>
                    <p className="text-2xl font-semibold">{publishedResult.gradePoint ?? "—"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-3">
                    Published {formatDate(publishedResult.publishedAt)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
