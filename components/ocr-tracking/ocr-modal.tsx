"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Mantém foco e fechamento acessíveis. Ex.: <OcrModal title="Ficha" onClose={close}>...</OcrModal>. */
export function OcrModal({ title, onClose, children, busy = false }: { title: string; onClose: () => void; children: React.ReactNode; busy?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => bindModalFocus(panel.current, onClose, busy), [onClose, busy]);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="max-h-[92dvh] w-full max-w-6xl overflow-y-auto rounded-lg border bg-card p-4 text-card-foreground shadow-xl sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 id={titleId} className="text-lg font-semibold">{title}</h2><Button type="button" size="icon" variant="ghost" disabled={busy} onClick={onClose} aria-label="Fechar janela"><X className="h-4 w-4" /></Button></div>
      {children}
    </div>
  </div>;
}

function bindModalFocus(panel: HTMLDivElement | null, onClose: () => void, busy: boolean) {
  const previous = document.activeElement as HTMLElement | null;
  panel?.focus();
  function onKey(event: KeyboardEvent) {
    if (event.key === "Escape" && !busy) { event.stopImmediatePropagation(); onClose(); }
    if (event.key === "Tab") trapModalFocus(event, panel);
  }
  document.addEventListener("keydown", onKey);
  return () => { document.removeEventListener("keydown", onKey); if (previous?.isConnected) previous.focus(); };
}

function trapModalFocus(event: KeyboardEvent, panel: HTMLDivElement | null) {
  const focusable = Array.from(panel?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]') ?? []);
  const target = event.shiftKey ? focusable.at(-1) : focusable[0];
  const boundary = event.shiftKey ? focusable[0] : focusable.at(-1);
  if (!focusable.length || document.activeElement === boundary || document.activeElement === panel) { event.preventDefault(); (target ?? panel)?.focus(); }
}
