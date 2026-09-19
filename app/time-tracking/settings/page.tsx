"use client";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { DailyGoalSettings } from "@/components/time-tracking/daily-goal-settings";
import { NonWorkingDaysSettings } from "@/components/time-tracking/non-working-days-settings";

export default function TimeTrackingSettingsPage() {
  return (
    <AuthGuard>
      {(user) => (
        <AppShell title="Configurações de horas">
          <div className="space-y-6">
            <DailyGoalSettings userId={user.id} />
            <NonWorkingDaysSettings userId={user.id} />
          </div>
        </AppShell>
      )}
    </AuthGuard>
  );
}
