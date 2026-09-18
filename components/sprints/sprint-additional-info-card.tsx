"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Pencil } from "lucide-react";

import { SprintAdditionalInfoEditor } from "@/components/sprints/sprint-additional-info-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createEmptySprintLink,
  getLocalDateKey,
  getSprintAdditionalInfo,
  getSprintTiming,
  sanitizeSprintLinks,
  summarizeTasksByField,
  validateSprintLinks,
} from "@/lib/sprint-hub";
import type {
  SprintAdditionalInfoUpdate,
  SprintLink,
  SprintRow,
  TagKind,
  TagOptionRow,
  TaskStatusRow,
} from "@/types/database";

type SprintAdditionalInfoCardProps = {
  sprint?: SprintRow;
  tasks: TaskStatusRow[];
  tags: TagOptionRow[];
  onEditingChange: (isEditing: boolean) => void;
  onSave: (values: SprintAdditionalInfoUpdate) => Promise<string>;
};

export function SprintAdditionalInfoCard({
  sprint,
  tasks,
  tags,
  onEditingChange,
  onSave,
}: SprintAdditionalInfoCardProps) {
  const [draft, setDraft] = useState<SprintAdditionalInfoUpdate>(() =>
    createInitialDraft(sprint),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setDraft(createInitialDraft(sprint));
    setIsEditing(false);
    setFeedback("");
  }, [sprint?.id]);

  const timing = useMemo(
    () => (sprint ? getSprintTiming(sprint, getLocalDateKey()) : null),
    [sprint],
  );
  const statusDistribution = useMemo(
    () => summarizeTasksByField(tasks, "status"),
    [tasks],
  );
  const environmentDistribution = useMemo(
    () => summarizeTasksByField(tasks, "ambiente"),
    [tasks],
  );

  function changeEditing(nextIsEditing: boolean) {
    setIsEditing(nextIsEditing);
    onEditingChange(nextIsEditing);
  }

  function startEditing() {
    if (!sprint) return;
    setDraft(getSprintAdditionalInfo(sprint));
    setFeedback("");
    changeEditing(true);
  }

  function cancelEditing() {
    setDraft(createInitialDraft(sprint));
    setFeedback("");
    changeEditing(false);
  }

  async function saveAdditionalInfo() {
    const validationFeedback = validateSprintLinks(draft.links);
    if (validationFeedback) {
      setFeedback(validationFeedback);
      return;
    }

    setIsSaving(true);
    setFeedback("");
    const values = { ...draft, links: sanitizeSprintLinks(draft.links) };
    const saveFeedback = await onSave(values);
    setIsSaving(false);
    if (saveFeedback) {
      setFeedback(saveFeedback);
      return;
    }

    setDraft(values);
    setFeedback("Informações da sprint atualizadas.");
    changeEditing(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-left">Informações da sprint</CardTitle>
          <p className="text-sm text-muted-foreground">
            Contexto, objetivos e visão consolidada da sprint selecionada.
          </p>
        </div>
        {sprint && !isEditing ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={startEditing}
            aria-label={`Editar informações de ${sprint.nome}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {!sprint ? (
          <p className="text-sm text-muted-foreground">
            Selecione ou cadastre uma sprint para visualizar informações
            adicionais.
          </p>
        ) : (
          <>
            <SprintOverview
              timing={timing}
              taskCount={tasks.length}
              statusDistribution={statusDistribution}
              environmentDistribution={environmentDistribution}
              tags={tags}
            />
            {isEditing ? (
              <SprintAdditionalInfoEditor
                draft={draft}
                isSaving={isSaving}
                feedback={feedback}
                onCancel={cancelEditing}
                onChange={setDraft}
                onSave={saveAdditionalInfo}
              />
            ) : (
              <SprintInfoDetails sprint={sprint} feedback={feedback} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SprintOverview({
  timing,
  taskCount,
  statusDistribution,
  environmentDistribution,
  tags,
}: {
  timing: ReturnType<typeof getSprintTiming> | null;
  taskCount: number;
  statusDistribution: ReturnType<typeof summarizeTasksByField>;
  environmentDistribution: ReturnType<typeof summarizeTasksByField>;
  tags: TagOptionRow[];
}) {
  return (
    <div className="space-y-4 border-b pb-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <OverviewValue label="Situação" value={timing?.label ?? "-"} />
        <OverviewValue label="Período" value={timing?.detail ?? "-"} />
        <OverviewValue label="Tarefas" value={String(taskCount)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DistributionList
          label="Distribuição por status"
          items={statusDistribution}
          tagKind="status"
          tags={tags}
        />
        <DistributionList
          label="Distribuição por ambiente"
          items={environmentDistribution}
          tagKind="ambiente"
          tags={tags}
        />
      </div>
    </div>
  );
}

function OverviewValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-secondary/30 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function DistributionList({
  label,
  items,
  tagKind,
  tags,
}: {
  label: string;
  items: ReturnType<typeof summarizeTasksByField>;
  tagKind: TagKind;
  tags: TagOptionRow[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <DistributionBadge
              key={item.name}
              item={item}
              tagKind={tagKind}
              tags={tags}
            />
          ))
        ) : (
          <span className="text-sm text-muted-foreground">Sem tarefas</span>
        )}
      </div>
    </div>
  );
}

function DistributionBadge({
  item,
  tagKind,
  tags,
}: {
  item: ReturnType<typeof summarizeTasksByField>[number];
  tagKind: TagKind;
  tags: TagOptionRow[];
}) {
  const tag = tags.find(
    (candidate) => candidate.tipo === tagKind && candidate.nome === item.name,
  );
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white"
      style={{ backgroundColor: tag?.cor ?? "#475569" }}
    >
      {item.name}
      <span aria-label={`${item.count} tarefas`}>({item.count})</span>
    </span>
  );
}

function SprintInfoDetails({
  sprint,
  feedback,
}: {
  sprint: SprintRow;
  feedback: string;
}) {
  const links = sanitizeSprintLinks(sprint.links);
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <InfoSection label="Objetivo" value={sprint.objetivo} />
        <InfoSection
          label="Critérios de sucesso"
          value={sprint.criterios_sucesso}
        />
      </div>
      <InfoSection label="Observações" value={sprint.observacoes} />
      <SprintLinks links={links} />
      {feedback ? <p className="text-sm text-primary">{feedback}</p> : null}
    </div>
  );
}

function InfoSection({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
        {value?.trim() || "Não informado"}
      </p>
    </div>
  );
}

function SprintLinks({ links }: { links: SprintLink[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Links úteis</p>
      {links.length ? (
        <div className="flex flex-wrap gap-2">
          {links.map((link, index) => (
            <Button
              key={`${link.label}-${link.url}-${index}`}
              variant="outline"
              size="sm"
              asChild
            >
              <a href={link.url} target="_blank" rel="noreferrer">
                {link.label}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Não informado</p>
      )}
    </div>
  );
}

function createInitialDraft(sprint?: SprintRow): SprintAdditionalInfoUpdate {
  if (sprint) return getSprintAdditionalInfo(sprint);
  return {
    objetivo: "",
    criterios_sucesso: "",
    observacoes: "",
    links: [createEmptySprintLink()],
  };
}
