"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ListChecks, LogOut, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  title: string;
};

const navigationItems = [
  { href: "/status", label: "Status", icon: ListChecks },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppShell({ children, title }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card/95 p-4 md:block">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">SEIDOR</p>
          <h1 className="text-lg font-semibold">Gerenciamento de Status</h1>
        </div>
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Button
          className="absolute bottom-4 left-4 right-4"
          variant="outline"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </aside>
      <main className="md:pl-64">
        <header className="sticky top-0 z-10 border-b bg-background/90 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            <div className="flex gap-2 md:hidden">
              {navigationItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Button key={item.href} asChild variant="outline" size="icon">
                    <Link href={item.href} aria-label={item.label}>
                      <Icon className="h-4 w-4" />
                    </Link>
                  </Button>
                );
              })}
              <Button variant="outline" size="icon" onClick={signOut} aria-label="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
