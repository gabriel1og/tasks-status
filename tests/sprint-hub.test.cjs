const assert = require("node:assert/strict");
const test = require("node:test");

const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const {
  createEmptySprintLink,
  getEditableSprintLinks,
  getLocalDateKey,
  getSprintAdditionalInfo,
  getSprintTiming,
  sanitizeSprintLinks,
  summarizeTasksByField,
  validateSprintLinks,
} = loadTypeScript("lib/sprint-hub.ts");

function createSprint(overrides = {}) {
  return {
    id: "sprint-1",
    user_id: "user-1",
    nome: "Sprint 1",
    data_inicio: "2026-09-10",
    data_fim: "2026-09-20",
    objetivo: "Entregar o hub",
    criterios_sucesso: "Hub disponível",
    observacoes: "Sem riscos",
    links: [],
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

test("sanitizes sprint links and keeps one blank editable row", () => {
  assert.deepEqual(createEmptySprintLink(), { label: "", url: "" });
  assert.deepEqual(
    sanitizeSprintLinks([
      { label: " Board ", url: " https://example.com/board " },
      { label: "Incompleto", url: "" },
      { label: "Inválido", url: "javascript:alert(1)" },
      null,
    ]),
    [{ label: "Board", url: "https://example.com/board" }],
  );
  assert.deepEqual(getEditableSprintLinks([]), [{ label: "", url: "" }]);
});

test("validates incomplete and non-http sprint links", () => {
  assert.equal(
    validateSprintLinks([{ label: "Board", url: "" }]),
    "Informe o nome e a URL de cada link útil.",
  );
  assert.equal(
    validateSprintLinks([{ label: "Board", url: "ftp://example.com" }]),
    "Use URLs iniciadas por http:// ou https://.",
  );
  assert.equal(
    validateSprintLinks([{ label: "Board", url: "https://example.com" }]),
    "",
  );
});

test("normalizes the editable additional sprint information", () => {
  assert.deepEqual(
    getSprintAdditionalInfo(
      createSprint({ links: [{ label: "Docs", url: "https://example.com" }] }),
    ),
    {
      objetivo: "Entregar o hub",
      criterios_sucesso: "Hub disponível",
      observacoes: "Sem riscos",
      links: [{ label: "Docs", url: "https://example.com" }],
    },
  );
});

test("describes planned active and finished sprint timing", () => {
  const sprint = createSprint();
  assert.deepEqual(getSprintTiming(sprint, "2026-09-08"), {
    phase: "planned",
    label: "Planejada",
    detail: "Começa em 2 dias",
  });
  assert.deepEqual(getSprintTiming(sprint, "2026-09-18"), {
    phase: "active",
    label: "Em andamento",
    detail: "2 dias restantes",
  });
  assert.deepEqual(getSprintTiming(sprint, "2026-09-21"), {
    phase: "finished",
    label: "Encerrada",
    detail: "Encerrada há 1 dia",
  });
  assert.equal(getLocalDateKey(new Date(2026, 8, 18)), "2026-09-18");
});

test("summarizes tasks by status and environment", () => {
  const tasks = [
    { status: "Em andamento", ambiente: "Desenvolvimento" },
    { status: "Concluído", ambiente: "Produção" },
    { status: "Em andamento", ambiente: "Desenvolvimento" },
  ];
  assert.deepEqual(summarizeTasksByField(tasks, "status"), [
    { name: "Em andamento", count: 2 },
    { name: "Concluído", count: 1 },
  ]);
  assert.deepEqual(summarizeTasksByField(tasks, "ambiente"), [
    { name: "Desenvolvimento", count: 2 },
    { name: "Produção", count: 1 },
  ]);
});
