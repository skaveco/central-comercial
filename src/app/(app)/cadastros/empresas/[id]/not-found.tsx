import { BuildingOffice2Icon } from "@heroicons/react/24/outline";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function CompanyNotFound() {
  return (
    <main className="flex min-h-[calc(100vh-72px)] items-center justify-center p-5">
      <div className="max-w-md rounded-xl bg-[var(--gray-1)] p-8 text-center">
        <BuildingOffice2Icon className="mx-auto size-9 text-[var(--gray-9)]" />
        <h1 className="mt-4 text-lg font-semibold">Empresa não encontrada</h1>
        <p className="mt-2 text-sm text-[var(--gray-11)]">O cadastro não existe ou não está disponível para o seu acesso.</p>
        <Button className="mt-5" render={<Link href="/cadastros/empresas" />}>Voltar para empresas</Button>
      </div>
    </main>
  );
}
