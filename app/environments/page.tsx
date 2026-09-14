"use client";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { EnvironmentTrackingWorkspace } from "@/components/environments/environment-tracking-workspace";

/** Renderiza a rota autenticada de ambientes. Exemplo: navegue para /environments. */
export default function EnvironmentsPage() {
  return (
    <AuthGuard>
      {(user) => (
        <AppShell title="Rastreamento de ambientes">
          <EnvironmentTrackingWorkspace user={user} />
        </AppShell>
      )}
    </AuthGuard>
  );
}
