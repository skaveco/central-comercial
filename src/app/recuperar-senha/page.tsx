import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { RecoverPasswordForm } from "@/components/auth/recover-password-form";

export default function RecoverPasswordPage() {
  return (
    <AuthShell
      description="Enviaremos as instruções para o seu e-mail de acesso."
      footer={
        <Link
          className="font-medium text-[var(--primary-11)] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-[var(--primary-8)]"
          href="/login"
        >
          Voltar para o acesso
        </Link>
      }
      title="Recuperar senha"
    >
      <RecoverPasswordForm />
    </AuthShell>
  );
}
