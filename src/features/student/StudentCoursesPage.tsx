import { Link } from "react-router-dom";
import { BookOpen, CalendarDays, MapPin, User } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { studentService } from "@/services/studentService";
import { attendanceService } from "@/services/attendanceService";
import { pct } from "@/lib/format";

interface CourseCard {
  id: string;
  offeringId: string;
  code: string;
  title: string;
  section: string;
  semester: string;
  schedule: string;
  room: string;
  teachers: string[];
  attendance: number;
  grade: string | null;
}

export function StudentCoursesPage() {
  const db = useDatabase();
  const { user } = useAuth();
  const student = user ? studentService.byUserId(db, user.id) : undefined;

  if (!student) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Courses" description="The courses you are enrolled in." />
        <Card>
          <EmptyState
            icon={BookOpen}
            title="No student profile"
            description="This account is not linked to a student record yet."
          />
        </Card>
      </div>
    );
  }

  const enrollments = studentService.enrollmentsFor(db, student.id).filter((e) => e.status === "active");

  const cards: CourseCard[] = enrollments.flatMap((enrollment) => {
    const offering = db.courseOfferings.find((item) => item.id === enrollment.offeringId);
    const course = offering ? db.courses.find((item) => item.id === offering.courseId) : undefined;
    if (!offering || !course) return [];
    const semester = db.semesters.find((item) => item.id === offering.semesterId);
    const teachers = offering.teacherIds
      .map((teacherId) => db.teachers.find((item) => item.id === teacherId)?.fullName)
      .filter((name): name is string => Boolean(name));
    const result = db.results.find(
      (item) => item.studentId === student.id && item.offeringId === offering.id && item.status === "published",
    );
    return [
      {
        id: enrollment.id,
        offeringId: offering.id,
        code: course.code,
        title: course.title,
        section: offering.section,
        semester: semester?.name ?? "—",
        schedule: offering.schedule,
        room: offering.room,
        teachers,
        attendance: attendanceService.studentSummary(db, student.id, offering.id).percentage,
        grade: result?.grade ?? null,
      },
    ];
  });

  return (
    <div className="space-y-6">
      <PageHeader title="My Courses" description="Course offerings you are enrolled in this term." />

      {cards.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="No enrolled courses"
            description="You are not enrolled in any course offerings yet."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.id} className="flex flex-col">
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="truncate">{card.code}</CardTitle>
                  <CardDescription className="line-clamp-2">{card.title}</CardDescription>
                </div>
                <Badge variant="outline" className="shrink-0">
                  Section {card.section}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {card.semester} · {card.schedule}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {card.room}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {card.teachers.length > 0 ? card.teachers.join(", ") : "No teacher assigned"}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Attendance</span>
                    <span className="text-xs font-medium">{pct(card.attendance)}</span>
                  </div>
                  <Progress value={card.attendance} />
                </div>

                <div className="mt-auto flex items-center justify-between gap-2">
                  {card.grade ? (
                    <StatusBadge status="published" label={`Grade ${card.grade}`} />
                  ) : (
                    <span className="text-xs text-muted-foreground">Result not published yet</span>
                  )}
                  <Button size="sm" asChild>
                    <Link to={`/student/courses/${card.offeringId}`}>
                      <BookOpen className="h-3.5 w-3.5" />
                      View
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
