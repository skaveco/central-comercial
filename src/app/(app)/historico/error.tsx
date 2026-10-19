"use client";

import { Button } from "@/components/ui/button";

export default function HistoryError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[55vh] place-items-center p-5">
      <div className="max-w-md rounded-xl bg-[var(--gray-1)] p-8 text-center">
        <h1 className="text-lg font-semibold">Não foi possível carregar o Histórico</h1>
        <p className="mt-2 text-sm text-[var(--gray-11)]">Tente novamente. Nenhuma negociação foi alterada.</p>
        <Button className="mt-5" onClick={reset}>Tentar novamente</Button>
      </div>
    </main>
  );
}
