"use client";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { DailyGoalSettings } from "@/components/time-tracking/daily-goal-settings";

export default function TimeTrackingSettingsPage() {
  return (
    <AuthGuard>
      {(user) => (
        <AppShell title="Configurações de horas">
          <DailyGoalSettings userId={user.id} />
        </AppShell>
      )}
    </AuthGuard>
  );
}
