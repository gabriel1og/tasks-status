"use client";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { OcrTrackingWorkspace } from "@/components/ocr-tracking/ocr-tracking-workspace";

/** Acompanhamento autenticado da configuração OCR. Ex.: navegue para /ocr-tracking. */
export default function OcrTrackingPage() {
  return <AuthGuard>{(user) => <AppShell title="Acompanhamento OCR"><OcrTrackingWorkspace key={user.id} user={user} /></AppShell>}</AuthGuard>;
}
