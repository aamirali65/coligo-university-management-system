import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

export function safeParse(value: string | undefined | null): Date | null {
  if (!value) return null;
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  return isValid(date) ? date : null;
}

export function formatDate(value: string | undefined | null, pattern = "MMM d, yyyy"): string {
  const date = safeParse(value);
  return date ? format(date, pattern) : "—";
}

export function formatDateTime(value: string | undefined | null): string {
  return formatDate(value, "MMM d, yyyy • HH:mm");
}

export function formatDay(value: string | undefined | null): string {
  return formatDate(value, "EEEE, MMM d, yyyy");
}

export function formatMonthYear(value: string | undefined | null): string {
  return formatDate(value, "MMM yyyy");
}

export function fromNow(value: string | undefined | null): string {
  const date = safeParse(value);
  if (!date) return "—";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatTime(time: string): string {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function percent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function pct(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}
