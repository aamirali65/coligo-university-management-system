import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FileCheck2, Save, Send, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChartCard } from "@/components/charts/chart-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SelectField } from "@/components/forms/field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { useActor } from "@/hooks/useActor";
import { teacherService } from "@/services/teacherService";
import { enrollmentService } from "@/services/enrollmentService";
import { assessmentService } from "@/services/assessmentService";
import { marksService, type MarkEntry } from "@/services/marksService";
import { resultService } from "@/services/resultService";
import { notify } from "@/lib/notify";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/constants";
import { formatDate, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AppError } from "@/types";

const chartTooltipStyle = {
  borderRadius: 8,
  border: "1px solid #E2E8F0",
  fontSize: 12,
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
};

export function TeacherMarksPage() {
  const db = useDatabase();
  const { user } = useAuth();
  const actor = useActor();
  const [searchParams] = useSearchParams();

  const [offeringId, setOfferingId] = useState(searchParams.get("offering") ?? "");
  const [assessmentId, setAssessmentId] = useState(searchParams.get("assessment") ?? "");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const teacher = user ? teacherService.byUserId(db, user.id) : undefined;
  const offerings = teacher ? teacherService.offeringsFor(db, teacher.id) : [];
  const offeringOptions = offerings.map((offering) => {
    const course = db.courses.find((item) => item.id === offering.courseId);
    return { value: offering.id, label: `${course?.code ?? offering.id} — ${course?.title ?? "Course"} (Sec ${offering.section})` };
  });

  const assessments = offeringId ? assessmentService.forOffering(db, offeringId) : [];
  const assessment = assessments.find((item) => item.id === assessmentId);
  const assessmentOptions = assessments.map((item) => ({
    value: item.id,
    label: `${item.title} (${ASSESSMENT_TYPE_LABELS[item.type]})`,
  }));

  const students = offeringId ? enrollmentService.studentsForOffering(db, offeringId) : [];
  const stats = assessment ? marksService.stats(db, assessment.id) : null;

  useEffect(() => {
    if (!assessmentId) {
      setScores({});
      return;
    }
    const marks = marksService.forAssessment(db, assessmentId);
    const map: Record<string, string> = {};
    for (const mark of marks) map[mark.studentId] = String(mark.score);
    setScores(map);
    setErrors({});
  }, [assessmentId, db]);

  function handleOfferingChange(value: string) {
    setOfferingId(value);
    setAssessmentId("");
    setScores({});
    setErrors({});
  }

  function computeErrors(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!assessment) return next;
    for (const student of students) {
      const raw = (scores[student.id] ?? "").trim();
      if (raw === "") continue;
      const value = Number(raw);
      if (!Number.isFinite(value)) next[student.id] = "Invalid number";
      else if (value < 0) next[student.id] = "Cannot be negative";
      else if (value > assessment.maxMarks) next[student.id] = `Max ${assessment.maxMarks}`;
    }
    return next;
  }

  async function handleSave() {
    if (!assessment) return;
    const found = computeErrors();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      notify.error("Check the highlighted marks", "Some values are out of range.");
      return;
    }
    const entries: MarkEntry[] = students.map((student) => {
      const raw = (scores[student.id] ?? "").trim();
      return { studentId: student.id, score: raw === "" ? null : Number(raw) };
    });
    setSaving(true);
    try {
      await marksService.saveMarks(assessment.id, entries, actor);
      notify.success("Marks saved", assessment.title);
    } catch (error) {
      notify.error("Could not save marks", error instanceof AppError ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitResults() {
    if (!offeringId) return;
    setSubmitting(true);
    try {
      const count = await resultService.submitOffering(offeringId, actor);
      notify.success("Results submitted for review", `${count} result(s) sent.`);
      setConfirmSubmit(false);
    } catch (error) {
      notify.error("Could not submit results", error instanceof AppError ? error.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const histogramData = (() => {
    if (!assessment) return [];
    const max = assessment.maxMarks;
    const buckets = 5;
    const size = max / buckets;
    const data = Array.from({ length: buckets }, (_, index) => ({
      range: `${Math.round(index * size)}–${Math.round((index + 1) * size)}`,
      count: 0,
    }));
    for (const student of students) {
      const raw = (scores[student.id] ?? "").trim();
      if (raw === "") continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > max) continue;
      const index = Math.min(buckets - 1, Math.floor(value / size));
      data[index].count += 1;
    }
    return data;
  })();

  if (!teacher) {
    return (
      <div className="space-y-6">
        <PageHeader title="Marks entry" description="Record and submit marks." />
        <Card>
          <EmptyState icon={FileCheck2} title="No teacher profile" description="This account is not linked to a teacher record." />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marks entry"
        description="Enter scores for each assessment and submit results for review."
        actions={
          <Button variant="outline" disabled={!offeringId} onClick={() => setConfirmSubmit(true)}>
            <Send className="h-4 w-4" />
            Submit results for review
          </Button>
        }
      />

      {offerings.length === 0 ? (
        <Card>
          <EmptyState icon={FileCheck2} title="No assigned courses" description="You have no offerings to enter marks for." />
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
                label="Assessment"
                value={assessmentId}
                onChange={setAssessmentId}
                options={assessmentOptions}
                placeholder={assessments.length === 0 ? "No assessments" : "Select an assessment"}
                disabled={!offeringId || assessments.length === 0}
              />
            </CardContent>
          </Card>

          {!assessment ? (
            <Card>
              <EmptyState
                icon={FileCheck2}
                title="Select an assessment"
                description="Choose a course offering and assessment to enter marks."
              />
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-5">
                  <p className="text-sm text-muted-foreground">Entered</p>
                  <p className="text-2xl font-semibold">
                    {stats?.count ?? 0}
                    <span className="text-sm font-normal text-muted-foreground"> / {students.length}</span>
                  </p>
                </Card>
                <Card className="p-5">
                  <p className="text-sm text-muted-foreground">Average</p>
                  <p className="text-2xl font-semibold">{stats?.average ?? "—"}</p>
                  {stats?.average !== null && stats?.average !== undefined && assessment.maxMarks > 0 && (
                    <p className="text-xs text-muted-foreground">{pct(Math.round((stats.average / assessment.maxMarks) * 1000) / 10)}</p>
                  )}
                </Card>
                <Card className="p-5">
                  <p className="text-sm text-muted-foreground">Highest</p>
                  <p className="text-2xl font-semibold">{stats?.highest ?? "—"}</p>
                </Card>
                <Card className="p-5">
                  <p className="text-sm text-muted-foreground">Lowest</p>
                  <p className="text-2xl font-semibold">{stats?.lowest ?? "—"}</p>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                    <div className="space-y-1">
                      <CardTitle>{assessment.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {ASSESSMENT_TYPE_LABELS[assessment.type]} · Max {assessment.maxMarks} · Weight {assessment.weight}% · Due {formatDate(assessment.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={assessment.status} />
                      <Button size="sm" onClick={handleSave} disabled={saving || students.length === 0}>
                        <Save className="h-4 w-4" />
                        {saving ? "Saving…" : "Save marks"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {students.length === 0 ? (
                      <EmptyState icon={FileCheck2} title="No students enrolled" description="There is nobody to grade for this offering." />
                    ) : (
                      <div className="divide-y divide-border">
                        {students.map((student) => (
                          <div key={student.id} className="flex items-center justify-between gap-3 px-5 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{student.fullName}</p>
                              <p className="text-xs text-muted-foreground">{student.registrationNumber}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Input
                                type="number"
                                min={0}
                                max={assessment.maxMarks}
                                step="0.5"
                                inputMode="decimal"
                                aria-label={`Score for ${student.fullName}`}
                                value={scores[student.id] ?? ""}
                                placeholder="—"
                                onChange={(event) =>
                                  setScores((prev) => ({ ...prev, [student.id]: event.target.value }))
                                }
                                className={cn("h-9 w-28", errors[student.id] && "border-destructive focus-visible:ring-destructive")}
                              />
                              {errors[student.id] && (
                                <p className="text-[11px] font-medium text-destructive" role="alert">
                                  {errors[student.id]}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <ChartCard
                  title="Score distribution"
                  description="Current entry across score bands"
                  empty={students.length === 0}
                  emptyMessage="No students to chart."
                >
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={histogramData} margin={{ left: -20, right: 8, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="range" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" allowDecimals={false} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Out of {assessment.maxMarks} marks
                  </div>
                </ChartCard>
              </div>
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title="Submit results for review?"
        description="Draft and returned results for this offering will be calculated and submitted for review."
        confirmLabel="Submit for review"
        loading={submitting}
        onConfirm={handleSubmitResults}
      />
    </div>
  );
}
