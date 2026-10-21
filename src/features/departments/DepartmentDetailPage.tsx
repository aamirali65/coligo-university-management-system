import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, GraduationCap, Mail, MapPin, Users } from "lucide-react";
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
import { departmentService } from "@/services/departmentService";
import { studentService } from "@/services/studentService";
import { teacherService } from "@/services/teacherService";
import { courseService } from "@/services/courseService";
import { formatDate } from "@/lib/format";

export function DepartmentDetailPage() {
  const db = useDatabase();
  const { id = "" } = useParams();
  const department = departmentService.byId(db, id);

  if (!department) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Department not found"
        description="The department you are looking for does not exist."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/departments">Back to departments</Link>
          </Button>
        }
      />
    );
  }

  const counts = departmentService.counts(db, id);
  const breakdown = departmentService.studentStatusBreakdown(db, id);
  const hod = department.hodId ? db.users.find((u) => u.id === department.hodId) : undefined;
  const students = studentService.byDepartment(db, id);
  const teachers = teacherService.byDepartment(db, id);
  const courses = courseService.byDepartment(db, id);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link to="/admin/departments">
          <ArrowLeft className="h-4 w-4" />
          Back to departments
        </Link>
      </Button>

      <PageHeader
        title={department.name}
        description={department.description}
        actions={<StatusBadge status={department.status} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={counts.students} icon={GraduationCap} />
        <StatCard label="Teachers" value={counts.teachers} icon={Users} tone="success" />
        <StatCard label="Courses" value={counts.courses} icon={BookOpen} tone="warning" />
        <StatCard label="Offerings" value={counts.offerings} icon={BookOpen} tone="muted" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Department information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Department code</p>
              <p className="text-sm font-medium">{department.code}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm font-medium">{formatDate(department.createdAt)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Office location</p>
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {department.officeLocation || "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Contact email</p>
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                {department.contactEmail || "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Head of Department</CardTitle>
          </CardHeader>
          <CardContent>
            {hod ? (
              <div className="flex items-center gap-3">
                <UserAvatar name={hod.fullName} size="lg" />
                <div>
                  <p className="text-sm font-medium">{hod.fullName}</p>
                  <p className="text-xs text-muted-foreground">{hod.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No HOD assigned.</p>
            )}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Student status</p>
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge status="active" label={`Active ${breakdown.active}`} />
                <StatusBadge status="inactive" label={`Inactive ${breakdown.inactive}`} />
                <StatusBadge status="graduated" label={`Graduated ${breakdown.graduated}`} />
                <StatusBadge status="suspended" label={`Suspended ${breakdown.suspended}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
          <TabsTrigger value="teachers">Teachers ({teachers.length})</TabsTrigger>
          <TabsTrigger value="courses">Courses ({courses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            {students.length === 0 ? (
              <EmptyState icon={GraduationCap} title="No students" description="No students are assigned to this department." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Registration</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.slice(0, 20).map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <UserAvatar name={student.fullName} size="sm" />
                          <Link to={`/admin/students/${student.id}`} className="text-sm font-medium hover:text-primary">
                            {student.fullName}
                          </Link>
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{student.registrationNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">Semester {student.currentSemester}</TableCell>
                      <TableCell><StatusBadge status={student.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="teachers">
          <Card>
            {teachers.length === 0 ? (
              <EmptyState icon={Users} title="No teachers" description="No teachers are assigned to this department." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Employee no.</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <UserAvatar name={teacher.fullName} size="sm" />
                          <Link to={`/admin/teachers/${teacher.id}`} className="text-sm font-medium hover:text-primary">
                            {teacher.fullName}
                          </Link>
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{teacher.employeeNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{teacher.designation}</TableCell>
                      <TableCell><StatusBadge status={teacher.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="courses">
          <Card>
            {courses.length === 0 ? (
              <EmptyState icon={BookOpen} title="No courses" description="No courses belong to this department." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="text-sm font-medium">{course.code}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{course.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{course.creditHours}</TableCell>
                      <TableCell><StatusBadge status={course.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
