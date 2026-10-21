import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClipboardList, FileCheck2, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SelectField, TextField } from "@/components/forms/field";
import { FormDialog } from "@/components/forms/form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type Column } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { FilterDropdown } from "@/components/tables/filter-dropdown";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { useActor } from "@/hooks/useActor";
import { teacherService } from "@/services/teacherService";
import { assessmentService, type AssessmentInput } from "@/services/assessmentService";
import { notify } from "@/lib/notify";
import { ASSESSMENT_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { AppError, type Assessment, type AssessmentStatus, type AssessmentType } from "@/types";

const TYPE_OPTIONS = (Object.keys(ASSESSMENT_TYPE_LABELS) as AssessmentType[]).map((value) => ({
  value,
  label: ASSESSMENT_TYPE_LABELS[value],
}));

const STATUS_OPTIONS: { value: AssessmentStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

interface AssessmentForm {
  title: string;
  type: AssessmentType;
  maxMarks: string;
  weight: string;
  dueDate: string;
  status: AssessmentStatus;
}

const EMPTY_FORM: AssessmentForm = {
  title: "",
  type: "assignment",
  maxMarks: "100",
  weight: "10",
  dueDate: new Date().toISOString().slice(0, 10),
  status: "draft",
};

export function TeacherAssessmentsPage() {
  const db = useDatabase();
  const { user } = useAuth();
  const actor = useActor();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [offeringId, setOfferingId] = useState(searchParams.get("offering") ?? "");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Assessment | null>(null);
  const [form, setForm] = useState<AssessmentForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Assessment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const teacher = user ? teacherService.byUserId(db, user.id) : undefined;
  const offerings = teacher ? teacherService.offeringsFor(db, teacher.id) : [];
  const offeringOptions = offerings.map((offering) => {
    const course = db.courses.find((item) => item.id === offering.courseId);
    return { value: offering.id, label: `${course?.code ?? offering.id} — ${course?.title ?? "Course"} (Sec ${offering.section})` };
  });

  const assessments = offeringId ? assessmentService.forOffering(db, offeringId) : [];
  const totalWeight = offeringId ? assessmentService.totalWeight(db, offeringId) : 0;

  const filtered = assessments.filter((assessment) => {
    if (typeFilter && assessment.type !== typeFilter) return false;
    if (statusFilter && assessment.status !== statusFilter) return false;
    return true;
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(assessment: Assessment) {
    setEditing(assessment);
    setForm({
      title: assessment.title,
      type: assessment.type,
      maxMarks: String(assessment.maxMarks),
      weight: String(assessment.weight),
      dueDate: assessment.dueDate,
      status: assessment.status,
    });
    setErrors({});
    setDialogOpen(true);
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = "Title is required.";
    const maxMarks = Number(form.maxMarks);
    if (!Number.isFinite(maxMarks) || maxMarks <= 0) next.maxMarks = "Enter a positive number.";
    const weight = Number(form.weight);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) next.weight = "Between 0 and 100.";
    if (!form.dueDate) next.dueDate = "Due date is required.";
    return next;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!offeringId) return;
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    const input: AssessmentInput = {
      offeringId,
      title: form.title.trim(),
      type: form.type,
      maxMarks: Number(form.maxMarks),
      weight: Number(form.weight),
      dueDate: form.dueDate,
      status: form.status,
    };
    setSaving(true);
    try {
      if (editing) {
        await assessmentService.update(editing.id, input, actor);
        notify.success("Assessment updated", input.title);
      } else {
        await assessmentService.create(input, actor);
        notify.success("Assessment created", input.title);
      }
      setDialogOpen(false);
    } catch (error) {
      notify.error("Could not save assessment", error instanceof AppError ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await assessmentService.remove(deleteTarget.id, actor);
      notify.success("Assessment deleted", deleteTarget.title);
      setDeleteTarget(null);
    } catch (error) {
      notify.error("Could not delete assessment", error instanceof AppError ? error.message : "Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Assessment>[] = [
    { key: "title", header: "Title", render: (row) => <span className="font-medium">{row.title}</span> },
    { key: "type", header: "Type", render: (row) => ASSESSMENT_TYPE_LABELS[row.type] },
    { key: "maxMarks", header: "Max marks", render: (row) => row.maxMarks },
    { key: "weight", header: "Weight", render: (row) => `${row.weight}%` },
    { key: "dueDate", header: "Due date", render: (row) => formatDate(row.dueDate) },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/teacher/marks?offering=${offeringId}&assessment=${row.id}`)}
          >
            <FileCheck2 className="h-4 w-4" />
            Marks
          </Button>
          <Button variant="ghost" size="icon" aria-label="Edit assessment" onClick={() => openEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete assessment"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (!teacher) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assessments" description="Manage your course assessments." />
        <Card>
          <EmptyState icon={ClipboardList} title="No teacher profile" description="This account is not linked to a teacher record." />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessments"
        description="Define graded components and their weights for each offering."
        actions={
          <Button disabled={!offeringId} onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New assessment
          </Button>
        }
      />

      {offerings.length === 0 ? (
        <Card>
          <EmptyState icon={ClipboardList} title="No assigned courses" description="You have no offerings to manage assessments for." />
        </Card>
      ) : (
        <Card>
          <div className="border-b border-border p-4">
            <SelectField
              label="Course offering"
              value={offeringId}
              onChange={setOfferingId}
              options={offeringOptions}
              placeholder="Select an offering"
              className="sm:max-w-md"
            />
          </div>

          {offeringId && (
            <TableToolbar
              actions={
                <Badge variant={totalWeight === 100 ? "success" : "warning"}>Total weight {totalWeight}%</Badge>
              }
            >
              <FilterDropdown
                label="Type"
                value={typeFilter}
                onChange={setTypeFilter}
                options={TYPE_OPTIONS}
                allLabel="All"
              />
              <FilterDropdown
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_OPTIONS}
                allLabel="All"
              />
            </TableToolbar>
          )}

          <CardContent className="p-0">
            {!offeringId ? (
              <EmptyState icon={ClipboardList} title="Select an offering" description="Choose a course offering to view its assessments." />
            ) : (
              <DataTable
                columns={columns}
                rows={filtered}
                rowKey={(row) => row.id}
                emptyState={
                  <EmptyState
                    icon={ClipboardList}
                    title="No assessments"
                    description="Create an assessment to define a graded component."
                  />
                }
              />
            )}
          </CardContent>
        </Card>
      )}

      {offeringId && totalWeight !== 100 && assessments.length > 0 && (
        <p className="text-xs text-warning">
          Assessment weights for this offering total {totalWeight}%. They should sum to 100% for accurate course totals.
        </p>
      )}

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit assessment" : "New assessment"}
        description="Weights across an offering should sum to 100%."
        submitLabel={editing ? "Save changes" : "Create assessment"}
        loading={saving}
        onSubmit={handleSubmit}
      >
        <TextField
          label="Title"
          name="title"
          required
          value={form.title}
          error={errors.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Type"
            value={form.type}
            onChange={(value) => setForm({ ...form, type: value as AssessmentType })}
            options={TYPE_OPTIONS}
          />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(value) => setForm({ ...form, status: value as AssessmentStatus })}
            options={STATUS_OPTIONS}
          />
          <TextField
            label="Maximum marks"
            name="maxMarks"
            type="number"
            min={1}
            required
            value={form.maxMarks}
            error={errors.maxMarks}
            onChange={(event) => setForm({ ...form, maxMarks: event.target.value })}
          />
          <TextField
            label="Weight (%)"
            name="weight"
            type="number"
            min={1}
            max={100}
            required
            value={form.weight}
            error={errors.weight}
            onChange={(event) => setForm({ ...form, weight: event.target.value })}
          />
        </div>
        <TextField
          label="Due date"
          name="dueDate"
          type="date"
          required
          value={form.dueDate}
          error={errors.dueDate}
          onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
        />
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete assessment?"
        description={deleteTarget ? `“${deleteTarget.title}” will be removed. Assessments with recorded marks cannot be deleted.` : undefined}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
