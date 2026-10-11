"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AuthMessage } from "@/components/auth/auth-message";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function prepareRecoverySession() {
      const supabase = createClient();
      const code = searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (active) setMessage({ text: "Este link é inválido ou expirou. Solicite um novo link.", tone: "error" });
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (active) setMessage({ text: "Este link é inválido ou expirou. Solicite um novo link.", tone: "error" });
        return;
      }

      if (active) setReady(true);
    }

    void prepareRecoverySession();
    return () => {
      active = false;
    };
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("passwordConfirmation") ?? "");

    if (password.length < 8) {
      setMessage({ text: "A senha deve ter pelo menos 8 caracteres.", tone: "error" });
      return;
    }
    if (password !== confirmation) {
      setMessage({ text: "As senhas não coincidem.", tone: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage({ text: "Não foi possível atualizar a senha. Solicite um novo link.", tone: "error" });
        return;
      }

      await supabase.auth.signOut();
      setMessage({ text: "Senha atualizada. Redirecionando para o acesso...", tone: "success" });
      window.setTimeout(() => router.replace("/login"), 1000);
    } catch {
      setMessage({ text: "Não foi possível conectar ao serviço de acesso.", tone: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {message ? <AuthMessage tone={message.tone}>{message.text}</AuthMessage> : null}

      <div className="space-y-1.5">
        <label className="block text-sm leading-5 font-medium text-[var(--gray-12)]" htmlFor="new-password">
          Nova senha
        </label>
        <PasswordField
          autoComplete="new-password"
          disabled={!ready}
          id="new-password"
          minLength={8}
          name="password"
          required
        />
        <p className="text-xs leading-4 text-[var(--gray-11)]">Use pelo menos 8 caracteres.</p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm leading-5 font-medium text-[var(--gray-12)]" htmlFor="password-confirmation">
          Confirmar nova senha
        </label>
        <PasswordField
          autoComplete="new-password"
          disabled={!ready}
          id="password-confirmation"
          minLength={8}
          name="passwordConfirmation"
          required
        />
      </div>

      <Button className="h-10 w-full" disabled={!ready || submitting} type="submit">
        {submitting ? "Atualizando..." : "Atualizar senha"}
      </Button>
    </form>
  );
}
