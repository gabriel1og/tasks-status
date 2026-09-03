"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildDefaultTags } from "@/lib/default-tags";
import { supabase } from "@/lib/supabase";
import type { TagKind, TagOptionInsert, TagOptionRow } from "@/types/database";

type UserSettingsForm = {
  nome: string;
  cargo: string;
};

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

function SettingsPanel({ user }: { user: User }) {
  const [profileForm, setProfileForm] = useState<UserSettingsForm>({
    nome: "",
    cargo: "",
  });
  const [tagForm, setTagForm] = useState<TagForm>(emptyTagForm);
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
    loadSettings(user);
  }, [user]);

  async function loadSettings(currentUser: User) {
    const [{ data: settingsRow }, tagRows] = await Promise.all([
      supabase.from("user_settings").select("*").eq("user_id", currentUser.id).maybeSingle(),
      loadTags(currentUser.id),
    ]);

    setProfileForm({
      nome: settingsRow?.nome ?? currentUser.email ?? "",
      cargo: settingsRow?.cargo ?? "",
    });
    setTags(tagRows);
  }

  async function loadTags(userId: string) {
    const { data: currentTags } = await supabase
      .from("tag_options")
      .select("*")
      .order("tipo")
      .order("nome");

    if (currentTags?.length) {
      return currentTags as TagOptionRow[];
    }

    const { data: createdTags } = await supabase
      .from("tag_options")
      .insert(buildDefaultTags(userId))
      .select("*");

    return (createdTags ?? []) as TagOptionRow[];
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setIsSaving(true);

    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        nome: profileForm.nome,
        cargo: profileForm.cargo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    setIsSaving(false);
    setFeedback(error ? error.message : "Perfil salvo.");
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
    const { error } = await supabase.from("tag_options").delete().eq("id", tagId);

    if (error) {
      setFeedback(error.message);
      return;
    }

    setTags((currentTags) => currentTags.filter((tag) => tag.id !== tagId));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Informações do usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={saveProfile}>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={profileForm.nome}
                onChange={(event) => setProfileField("nome", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={profileForm.cargo}
                onChange={(event) => setProfileField("cargo", event.target.value)}
              />
            </div>
            <Button disabled={isSaving}>
              <Save className="h-4 w-4" />
              Salvar perfil
            </Button>
          </form>
          {feedback ? <p className="mt-4 text-sm text-muted-foreground">{feedback}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags de Status e Ambiente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="grid gap-4 md:grid-cols-[160px_1fr_96px_140px]" onSubmit={addTag}>
            <div className="space-y-2">
              <Label>Coluna</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
            <TagList title="Ambiente" tags={environmentTags} onDelete={deleteTag} />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  function setProfileField(field: keyof UserSettingsForm, value: string) {
    setProfileForm((currentForm) => ({ ...currentForm, [field]: value }));
  }
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
    <div className="rounded-md border">
      <div className="border-b px-4 py-3 text-sm font-semibold">{title}</div>
      <div className="divide-y">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center justify-between gap-3 px-4 py-3">
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
