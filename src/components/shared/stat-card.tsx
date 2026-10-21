import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  trend?: { value: number; label?: string };
  tone?: "primary" | "success" | "warning" | "destructive" | "muted";
  loading?: boolean;
}

const TONES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

export function StatCard({ label, value, icon: Icon, hint, trend, tone = "primary", loading }: StatCardProps) {
  if (loading) {
    return (
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="mt-4 h-7 w-16" />
        <Skeleton className="mt-2 h-3 w-28" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg", TONES[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {trend && (
          <span
            className={cn(
              "text-xs font-medium",
              trend.value >= 0 ? "text-success" : "text-destructive",
            )}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}%
          </span>
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </Card>
  );
}
