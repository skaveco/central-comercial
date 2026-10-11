import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthShell description="Escolha uma nova senha para sua conta." title="Criar nova senha">
      <Suspense fallback={<p className="text-sm text-[var(--gray-11)]">Validando link...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
