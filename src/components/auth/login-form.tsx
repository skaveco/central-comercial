"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthMessage } from "@/components/auth/auth-message";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  accessReasonMessages,
  getSafeInternalPath,
  type AccessStatus,
} from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/client";

function loginErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de acessar.";
  }
  if (normalized.includes("too many requests") || normalized.includes("rate limit")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }

  return "Não foi possível entrar agora. Tente novamente em instantes.";
}

type LoginFormProps = {
  initialMessage?: string;
  nextPath?: string;
};

export function LoginForm({ initialMessage, nextPath }: LoginFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<{ text: string; tone: "error" | "warning" } | null>(
    initialMessage ? { text: initialMessage, tone: "warning" } : null,
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setMessage({ text: loginErrorMessage(authError.message), tone: "error" });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("access_status")
        .eq("id", authData.user.id)
        .single<{ access_status: AccessStatus }>();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setMessage({ text: "Não foi possível validar sua permissão. Fale com um administrador.", tone: "error" });
        return;
      }

      if (profile.access_status !== "active") {
        await supabase.auth.signOut();
        setMessage({ text: accessReasonMessages[profile.access_status], tone: "warning" });
        return;
      }

      router.replace(getSafeInternalPath(nextPath));
      router.refresh();
    } catch {
      setMessage({ text: "Não foi possível conectar ao serviço de acesso.", tone: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" noValidate={false} onSubmit={handleSubmit}>
      {message ? <AuthMessage tone={message.tone}>{message.text}</AuthMessage> : null}

      <div className="space-y-1.5">
        <label className="block text-sm leading-5 font-medium text-[var(--gray-12)]" htmlFor="email">
          E-mail
        </label>
        <Input
          autoComplete="email"
          className="h-10"
          id="email"
          name="email"
          placeholder="nome@skave.com.br"
          required
          type="email"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <label className="block text-sm leading-5 font-medium text-[var(--gray-12)]" htmlFor="password">
            Senha
          </label>
          <Link
            className="text-sm leading-5 font-medium text-[var(--primary-11)] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-[var(--primary-8)]"
            href="/recuperar-senha"
          >
            Esqueci minha senha
          </Link>
        </div>
        <PasswordField autoComplete="current-password" id="password" minLength={6} name="password" required />
      </div>

      <Button className="h-10 w-full" disabled={submitting} type="submit">
        {submitting ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
