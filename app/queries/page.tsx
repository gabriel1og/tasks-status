"use client";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { QueryLibrary } from "@/components/queries/query-library";

export default function QueriesPage() {
  return (
    <AuthGuard>
      {(user) => (
        <AppShell title="Queries">
          <QueryLibrary key={user.id} user={user} />
        </AppShell>
      )}
    </AuthGuard>
  );
}
