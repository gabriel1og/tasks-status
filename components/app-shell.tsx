"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarRange,
  ListFilter,
  ListChecks,
  ListTodo,
  LoaderCircle,
  type LucideIcon,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeModeMenu } from "@/components/theme-mode-menu";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  title: string;
};

const navigationItems = [
  { href: "/status", label: "Status", icon: ListChecks },
  { href: "/sprints", label: "Sprints", icon: CalendarRange },
  { href: "/future-tasks", label: "Tarefas Futuras", icon: ListTodo },
  { href: "/queries", label: "Queries", icon: ListFilter },
  { href: "/settings", label: "Configurações", icon: Settings },
];

const sidebarStorageKey = "gerenciamento-status:sidebar-collapsed";

export function AppShell({ children, title }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    setIsSidebarCollapsed(
      window.localStorage.getItem(sidebarStorageKey) === "true",
    );
  }, []);

  async function signOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setSignOutError("");
    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
      console.error(
        JSON.stringify({
          event: "auth_sign_out_failed",
          message: error.message,
        }),
      );
      setSignOutError("Não foi possível sair. Tente novamente.");
      setIsSigningOut(false);
      return;
    }

    router.replace("/login");
  }

  function toggleSidebar() {
    setIsSidebarCollapsed((currentValue) => {
      const nextValue = !currentValue;

      window.localStorage.setItem(sidebarStorageKey, String(nextValue));
      return nextValue;
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden border-r bg-card/95 p-4 transition-[width] duration-200 md:flex md:flex-col",
          isSidebarCollapsed ? "w-20" : "w-64",
        )}
      >
        <SidebarHeader
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
        />
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            return (
              <SidebarNavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                isActive={
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                }
                isCollapsed={isSidebarCollapsed}
                label={item.label}
              />
            );
          })}
        </nav>
        <SidebarSignOut
          isCollapsed={isSidebarCollapsed}
          isSigningOut={isSigningOut}
          onClick={signOut}
        />
      </aside>
      <main className={cn(isSidebarCollapsed ? "md:pl-20" : "md:pl-64")}>
        <header className="sticky top-0 z-10 border-b bg-background/90 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            <div className="flex max-w-full flex-wrap items-center gap-2">
              <ThemeModeMenu />
              <div className="flex flex-wrap gap-2 md:hidden">
                {navigationItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Button
                      key={item.href}
                      asChild
                      variant="outline"
                      size="icon"
                    >
                      <Link href={item.href} aria-label={item.label}>
                        <Icon className="h-4 w-4" />
                      </Link>
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={signOut}
                  aria-label={isSigningOut ? "Saindo" : "Sair"}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </main>
      {signOutError ? (
        <div
          role="alert"
          className="fixed bottom-4 right-4 z-50 rounded-md border border-destructive/40 bg-card px-4 py-3 text-sm text-destructive shadow-lg"
        >
          {signOutError}
        </div>
      ) : null}
      {isSigningOut ? <SignOutOverlay /> : null}
    </div>
  );
}

function SidebarHeader({
  isCollapsed,
  onToggle,
}: {
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  const ToggleIcon = isCollapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <div
      className={cn(
        "mb-8 flex gap-3",
        isCollapsed ? "flex-col items-center" : "items-center justify-between",
      )}
    >
      <div className={cn("overflow-hidden", isCollapsed ? "w-10" : "w-44")}>
        <Image
          src={isCollapsed ? "/logo.png" : "/logo-name.png"}
          alt="TaskFlow"
          width={isCollapsed ? 1280 : 2103}
          height={isCollapsed ? 1280 : 748}
          priority
          className={cn("h-auto", isCollapsed ? "w-10" : "w-32")}
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        aria-label={isCollapsed ? "Expandir menu" : "Reduzir menu"}
      >
        <ToggleIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

function SidebarNavItem({
  href,
  icon: Icon,
  isActive,
  isCollapsed,
  label,
}: {
  href: string;
  icon: LucideIcon;
  isActive: boolean;
  isCollapsed: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex h-10 items-center rounded-md text-sm font-medium",
        isCollapsed ? "justify-center px-0" : "gap-3 px-3",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      aria-label={label}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {isCollapsed ? <SidebarTooltip label={label} /> : <span>{label}</span>}
    </Link>
  );
}

function SidebarSignOut({
  isCollapsed,
  isSigningOut,
  onClick,
}: {
  isCollapsed: boolean;
  isSigningOut: boolean;
  onClick: () => void;
}) {
  const label = isSigningOut ? "Saindo..." : "Sair";

  return (
    <Button
      className={cn("group relative mt-auto", isCollapsed ? "px-0" : "w-full")}
      variant="outline"
      size={isCollapsed ? "icon" : "default"}
      onClick={onClick}
      aria-label={label}
      disabled={isSigningOut}
    >
      {isSigningOut ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      {isCollapsed ? <SidebarTooltip label={label} /> : label}
    </Button>
  );
}

function SignOutOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3 rounded-md border bg-card px-5 py-4 text-sm font-medium shadow-xl">
        <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
        Saindo...
      </div>
    </div>
  );
}

function SidebarTooltip({ label }: { label: string }) {
  return (
    <span
      className="pointer-events-none absolute left-full top-1/2 z-30 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border bg-card px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      aria-hidden="true"
    >
      {label}
    </span>
  );
}
