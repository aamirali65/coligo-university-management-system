import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/features/auth/AuthContext";
import { useDatabase } from "@/hooks/useDatabase";
import { notificationService } from "@/services/notificationService";
import { fromNow } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types";

const TYPE_DOT: Record<AppNotification["type"], string> = {
  info: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
};

export function NotificationDropdown() {
  const db = useDatabase();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const items = notificationService.forUser(db, user.id);
  const unread = items.filter((n) => !n.read).length;

  const handleOpen = (notification: AppNotification) => {
    if (!notification.read) notificationService.markRead(notification.id);
    if (notification.link) navigate(notification.link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4.5 w-4.5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => notificationService.markAllRead(user.id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {items.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications" description="You're all caught up." className="py-8" />
          ) : (
            <ul className="divide-y divide-border">
              {items.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => handleOpen(notification)}
                    className={cn(
                      "flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/60",
                      !notification.read && "bg-accent/50",
                    )}
                  >
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TYPE_DOT[notification.type])} />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium text-foreground">{notification.title}</span>
                      <span className="block text-xs text-muted-foreground">{notification.message}</span>
                      <span className="block text-[11px] text-muted-foreground/80">
                        {fromNow(notification.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
