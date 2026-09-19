"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { TaskFlowLogo } from "@/components/taskflow-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRequestErrorFeedback } from "@/lib/request-feedback";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";
type SubmissionKind = "credentials" | "google" | null;

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isFeedbackError, setIsFeedbackError] = useState(false);
  const [submissionKind, setSubmissionKind] = useState<SubmissionKind>(null);

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/status");
      }
    });
  }, [router]);

  async function submitCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");

    if (!hasSupabaseConfig()) {
      showAuthError("Configure as variáveis do Supabase para entrar.");
      return;
    }

    setSubmissionKind("credentials");
    const authResult = await authenticateWithEmail(authMode, email, password);

    if (authResult.error) {
      setSubmissionKind(null);
      showAuthError(
        getRequestErrorFeedback(
          authMode === "login" ? "email_sign_in" : "email_sign_up",
          authResult.error,
          authMode === "login"
            ? "Não foi possível entrar. Verifique seu e-mail e sua senha."
            : "Não foi possível criar a conta. Verifique os dados informados.",
        ),
      );
      return;
    }

    if (authMode === "signup" && !authResult.data.session) {
      setSubmissionKind(null);
      setIsFeedbackError(false);
      setFeedback("Cadastro criado. Confirme seu e-mail para entrar.");
      return;
    }

    router.replace("/status");
  }

  async function signInWithGoogle() {
    setFeedback("");

    if (!hasSupabaseConfig()) {
      showAuthError("Configure as variáveis do Supabase para entrar.");
      return;
    }

    setSubmissionKind("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/status` },
    });

    if (error) {
      setSubmissionKind(null);
      showAuthError(
        getRequestErrorFeedback(
          "google_sign_in",
          error,
          "Não foi possível entrar com o Google. Tente novamente.",
        ),
      );
    }
  }

  function showAuthError(message: string) {
    setIsFeedbackError(true);
    setFeedback(message);
  }

  function toggleAuthMode() {
    setAuthMode((currentMode) =>
      currentMode === "login" ? "signup" : "login",
    );
    setFeedback("");
    setIsFeedbackError(false);
  }

  const isSubmitting = submissionKind !== null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md border-border/80 shadow-2xl shadow-black/10">
        <CardHeader className="space-y-3 pb-6">
          <TaskFlowLogo priority className="w-28" />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {authMode === "login" ? "Entre na sua conta" : "Crie sua conta"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Organize tarefas e sprints da sua equipe.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* <Button
            type="button"
            variant="outline"
            className="h-12 w-full text-base"
            disabled={isSubmitting}
            onClick={signInWithGoogle}
          >
            <GoogleIcon />
            {submissionKind === "google"
              ? "Redirecionando..."
              : "Continuar com Google"}
          </Button>

          <div className="flex items-center gap-4" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              ou
            </span>
            <span className="h-px flex-1 bg-border" />
          </div> */}

          <form className="space-y-5" onSubmit={submitCredentials}>
            <div className="space-y-2">
              <Label htmlFor="email" className="uppercase tracking-wide">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="h-12"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="uppercase tracking-wide">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete={
                  authMode === "login" ? "current-password" : "new-password"
                }
                className="h-12"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {feedback ? (
              <p
                role="status"
                className={cn(
                  "text-sm",
                  isFeedbackError
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {feedback}
              </p>
            ) : null}
            <Button
              className="h-12 w-full text-base"
              disabled={isSubmitting}
              aria-busy={submissionKind === "credentials"}
            >
              {submissionKind === "credentials" ? (
                <>
                  <LoaderCircle
                    className="h-5 w-5 animate-spin"
                    aria-hidden="true"
                  />
                  {authMode === "login" ? "Entrando..." : "Cadastrando..."}
                </>
              ) : authMode === "login" ? (
                "Entrar"
              ) : (
                "Cadastrar"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {authMode === "login" ? "Não tem conta?" : "Já tem uma conta?"}{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isSubmitting}
              onClick={toggleAuthMode}
            >
              {authMode === "login" ? "Cadastre-se" : "Entre"}
            </button>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function authenticateWithEmail(
  authMode: AuthMode,
  email: string,
  password: string,
) {
  if (authMode === "login") {
    return supabase.auth.signInWithPassword({ email, password });
  }

  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/status` },
  });
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.32 2.98-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.97-.9 6.62-2.42l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.87A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.87V7.51H3.04A10 10 0 0 0 2 12c0 1.61.39 3.13 1.04 4.49l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 6c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.62C7.18 7.76 9.39 6 12 6Z"
      />
    </svg>
  );
}
