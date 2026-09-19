"use client";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { WeeklyOverview } from "@/components/time-tracking/weekly-overview";

export default function TimeTrackingPage() {
  return (
    <AuthGuard>
      {(user) => (
        <AppShell title="Visão geral de horas">
          <WeeklyOverview userId={user.id} />
        </AppShell>
      )}
    </AuthGuard>
  );
}
