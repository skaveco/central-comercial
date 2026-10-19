import { Suspense } from "react";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { accessReasonMessages, getSafeInternalPath } from "@/lib/auth/access";

type LoginPageProps = {
  searchParams: Promise<{ reason?: string; next?: string }>;
};

async function LoginContent({ searchParams }: LoginPageProps) {
  const { reason, next } = await searchParams;

  return (
    <AuthShell
      description="Use seu e-mail corporativo para acessar."
      footer={
        <>
          Ainda não tem acesso?{" "}
          <Link className="font-medium text-[var(--primary-11)] hover:underline" href="/cadastro">
            Solicitar cadastro
          </Link>
        </>
      }
      title="Acesse sua conta"
    >
      <LoginForm
        initialMessage={reason ? accessReasonMessages[reason] : undefined}
        nextPath={getSafeInternalPath(next)}
      />
    </AuthShell>
  );
}

export default function LoginPage(props: LoginPageProps) {
  return (
    <Suspense
      fallback={
        <AuthShell description="Validando o acesso..." title="Acesse sua conta">
          <div className="h-40 animate-pulse rounded-lg bg-[var(--gray-3)]" />
        </AuthShell>
      }
    >
      <LoginContent {...props} />
    </Suspense>
  );
}
