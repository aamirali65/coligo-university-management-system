import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CalendarDays, GraduationCap, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDatabase } from "@/hooks/useDatabase";
import { teacherService } from "@/services/teacherService";
import { timetableService } from "@/services/timetableService";
import { formatDate, formatTime } from "@/lib/format";
import { DAY_NAMES } from "@/lib/constants";

export function TeacherDetailPage() {
  const db = useDatabase();
  const { id = "" } = useParams();
  const teacher = teacherService.byId(db, id);

  if (!teacher) {
    return (
      <EmptyState
        icon={Users}
        title="Teacher not found"
        description="The teacher you are looking for does not exist."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/teachers">Back to teachers</Link>
          </Button>
        }
      />
    );
  }

  const department = db.departments.find((d) => d.id === teacher.departmentId);
  const offerings = teacherService.offeringsFor(db, teacher.id);
  const timetable = timetableService.forTeacher(db, teacher.id).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const students = teacherService.studentCount(db, teacher.id);
  const performance = db.results.filter((r) => {
    const offering = db.courseOfferings.find((o) => o.id === r.offeringId);
    return offering?.teacherIds.includes(teacher.id) && r.status === "published";
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link to="/admin/teachers">
          <ArrowLeft className="h-4 w-4" />
          Back to teachers
        </Link>
      </Button>

      <PageHeader
        title={teacher.fullName}
        description={`${teacher.employeeNumber} · ${teacher.designation}`}
        actions={<StatusBadge status={teacher.status} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Course offerings" value={offerings.length} icon={BookOpen} />
        <StatCard label="Students taught" value={students} icon={GraduationCap} tone="success" />
        <StatCard label="Weekly classes" value={timetable.length} icon={CalendarDays} tone="warning" />
        <StatCard label="Published results" value={performance.length} icon={Users} tone="muted" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Teacher information</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <UserAvatar name={teacher.fullName} size="lg" />
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{teacher.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{teacher.phone || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="text-sm font-medium">{department?.name ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Designation</p>
                <p className="text-sm font-medium">{teacher.designation}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Hire date</p>
                <p className="text-sm font-medium">{formatDate(teacher.hireDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assigned courses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {offerings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No course offerings assigned.</p>
            ) : (
              offerings.slice(0, 6).map((offering) => {
                const course = db.courses.find((c) => c.id === offering.courseId);
                return (
                  <div key={offering.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{course?.code}</span>
                    <span className="text-xs text-muted-foreground">Section {offering.section}</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timetable">
        <TabsList>
          <TabsTrigger value="timetable">Timetable ({timetable.length})</TabsTrigger>
          <TabsTrigger value="courses">Offerings ({offerings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="timetable">
          <Card>
            {timetable.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No timetable" description="This teacher has no scheduled classes." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Section</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timetable.map((entry) => {
                    const offering = db.courseOfferings.find((o) => o.id === entry.offeringId);
                    const course = offering ? db.courses.find((c) => c.id === offering.courseId) : undefined;
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm font-medium">{DAY_NAMES[entry.dayOfWeek]}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatTime(entry.startTime)} – {formatTime(entry.endTime)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{course?.code ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{entry.room}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{entry.section}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="courses">
          <Card>
            {offerings.length === 0 ? (
              <EmptyState icon={BookOpen} title="No offerings" description="This teacher is not assigned to any course offering." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offerings.map((offering) => {
                    const course = db.courses.find((c) => c.id === offering.courseId);
                    const semester = db.semesters.find((s) => s.id === offering.semesterId);
                    const enrolled = db.enrollments.filter((e) => e.offeringId === offering.id && e.status === "active").length;
                    return (
                      <TableRow key={offering.id}>
                        <TableCell>
                          <span className="block text-sm font-medium">{course?.code}</span>
                          <span className="block text-xs text-muted-foreground">{course?.title}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{offering.section}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{semester?.name ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{offering.schedule}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{enrolled}/{offering.capacity}</TableCell>
                        <TableCell><StatusBadge status={offering.status} /></TableCell>
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
