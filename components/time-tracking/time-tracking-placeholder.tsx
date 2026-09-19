"use client";

import { Clock3 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent } from "@/components/ui/card";

export function TimeTrackingPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <AuthGuard>
      {() => (
        <AppShell title={title}>
          <Card>
            <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Clock3 className="h-6 w-6" />
              </div>
              <div className="max-w-xl space-y-2">
                <h1 className="text-xl font-semibold">{title}</h1>
                <p className="text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
              <span className="rounded-full border bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                Estrutura preparada para as próximas fases
              </span>
            </CardContent>
          </Card>
        </AppShell>
      )}
    </AuthGuard>
  );
}
