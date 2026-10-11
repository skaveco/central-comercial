"use client";

import { useState, type FormEvent } from "react";

import { AuthMessage } from "@/components/auth/auth-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function RecoverPasswordForm() {
  const [message, setMessage] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/redefinir-senha`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) {
        const limited = error.message.toLowerCase().includes("rate limit");
        setMessage({
          text: limited
            ? "Muitas solicitações. Aguarde alguns minutos antes de tentar novamente."
            : "Não foi possível enviar o link agora. Tente novamente em instantes.",
          tone: "error",
        });
        return;
      }

      setMessage({
        text: "Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha.",
        tone: "success",
      });
      event.currentTarget.reset();
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
        <label className="block text-sm leading-5 font-medium text-[var(--gray-12)]" htmlFor="recovery-email">
          E-mail
        </label>
        <Input
          autoComplete="email"
          className="h-10"
          id="recovery-email"
          name="email"
          placeholder="nome@skave.com.br"
          required
          type="email"
        />
      </div>

      <Button className="h-10 w-full" disabled={submitting} type="submit">
        {submitting ? "Enviando..." : "Enviar link de recuperação"}
      </Button>
    </form>
  );
}
