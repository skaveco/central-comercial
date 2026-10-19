"use client";

import { SunIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const routeLabels: Record<string, string> = {
  cadastros: "Cadastros",
  configuracoes: "Configurações",
  contatos: "Contatos",
  dashboard: "Dashboard",
  empresas: "Empresas",
  historico: "Histórico",
  oportunidades: "Oportunidades",
  produtos: "Produtos e Serviços",
  tarefas: "Tarefas",
};

const searchItems = [
  { label: "Dashboard", href: "/" },
  { label: "Tarefas", href: "/tarefas" },
  { label: "Oportunidades", href: "/oportunidades" },
  { label: "Histórico", href: "/historico" },
  { label: "Empresas", href: "/cadastros/empresas" },
  { label: "Contatos", href: "/cadastros/contatos" },
  { label: "Produtos e Serviços", href: "/cadastros/produtos" },
  { label: "Configurações", href: "/configuracoes" },
];

type AppHeaderProps = {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
};

function labelForSegment(segment: string) {
  return routeLabels[segment] ?? segment.replaceAll("-", " ");
}

const uuidSegmentPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function AppHeader({ sidebarCollapsed, onToggleSidebar }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter((segment) => segment && !uuidSegmentPattern.test(segment));
    return segments.length > 0 ? segments.map(labelForSegment) : ["Dashboard"];
  }, [pathname]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("theme");
    const shouldUseDark =
      storedTheme === "dark" ||
      (!storedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);

    document.documentElement.classList.toggle("dark", shouldUseDark);
    const frame = window.requestAnimationFrame(() => setDarkMode(shouldUseDark));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function toggleTheme() {
    const nextDarkMode = !darkMode;
    document.documentElement.classList.toggle("dark", nextDarkMode);
    window.localStorage.setItem("theme", nextDarkMode ? "dark" : "light");
    setDarkMode(nextDarkMode);
  }

  function navigateTo(href: string) {
    setCommandOpen(false);
    router.push(href);
  }

  return (
    <>
      <header className="w-full shrink-0 pt-2 pr-2">
        <div className="flex w-full items-center justify-between rounded-[10px] bg-[var(--gray-1)] px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              aria-label={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
              aria-pressed={sidebarCollapsed}
              className="flex size-7 shrink-0 items-center justify-center rounded-sm transition-colors hover:bg-[var(--gray-3)] focus-visible:outline-2 focus-visible:outline-[var(--primary-8)]"
              onClick={onToggleSidebar}
              type="button"
            >
              <Image
                alt=""
                aria-hidden="true"
                className="dark:invert"
                height={16}
                src="/icons/header/sidebar-simple.svg"
                width={16}
              />
            </button>

            <Image
              alt=""
              aria-hidden="true"
              className="h-[17px] w-4 shrink-0 dark:invert"
              height={17}
              src="/icons/header/separator.svg"
              width={16}
            />

            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
              {breadcrumbs.map((breadcrumb, index) => {
                const current = index === breadcrumbs.length - 1;

                return (
                  <span className="contents" key={`${breadcrumb}-${index}`}>
                    {index > 0 && (
                      <Image
                        alt=""
                        aria-hidden="true"
                        className="size-3 shrink-0 dark:invert"
                        height={12}
                        src="/icons/header/caret-right.svg"
                        width={12}
                      />
                    )}
                    <span
                      aria-current={current ? "page" : undefined}
                      className={
                        current
                          ? "truncate text-sm leading-5 text-[var(--gray-12)]"
                          : "truncate text-sm leading-5 text-[var(--gray-11)]"
                      }
                    >
                      {breadcrumb}
                    </span>
                  </span>
                );
              })}
            </nav>
          </div>

          <div className="ml-4 flex shrink-0 items-center gap-3">
            <button
              aria-haspopup="dialog"
              className="flex w-[239px] items-center gap-2 rounded-md border border-[var(--gray-6)] px-2 py-1.5 text-left opacity-90 transition-colors hover:bg-[var(--gray-3)] focus-visible:outline-2 focus-visible:outline-[var(--primary-8)]"
              onClick={() => setCommandOpen(true)}
              type="button"
            >
              <Image
                alt=""
                aria-hidden="true"
                className="dark:invert"
                height={16}
                src="/icons/header/search.svg"
                width={16}
              />
              <span className="text-sm leading-5 text-[var(--gray-12)]">Busca</span>
              <kbd className="ml-auto text-xs leading-4 font-normal text-[var(--gray-11)]">⌘K</kbd>
            </button>

            <button
              aria-label={darkMode ? "Ativar tema claro" : "Ativar tema escuro"}
              className="flex size-8 items-center justify-center rounded-md border border-[var(--gray-6)] transition-colors hover:bg-[var(--gray-3)] focus-visible:outline-2 focus-visible:outline-[var(--primary-8)]"
              onClick={toggleTheme}
              type="button"
            >
              {darkMode ? (
                <SunIcon aria-hidden="true" className="size-4 text-[var(--gray-12)]" />
              ) : (
                <Image alt="" aria-hidden="true" height={16} src="/icons/header/moon.svg" width={16} />
              )}
            </button>
          </div>
        </div>
      </header>

      <CommandDialog
        description="Pesquise uma página da Central Comercial"
        open={commandOpen}
        onOpenChange={setCommandOpen}
        title="Busca"
      >
        <CommandInput autoFocus placeholder="Buscar página..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup heading="Páginas">
            {searchItems.map((item) => (
              <CommandItem key={item.href} onSelect={() => navigateTo(item.href)} value={item.label}>
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
