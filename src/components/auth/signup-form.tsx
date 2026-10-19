"use client";

import { useState, type FormEvent } from "react";

import { AuthMessage } from "@/components/auth/auth-message";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const [message, setMessage] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const formElement = event.currentTarget;

    const form = new FormData(formElement);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const passwordConfirmation = String(form.get("passwordConfirmation") ?? "");

    if (name.length < 3) {
      setMessage({ text: "Informe seu nome completo.", tone: "error" });
      return;
    }
    if (password.length < 8) {
      setMessage({ text: "A senha deve ter pelo menos 8 caracteres.", tone: "error" });
      return;
    }
    if (password !== passwordConfirmation) {
      setMessage({ text: "As senhas não coincidem.", tone: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });

      if (error) {
        const duplicate = error.message.toLowerCase().includes("already registered");
        setMessage({
          text: duplicate
            ? "Já existe uma solicitação para este e-mail."
            : "Não foi possível enviar a solicitação. Verifique os dados e tente novamente.",
          tone: "error",
        });
        return;
      }

      await supabase.auth.signOut({ scope: "local" });
      formElement.reset();
      setMessage({
        text: "Solicitação enviada. O Administrador definirá seu cargo antes de liberar o acesso.",
        tone: "success",
      });
      setSubmitted(true);
    } catch {
      setMessage({ text: "Não foi possível conectar ao serviço de acesso.", tone: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {message ? <AuthMessage tone={message.tone}>{message.text}</AuthMessage> : null}

      {!submitted ? (
        <>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" htmlFor="name">Nome completo</label>
            <Input autoComplete="name" className="h-10" id="name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" htmlFor="signup-email">E-mail</label>
            <Input autoComplete="email" className="h-10" id="signup-email" name="email" required type="email" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" htmlFor="signup-password">Senha</label>
            <PasswordField autoComplete="new-password" id="signup-password" minLength={8} name="password" required />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" htmlFor="password-confirmation">Confirmar senha</label>
            <PasswordField autoComplete="new-password" id="password-confirmation" minLength={8} name="passwordConfirmation" required />
          </div>
          <p className="text-xs leading-4 text-[var(--gray-11)]">
            O cadastro não libera acesso automaticamente. Um Administrador precisa aprovar e atribuir seu cargo.
          </p>
          <Button className="h-10 w-full" disabled={submitting} type="submit">
            {submitting ? "Enviando..." : "Enviar solicitação"}
          </Button>
        </>
      ) : null}
    </form>
  );
}
