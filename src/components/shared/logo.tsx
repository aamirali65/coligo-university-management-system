import { GraduationCap } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, showWordmark = true, size = "md" }: LogoProps) {
  const box = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const icon = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  const text = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm",
          box,
        )}
        aria-hidden="true"
      >
        <GraduationCap className={icon} />
      </span>
      {showWordmark && (
        <span className={cn("font-semibold tracking-tight text-foreground", text)}>{APP_NAME}</span>
      )}
    </span>
  );
}
