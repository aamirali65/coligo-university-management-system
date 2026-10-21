import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, HelpCircle, Keyboard, LogOut, Menu, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { GlobalSearch } from "@/components/shared/global-search";
import { NotificationDropdown } from "@/components/shared/notification-dropdown";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAuth } from "@/features/auth/AuthContext";
import { APP_NAME, APP_TAGLINE, ROLE_LABELS } from "@/lib/constants";

const SHORTCUTS = [
  { keys: "Ctrl + K", action: "Open global search" },
  { keys: "Ctrl + B", action: "Collapse or expand the sidebar" },
  { keys: "Esc", action: "Close dialogs and menus" },
];

export function AppHeader({ onOpenMobile }: { onOpenMobile: () => void }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);

  if (!user || !role) return null;
  const base = role === "examination" ? "examinations" : role;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMobile}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden min-w-0 flex-1 flex-col sm:flex">
        <Breadcrumbs />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <GlobalSearch />
        <NotificationDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Help menu">
              <HelpCircle className="h-4.5 w-4.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Help</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setHelpOpen(true)}>
              <Keyboard className="h-4 w-4" />
              Keyboard shortcuts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setHelpOpen(true)}>
              <BookOpen className="h-4 w-4" />
              About {APP_NAME}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-md p-1 pr-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <UserAvatar name={user.fullName} size="sm" />
              <span className="hidden text-left lg:block">
                <span className="block text-sm font-medium leading-tight text-foreground">{user.fullName}</span>
                <span className="block text-xs leading-tight text-muted-foreground">{ROLE_LABELS[role]}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block text-sm font-medium text-foreground">{user.fullName}</span>
              <span className="block text-xs font-normal text-muted-foreground">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(`/${base}/profile`)}>
              <UserIcon className="h-4 w-4" />
              View profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>About {APP_NAME}</DialogTitle>
            <DialogDescription>{APP_TAGLINE} — a university management system demo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This is the frontend demonstration phase. All data is stored locally in your browser and
              authentication is simulated. No real backend is connected yet.
            </p>
            <div>
              <p className="mb-2 text-sm font-medium">Keyboard shortcuts</p>
              <ul className="space-y-1.5">
                {SHORTCUTS.map((shortcut) => (
                  <li key={shortcut.keys} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{shortcut.action}</span>
                    <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-xs font-medium">
                      {shortcut.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
