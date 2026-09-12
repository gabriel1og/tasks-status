"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { QueryDetail } from "@/components/queries/query-detail";

export default function QueryResultsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <AuthGuard>
      {(user) => (
        <AppShell title="Query">
          <QueryDetail key={`${user.id}:${id}`} user={user} queryId={id} />
        </AppShell>
      )}
    </AuthGuard>
  );
}
