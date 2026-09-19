const assert = require("node:assert/strict");
const test = require("node:test");

const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const { isNavigationItemActive, navigationGroups } = loadTypeScript(
  "lib/app-navigation.ts",
);

function getNavigationItem(href) {
  return navigationGroups
    .flatMap((group) => group.items)
    .find((item) => item.href === href);
}

test("groups navigation into hub, tasks and time tracking domains", () => {
  assert.deepEqual(
    navigationGroups.map((group) => ({ id: group.id, label: group.label })),
    [
      { id: "hub", label: "Hub" },
      { id: "tasks", label: "Gerenciamento de tarefas" },
      { id: "timeTracking", label: "Apontamento de horas" },
    ],
  );
});

test("preserves every existing task management URL", () => {
  const taskGroup = navigationGroups.find((group) => group.id === "tasks");

  assert.deepEqual(
    taskGroup.items.map((item) => item.href),
    [
      "/status",
      "/environments",
      "/sprints",
      "/future-tasks",
      "/queries",
      "/settings",
    ],
  );
});

test("exposes the dashboard and empty time tracking routes", () => {
  const allHrefs = navigationGroups.flatMap((group) =>
    group.items.map((item) => item.href),
  );

  assert.deepEqual(allHrefs.slice(0, 1), ["/dashboard"]);
  assert.deepEqual(allHrefs.slice(-4), [
    "/time-tracking",
    "/time-tracking/entries",
    "/time-tracking/categories",
    "/time-tracking/settings",
  ]);
});

test("keeps nested query pages active without activating time overview twice", () => {
  const queriesItem = getNavigationItem("/queries");
  const timeOverviewItem = getNavigationItem("/time-tracking");
  const timeEntriesItem = getNavigationItem("/time-tracking/entries");

  assert.equal(isNavigationItemActive("/queries/query-1", queriesItem), true);
  assert.equal(
    isNavigationItemActive("/time-tracking/entries", timeOverviewItem),
    false,
  );
  assert.equal(
    isNavigationItemActive("/time-tracking/entries", timeEntriesItem),
    true,
  );
});
