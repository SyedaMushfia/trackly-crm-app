"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Kanban,
  ClipboardList,
  LogOut,
  Settings,
  ShieldCheck,
  UserCog,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { NotificationBell } from "@/components/notification-bell";
import { Avatar } from "@/components/avatar";

function NavItem({
  href,
  icon: Icon,
  label,
  exact = false,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-full text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {label}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

function PageTitle() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  if (pathname === "/dashboard") {
    return (
      <h1 className="text-2xl font-semibold text-foreground">
        Welcome back, {firstName} 👋
      </h1>
    );
  }
  if (pathname.startsWith("/dashboard/leads"))   return <h1 className="text-2xl font-semibold text-foreground">My Leads</h1>;
  if (pathname.startsWith("/dashboard/pipeline")) return <h1 className="text-2xl font-semibold text-foreground">Pipeline</h1>;
  if (pathname.startsWith("/dashboard/tasks"))    return <h1 className="text-2xl font-semibold text-foreground">My Tasks</h1>;
  if (pathname.startsWith("/dashboard/team"))     return <h1 className="text-2xl font-semibold text-foreground">Team</h1>;
  if (pathname.startsWith("/dashboard/admin/audit-log"))  return <h1 className="text-2xl font-semibold text-foreground">Audit Log</h1>;
  if (pathname.startsWith("/dashboard/admin/users"))      return <h1 className="text-2xl font-semibold text-foreground">User Management</h1>;
  if (pathname.startsWith("/dashboard/settings")) return <h1 className="text-2xl font-semibold text-foreground">Settings</h1>;

  return null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const role      = session?.user?.role;
  const isManager = role === "manager";

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-60 bg-card border-r border-border flex flex-col items-center flex-shrink-0">
        {/* Logo */}
        <div className="w-40 h-20">
          <img
            src={theme === "dark" ? "/trackly-logo-dark.png" : "/trackly-logo.png"}
            alt="Trackly"
            className="h-full w-full object-contain"
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 w-full p-3 space-y-0.5 overflow-y-auto">
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" exact />

          {isManager ? (
            <>
              <NavItem href="/dashboard/leads"   icon={ClipboardList} label="Leads" />
              <NavItem href="/dashboard/team"    icon={Users}         label="Team" />

              <SectionLabel>Admin</SectionLabel>
              <NavItem href="/dashboard/admin/audit-log" icon={ShieldCheck} label="Audit Log" />
              <NavItem href="/dashboard/admin/users"     icon={UserCog}     label="User Management" />
            </>
          ) : (
            <>
              <NavItem href="/dashboard/leads"    icon={ClipboardList} label="My Leads" />
              <NavItem href="/dashboard/pipeline" icon={Kanban}        label="Pipeline" />
              <NavItem href="/dashboard/tasks"    icon={CheckSquare}   label="My Tasks" />
            </>
          )}

          <SectionLabel>Account</SectionLabel>
          <NavItem href="/dashboard/settings" icon={Settings} label="Settings" />
        </nav>

        {/* User + Sign out */}
        <div className="p-3 border-t border-border w-full space-y-1">
          {/* Dark mode toggle */}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Dark mode</span>
            <button
              type="button"
              onClick={toggleTheme}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
                theme === "dark" ? "bg-primary" : "bg-muted"
              )}
              aria-label="Toggle dark mode"
            >
              <span
                className={cn(
                  "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-card shadow transition-transform",
                  theme === "dark" ? "translate-x-[18px]" : "translate-x-1"
                )}
              >
                {theme === "dark" ? (
                  <Moon className="h-2 w-2 text-foreground" />
                ) : (
                  <Sun className="h-2 w-2 text-yellow-500" />
                )}
              </span>
            </button>
          </div>

          <div className="px-3 py-2 flex items-center gap-2.5">
            <Avatar src={session?.user?.avatarUrl} name={session?.user?.name} size="md" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {session?.user?.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 flex-shrink-0">
          <PageTitle />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link href="/dashboard/settings" title="Settings" className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar src={session?.user?.avatarUrl} name={session?.user?.name} size="sm" />
            </Link>
          </div>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}