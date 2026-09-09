"use client";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { TaskWorkspace } from "@/components/tasks/task-workspace";

export default function FutureTasksPage() {
  return (
    <AuthGuard>
      {(user) => (
        <AppShell title="Tarefas Futuras">
          <TaskWorkspace user={user} mode="future" />
        </AppShell>
      )}
    </AuthGuard>
  );
}
