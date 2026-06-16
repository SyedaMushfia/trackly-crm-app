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
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { NotificationBell } from "@/components/notification-bell";
import { Avatar } from "@/components/avatar";
import { useState } from "react";

function NavItem({
  href,
  icon: Icon,
  label,
  exact = false,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
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
      <h1 className="text-lg sm:text-2xl font-semibold text-foreground truncate">
        Welcome back, {firstName} 👋
      </h1>
    );
  }
  if (pathname.startsWith("/dashboard/leads")) {
    return (
      <h1 className="text-lg sm:text-2xl font-semibold text-foreground">
        {session?.user?.role === "manager" ? "All Leads" : "My Leads"}
      </h1>
    );
  }  
  if (pathname.startsWith("/dashboard/pipeline")) return <h1 className="text-lg sm:text-2xl font-semibold text-foreground">Pipeline</h1>;
  if (pathname.startsWith("/dashboard/tasks"))    return <h1 className="text-lg sm:text-2xl font-semibold text-foreground">My Tasks</h1>;
  if (pathname.startsWith("/dashboard/team"))     return <h1 className="text-lg sm:text-2xl font-semibold text-foreground">Team</h1>;
  if (pathname.startsWith("/dashboard/admin/audit-log"))  return <h1 className="text-lg sm:text-2xl font-semibold text-foreground">Audit Log</h1>;
  if (pathname.startsWith("/dashboard/admin/users"))      return <h1 className="text-lg sm:text-2xl font-semibold text-foreground">User Management</h1>;
  if (pathname.startsWith("/dashboard/settings")) return <h1 className="text-lg sm:text-2xl font-semibold text-foreground">Settings</h1>;

  return null;
}

function SidebarContent({
  isManager,
  onNavClick,
}: {
  isManager: boolean;
  onNavClick?: () => void;
}) {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Logo */}
      <div className="w-40 h-20 flex-shrink-0">
        <img
          src={theme === "dark" ? "/trackly-logo-dark.png" : "/trackly-logo.png"}
          alt="Trackly"
          className="h-full w-full object-contain"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 w-full p-3 space-y-0.5 overflow-y-auto">
        <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" exact onClick={onNavClick} />

        {isManager ? (
          <>
            <NavItem href="/dashboard/leads"   icon={ClipboardList} label="Leads" onClick={onNavClick} />
            <NavItem href="/dashboard/team"    icon={Users}         label="Team" onClick={onNavClick} />

            <SectionLabel>Admin</SectionLabel>
            <NavItem href="/dashboard/admin/audit-log" icon={ShieldCheck} label="Audit Log" onClick={onNavClick} />
            <NavItem href="/dashboard/admin/users"     icon={UserCog}     label="User Management" onClick={onNavClick} />
          </>
        ) : (
          <>
            <NavItem href="/dashboard/leads"    icon={ClipboardList} label="My Leads" onClick={onNavClick} />
            <NavItem href="/dashboard/pipeline" icon={Kanban}        label="Pipeline" onClick={onNavClick} />
            <NavItem href="/dashboard/tasks"    icon={CheckSquare}   label="My Tasks" onClick={onNavClick} />
          </>
        )}

        <SectionLabel>Account</SectionLabel>
        <NavItem href="/dashboard/settings" icon={Settings} label="Settings" onClick={onNavClick} />
      </nav>

      {/* User + Sign out */}
      <div className="p-3 border-t border-border w-full space-y-1 flex-shrink-0">
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
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const role      = session?.user?.role;
  const isManager = role === "manager";

  return (
    <div className="flex h-screen bg-background">
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex w-60 bg-card border-r border-border flex-col items-center flex-shrink-0">
        <SidebarContent isManager={isManager} />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile sidebar drawer ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col items-center transition-transform duration-200 md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button inside drawer */}
        <button
          className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent isManager={isManager} onNavClick={() => setSidebarOpen(false)} />
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-4 sm:px-6 flex-shrink-0 gap-2">
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1 min-w-0">
            <PageTitle />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
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