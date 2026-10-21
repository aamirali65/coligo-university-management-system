import { toast } from "sonner";

/** Thin wrapper around Sonner so toast usage stays consistent app-wide. */
export const notify = {
  success(message: string, description?: string) {
    toast.success(message, { description });
  },
  error(message: string, description?: string) {
    toast.error(message, { description });
  },
  info(message: string, description?: string) {
    toast.info(message, { description });
  },
  warning(message: string, description?: string) {
    toast.warning(message, { description });
  },
};

export { toast };
