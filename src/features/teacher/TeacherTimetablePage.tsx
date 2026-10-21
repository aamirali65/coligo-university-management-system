import { useState } from "react";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { SelectField } from "@/components/forms/field";
import { WeeklyTimetable, type TimetableItem } from "@/components/shared/weekly-timetable";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { teacherService } from "@/services/teacherService";
import { timetableService } from "@/services/timetableService";
import { ACADEMIC_DAYS, DAY_NAMES } from "@/lib/constants";
import { formatTime } from "@/lib/format";

const ALL = "all";

export function TeacherTimetablePage() {
  const db = useDatabase();
  const { user } = useAuth();
  const [day, setDay] = useState(ALL);

  const teacher = user ? teacherService.byUserId(db, user.id) : undefined;
  const entries = teacher ? timetableService.forTeacher(db, teacher.id) : [];

  const items: TimetableItem[] = entries.map((entry) => {
    const offering = db.courseOfferings.find((item) => item.id === entry.offeringId);
    const course = offering ? db.courses.find((item) => item.id === offering.courseId) : undefined;
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Timetable"
        description="Your weekly teaching schedule."
        actions={
          <div className="w-full sm:w-48">
            <SelectField label="Filter by day" value={day} onChange={setDay} options={dayOptions} />
          </div>
        }
      />

      {!teacher || items.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="No timetable entries"
            description="Your weekly schedule will appear here once classes are assigned."
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <WeeklyTimetable items={items} showTeacher={false} />
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
    </div>
  );
}
