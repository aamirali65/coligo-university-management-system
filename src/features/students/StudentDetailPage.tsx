import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CalendarCheck, GraduationCap, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDatabase } from "@/hooks/useDatabase";
import { studentService } from "@/services/studentService";
import { reportService } from "@/services/reportService";
import { formatDate, formatTime } from "@/lib/format";
import { ATTENDANCE_LABELS, STUDENT_STATUS_LABELS } from "@/lib/constants";

export function StudentDetailPage() {
  const db = useDatabase();
  const { id = "" } = useParams();
  const student = studentService.byId(db, id);

  if (!student) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Student not found"
        description="The student you are looking for does not exist."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/students">Back to students</Link>
          </Button>
        }
      />
    );
  }

  const department = db.departments.find((d) => d.id === student.departmentId);
  const attendance = studentService.attendanceSummary(db, student.id);
  const gpa = reportService.studentGpa(db, student.id);
  const history = studentService.academicHistory(db, student.id);
  const results = studentService.resultsFor(db, student.id).filter((r) => r.result.status === "published");
  const earnedCredits = results.reduce((sum, r) => sum + (r.course?.creditHours ?? 0), 0);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link to="/admin/students">
          <ArrowLeft className="h-4 w-4" />
          Back to students
        </Link>
      </Button>

      <PageHeader
        title={student.fullName}
        description={`${student.registrationNumber} · ${department?.name ?? "No department"}`}
        actions={<StatusBadge status={student.status} label={STUDENT_STATUS_LABELS[student.status]} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="GPA" value={gpa === null ? "—" : gpa.toFixed(2)} icon={TrendingUp} tone="primary" hint={`${earnedCredits} credits`} />
        <StatCard label="Attendance" value={`${attendance.percentage}%`} icon={CalendarCheck} tone={attendance.percentage >= db.settings.attendanceThreshold ? "success" : "destructive"} hint={`${attendance.total} sessions`} />
        <StatCard label="Courses enrolled" value={history.length} icon={BookOpen} tone="muted" />
        <StatCard label="Published results" value={results.length} icon={GraduationCap} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Student information</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <UserAvatar name={student.fullName} size="lg" />
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{student.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{student.phone || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="text-sm font-medium">{department?.name ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Current semester</p>
                <p className="text-sm font-medium">Semester {student.currentSemester}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Admission date</p>
                <p className="text-sm font-medium">{formatDate(student.admissionDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["present", "late", "absent", "excused"] as const).map((status) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{ATTENDANCE_LABELS[status]}</span>
                <span className="font-medium">{attendance.byStatus[status]}</span>
              </div>
            ))}
            <div className="pt-1">
              <Progress value={attendance.percentage} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses">Courses ({history.length})</TabsTrigger>
          <TabsTrigger value="results">Results ({results.length})</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          <Card>
            {history.length === 0 ? (
              <EmptyState icon={BookOpen} title="No enrollments" description="This student is not enrolled in any course offering." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map(({ enrollment, offering, course, semester }) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <span className="block text-sm font-medium">{course?.code}</span>
                        <span className="block text-xs text-muted-foreground">{course?.title}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{semester?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{offering?.section ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{offering?.schedule ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(enrollment.enrolledAt)}</TableCell>
                      <TableCell><StatusBadge status={enrollment.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            {results.length === 0 ? (
              <EmptyState icon={GraduationCap} title="No published results" description="No results have been published for this student yet." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Published</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map(({ result, course, semester }) => (
                    <TableRow key={result.id}>
                      <TableCell className="text-sm font-medium">{course?.code} — {course?.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{semester?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{result.totalScore ?? "—"}</TableCell>
                      <TableCell className="text-sm font-medium">{result.grade ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{result.gradePoint ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(result.publishedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            {db.attendance.filter((a) => a.studentId === student.id).length === 0 ? (
              <EmptyState icon={CalendarCheck} title="No attendance records" description="No attendance has been recorded for this student." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {db.attendance
                    .filter((a) => a.studentId === student.id)
                    .slice(0, 30)
                    .map((record) => {
                      const session = db.classSessions.find((s) => s.id === record.classSessionId);
                      const offering = db.courseOfferings.find((o) => o.id === record.offeringId);
                      const course = offering ? db.courses.find((c) => c.id === offering.courseId) : undefined;
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(session?.date)}</TableCell>
                          <TableCell className="text-sm font-medium">{course?.code ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatTime(session?.startTime ?? "")}</TableCell>
                          <TableCell><StatusBadge status={record.status} label={ATTENDANCE_LABELS[record.status]} /></TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
