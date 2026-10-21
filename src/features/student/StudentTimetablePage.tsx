import { useState } from "react";
import { CalendarDays, Clock, GraduationCap, MapPin } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { SelectField } from "@/components/forms/field";
import { WeeklyTimetable, type TimetableItem } from "@/components/shared/weekly-timetable";
import { DataTable, type Column } from "@/components/tables/data-table";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { studentService } from "@/services/studentService";
import { timetableService } from "@/services/timetableService";
import { examinationService } from "@/services/examinationService";
import { ACADEMIC_DAYS, DAY_NAMES } from "@/lib/constants";
import { formatDate, formatTime, titleCase } from "@/lib/format";

const ALL = "all";

interface ExamRow {
  id: string;
  code: string;
  title: string;
  type: string;
  date: string;
  time: string;
  venue: string;
  status: string;
}

export function StudentTimetablePage() {
  const db = useDatabase();
  const { user } = useAuth();
  const [day, setDay] = useState(ALL);

  const student = user ? studentService.byUserId(db, user.id) : undefined;

  if (!student) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Timetable" description="Your weekly class schedule." />
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="No student profile"
            description="This account is not linked to a student record yet."
          />
        </Card>
      </div>
    );
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const activeOfferings = studentService
    .enrollmentsFor(db, student.id)
    .filter((enrollment) => enrollment.status === "active")
    .map((enrollment) => db.courseOfferings.find((offering) => offering.id === enrollment.offeringId))
    .filter((offering): offering is NonNullable<typeof offering> => Boolean(offering));
  const offeringIds = new Set(activeOfferings.map((offering) => offering.id));

  const items: TimetableItem[] = timetableService.forStudent(db, student.id).map((entry) => {
    const offering = db.courseOfferings.find((item) => item.id === entry.offeringId);
    const course = offering ? db.courses.find((item) => item.id === offering.courseId) : undefined;
    const teacher = db.teachers.find((item) => item.id === entry.teacherId);
    return {
      id: entry.id,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room,
      section: entry.section,
      courseCode: course?.code ?? offering?.id ?? "",
      courseTitle: course?.title ?? "",
      teacherName: teacher?.fullName,
    };
  });

  const filtered = day === ALL ? items : items.filter((item) => String(item.dayOfWeek) === day);
  const dayOptions = [
    { value: ALL, label: "All days" },
    ...ACADEMIC_DAYS.map((value) => ({ value: String(value), label: DAY_NAMES[value] })),
  ];
  const sorted = [...filtered].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
  );

  const examRows: ExamRow[] = examinationService
    .list(db, { pageSize: 100 })
    .items.filter(
      (exam) =>
        offeringIds.has(exam.offeringId) &&
        exam.status !== "cancelled" &&
        exam.date >= todayIso,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((exam) => {
      const offering = db.courseOfferings.find((item) => item.id === exam.offeringId);
      const course = offering ? db.courses.find((item) => item.id === offering.courseId) : undefined;
      if (!course) return [];
      return [
        {
          id: exam.id,
          code: course.code,
          title: course.title,
          type: titleCase(exam.type),
          date: exam.date,
          time: `${formatTime(exam.startTime)} – ${formatTime(exam.endTime)}`,
          venue: exam.venue,
          status: exam.status,
        },
      ];
    });

  const columns: Column<ExamRow>[] = [
    {
      key: "course",
      header: "Course",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.title}</p>
          <p className="truncate text-xs text-muted-foreground">{row.code}</p>
        </div>
      ),
    },
    { key: "type", header: "Type", render: (row) => row.type },
    { key: "date", header: "Date", render: (row) => formatDate(row.date) },
    { key: "time", header: "Time", render: (row) => row.time },
    { key: "venue", header: "Venue", render: (row) => row.venue },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Timetable"
        description="Your weekly class schedule and upcoming examinations."
        actions={
          <div className="w-full sm:w-48">
            <SelectField label="Filter by day" value={day} onChange={setDay} options={dayOptions} />
          </div>
        }
      />

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="No timetable entries"
            description="Your weekly schedule will appear once classes are scheduled."
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Weekly classes</p>
              <p className="text-2xl font-semibold">{items.length}</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Showing</p>
              <p className="text-2xl font-semibold">{filtered.length}</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">Distinct courses</p>
              <p className="text-2xl font-semibold">{new Set(items.map((item) => item.courseCode)).size}</p>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Weekly schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyTimetable items={filtered} showTeacher />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All classes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {sorted.length === 0 ? (
                <EmptyState icon={CalendarDays} title="No classes on this day" description="Try selecting a different day." />
              ) : (
                <div className="divide-y divide-border">
                  {sorted.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item.courseCode} — {item.courseTitle}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {DAY_NAMES[item.dayOfWeek]} · {formatTime(item.startTime)} – {formatTime(item.endTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.room} · Section {item.section}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upcoming examinations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            rows={examRows}
            rowKey={(row) => row.id}
            emptyState={
              <EmptyState
                icon={GraduationCap}
                title="No upcoming examinations"
                description="Scheduled examinations for your courses will appear here."
              />
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
