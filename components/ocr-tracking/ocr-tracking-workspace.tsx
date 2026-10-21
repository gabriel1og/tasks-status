"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { newOcrItem } from "@/lib/ocr-tracking/definitions";
import {
  emptyOcrFilters,
  filterOcrItems,
  type OcrFilters,
  type OcrSort,
} from "@/lib/ocr-tracking/filtering";
import { ocrTables } from "@/lib/ocr-tracking/repository";
import type { OcrItem, OcrStage } from "@/types/ocr-tracking";
import { useOcrWorkspace } from "./use-ocr-workspace";
import { OcrFiltersBar } from "./filters";
import { OcrStagesTable } from "./stages-table";
import { OcrIssuesTable } from "./issues-table";
import { OcrFieldsTable } from "./fields-table";
import {
  OcrItemDetails,
  type OcrDetailActions,
  type OcrDetailTab,
} from "./item-details";
import {
  OcrWorkspaceEditor,
  newChildTarget,
  type OcrEditorTarget,
} from "./workspace-editors";
import { OcrImportPreview } from "./import-preview";
import { ocrSelectClass } from "./editor";
import { OcrPagination, OcrSummary, OcrToolbar } from "./workspace-controls";

const viewLabels = { stages: "Etapas", issues: "Pendências", fields: "Campos" };

/** Reúne as três visões sem remontar filtros após gravações. Ex.: <OcrTrackingWorkspace user={user} />. */
export function OcrTrackingWorkspace({ user }: { user: User }) {
  const controller = useOcrWorkspace(user.id),
    { workspace, loading } = controller;
  const [filters, setFilters] = useState<OcrFilters>({ ...emptyOcrFilters }),
    [sort, setSort] = useState<OcrSort>("name");
  const [view, setView] = useState<keyof typeof viewLabels>("stages"),
    [page, setPage] = useState(1),
    [size, setSize] = useState(25);
  const [selection, setSelection] = useState<{
      id: string;
      stage?: OcrStage;
      tab?: OcrDetailTab;
    } | null>(null),
    [fieldItemId, setFieldItemId] = useState("");
  const [editor, setEditor] = useState<OcrEditorTarget | null>(null),
    [importing, setImporting] = useState(false);
  const closeDetails = useCallback(() => setSelection(null), []);
  const closeEditor = useCallback(() => setEditor(null), []);
  const closeImport = useCallback(() => setImporting(false), []);
  const visible = useMemo(
    () => filterOcrItems(workspace, filters, sort, view === "issues"),
    [workspace, filters, sort, view],
  );
  const itemIds = new Set(visible.map((item) => item.id));
  const selected = workspace.items.find((item) => item.id === selection?.id);
  const fieldItem =
    visible.find((item) => item.id === fieldItemId) ?? visible[0];
  const issues = workspace.issues
    .filter(
      (issue) =>
        itemIds.has(issue.item_id) &&
        (!filters.issueKind || issue.kind === filters.issueKind) &&
        (!filters.issueStatus || issue.status === filters.issueStatus) &&
        (view !== "issues" ||
          !filters.assignee ||
          (filters.assignee === "__none"
            ? !issue.assignee.trim()
            : issue.assignee === filters.assignee)),
    )
    .sort(
      (left, right) =>
        visible.findIndex((item) => item.id === left.item_id) -
          visible.findIndex((item) => item.id === right.item_id) ||
        left.created_at.localeCompare(right.created_at),
    );
  const fields = workspace.fields.filter(
    (field) => field.item_id === fieldItem?.id,
  );
  const total =
    view === "stages"
      ? visible.length
      : view === "issues"
        ? issues.length
        : fields.length;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(total / size))),
    offset = (currentPage - 1) * size;
  useEffect(() => {
    setPage((current) =>
      Math.min(current, Math.max(1, Math.ceil(total / size))),
    );
  }, [total, size]);
  const changeFilter = (key: keyof OcrFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };
  const actions = detailActions(controller, setEditor);
  function createItem() {
    setEditor({
      kind: "newItem",
      row: {
        ...newOcrItem(),
        source_key: `manual:${crypto.randomUUID()}`,
        id: "",
        user_id: user.id,
        created_at: "",
        updated_at: "",
      },
    });
  }
  return (
    <div className="min-w-0 space-y-5">
      <OcrToolbar
        items={visible}
        issues={issues}
        workspace={workspace}
        loading={loading}
        onNew={createItem}
        onImport={() => setImporting(true)}
        onReload={() => void controller.reload()}
      />
      {controller.feedback && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 p-3 text-sm text-destructive"
        >
          {controller.feedback}
        </p>
      )}
      <OcrSummary
        items={visible}
        workspace={workspace}
        onFilter={(value) => changeFilter("status", value)}
      />
      <Card>
        <CardContent className="min-w-0 space-y-4 p-4 sm:p-6">
          <OcrFiltersBar
            filters={filters}
            items={workspace.items}
            issues={workspace.issues}
            issueAssignee={view === "issues"}
            onChange={changeFilter}
            onClear={() => {
              setFilters({ ...emptyOcrFilters });
              setSort("name");
              setPage(1);
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="Visões do acompanhamento"
            >
              {Object.entries(viewLabels).map(([key, label]) => (
                <Button
                  key={key}
                  role="tab"
                  aria-selected={view === key}
                  variant={view === key ? "default" : "outline"}
                  onClick={() => {
                    setView(key as keyof typeof viewLabels);
                    setPage(1);
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <p className="flex items-center gap-2 w-36">Ordenar por</p>
              <select
                className={ocrSelectClass}
                value={sort}
                onChange={(event) => setSort(event.target.value as OcrSort)}
              >
                <option value="name">Nome</option>
                <option value="progress">Etapas concluídas</option>
                <option value="issues">Pendências abertas</option>
                <option value="updated">Última atualização</option>
              </select>
            </label>
          </div>
          {view === "fields" && (
            <div className="flex flex-wrap items-center gap-3">
              <label className="min-w-60 flex-1 text-sm">
                Documento
                <select
                  className={ocrSelectClass}
                  value={fieldItem?.id ?? ""}
                  onChange={(event) => {
                    setFieldItemId(event.target.value);
                    setPage(1);
                  }}
                >
                  {!visible.length && (
                    <option value="">Nenhum documento</option>
                  )}
                  {visible.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.filename}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="outline"
                disabled={!fieldItem || loading}
                onClick={() => fieldItem && actions.onAddField(fieldItem)}
              >
                <Plus className="h-4 w-4" />
                Adicionar campo
              </Button>
            </div>
          )}
          {loading ? (
            <p role="status" className="text-sm">
              Carregando acompanhamento...
            </p>
          ) : !total ? (
            <p className="text-sm text-muted-foreground">
              Nenhum resultado. Ajuste os filtros, cadastre um acompanhamento ou
              importe a base inicial.
            </p>
          ) : (
            <>
              {view === "stages" && (
                <OcrStagesTable
                  items={visible.slice(offset, offset + size)}
                  workspace={workspace}
                  onOpen={(item, stage) => setSelection({ id: item.id, stage })}
                  onSave={(edited, previous) =>
                    controller.save(ocrTables.items, edited, previous)
                  }
                />
              )}
              {view === "issues" && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Adicione novas pendências pela ficha do documento na visão
                    Etapas.
                  </p>
                  <OcrIssuesTable
                    issues={issues.slice(offset, offset + size)}
                    items={visible}
                    fields={workspace.fields}
                    onEdit={actions.onEditIssue}
                  />
                </>
              )}
              {view === "fields" && (
                <OcrFieldsTable
                  fields={fields.slice(offset, offset + size)}
                  onEdit={actions.onEditField}
                />
              )}
            </>
          )}
          <OcrPagination
            page={currentPage}
            size={size}
            total={total}
            onPage={setPage}
            onSize={(value) => {
              setSize(value);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>
      {selected && !editor && !importing && (
        <OcrItemDetails
          key={`${selected.id}:${selection?.stage ?? "all"}`}
          item={selected}
          workspace={workspace}
          stage={selection?.stage}
          activeTab={selection?.tab}
          onTabChange={(tab) =>
            setSelection((current) => (current ? { ...current, tab } : current))
          }
          onClose={closeDetails}
          {...actions}
        />
      )}
      {editor && (
        <OcrWorkspaceEditor
          key={`${editor.kind}:${editor.row.id}`}
          target={editor}
          controller={controller}
          onClose={closeEditor}
        />
      )}
      {importing && (
        <OcrImportPreview
          workspace={workspace}
          onImport={controller.importSeeds}
          onClose={closeImport}
        />
      )}
    </div>
  );
}

function detailActions(
  controller: ReturnType<typeof useOcrWorkspace>,
  setEditor: (target: OcrEditorTarget) => void,
): OcrDetailActions {
  return {
    onEditItem: (row) => setEditor({ kind: "item", row }),
    onEditChecklist: (row) => setEditor({ kind: "checklist", row }),
    onEditField: (row) => setEditor({ kind: "field", row }),
    onEditIssue: (row) => setEditor({ kind: "issue", row }),
    onAddField: (item) => setEditor(newChildTarget(item, "field")),
    onAddIssue: (item) => setEditor(newChildTarget(item, "issue")),
    onArchive: (item) =>
      controller.save(
        ocrTables.items,
        {
          ...item,
          archived_at: item.archived_at ? null : new Date().toISOString(),
        },
        item,
      ),
  };
}
