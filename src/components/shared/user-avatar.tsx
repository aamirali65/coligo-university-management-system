import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const PALETTE = [
  "bg-primary/10 text-primary",
  "bg-success/10 text-success",
  "bg-warning/10 text-warning",
  "bg-navy/10 text-navy",
  "bg-secondary text-secondary-foreground",
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i)) % PALETTE.length;
  return PALETTE[hash];
}

export function UserAvatar({
  name,
  className,
  size = "md",
}: {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dimension = size === "sm" ? "h-7 w-7 text-[10px]" : size === "lg" ? "h-12 w-12 text-sm" : "h-9 w-9 text-xs";
  return (
    <Avatar className={cn(dimension, className)}>
      <AvatarFallback className={cn("font-semibold", colorFor(name))}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
