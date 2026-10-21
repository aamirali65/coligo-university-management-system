import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  empty?: boolean;
  emptyMessage?: string;
  contentClassName?: string;
}

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
  empty,
  emptyMessage = "No data available yet.",
  contentClassName,
}: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className={cn(contentClassName)}>
        {empty ? <EmptyState icon={BarChart3} title={emptyMessage} /> : children}
      </CardContent>
    </Card>
  );
}
