"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[60vh] place-items-center p-5">
      <div className="max-w-md rounded-xl border border-[var(--tomato-6)] bg-[var(--tomato-3)] p-6 text-center">
        <h1 className="text-lg font-semibold">Não foi possível carregar a Dashboard</h1>
        <p className="mt-2 text-sm text-[var(--gray-11)]">Tente novamente. Se o problema continuar, revise a conexão com o Supabase.</p>
        <Button className="mt-4" onClick={reset}>Tentar novamente</Button>
      </div>
    </main>
  );
}
