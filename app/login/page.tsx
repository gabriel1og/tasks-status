"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isInboundSessionActive, signInInbound } from "@/lib/mock-auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isInboundSessionActive()) {
      router.replace("/status");
    }
  }, [router]);

  function submitCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setIsSubmitting(true);

    const authResult = signInInbound(username, password);
    setIsSubmitting(false);

    if (!authResult.ok) {
      setFeedback(authResult.message);
      return;
    }

    router.replace("/status");
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[1fr_600px]">
      <section className="hidden items-center bg-sky-900 px-12 text-primary-foreground lg:flex">
        <div className="max-w-xl space-y-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-white/15">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <p className="mb-3 text-sm uppercase tracking-wide text-white/75">
              Operacional Inbound
            </p>
            <h1 className="text-3xl font-semibold text-white/75">
              Controle os status de tarefas por sprint, ambiente e fluxo Azure.
            </h1>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitCredentials}>
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              {feedback ? (
                <p className="text-sm text-muted-foreground">{feedback}</p>
              ) : null}
              <Button className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Aguarde..." : "Entrar"}
              </Button>

              <div className="text-[13px] text-white/75 text-center">
                Use <b>inbound/inbound</b> para acessar o sistema
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
