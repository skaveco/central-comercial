import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function OpportunityNotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center p-5 text-center">
      <h1 className="text-2xl font-semibold">Oportunidade não encontrada</h1>
      <p className="mt-2 text-sm text-[var(--gray-11)]">Ela pode não existir ou não estar disponível para o seu acesso.</p>
      <Button className="mt-5" render={<Link href="/oportunidades" />}>Voltar para Pipeline</Button>
    </main>
  );
}
