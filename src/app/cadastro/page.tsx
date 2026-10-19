import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthShell
      description="Preencha seus dados. Seu acesso dependerá da aprovação de um Administrador."
      footer={<Link className="font-medium text-[var(--primary-11)] hover:underline" href="/login">Voltar ao acesso</Link>}
      title="Solicitar acesso"
    >
      <SignupForm />
    </AuthShell>
  );
}
