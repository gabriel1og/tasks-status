"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

type AuthGuardProps = {
  children: (user: User) => React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        router.replace("/login");
        return;
      }

      setCurrentUser(data.session.user);
      setIsLoading(false);
    });
  }, [router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Carregando painel...</span>
      </main>
    );
  }

  if (!currentUser) {
    return null;
  }

  return children(currentUser);
}
