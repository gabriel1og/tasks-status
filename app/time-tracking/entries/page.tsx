"use client";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { TimeEntriesWorkspace } from "@/components/time-tracking/time-entries-workspace";

export default function TimeEntriesPage() {
  return (
    <AuthGuard>
      {(user) => (
        <AppShell title="Apontamentos">
          <TimeEntriesWorkspace userId={user.id} />
        </AppShell>
      )}
    </AuthGuard>
  );
}
