"use client";

import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Clock3,
  type LucideIcon,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <AuthGuard>
      {() => (
        <AppShell title="Dashboard">
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Central de trabalho
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Acesse os recursos de tarefas e de apontamento de horas em
                áreas independentes do mesmo hub.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <DomainCard
                href="/status"
                icon={ClipboardList}
                title="Gerenciamento de tarefas"
                description="Acompanhe status, ambientes, sprints, tarefas futuras e queries salvas."
                actionLabel="Abrir tarefas"
              />
              <DomainCard
                href="/time-tracking"
                icon={Clock3}
                title="Apontamento de horas"
                description="A estrutura de navegação está pronta para receber lançamentos, categorias e configurações."
                actionLabel="Abrir área de horas"
              />
            </div>
          </div>
        </AppShell>
      )}
    </AuthGuard>
  );
}

function DomainCard({
  href,
  icon: Icon,
  title,
  description,
  actionLabel,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
}) {
  return (
    <Card className="flex min-h-64 flex-col">
      <CardHeader className="space-y-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-left">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-6">
        <p className="text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <Button asChild className="w-full sm:w-fit">
          <Link href={href}>
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
