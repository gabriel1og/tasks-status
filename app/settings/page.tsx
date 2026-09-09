"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildDefaultTags } from "@/lib/default-tags";
import type { MockUser } from "@/lib/mock-auth";
import { supabase } from "@/lib/supabase";
import type { TagKind, TagOptionInsert, TagOptionRow } from "@/types/database";

type TagForm = {
  tipo: TagKind;
  nome: string;
  cor: string;
};

const emptyTagForm: TagForm = {
  tipo: "status",
  nome: "",
  cor: "#2563eb",
};

export default function SettingsPage() {
  return (
    <AuthGuard>
      {(user) => (
        <AppShell title="Configurações">
          <SettingsPanel user={user} />
        </AppShell>
      )}
    </AuthGuard>
  );
}

function SettingsPanel({ user }: { user: MockUser }) {
  const [tagForm, setTagForm] = useState<TagForm>(emptyTagForm);
  const [editTagForm, setEditTagForm] = useState<TagForm>(emptyTagForm);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tags, setTags] = useState<TagOptionRow[]>([]);
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const statusTags = useMemo(
    () => tags.filter((tag) => tag.tipo === "status"),
    [tags],
  );
  const environmentTags = useMemo(
    () => tags.filter((tag) => tag.tipo === "ambiente"),
    [tags],
  );

  useEffect(() => {
    loadTags(user.id).then((tagRows) => {
      setTags(tagRows);
    });
  }, [user.id]);

  async function loadTags(userId: string) {
    const { data: currentTags, error } = await supabase
      .from("tag_options")
      .select("*")
      .eq("user_id", userId)
      .order("tipo")
      .order("nome");

    if (error) {
      setFeedback(error.message);
      return [];
    }

    if (currentTags?.length) {
      return currentTags as TagOptionRow[];
    }

    const { data: createdTags } = await supabase
      .from("tag_options")
      .insert(buildDefaultTags(userId))
      .select("*");

    return (createdTags ?? []) as TagOptionRow[];
  }

  async function addTag(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");

    const newTag: TagOptionInsert = {
      user_id: user.id,
      tipo: tagForm.tipo,
      nome: tagForm.nome,
      cor: tagForm.cor,
    };

    const { data: createdTag, error } = await supabase
      .from("tag_options")
      .insert(newTag)
      .select("*")
      .single();

    if (error) {
      setFeedback(error.message);
      return;
    }

    setTags((currentTags) => [...currentTags, createdTag as TagOptionRow]);
    setTagForm(emptyTagForm);
  }

  async function updateTag() {
    if (!editingTagId) {
      return;
    }

    setFeedback("");
    setIsSaving(true);

    const originalTag = tags.find((tag) => tag.id === editingTagId);
    const { data: updatedTag, error } = await supabase
      .from("tag_options")
      .update(editTagForm)
      .eq("id", editingTagId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      setIsSaving(false);
      setFeedback(error.message);
      return;
    }

    const taskUpdateError = await updateTasksWithRenamedTag(originalTag);
    setIsSaving(false);

    if (taskUpdateError) {
      setFeedback(taskUpdateError);
    }

    setTags((currentTags) =>
      currentTags.map((tag) =>
        tag.id === editingTagId ? (updatedTag as TagOptionRow) : tag,
      ),
    );
    cancelTagEdit();
  }

  async function deleteTag(tagId: string) {
    const { error } = await supabase
      .from("tag_options")
      .delete()
      .eq("id", tagId)
      .eq("user_id", user.id);

    if (error) {
      setFeedback(error.message);
      return;
    }

    setTags((currentTags) => currentTags.filter((tag) => tag.id !== tagId));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tags de Status e Ambiente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            className="grid gap-4 md:grid-cols-[160px_1fr_96px_140px]"
            onSubmit={addTag}
          >
            <div className="space-y-2">
              <Label>Coluna</Label>
              <select
                className={selectInputClassName}
                value={tagForm.tipo}
                onChange={(event) =>
                  setTagForm((currentForm) => ({
                    ...currentForm,
                    tipo: event.target.value as TagKind,
                  }))
                }
              >
                <option value="status">Status</option>
                <option value="ambiente">Ambiente</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-name">Nome da tag</Label>
              <Input
                id="tag-name"
                value={tagForm.nome}
                onChange={(event) =>
                  setTagForm((currentForm) => ({
                    ...currentForm,
                    nome: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-color">Cor</Label>
              <Input
                id="tag-color"
                type="color"
                value={tagForm.cor}
                onChange={(event) =>
                  setTagForm((currentForm) => ({
                    ...currentForm,
                    cor: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </form>

          <div className="grid gap-4 lg:grid-cols-2">
            <TagList
              title="Status"
              tags={statusTags}
              editTagForm={editTagForm}
              editingTagId={editingTagId}
              isSaving={isSaving}
              onCancelEdit={cancelTagEdit}
              onDelete={deleteTag}
              onEdit={startTagEdit}
              onEditField={setEditTagField}
              onSaveEdit={updateTag}
            />
            <TagList
              title="Ambiente"
              tags={environmentTags}
              editTagForm={editTagForm}
              editingTagId={editingTagId}
              isSaving={isSaving}
              onCancelEdit={cancelTagEdit}
              onDelete={deleteTag}
              onEdit={startTagEdit}
              onEditField={setEditTagField}
              onSaveEdit={updateTag}
            />
          </div>
          {feedback ? (
            <p className="text-sm text-muted-foreground">{feedback}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );

  async function updateTasksWithRenamedTag(originalTag?: TagOptionRow) {
    if (!originalTag || originalTag.tipo !== editTagForm.tipo) {
      return "";
    }

    if (originalTag.nome === editTagForm.nome) {
      return "";
    }

    const { error } = await supabase
      .from("task_statuses")
      .update({ [editTagForm.tipo]: editTagForm.nome })
      .eq("user_id", user.id)
      .eq(editTagForm.tipo, originalTag.nome);

    return error?.message ?? "";
  }

  function setEditTagField(field: keyof TagForm, value: string) {
    setEditTagForm((currentForm) => ({
      ...currentForm,
      [field]: field === "tipo" ? (value as TagKind) : value,
    }));
  }

  function startTagEdit(tag: TagOptionRow) {
    setFeedback("");
    setEditingTagId(tag.id);
    setEditTagForm(getTagForm(tag));
  }

  function cancelTagEdit() {
    setEditingTagId(null);
    setEditTagForm(emptyTagForm);
  }
}

function TagList({
  title,
  tags,
  editTagForm,
  editingTagId,
  isSaving,
  onCancelEdit,
  onDelete,
  onEdit,
  onEditField,
  onSaveEdit,
}: {
  title: string;
  tags: TagOptionRow[];
  editTagForm: TagForm;
  editingTagId: string | null;
  isSaving: boolean;
  onCancelEdit: () => void;
  onDelete: (tagId: string) => void;
  onEdit: (tag: TagOptionRow) => void;
  onEditField: (field: keyof TagForm, value: string) => void;
  onSaveEdit: () => void;
}) {
  return (
    <div className="rounded-md border bg-secondary/30">
      <div className="border-b px-4 py-3 text-sm font-semibold">{title}</div>
      <div className="divide-y">
        {tags.map((tag) =>
          tag.id === editingTagId ? (
            <EditableTagRow
              key={tag.id}
              tag={tag}
              editTagForm={editTagForm}
              isSaving={isSaving}
              onCancelEdit={onCancelEdit}
              onEditField={onEditField}
              onSaveEdit={onSaveEdit}
            />
          ) : (
            <ReadonlyTagRow
              key={tag.id}
              tag={tag}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ),
        )}
      </div>
    </div>
  );
}

function EditableTagRow({
  tag,
  editTagForm,
  isSaving,
  onCancelEdit,
  onEditField,
  onSaveEdit,
}: {
  tag: TagOptionRow;
  editTagForm: TagForm;
  isSaving: boolean;
  onCancelEdit: () => void;
  onEditField: (field: keyof TagForm, value: string) => void;
  onSaveEdit: () => void;
}) {
  return (
    <div className="grid gap-3 px-4 py-3 md:grid-cols-[120px_1fr_72px_88px]">
      <select
        className={selectInputClassName}
        value={editTagForm.tipo}
        onChange={(event) => onEditField("tipo", event.target.value)}
      >
        <option value="status">Status</option>
        <option value="ambiente">Ambiente</option>
      </select>
      <Input
        value={editTagForm.nome}
        onChange={(event) => onEditField("nome", event.target.value)}
        required
      />
      <Input
        type="color"
        value={editTagForm.cor}
        onChange={(event) => onEditField("cor", event.target.value)}
      />
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onSaveEdit}
          disabled={isSaving || !editTagForm.nome}
          aria-label={`Salvar ${tag.nome}`}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancelEdit}
          aria-label={`Cancelar edicao de ${tag.nome}`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ReadonlyTagRow({
  tag,
  onDelete,
  onEdit,
}: {
  tag: TagOptionRow;
  onDelete: (tagId: string) => void;
  onEdit: (tag: TagOptionRow) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="flex items-center gap-3 text-sm">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: tag.cor }}
        />
        {tag.nome}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(tag)}
          aria-label={`Editar ${tag.nome}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(tag.id)}
          aria-label={`Remover ${tag.nome}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const selectInputClassName =
  "h-10 w-full rounded-md border border-input bg-secondary px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function getTagForm(tag: TagOptionRow): TagForm {
  return {
    tipo: tag.tipo,
    nome: tag.nome,
    cor: tag.cor,
  };
}
