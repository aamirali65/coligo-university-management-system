import { Clock, MapPin } from "lucide-react";
import { ACADEMIC_DAYS, DAY_SHORT } from "@/lib/constants";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface TimetableItem {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  section: string;
  courseCode: string;
  courseTitle: string;
  teacherName?: string;
}

const SLOT_TONES = [
  "border-primary/30 bg-primary/5 text-primary",
  "border-success/30 bg-success/5 text-success",
  "border-warning/30 bg-warning/5 text-warning",
  "border-navy/30 bg-navy/5 text-navy",
];

export function WeeklyTimetable({
  items,
  showTeacher = true,
  className,
}: {
  items: TimetableItem[];
  showTeacher?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-3 xl:grid-cols-6", className)}>
      {ACADEMIC_DAYS.map((day, dayIndex) => {
        const dayItems = items
          .filter((item) => item.dayOfWeek === day)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        return (
          <div key={day} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{DAY_SHORT[day]}</p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {dayItems.length}
              </span>
            </div>
            {dayItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                No classes
              </div>
            ) : (
              dayItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-lg border p-3 text-xs shadow-sm",
                    SLOT_TONES[dayIndex % SLOT_TONES.length],
                  )}
                >
                  <p className="text-sm font-semibold">{item.courseCode}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs font-normal text-muted-foreground">
                    {item.courseTitle}
                  </p>
                  <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                    <p className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(item.startTime)} – {formatTime(item.endTime)}
                    </p>
                    <p className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {item.room} · Sec {item.section}
                    </p>
                    {showTeacher && item.teacherName && (
                      <p className="truncate text-[11px] text-muted-foreground">{item.teacherName}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
