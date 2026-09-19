export type NavigationIconName =
  | "dashboard"
  | "status"
  | "environments"
  | "sprints"
  | "futureTasks"
  | "queries"
  | "taskSettings"
  | "timeOverview"
  | "timeEntries"
  | "timeCategories"
  | "timeSettings";

export type NavigationItem = {
  href: string;
  label: string;
  icon: NavigationIconName;
  match: "exact" | "nested";
};

export type NavigationGroup = {
  id: "hub" | "tasks" | "timeTracking";
  label: string;
  items: NavigationItem[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    id: "hub",
    label: "Hub",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: "dashboard",
        match: "exact",
      },
    ],
  },
  {
    id: "tasks",
    label: "Gerenciamento de tarefas",
    items: [
      { href: "/status", label: "Status", icon: "status", match: "nested" },
      {
        href: "/environments",
        label: "Ambientes",
        icon: "environments",
        match: "nested",
      },
      {
        href: "/sprints",
        label: "Sprints",
        icon: "sprints",
        match: "nested",
      },
      {
        href: "/future-tasks",
        label: "Tarefas futuras",
        icon: "futureTasks",
        match: "nested",
      },
      {
        href: "/queries",
        label: "Queries",
        icon: "queries",
        match: "nested",
      },
      {
        href: "/settings",
        label: "Configurações",
        icon: "taskSettings",
        match: "nested",
      },
    ],
  },
  {
    id: "timeTracking",
    label: "Apontamento de horas",
    items: [
      {
        href: "/time-tracking",
        label: "Visão geral",
        icon: "timeOverview",
        match: "exact",
      },
      {
        href: "/time-tracking/entries",
        label: "Apontamentos",
        icon: "timeEntries",
        match: "nested",
      },
      {
        href: "/time-tracking/categories",
        label: "Categorias",
        icon: "timeCategories",
        match: "nested",
      },
      {
        href: "/time-tracking/settings",
        label: "Configurações",
        icon: "timeSettings",
        match: "nested",
      },
    ],
  },
];

export function isNavigationItemActive(
  pathname: string,
  item: NavigationItem,
): boolean {
  if (item.match === "exact") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
