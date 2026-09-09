"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getInboundUser,
  isInboundSessionActive,
  type MockUser,
} from "@/lib/mock-auth";

type AuthGuardProps = {
  children: (user: MockUser) => React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isInboundSessionActive()) {
      router.replace("/login");
      return;
    }

    setCurrentUser(getInboundUser());
    setIsLoading(false);
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
