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
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setCurrentUser(data.session?.user ?? null);
      setIsLoading(false);

      if (!data.session?.user) {
        router.replace("/login");
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) {
          return;
        }

        setCurrentUser(session?.user ?? null);
        setIsLoading(false);

        if (!session?.user) {
          router.replace("/login");
        }
      },
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
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
