"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    setIsSubmitting(true);

    const authResult =
      authMode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setIsSubmitting(false);

    if (authResult.error) {
      setFeedback(authResult.error.message);
      return;
    }

    if (authMode === "signup" && !authResult.data.session) {
      setFeedback("Cadastro criado. Confirme seu e-mail para entrar.");
      return;
    }

    router.replace("/status");
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[1fr_460px]">
      <section className="hidden items-center bg-primary px-12 text-primary-foreground lg:flex">
        <div className="max-w-xl space-y-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-white/15">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <p className="mb-3 text-sm uppercase tracking-wide text-white/75">
              Operacional
            </p>
            <h1 className="text-4xl font-semibold leading-tight">
              Controle os status de tarefas por sprint, ambiente e fluxo Azure.
            </h1>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{authMode === "login" ? "Entrar" : "Criar acesso"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitCredentials}>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
              <Button className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Aguarde..." : authMode === "login" ? "Entrar" : "Cadastrar"}
              </Button>
            </form>
            <Button
              className="mt-4 w-full"
              variant="ghost"
              onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
            >
              {authMode === "login" ? "Criar uma conta" : "Já tenho conta"}
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
