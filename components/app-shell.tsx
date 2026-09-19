"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Boxes,
  CalendarRange,
  ChartNoAxesCombined,
  Clock3,
  LayoutDashboard,
  ListFilter,
  ListChecks,
  ListTodo,
  LoaderCircle,
  Menu,
  type LucideIcon,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  SlidersHorizontal,
  Tags,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { TaskFlowLogo } from "@/components/taskflow-logo";
import { ThemeModeMenu } from "@/components/theme-mode-menu";
import {
  isNavigationItemActive,
  navigationGroups,
  type NavigationGroup,
  type NavigationIconName,
  type NavigationItem,
} from "@/lib/app-navigation";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  title: string;
};

const navigationIcons: Record<NavigationIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  status: ListChecks,
  environments: Boxes,
  sprints: CalendarRange,
  futureTasks: ListTodo,
  queries: ListFilter,
  taskSettings: Settings,
  timeOverview: ChartNoAxesCombined,
  timeEntries: Clock3,
  timeCategories: Tags,
  timeSettings: SlidersHorizontal,
};

const sidebarStorageKey = "gerenciamento-status:sidebar-collapsed";
let cachedSidebarCollapsed = false;
let hasReadSidebarPreference = false;

export function AppShell({ children, title }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    cachedSidebarCollapsed,
  );
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    if (hasReadSidebarPreference) return;

    cachedSidebarCollapsed =
      window.localStorage.getItem(sidebarStorageKey) === "true";
    hasReadSidebarPreference = true;
    setIsSidebarCollapsed(cachedSidebarCollapsed);
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

      cachedSidebarCollapsed = nextValue;
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
        <nav
          className="scrollbar-hidden min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden"
          aria-label="Navegação principal"
        >
          {navigationGroups.map((group) => (
            <SidebarNavigationGroup
              key={group.id}
              group={group}
              pathname={pathname}
              isCollapsed={isSidebarCollapsed}
            />
          ))}
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
              <MobileNavigation
                pathname={pathname}
                isSigningOut={isSigningOut}
                onSignOut={signOut}
              />
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

function SidebarNavigationGroup({
  group,
  pathname,
  isCollapsed,
}: {
  group: NavigationGroup;
  pathname: string;
  isCollapsed: boolean;
}) {
  return (
    <div
      className={cn(
        "space-y-1",
        isCollapsed && "border-b pb-4 last:border-b-0 last:pb-0",
      )}
      role="group"
      aria-label={group.label}
    >
      {isCollapsed ? null : (
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {group.label}
        </p>
      )}
      {group.items.map((item) => (
        <SidebarNavItem
          key={item.href}
          href={item.href}
          icon={navigationIcons[item.icon]}
          isActive={isNavigationItemActive(pathname, item)}
          isCollapsed={isCollapsed}
          label={item.label}
        />
      ))}
    </div>
  );
}

function MobileNavigation({
  pathname,
  isSigningOut,
  onSignOut,
}: {
  pathname: string;
  isSigningOut: boolean;
  onSignOut: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => setIsOpen(false), [pathname]);

  return (
    <div className="md:hidden">
      <Button
        ref={triggerRef}
        variant="outline"
        size="icon"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-label={isOpen ? "Fechar navegação" : "Abrir navegação"}
        aria-expanded={isOpen}
      >
        <Menu className="h-4 w-4" />
      </Button>
      <Popover
        open={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={triggerRef}
        label="Navegação principal"
        align="right"
        width={288}
      >
        <nav className="scrollbar-hidden max-h-[70vh] space-y-5 overflow-y-auto">
          {navigationGroups.map((group) => (
            <MobileNavigationGroup
              key={group.id}
              group={group}
              pathname={pathname}
              onNavigate={() => setIsOpen(false)}
            />
          ))}
          <Button
            className="w-full justify-start gap-3"
            variant="outline"
            onClick={onSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {isSigningOut ? "Saindo..." : "Sair"}
          </Button>
        </nav>
      </Popover>
    </div>
  );
}

function MobileNavigationGroup({
  group,
  pathname,
  onNavigate,
}: {
  group: NavigationGroup;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-1" role="group" aria-label={group.label}>
      <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {group.label}
      </p>
      {group.items.map((item) => (
        <MobileNavigationItem
          key={item.href}
          item={item}
          isActive={isNavigationItemActive(pathname, item)}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function MobileNavigationItem({
  item,
  isActive,
  onNavigate,
}: {
  item: NavigationItem;
  isActive: boolean;
  onNavigate: () => void;
}) {
  const Icon = navigationIcons[item.icon];

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
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
          "flex overflow-hidden",
          isCollapsed ? "w-12 justify-center" : "w-12 justify-start",
        )}
      >
        <TaskFlowLogo priority className={isCollapsed ? "w-12" : "w-12"} />
      </div>
      <Button
        className="group relative"
        variant="ghost"
        size="icon"
        onClick={onToggle}
        aria-label={isCollapsed ? "Expandir menu" : "Reduzir menu"}
      >
        <ToggleIcon className="h-4 w-4" />
        {isCollapsed ? <SidebarTooltip label="Expandir menu" /> : null}
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
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  function showTooltip() {
    if (!isCollapsed || !linkRef.current) return;

    const bounds = linkRef.current.getBoundingClientRect();
    setTooltipPosition({
      left: bounds.right + 12,
      top: bounds.top + bounds.height / 2,
    });
  }

  return (
    <>
      <Link
        ref={linkRef}
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "group relative flex h-10 items-center rounded-md text-sm font-medium",
          isCollapsed ? "justify-center px-0" : "gap-3 px-3",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        aria-label={label}
        onBlur={() => setTooltipPosition(null)}
        onFocus={showTooltip}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setTooltipPosition(null)}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {isCollapsed ? null : <span>{label}</span>}
      </Link>
      {tooltipPosition
        ? createPortal(
            <span
              className="pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-md border bg-popover/95 px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-md backdrop-blur-sm"
              style={tooltipPosition}
              role="tooltip"
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </>
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
