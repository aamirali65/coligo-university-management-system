import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarPlus, CheckCircle2, ClipboardCheck, Save } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { SelectField, TextField } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { useActor } from "@/hooks/useActor";
import { teacherService } from "@/services/teacherService";
import { enrollmentService } from "@/services/enrollmentService";
import { attendanceService, type AttendanceEntry } from "@/services/attendanceService";
import { notify } from "@/lib/notify";
import { ATTENDANCE_LABELS } from "@/lib/constants";
import { formatDate, formatTime, fromNow, pct } from "@/lib/format";
import { AppError, type AttendanceStatus } from "@/types";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = (
  ["present", "absent", "late", "excused"] as AttendanceStatus[]
).map((value) => ({ value, label: ATTENDANCE_LABELS[value] }));

export function TeacherAttendancePage() {
  const db = useDatabase();
  const { user } = useAuth();
  const actor = useActor();
  const [searchParams] = useSearchParams();

  const [offeringId, setOfferingId] = useState(searchParams.get("offering") ?? "");
  const [sessionId, setSessionId] = useState("");
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    startTime: "09:00",
    endTime: "10:30",
    topic: "",
  });

  const teacher = user ? teacherService.byUserId(db, user.id) : undefined;
  const offerings = teacher ? teacherService.offeringsFor(db, teacher.id) : [];

  const offeringOptions = offerings.map((offering) => {
    const course = db.courses.find((item) => item.id === offering.courseId);
    return { value: offering.id, label: `${course?.code ?? offering.id} — ${course?.title ?? "Course"} (Sec ${offering.section})` };
  });

  const sessions = offeringId ? attendanceService.sessionsForOffering(db, offeringId) : [];
  const session = sessionId ? attendanceService.sessionById(db, sessionId) : undefined;
  const students = offeringId ? enrollmentService.studentsForOffering(db, offeringId) : [];
  const summary = offeringId ? attendanceService.offeringSummary(db, offeringId) : null;
  const locked = session?.status === "finalized";

  const sessionOptions = useMemo(
    () =>
      sessions.map((item) => ({
        value: item.id,
        label: `${formatDate(item.date)} · ${item.topic || "Class session"}${item.status === "finalized" ? " (finalized)" : ""}`,
      })),
    [sessions],
  );

  useEffect(() => {
    if (!sessionId) {
      setStatuses({});
      return;
    }
    const records = attendanceService.recordsForSession(db, sessionId);
    const map: Record<string, AttendanceStatus> = {};
    for (const record of records) map[record.studentId] = record.status;
    setStatuses(map);
  }, [sessionId, db]);

  function handleOfferingChange(value: string) {
    setOfferingId(value);
    setSessionId("");
    setStatuses({});
  }

  function entries(): AttendanceEntry[] {
    return students.map((student) => ({
      studentId: student.id,
      status: statuses[student.id] ?? "present",
    }));
  }

  async function handleSave(finalize: boolean) {
    if (!session) return;
    if (finalize) {
      setFinalizing(true);
    } else {
      setSaving(true);
    }
    try {
      await attendanceService.save(session.id, entries(), finalize, actor);
      notify.success(finalize ? "Attendance finalized" : "Attendance saved", `${students.length} record(s) submitted.`);
      setConfirmFinalize(false);
    } catch (error) {
      notify.error(
        finalize ? "Could not finalize attendance" : "Could not save attendance",
        error instanceof AppError ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
      setFinalizing(false);
    }
  }

  async function handleCreateSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!offeringId) return;
    setCreating(true);
    try {
      const created = await attendanceService.createSession(
        {
          offeringId,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          topic: form.topic,
        },
        actor,
      );
      notify.success("Class session created", formatDate(created.date));
      setSessionId(created.id);
      setSessionDialogOpen(false);
      setForm({ ...form, topic: "" });
    } catch (error) {
      notify.error("Could not create session", error instanceof AppError ? error.message : "Please try again.");
    } finally {
      setCreating(false);
    }
  }

  if (!teacher) {
    return (
      <div className="space-y-6">
        <PageHeader title="Attendance" description="Record attendance for your classes." />
        <Card>
          <EmptyState icon={ClipboardCheck} title="No teacher profile" description="This account is not linked to a teacher record." />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Create class sessions and mark student attendance."
        actions={
          <Button disabled={!offeringId} onClick={() => setSessionDialogOpen(true)}>
            <CalendarPlus className="h-4 w-4" />
            New session
          </Button>
        }
      />

      {offerings.length === 0 ? (
        <Card>
          <EmptyState icon={ClipboardCheck} title="No assigned courses" description="You have no course offerings to take attendance for." />
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
              <SelectField
                label="Course offering"
                value={offeringId}
                onChange={handleOfferingChange}
                options={offeringOptions}
                placeholder="Select an offering"
              />
              <SelectField
                label="Class session"
                value={sessionId}
                onChange={setSessionId}
                options={sessionOptions}
                placeholder={sessions.length === 0 ? "No sessions yet" : "Select a session"}
                disabled={!offeringId || sessions.length === 0}
              />
              {summary && (
                <div className="sm:col-span-2 flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
                  <span className="text-xs text-muted-foreground">Offering attendance</span>
                  <Badge variant={summary.percentage >= 75 ? "success" : "warning"}>{pct(summary.percentage)}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Present {summary.present} · Late {summary.late} · Absent {summary.absent} · Excused {summary.excused}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {!session ? (
            <Card>
              <EmptyState
                icon={ClipboardCheck}
                title="Select a class session"
                description="Choose an existing session or create a new one to begin marking attendance."
              />
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <div className="space-y-1">
                  <CardTitle>{session.topic || "Class session"}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(session.date)} · {formatTime(session.startTime)} – {formatTime(session.endTime)} · {fromNow(session.date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={session.status} />
                  {!locked && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving || finalizing || students.length === 0}>
                        <Save className="h-4 w-4" />
                        {saving ? "Saving…" : "Save"}
                      </Button>
                      <Button size="sm" onClick={() => setConfirmFinalize(true)} disabled={saving || finalizing || students.length === 0}>
                        <CheckCircle2 className="h-4 w-4" />
                        Finalize
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {students.length === 0 ? (
                  <EmptyState icon={ClipboardCheck} title="No students enrolled" description="There is nobody to mark for this offering." />
                ) : (
                  <div className="divide-y divide-border">
                    {students.map((student) => {
                      const status = statuses[student.id] ?? "present";
                      return (
                        <div key={student.id} className="flex items-center justify-between gap-3 px-5 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <UserAvatar name={student.fullName} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{student.fullName}</p>
                              <p className="text-xs text-muted-foreground">{student.registrationNumber}</p>
                            </div>
                          </div>
                          {locked ? (
                            <StatusBadge status={status} label={ATTENDANCE_LABELS[status]} />
                          ) : (
                            <Select
                              value={status}
                              onValueChange={(value) =>
                                setStatuses((prev) => ({ ...prev, [student.id]: value as AttendanceStatus }))
                              }
                            >
                              <SelectTrigger className="h-8 w-36" aria-label={`Attendance for ${student.fullName}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <FormDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        title="New class session"
        description="Create a session to record attendance against."
        submitLabel="Create session"
        loading={creating}
        onSubmit={handleCreateSession}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Date"
            type="date"
            name="date"
            required
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
          />
          <TextField
            label="Topic"
            name="topic"
            placeholder="e.g. Normalization"
            value={form.topic}
            onChange={(event) => setForm({ ...form, topic: event.target.value })}
          />
          <TextField
            label="Start time"
            type="time"
            name="startTime"
            required
            value={form.startTime}
            onChange={(event) => setForm({ ...form, startTime: event.target.value })}
          />
          <TextField
            label="End time"
            type="time"
            name="endTime"
            required
            value={form.endTime}
            onChange={(event) => setForm({ ...form, endTime: event.target.value })}
          />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={confirmFinalize}
        onOpenChange={setConfirmFinalize}
        title="Finalize attendance?"
        description="Once finalized, this session is locked and its records can no longer be edited."
        confirmLabel="Finalize"
        loading={finalizing}
        onConfirm={() => handleSave(true)}
      />
    </div>
  );
}
