"use client";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { QueryDetail } from "@/components/queries/query-detail";

export default function NewQueryPage() {
  return (
    <AuthGuard>
      {(user) => (
        <AppShell title="Nova query">
          <QueryDetail key={user.id} user={user} />
        </AppShell>
      )}
    </AuthGuard>
  );
}
