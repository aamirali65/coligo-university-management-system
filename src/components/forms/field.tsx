import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FieldShellProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, error, hint, required, className, children }: FieldShellProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} className="flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export interface TextFieldProps extends React.ComponentProps<"input"> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, hint, containerClassName, id, required, ...props }, ref) => (
    <Field
      label={label}
      htmlFor={id ?? props.name}
      error={error}
      hint={hint}
      required={required}
      className={containerClassName}
    >
      <Input ref={ref} id={id ?? props.name} required={required} aria-invalid={Boolean(error)} {...props} />
    </Field>
  ),
);
TextField.displayName = "TextField";

export interface TextareaFieldProps extends React.ComponentProps<"textarea"> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export const TextareaField = React.forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, error, hint, containerClassName, id, required, ...props }, ref) => (
    <Field
      label={label}
      htmlFor={id ?? props.name}
      error={error}
      hint={hint}
      required={required}
      className={containerClassName}
    >
      <Textarea ref={ref} id={id ?? props.name} required={required} aria-invalid={Boolean(error)} {...props} />
    </Field>
  ),
);
TextareaField.displayName = "TextareaField";

export interface SelectFieldOption {
  value: string;
  label: string;
}

export interface SelectFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: SelectFieldOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export function SelectField({
  label,
  error,
  hint,
  required,
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
  disabled,
  id,
  name,
}: SelectFieldProps) {
  return (
    <Field label={label} htmlFor={id ?? name} error={error} hint={hint} required={required} className={className}>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id ?? name} aria-invalid={Boolean(error)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
