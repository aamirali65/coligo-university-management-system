import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, PanelLeftClose, PanelLeftOpen, User as UserIcon } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/features/auth/AuthContext";
import { NAVIGATION } from "@/lib/navigation";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
}

export function AppSidebar({ collapsed, onToggleCollapse, onNavigate }: AppSidebarProps) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  if (!user || !role) return null;
  const groups = NAVIGATION[role];

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-border bg-card transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className={cn("flex h-16 items-center border-b border-border px-4", collapsed && "justify-center px-2")}>
        <Logo showWordmark={!collapsed} size="md" />
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto scrollbar-thin px-3 py-4" aria-label="Main navigation">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed && (
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </p>
            )}
            {group.items.map((item) => {
              const link = (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      collapsed && "justify-center px-0",
                      isActive
                        ? "bg-accent text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );

              return collapsed ? (
                <Tooltip key={item.href} delayDuration={100}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                link
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-md p-2",
            collapsed && "justify-center p-0 py-2",
          )}
        >
          <UserAvatar name={user.fullName} />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
            </div>
          )}
        </div>
        <div className={cn("mt-1 flex items-center gap-1", collapsed ? "flex-col" : "justify-between")}>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn("text-muted-foreground", !collapsed && "flex-1 justify-start")}
                onClick={() => navigate(`/${role === "examination" ? "examinations" : role}/profile`)}
              >
                <UserIcon className="h-4 w-4" />
                {!collapsed && "Profile"}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">View profile</TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={handleLogout} aria-label="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Log out</TooltipContent>
          </Tooltip>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className={cn("mt-1 hidden w-full text-muted-foreground lg:flex", collapsed && "justify-center")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && "Collapse"}
        </Button>
      </div>
    </div>
  );
}
