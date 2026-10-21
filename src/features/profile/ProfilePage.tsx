import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarCheck, GraduationCap, Mail, Pencil, Phone, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/forms/form-dialog";
import { TextField } from "@/components/forms/field";
import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/features/auth/AuthContext";
import { useActor } from "@/hooks/useActor";
import { userService } from "@/services/userService";
import { studentService } from "@/services/studentService";
import { teacherService } from "@/services/teacherService";
import { reportService } from "@/services/reportService";
import { notify } from "@/lib/notify";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS, STUDENT_STATUS_LABELS } from "@/lib/constants";

const schema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ProfilePage() {
  const db = useDatabase();
  const { user, role } = useAuth();
  const actor = useActor();
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: user?.fullName ?? "", email: user?.email ?? "", phone: user?.phone ?? "" },
  });

  if (!user) return null;

  const department = user.departmentId ? db.departments.find((d) => d.id === user.departmentId) : undefined;
  const student = user.studentId ? studentService.byId(db, user.studentId) : undefined;
  const teacher = user.teacherId ? teacherService.byId(db, user.teacherId) : undefined;
  const attendance = student ? studentService.attendanceSummary(db, student.id) : undefined;
  const gpa = student ? reportService.studentGpa(db, student.id) : undefined;

  const openEdit = () => {
    form.reset({ fullName: user.fullName, email: user.email, phone: user.phone });
    setFormOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      await userService.update(
        user.id,
        {
          fullName: values.fullName,
          email: values.email,
          phone: values.phone ?? "",
          role: user.role,
          departmentId: user.departmentId,
          status: user.status,
        },
        actor,
      );
      notify.success("Profile updated", "Your contact details were saved.");
      setFormOpen(false);
    } catch (error) {
      notify.error("Could not update profile", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Your account details and role information."
        actions={
          <Button variant="outline" onClick={openEdit}>
            <Pencil className="h-4 w-4" />
            Edit details
          </Button>
        }
      />

      {student && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="GPA" value={gpa === null || gpa === undefined ? "—" : gpa.toFixed(2)} icon={TrendingUp} />
          <StatCard label="Attendance" value={`${attendance?.percentage ?? 0}%`} icon={CalendarCheck} tone="success" />
          <StatCard label="Semester" value={student.currentSemester} icon={GraduationCap} tone="warning" />
          <StatCard label="Status" value={STUDENT_STATUS_LABELS[student.status]} icon={Users} tone="muted" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account information</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <UserAvatar name={user.fullName} size="lg" />
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Full name</p>
                <p className="text-sm font-medium">{user.fullName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="text-sm font-medium">{ROLE_LABELS[user.role]}</p>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3.5 w-3.5" /> Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3.5 w-3.5" /> Phone</p>
                <p className="text-sm font-medium">{user.phone || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="text-sm font-medium">{department?.name ?? "Not applicable"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Account created</p>
                <p className="text-sm font-medium">{formatDate(user.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Role</span>
              <StatusBadge status={user.role} label={ROLE_LABELS[user.role]} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge status={user.status} />
            </div>
            {student && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Registration</span>
                  <span className="text-sm font-medium">{student.registrationNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Admitted</span>
                  <span className="text-sm font-medium">{formatDate(student.admissionDate)}</span>
                </div>
              </>
            )}
            {teacher && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Employee no.</span>
                  <span className="text-sm font-medium">{teacher.employeeNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Designation</span>
                  <span className="text-sm font-medium">{teacher.designation}</span>
                </div>
              </>
            )}
            {role === "admin" && (
              <p className="text-xs text-muted-foreground">
                As an administrator you have full access to all modules and settings.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Edit contact details"
        description="Update your display name and contact information."
        submitLabel="Save changes"
        onSubmit={form.handleSubmit(onSubmit)}
        loading={saving}
      >
        <TextField label="Full name" required error={form.formState.errors.fullName?.message} {...form.register("fullName")} />
        <TextField label="Email" type="email" required error={form.formState.errors.email?.message} {...form.register("email")} />
        <TextField label="Phone" placeholder="+92 300 0000000" {...form.register("phone")} />
      </FormDialog>
    </div>
  );
}
