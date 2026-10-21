import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RotateCcw, Save } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TextField, TextareaField } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDatabase } from "@/hooks/useDatabase";
import { useActor } from "@/hooks/useActor";
import { settingsService } from "@/services/settingsService";
import { notify } from "@/lib/notify";
import type { GradeBand, Settings } from "@/types";

const schema = z.object({
  universityName: z.string().min(2, "University name is required."),
  contactEmail: z.string().email("Enter a valid contact email."),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  attendanceThreshold: z.coerce.number().min(0).max(100),
  defaultCapacity: z.coerce.number().int().min(1),
  dateFormat: z.string().min(1, "Date format is required."),
  theme: z.enum(["light", "dark"]),
});

type FormValues = z.infer<typeof schema>;

const DATE_FORMATS = ["MMM d, yyyy", "dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd"];

export function SettingsPage() {
  const db = useDatabase();
  const actor = useActor();
  const [gradingScale, setGradingScale] = useState<GradeBand[]>(db.settings.gradingScale);
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      universityName: db.settings.universityName,
      contactEmail: db.settings.contactEmail,
      contactPhone: db.settings.contactPhone,
      address: db.settings.address,
      attendanceThreshold: db.settings.attendanceThreshold,
      defaultCapacity: db.settings.defaultCapacity,
      dateFormat: db.settings.dateFormat,
      theme: db.settings.theme,
    },
  });

  useEffect(() => {
    setGradingScale(db.settings.gradingScale);
  }, [db.settings.gradingScale]);

  const updateBand = (grade: string, field: keyof GradeBand, value: number) => {
    setGradingScale((prev) => prev.map((band) => (band.grade === grade ? { ...band, [field]: value } : band)));
  };

  const onSubmit = async (values: FormValues) => {
    const next: Settings = {
      ...db.settings,
      universityName: values.universityName,
      contactEmail: values.contactEmail,
      contactPhone: values.contactPhone ?? "",
      address: values.address ?? "",
      attendanceThreshold: values.attendanceThreshold,
      defaultCapacity: values.defaultCapacity,
      dateFormat: values.dateFormat,
      theme: values.theme,
      gradingScale,
    };
    setSaving(true);
    try {
      await settingsService.update(next, actor);
      notify.success("Settings saved", "Your configuration was updated.");
    } catch (error) {
      notify.error("Could not save settings", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    setResetting(true);
    try {
      await settingsService.resetDemoData(actor);
      notify.success("Demo data reset", "All data has been restored to the seed dataset.");
      setResetOpen(false);
    } catch (error) {
      notify.error("Could not reset demo data", error instanceof Error ? error.message : undefined);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure university details, grading and system defaults."
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>University information</CardTitle>
            <CardDescription>Shown on reports and throughout the application.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <TextField label="University name" required error={form.formState.errors.universityName?.message} {...form.register("universityName")} />
            <TextField label="Contact email" type="email" required error={form.formState.errors.contactEmail?.message} {...form.register("contactEmail")} />
            <TextField label="Contact phone" {...form.register("contactPhone")} />
            <TextField label="Date format" {...form.register("dateFormat")} hint={DATE_FORMATS.join(" · ")} />
            <TextareaField label="Address" containerClassName="sm:col-span-2" {...form.register("address")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System defaults</CardTitle>
            <CardDescription>Attendance and capacity thresholds used across modules.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <TextField label="Attendance threshold (%)" type="number" min={0} max={100} required error={form.formState.errors.attendanceThreshold?.message} {...form.register("attendanceThreshold")} />
            <TextField label="Default offering capacity" type="number" min={1} required error={form.formState.errors.defaultCapacity?.message} {...form.register("defaultCapacity")} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="theme">Theme</label>
              <select id="theme" className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("theme")}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grading scale</CardTitle>
            <CardDescription>Letter grades, score ranges and grade points used to compute results and GPA.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead>Min %</TableHead>
                  <TableHead>Max %</TableHead>
                  <TableHead>Grade points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gradingScale.map((band) => (
                  <TableRow key={band.grade}>
                    <TableCell className="text-sm font-medium">{band.grade}</TableCell>
                    <TableCell>
                      <input
                        type="number"
                        step="0.01"
                        value={band.min}
                        onChange={(event) => updateBand(band.grade, "min", Number(event.target.value))}
                        className="h-8 w-24 rounded-md border border-input bg-card px-2 text-sm"
                        aria-label={`${band.grade} minimum`}
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="number"
                        step="0.01"
                        value={band.max}
                        onChange={(event) => updateBand(band.grade, "max", Number(event.target.value))}
                        className="h-8 w-24 rounded-md border border-input bg-card px-2 text-sm"
                        aria-label={`${band.grade} maximum`}
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="number"
                        step="0.1"
                        value={band.points}
                        onChange={(event) => updateBand(band.grade, "points", Number(event.target.value))}
                        className="h-8 w-24 rounded-md border border-input bg-card px-2 text-sm"
                        aria-label={`${band.grade} points`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>Reset all demo data back to the original seed dataset. This cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setResetOpen(true)}>
            <RotateCcw className="h-4 w-4" />
            Reset demo data
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset all demo data?"
        description="Every change you have made will be discarded and the original seed dataset restored."
        confirmLabel="Reset data"
        destructive
        loading={resetting}
        onConfirm={onReset}
      />
    </div>
  );
}
