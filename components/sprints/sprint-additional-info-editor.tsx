"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEmptySprintLink } from "@/lib/sprint-hub";
import type {
  SprintAdditionalInfoUpdate,
  SprintLink,
} from "@/types/database";

type SprintAdditionalInfoEditorProps = {
  draft: SprintAdditionalInfoUpdate;
  isSaving: boolean;
  feedback: string;
  onCancel: () => void;
  onChange: (draft: SprintAdditionalInfoUpdate) => void;
  onSave: () => void;
};

const textareaClassName =
  "flex w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function SprintAdditionalInfoEditor({
  draft,
  isSaving,
  feedback,
  onCancel,
  onChange,
  onSave,
}: SprintAdditionalInfoEditorProps) {
  return (
    <fieldset disabled={isSaving} className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <TextAreaField
          id="sprint-goal"
          label="Objetivo"
          value={draft.objetivo}
          placeholder="Descreva o principal objetivo da sprint"
          onChange={(objetivo) => onChange({ ...draft, objetivo })}
        />
        <TextAreaField
          id="sprint-success-criteria"
          label="Critérios de sucesso"
          value={draft.criterios_sucesso}
          placeholder="Informe os resultados esperados para a sprint"
          onChange={(criterios_sucesso) =>
            onChange({ ...draft, criterios_sucesso })
          }
        />
      </div>
      <TextAreaField
        id="sprint-notes"
        label="Observações"
        value={draft.observacoes}
        placeholder="Registre contexto, riscos ou pontos de atenção"
        rows={3}
        onChange={(observacoes) => onChange({ ...draft, observacoes })}
      />
      <SprintLinksEditor
        links={draft.links}
        onChange={(links) => onChange({ ...draft, links })}
      />
      {feedback ? <p className="text-sm text-destructive">{feedback}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" onClick={onSave}>
          {isSaving ? "Salvando..." : "Salvar informações"}
        </Button>
      </div>
    </fieldset>
  );
}

function TextAreaField({
  id,
  label,
  value,
  placeholder,
  rows = 2,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={4000}
        placeholder={placeholder}
        className={textareaClassName}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function SprintLinksEditor({
  links,
  onChange,
}: {
  links: SprintLink[];
  onChange: (links: SprintLink[]) => void;
}) {
  function updateLink(index: number, field: keyof SprintLink, value: string) {
    onChange(
      links.map((link, linkIndex) =>
        linkIndex === index ? { ...link, [field]: value } : link,
      ),
    );
  }

  function removeLink(index: number) {
    const remainingLinks = links.filter((_, linkIndex) => linkIndex !== index);
    onChange(remainingLinks.length ? remainingLinks : [createEmptySprintLink()]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Links úteis</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...links, createEmptySprintLink()])}
        >
          <Plus className="h-4 w-4" />
          Adicionar link
        </Button>
      </div>
      <div className="space-y-2">
        {links.map((link, index) => (
          <div
            key={index}
            className="grid gap-2 sm:grid-cols-[minmax(140px,0.7fr)_minmax(220px,1.3fr)_40px]"
          >
            <Input
              value={link.label}
              maxLength={120}
              placeholder="Nome do link"
              aria-label={`Nome do link ${index + 1}`}
              onChange={(event) =>
                updateLink(index, "label", event.target.value)
              }
            />
            <Input
              type="url"
              value={link.url}
              maxLength={2000}
              placeholder="https://..."
              aria-label={`URL do link ${index + 1}`}
              onChange={(event) => updateLink(index, "url", event.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeLink(index)}
              aria-label={`Remover link ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
