"use client";

import { Plus, Tags } from "lucide-react";
import { useEffect, useState } from "react";

import {
  TimeCategoryList,
  type TimeCategoryDraft,
} from "@/components/time-tracking/time-category-list";
import {
  TimeTrackingFeedback,
  type TimeTrackingFeedbackValue,
} from "@/components/time-tracking/time-tracking-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getRequestErrorFeedback,
  normalizeRequestError,
} from "@/lib/request-feedback";
import { timeTrackingRepository } from "@/lib/time-tracking/time-tracking-repository";
import {
  buildTimeCategoryChanges,
  hasDuplicateTimeCategoryName,
} from "@/lib/time-tracking/time-tracking-rules";
import type { TimeCategoryInput, TimeCategoryRow } from "@/types/time-tracking";

const initialCategoryDraft: TimeCategoryDraft = {
  color: "#2563eb",
  name: "",
};

type MutationOptions = {
  action: () => Promise<unknown>;
  busyAction: string;
  fallbackMessage: string;
  operation: string;
  successMessage: string;
};

export function TimeCategoriesPanel({ userId }: { userId: string }) {
  const [categories, setCategories] = useState<TimeCategoryRow[]>([]);
  const [newCategory, setNewCategory] = useState(initialCategoryDraft);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState(initialCategoryDraft);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>("loading");
  const [feedback, setFeedback] = useState<TimeTrackingFeedbackValue | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initializeCategories() {
      try {
        let rows = await timeTrackingRepository.listCategories(userId, true);
        if (rows.length === 0) {
          await timeTrackingRepository.ensureDefaultCategories(userId);
          rows = await timeTrackingRepository.listCategories(userId, true);
        }
        if (isMounted) setCategories(rows);
      } catch (error) {
        if (isMounted) {
          setFeedback({
            type: "error",
            message: getCategoryRequestFeedback(
              "initialize_time_categories",
              error,
              "Não foi possível carregar as categorias.",
            ),
          });
        }
      } finally {
        if (isMounted) setBusyAction(null);
      }
    }

    void initializeCategories();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const activeCategories = categories.filter((category) => !category.archived_at);
  const archivedCategories = categories.filter(
    (category) => category.archived_at,
  );
  const isLoading = busyAction === "loading";

  async function createCategory() {
    const changes = validateCategoryDraft(newCategory, categories);
    if (!changes) return;

    const succeeded = await runMutation({
      action: () => timeTrackingRepository.createCategory(userId, changes),
      busyAction: "create",
      fallbackMessage: "Não foi possível criar a categoria.",
      operation: "create_time_category",
      successMessage: "Categoria criada com sucesso.",
    });
    if (succeeded) setNewCategory(initialCategoryDraft);
  }

  async function saveCategory(category: TimeCategoryRow) {
    const changes = validateCategoryDraft(editingDraft, categories, category.id);
    if (!changes) return;

    const succeeded = await runMutation({
      action: () =>
        timeTrackingRepository.updateCategory(userId, category.id, changes),
      busyAction: `edit:${category.id}`,
      fallbackMessage: "Não foi possível atualizar a categoria.",
      operation: "update_time_category",
      successMessage: "Categoria atualizada com sucesso.",
    });
    if (succeeded) setEditingCategoryId(null);
  }

  function startEditing(category: TimeCategoryRow) {
    setPendingDeleteId(null);
    setEditingCategoryId(category.id);
    setEditingDraft({ color: category.color, name: category.name });
    setFeedback(null);
  }

  async function archiveCategory(category: TimeCategoryRow) {
    await runMutation({
      action: () => timeTrackingRepository.archiveCategory(userId, category.id),
      busyAction: `archive:${category.id}`,
      fallbackMessage: "Não foi possível arquivar a categoria.",
      operation: "archive_time_category",
      successMessage: "Categoria arquivada. O histórico foi preservado.",
    });
  }

  async function restoreCategory(category: TimeCategoryRow) {
    await runMutation({
      action: () => timeTrackingRepository.restoreCategory(userId, category.id),
      busyAction: `restore:${category.id}`,
      fallbackMessage: "Não foi possível reativar a categoria.",
      operation: "restore_time_category",
      successMessage: "Categoria reativada com sucesso.",
    });
  }

  async function deleteCategory(category: TimeCategoryRow) {
    const succeeded = await runMutation({
      action: () => timeTrackingRepository.deleteCategory(userId, category.id),
      busyAction: `delete:${category.id}`,
      fallbackMessage: "Não foi possível excluir a categoria.",
      operation: "delete_time_category",
      successMessage: "Categoria excluída com sucesso.",
    });
    if (succeeded) setPendingDeleteId(null);
  }

  async function runMutation(options: MutationOptions): Promise<boolean> {
    setBusyAction(options.busyAction);
    setFeedback(null);
    try {
      await options.action();
      setCategories(await timeTrackingRepository.listCategories(userId, true));
      setFeedback({ type: "success", message: options.successMessage });
      return true;
    } catch (error) {
      setFeedback({
        type: "error",
        message: getCategoryRequestFeedback(
          options.operation,
          error,
          options.fallbackMessage,
        ),
      });
      return false;
    } finally {
      setBusyAction(null);
    }
  }

  function validateCategoryDraft(
    draft: TimeCategoryDraft,
    currentCategories: TimeCategoryRow[],
    ignoredCategoryId?: string,
  ): TimeCategoryInput | null {
    try {
      const changes = buildTimeCategoryChanges(draft);
      const duplicate = hasDuplicateTimeCategoryName(
        currentCategories,
        changes.name,
        ignoredCategoryId,
      );
      if (duplicate) {
        setFeedback({
          type: "error",
          message: "Já existe uma categoria ativa ou arquivada com esse nome.",
        });
        return null;
      }
      return changes;
    } catch (error) {
      setFeedback({ type: "error", message: getValidationMessage(error) });
      return null;
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Tags className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-left text-lg">
                Categorias de horas
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Organize os apontamentos com nomes e cores próprios.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            className="grid gap-3 rounded-md border bg-secondary/20 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              void createCategory();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="new-time-category-name">Nova categoria</Label>
              <Input
                id="new-time-category-name"
                required
                maxLength={80}
                placeholder="Ex.: Desenvolvimento"
                value={newCategory.name}
                disabled={Boolean(busyAction)}
                onChange={(event) =>
                  setNewCategory({ ...newCategory, name: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-time-category-color">Cor</Label>
              <input
                id="new-time-category-color"
                type="color"
                value={newCategory.color}
                disabled={Boolean(busyAction)}
                onChange={(event) =>
                  setNewCategory({ ...newCategory, color: event.target.value })
                }
                className="block h-10 w-full min-w-20 cursor-pointer rounded-md border border-input bg-secondary p-1 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <Button type="submit" disabled={Boolean(busyAction)}>
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </form>

          <TimeTrackingFeedback feedback={feedback} />

          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Carregando categorias...
            </p>
          ) : (
            <div className="space-y-8">
              <TimeCategoryList
                title="Ativas"
                emptyMessage="Nenhuma categoria ativa."
                categories={activeCategories}
                isArchived={false}
                busyAction={busyAction}
                editingCategoryId={editingCategoryId}
                editingDraft={editingDraft}
                pendingDeleteId={pendingDeleteId}
                onArchive={(category) => void archiveCategory(category)}
                onCancelDelete={() => setPendingDeleteId(null)}
                onCancelEditing={() => setEditingCategoryId(null)}
                onConfirmDelete={(category) => void deleteCategory(category)}
                onDeleteRequest={(category) => {
                  setEditingCategoryId(null);
                  setPendingDeleteId(category.id);
                  setFeedback(null);
                }}
                onDraftChange={setEditingDraft}
                onEdit={startEditing}
                onRestore={() => undefined}
                onSave={(category) => void saveCategory(category)}
              />
              <TimeCategoryList
                title="Arquivadas"
                emptyMessage="Nenhuma categoria arquivada."
                categories={archivedCategories}
                isArchived
                busyAction={busyAction}
                editingCategoryId={editingCategoryId}
                editingDraft={editingDraft}
                pendingDeleteId={pendingDeleteId}
                onArchive={() => undefined}
                onCancelDelete={() => setPendingDeleteId(null)}
                onCancelEditing={() => setEditingCategoryId(null)}
                onConfirmDelete={(category) => void deleteCategory(category)}
                onDeleteRequest={(category) => setPendingDeleteId(category.id)}
                onDraftChange={setEditingDraft}
                onEdit={startEditing}
                onRestore={(category) => void restoreCategory(category)}
                onSave={(category) => void saveCategory(category)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getValidationMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Revise os dados informados para a categoria.";
}

function getCategoryRequestFeedback(
  operation: string,
  error: unknown,
  fallbackMessage: string,
): string {
  const requestError = normalizeRequestError(error);
  const userMessage =
    requestError.code === "23505"
      ? "Já existe uma categoria com esse nome."
      : requestError.code === "23503"
        ? "Esta categoria possui apontamentos. Arquive-a para preservar o histórico."
        : fallbackMessage;
  return getRequestErrorFeedback(operation, requestError, userMessage);
}
