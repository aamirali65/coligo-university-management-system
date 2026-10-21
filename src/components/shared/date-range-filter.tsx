import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  fromLabel?: string;
  toLabel?: string;
  className?: string;
}

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel = "From",
  toLabel = "To",
  className,
}: DateRangeFilterProps) {
  return (
    <div className={cn("flex flex-wrap items-end gap-2", className)}>
      <div className="space-y-1">
        <Label htmlFor="date-from" className="text-xs text-muted-foreground">
          {fromLabel}
        </Label>
        <Input
          id="date-from"
          type="date"
          value={from}
          onChange={(event) => onFromChange(event.target.value)}
          className="h-9 w-[150px]"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="date-to" className="text-xs text-muted-foreground">
          {toLabel}
        </Label>
        <Input
          id="date-to"
          type="date"
          value={to}
          onChange={(event) => onToChange(event.target.value)}
          className="h-9 w-[150px]"
        />
      </div>
    </div>
  );
}
