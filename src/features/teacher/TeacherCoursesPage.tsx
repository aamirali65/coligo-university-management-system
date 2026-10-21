import { Link } from "react-router-dom";
import { BookOpen, CalendarDays, ClipboardCheck, FileCheck2, MapPin, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { teacherService } from "@/services/teacherService";
import { academicService } from "@/services/academicService";
import { pct } from "@/lib/format";

export function TeacherCoursesPage() {
  const db = useDatabase();
  const { user } = useAuth();
  const teacher = user ? teacherService.byUserId(db, user.id) : undefined;
  const offerings = teacher ? teacherService.offeringsFor(db, teacher.id) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Courses"
        description="Course offerings assigned to you this term."
      />

      {offerings.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="No assigned courses"
            description="You have not been assigned to any course offerings yet."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {offerings.map((offering) => {
            const course = db.courses.find((item) => item.id === offering.courseId);
            const semester = db.semesters.find((item) => item.id === offering.semesterId);
            const enrolled = academicService.offeringEnrollmentCount(db, offering.id);
            const rate = Math.min(100, Math.round((enrolled / offering.capacity) * 100));
            return (
              <Card key={offering.id} className="flex flex-col">
                <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="truncate">{course?.code ?? offering.id}</CardTitle>
                    <CardDescription className="line-clamp-2">{course?.title ?? "Course"}</CardDescription>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    Section {offering.section}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {semester?.name ?? "—"} · {offering.schedule}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {offering.room}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {enrolled} / {offering.capacity} students
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Progress value={rate} />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{pct(rate)} full</span>
                      <StatusBadge status={offering.status} />
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button size="sm" asChild>
                      <Link to={`/teacher/courses/${offering.id}`}>
                        <BookOpen className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/teacher/attendance?offering=${offering.id}`}>
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Attendance
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/teacher/marks?offering=${offering.id}`}>
                        <FileCheck2 className="h-3.5 w-3.5" />
                        Marks
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
