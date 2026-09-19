"use client";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { TimeCategoriesPanel } from "@/components/time-tracking/time-categories-panel";

export default function TimeCategoriesPage() {
  return (
    <AuthGuard>
      {(user) => (
        <AppShell title="Categorias de horas">
          <TimeCategoriesPanel userId={user.id} />
        </AppShell>
      )}
    </AuthGuard>
  );
}
