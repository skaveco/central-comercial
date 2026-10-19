import {
  ArrowLeftIcon,
  BanknotesIcon,
  ChartBarSquareIcon,
  Cog6ToothIcon,
  TagIcon,
  TrophyIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export type SettingsSection = "users" | "goals" | "opportunities" | "product-categories" | "segments";

type NavigationItem = {
  href?: string;
  icon: typeof Cog6ToothIcon;
  id?: SettingsSection;
  label: string;
};

const accessItems: NavigationItem[] = [
  { href: "/configuracoes", icon: UserGroupIcon, id: "users", label: "Usuários e permissões" },
];

const registrationItems: NavigationItem[] = [
  { href: "/configuracoes?section=goals", icon: ChartBarSquareIcon, id: "goals", label: "Metas" },
  {
    href: "/configuracoes?section=product-categories",
    icon: BanknotesIcon,
    id: "product-categories",
    label: "Categorias de produtos",
  },
  {
    href: "/configuracoes?section=opportunities",
    icon: TrophyIcon,
    id: "opportunities",
    label: "Oportunidades",
  },
  { href: "/configuracoes?section=segments", icon: TagIcon, id: "segments", label: "Segmentos" },
];

function SettingsNavigationItem({ activeSection, item }: { activeSection: SettingsSection; item: NavigationItem }) {
  const Icon = item.icon;
  const active = item.id === activeSection;
  const classes = `flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
    active
      ? "bg-[var(--primary-4)] text-[var(--gray-12)]"
      : item.href
        ? "text-[var(--gray-11)] hover:bg-[var(--gray-3)] hover:text-[var(--gray-12)]"
        : "cursor-not-allowed text-[var(--gray-9)]"
  }`;

  if (!item.href) {
    return (
      <span aria-disabled="true" className={classes} title="Disponível em uma próxima etapa">
        <Icon className="size-4" />
        {item.label}
      </span>
    );
  }

  return (
    <Link aria-current={active ? "page" : undefined} className={classes} href={item.href}>
      <Icon className="size-4" />
      {item.label}
    </Link>
  );
}

export function SettingsLayout({
  activeSection,
  children,
}: {
  activeSection: SettingsSection;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[1440px] p-5">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl leading-8 font-semibold">Configurações</h1>
          <p className="text-sm text-[var(--gray-11)]">
            Gerencie os usuários e as preferências da Central Comercial.
          </p>
        </div>
        <Button render={<Link href="/" />} variant="outline">
          <ArrowLeftIcon />
          Voltar à central
        </Button>
      </header>

      <div className="grid grid-cols-[226px_minmax(0,1fr)] gap-5">
        <aside className="self-stretch rounded-lg bg-[var(--gray-1)] p-2">
          <p className="px-2 py-1.5 text-xs font-semibold">Acessos</p>
          <nav aria-label="Configurações de acesso" className="space-y-0.5">
            {accessItems.map((item) => (
              <SettingsNavigationItem activeSection={activeSection} item={item} key={item.label} />
            ))}
          </nav>

          <p className="mt-3 px-2 py-1.5 text-xs font-semibold">Cadastros</p>
          <nav aria-label="Configurações de cadastros" className="space-y-0.5">
            {registrationItems.map((item) => (
              <SettingsNavigationItem activeSection={activeSection} item={item} key={item.label} />
            ))}
          </nav>
        </aside>

        <div className="min-w-0 space-y-5">{children}</div>
      </div>
    </main>
  );
}
