"use client";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { TaskWorkspace } from "@/components/tasks/task-workspace";

export default function StatusPage() {
  return (
    <AuthGuard>
      {(user) => (
        <AppShell title="Status das tarefas">
          <TaskWorkspace user={user} mode="status" />
        </AppShell>
      )}
    </AuthGuard>
  );
}
