"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import type { MockUser } from "@/lib/mock-auth";
import { supabase } from "@/lib/supabase";
import type { SprintInsert, SprintRow } from "@/types/database";
import { DateField } from "../ui/date-field";

type SprintForm = Pick<SprintInsert, "nome" | "data_inicio" | "data_fim">;

const emptySprintForm: SprintForm = {
  nome: "",
  data_inicio: "",
  data_fim: "",
};

export function SprintSettings({ user }: { user: MockUser }) {
  const [sprints, setSprints] = useState<SprintRow[]>([]);
  const [sprintForm, setSprintForm] = useState<SprintForm>(emptySprintForm);
  const [editSprintForm, setEditSprintForm] =
    useState<SprintForm>(emptySprintForm);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSprints(user.id);
  }, [user.id]);

  async function loadSprints(userId: string) {
    const { data: sprintRows, error } = await supabase
      .from("sprints")
      .select("*")
      .eq("user_id", userId)
      .order("data_inicio", { ascending: false });

    if (error) {
      setFeedback(error.message);
      return;
    }

    setSprints((sprintRows ?? []) as SprintRow[]);
  }

  async function createSprint(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const payload: SprintInsert = { user_id: user.id, ...sprintForm };
    const { data: createdSprint, error } = await supabase
      .from("sprints")
      .insert(payload)
      .select("*")
      .single();

    setIsSaving(false);
    if (error) {
      setFeedback(error.message);
      return;
    }

    setSprints((currentSprints) =>
      sortSprints([createdSprint as SprintRow, ...currentSprints]),
    );
    setSprintForm(emptySprintForm);
  }

  async function updateSprint() {
    if (!editingSprintId) {
      return;
    }

    setFeedback("");
    setIsSaving(true);
    const { data: updatedSprint, error } = await supabase
      .from("sprints")
      .update(editSprintForm)
      .eq("id", editingSprintId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      setIsSaving(false);
      setFeedback(error.message);
      return;
    }

    const { error: taskUpdateError } = await supabase
      .from("task_statuses")
      .update({ sprint: editSprintForm.nome })
      .eq("sprint_id", editingSprintId)
      .eq("user_id", user.id);

    setIsSaving(false);
    if (taskUpdateError) {
      setFeedback(taskUpdateError.message);
    }

    setSprints((currentSprints) =>
      sortSprints(
        currentSprints.map((sprint) =>
          sprint.id === editingSprintId ? (updatedSprint as SprintRow) : sprint,
        ),
      ),
    );
    cancelSprintEdit();
  }

  async function deleteSprint(sprintId: string) {
    setFeedback("");
    setIsSaving(true);
    const { error: taskUpdateError } = await supabase
      .from("task_statuses")
      .update({ sprint_id: null, sprint: "", is_future: true })
      .eq("sprint_id", sprintId)
      .eq("user_id", user.id);

    if (taskUpdateError) {
      setIsSaving(false);
      setFeedback(taskUpdateError.message);
      return;
    }

    const { error } = await supabase
      .from("sprints")
      .delete()
      .eq("id", sprintId)
      .eq("user_id", user.id);

    setIsSaving(false);
    if (error) {
      setFeedback(error.message);
      return;
    }

    setSprints((currentSprints) =>
      currentSprints.filter((sprint) => sprint.id !== sprintId),
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sprints</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="grid gap-4 md:grid-cols-[minmax(220px,1fr)_180px_180px_140px]"
          onSubmit={createSprint}
        >
          <SprintField label="Nome" id="sprint-name">
            <Input
              id="sprint-name"
              value={sprintForm.nome}
              onChange={(event) => setCreateField("nome", event.target.value)}
              required
            />
          </SprintField>
          <SprintField label="Data inicial" id="sprint-start-date">
            <DateField
              id="sprint-start-date"
              value={sprintForm.data_inicio}
              onChange={(value) => setCreateDateField("data_inicio", value)}
              label="Data inicial"
              required
              className="mt-1"
            />
          </SprintField>
          <SprintField label="Data final" id="sprint-end-date">
            <DateField
              id="sprint-end-date"
              value={sprintForm.data_fim}
              minDate={sprintForm.data_inicio}
              onChange={(value) => setCreateDateField("data_fim", value)}
              label="Data final"
              required
              className="mt-1"
            />
          </SprintField>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={isSaving || !isValidSprint(sprintForm)}
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </form>

        <div className="rounded-md border bg-secondary/30">
          <div className="grid grid-cols-[1fr_auto] gap-3 border-b px-4 py-3 text-sm font-semibold sm:grid-cols-[1fr_minmax(300px,360px)_88px]">
            <span>Nome</span>
            <span className="hidden sm:block">Duração</span>
            <span className="sr-only">Ações</span>
          </div>
          <div className="divide-y">
            {sprints.length ? (
              sprints.map((sprint) =>
                sprint.id === editingSprintId ? (
                  <EditableSprintRow
                    key={sprint.id}
                    sprint={sprint}
                    form={editSprintForm}
                    isSaving={isSaving}
                    onCancel={cancelSprintEdit}
                    onChange={setEditField}
                    onDateChange={setEditDateField}
                    onSave={updateSprint}
                  />
                ) : (
                  <ReadonlySprintRow
                    key={sprint.id}
                    sprint={sprint}
                    isSaving={isSaving}
                    onDelete={deleteSprint}
                    onEdit={startSprintEdit}
                  />
                ),
              )
            ) : (
              <p className="px-4 py-5 text-sm text-muted-foreground">
                Nenhuma sprint cadastrada.
              </p>
            )}
          </div>
        </div>

        {feedback ? (
          <p className="text-sm text-destructive">{feedback}</p>
        ) : null}
      </CardContent>
    </Card>
  );

  function setCreateField(field: keyof SprintForm, value: string) {
    setSprintForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function setCreateDateField(field: "data_inicio" | "data_fim", value: string) {
    setSprintForm((currentForm) =>
      updateSprintDateField(currentForm, field, value),
    );
  }

  function setEditField(field: keyof SprintForm, value: string) {
    setEditSprintForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function setEditDateField(field: "data_inicio" | "data_fim", value: string) {
    setEditSprintForm((currentForm) =>
      updateSprintDateField(currentForm, field, value),
    );
  }

  function startSprintEdit(sprint: SprintRow) {
    setFeedback("");
    setEditingSprintId(sprint.id);
    setEditSprintForm(toSprintForm(sprint));
  }

  function cancelSprintEdit() {
    setEditingSprintId(null);
    setEditSprintForm(emptySprintForm);
  }
}

function SprintField({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function EditableSprintRow({
  sprint,
  form,
  isSaving,
  onCancel,
  onChange,
  onDateChange,
  onSave,
}: {
  sprint: SprintRow;
  form: SprintForm;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (field: keyof SprintForm, value: string) => void;
  onDateChange: (field: "data_inicio" | "data_fim", value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_minmax(300px,360px)_88px]">
      <Input
        value={form.nome}
        onChange={(event) => onChange("nome", event.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <DateField
          value={form.data_inicio}
          onChange={(value) => onDateChange("data_inicio", value)}
          label={`Data inicial de ${sprint.nome}`}
        />
        <DateField
          value={form.data_fim}
          minDate={form.data_inicio}
          onChange={(value) => onDateChange("data_fim", value)}
          label={`Data final de ${sprint.nome}`}
        />
      </div>
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onSave}
          disabled={isSaving || !isValidSprint(form)}
          aria-label={`Salvar ${sprint.nome}`}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          disabled={isSaving}
          aria-label={`Cancelar edicao de ${sprint.nome}`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ReadonlySprintRow({
  sprint,
  isSaving,
  onDelete,
  onEdit,
}: {
  sprint: SprintRow;
  isSaving: boolean;
  onDelete: (sprintId: string) => void;
  onEdit: (sprint: SprintRow) => void;
}) {
  return (
    <div className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_minmax(300px,360px)_88px]">
      <span className="text-sm font-medium">{sprint.nome}</span>
      <span className="text-sm text-muted-foreground">
        {formatSprintPeriod(sprint)}
      </span>
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(sprint)}
          disabled={isSaving}
          aria-label={`Editar ${sprint.nome}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(sprint.id)}
          disabled={isSaving}
          aria-label={`Remover ${sprint.nome}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function isValidSprint(form: SprintForm) {
  return Boolean(
    form.nome &&
    form.data_inicio &&
    form.data_fim &&
    form.data_fim >= form.data_inicio,
  );
}

function toSprintForm(sprint: SprintRow): SprintForm {
  return {
    nome: sprint.nome,
    data_inicio: sprint.data_inicio,
    data_fim: sprint.data_fim,
  };
}

function updateSprintDateField(
  form: SprintForm,
  field: "data_inicio" | "data_fim",
  value: string,
) {
  if (field === "data_inicio" && form.data_fim && form.data_fim < value) {
    return { ...form, data_inicio: value, data_fim: value };
  }

  return { ...form, [field]: value };
}

function sortSprints(sprints: SprintRow[]) {
  return [...sprints].sort((left, right) =>
    right.data_inicio.localeCompare(left.data_inicio),
  );
}

function formatSprintPeriod(sprint: SprintRow) {
  return `${formatDate(sprint.data_inicio)} a ${formatDate(sprint.data_fim)}`;
}
