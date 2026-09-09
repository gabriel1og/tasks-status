"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarRange,
  ListChecks,
  ListTodo,
  type LucideIcon,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeModeMenu } from "@/components/theme-mode-menu";
import { signOutInbound } from "@/lib/mock-auth";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  title: string;
};

const navigationItems = [
  { href: "/status", label: "Status", icon: ListChecks },
  { href: "/sprints", label: "Sprints", icon: CalendarRange },
  { href: "/future-tasks", label: "Tarefas Futuras", icon: ListTodo },
  { href: "/settings", label: "Configurações", icon: Settings },
];

const sidebarStorageKey = "gerenciamento-status:sidebar-collapsed";

export function AppShell({ children, title }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    setIsSidebarCollapsed(
      window.localStorage.getItem(sidebarStorageKey) === "true",
    );
  }, []);

  function signOut() {
    signOutInbound();
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
                isActive={pathname === item.href}
                isCollapsed={isSidebarCollapsed}
                label={item.label}
              />
            );
          })}
        </nav>
        <SidebarSignOut isCollapsed={isSidebarCollapsed} onClick={signOut} />
      </aside>
      <main className={cn(isSidebarCollapsed ? "md:pl-20" : "md:pl-64")}>
        <header className="sticky top-0 z-10 border-b bg-background/90 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            <div className="flex items-center gap-2">
              <ThemeModeMenu />
              <div className="flex gap-2 md:hidden">
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
                  aria-label="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </main>
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
      <div
        className={cn(
          "overflow-hidden",
          isCollapsed ? "w-10" : "w-44",
        )}
      >
        <Image
          src="/4tax-inbound-logo.png"
          alt="4tax Inbound"
          width={235}
          height={36}
          priority
          className={cn("h-auto dark:hidden", isCollapsed ? "w-10" : "w-44")}
        />
        <Image
          src="/4tax-inbound-logo-dark.png"
          alt="4tax Inbound"
          width={235}
          height={36}
          priority
          className={cn(
            "hidden h-auto dark:block",
            isCollapsed ? "w-10" : "w-44",
          )}
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
  onClick,
}: {
  isCollapsed: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className={cn("group relative mt-auto", isCollapsed ? "px-0" : "w-full")}
      variant="outline"
      size={isCollapsed ? "icon" : "default"}
      onClick={onClick}
      aria-label="Sair"
    >
      <LogOut className="h-4 w-4" />
      {isCollapsed ? <SidebarTooltip label="Sair" /> : "Sair"}
    </Button>
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
