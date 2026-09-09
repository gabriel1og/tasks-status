"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

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
  const [tags, setTags] = useState<TagOptionRow[]>([]);
  const [feedback, setFeedback] = useState("");

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
                className="h-10 w-full rounded-md border border-input bg-secondary px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            <TagList title="Status" tags={statusTags} onDelete={deleteTag} />
            <TagList
              title="Ambiente"
              tags={environmentTags}
              onDelete={deleteTag}
            />
          </div>
          {feedback ? (
            <p className="text-sm text-muted-foreground">{feedback}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function TagList({
  title,
  tags,
  onDelete,
}: {
  title: string;
  tags: TagOptionRow[];
  onDelete: (tagId: string) => void;
}) {
  return (
    <div className="rounded-md border bg-secondary/30">
      <div className="border-b px-4 py-3 text-sm font-semibold">{title}</div>
      <div className="divide-y">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <span className="flex items-center gap-3 text-sm">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: tag.cor }}
              />
              {tag.nome}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(tag.id)}
              aria-label={`Remover ${tag.nome}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
