import { Badge, type BadgeProps } from "@/components/ui/badge";

type Variant = NonNullable<BadgeProps["variant"]>;

const STATUS_VARIANTS: Record<string, Variant> = {
  // generic
  active: "success",
  inactive: "muted",
  // periods
  upcoming: "info",
  completed: "secondary",
  // enrollment / assessment
  dropped: "muted",
  open: "success",
  closed: "secondary",
  draft: "muted",
  // students
  graduated: "info",
  suspended: "destructive",
  // results
  submitted: "info",
  under_review: "warning",
  approved: "success",
  published: "success",
  returned: "destructive",
  // examinations / sessions
  scheduled: "info",
  cancelled: "destructive",
  finalized: "success",
  // attendance
  present: "success",
  absent: "destructive",
  late: "warning",
  excused: "info",
  // audiences
  university: "info",
  department: "secondary",
  teachers: "outline",
  students: "outline",
  examination_staff: "outline",
  // audit actions
  create: "success",
  update: "info",
  delete: "destructive",
  login: "muted",
  logout: "muted",
  submit: "info",
  approve: "success",
  publish: "success",
  return: "destructive",
  activate: "success",
  deactivate: "muted",
  reset: "warning",
};

function label(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({
  status,
  label: labelOverride,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const variant = STATUS_VARIANTS[status] ?? "outline";
  return (
    <Badge variant={variant} className={className}>
      {labelOverride ?? label(status)}
    </Badge>
  );
}
