"use client";

import {
  ArrowRightStartOnRectangleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

type SidebarItem = {
  label: string;
  href: string;
  icon: string;
};

type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

const sections: SidebarSection[] = [
  {
    label: "Visão",
    items: [
      { label: "Dashboard", href: "/", icon: "/icons/sidebar/dashboard.svg" },
      { label: "Tarefas", href: "/tarefas", icon: "/icons/sidebar/tasks.svg" },
    ],
  },
  {
    label: "Comercial",
    items: [
      {
        label: "Oportunidades",
        href: "/oportunidades",
        icon: "/icons/sidebar/opportunities.svg",
      },
      { label: "Histórico", href: "/historico", icon: "/icons/sidebar/history.svg" },
    ],
  },
  {
    label: "Cadastros",
    items: [
      {
        label: "Empresas",
        href: "/cadastros/empresas",
        icon: "/icons/sidebar/companies.svg",
      },
      {
        label: "Contatos",
        href: "/cadastros/contatos",
        icon: "/icons/sidebar/contacts.svg",
      },
      {
        label: "Produtos",
        href: "/cadastros/produtos",
        icon: "/icons/sidebar/products.svg",
      },
    ],
  },
];

function routeIsActive(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const roleLabels = {
  admin: "Administrador",
  pre_sales: "Pré-venda",
  commercial: "Comercial",
};

type AppSidebarProps = {
  collapsed?: boolean;
  user: {
    name: string;
    role: keyof typeof roleLabels;
  };
};

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "U";
  return `${words[0][0]}${words.length > 1 ? words.at(-1)?.[0] ?? "" : ""}`.toUpperCase();
}

export function AppSidebar({ collapsed = false, user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    setLogoutError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut({ scope: "local" });

      if (error) {
        setLogoutError("Não foi possível encerrar a sessão. Tente novamente.");
        return;
      }

      setLogoutDialogOpen(false);
      router.replace("/login");
      router.refresh();
    } catch {
      setLogoutError("Não foi possível conectar ao serviço de acesso.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          "h-dvh shrink-0 overflow-hidden bg-[var(--gray-3)] transition-[width,padding] duration-200",
          collapsed ? "w-16 p-2" : "w-[242px] p-2",
        )}
      >
        <aside
          aria-label="Navegação principal"
          className={cn(
            "flex h-full flex-col overflow-hidden rounded-[10px] bg-[var(--gray-1)] transition-[width] duration-200",
            collapsed ? "w-12" : "w-[226px]",
          )}
        >
        <header className="w-full p-2">
          <div
            className={cn(
              "flex w-full rounded-md p-2",
              collapsed ? "items-center justify-center" : "flex-col",
            )}
          >
            <span className="truncate text-[18px] leading-7 font-bold text-[var(--gray-12)]">
              {collapsed ? "S" : "SKV"}
            </span>
            <span
              className={cn(
                "truncate text-xs leading-4 font-normal text-[var(--gray-11)]",
                collapsed && "sr-only",
              )}
            >
              Central Comercial
            </span>
          </div>
        </header>

        <nav className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          {sections.map((section) => (
            <section className={cn("w-full p-2", collapsed && "py-1")} key={section.label}>
              <h2
                className={cn(
                  "px-2 py-1.5 text-xs leading-4 font-semibold text-[var(--gray-12)]",
                  collapsed && "sr-only",
                )}
              >
                {section.label}
              </h2>

              <ul className="w-full">
                {section.items.map((item) => {
                  const active = routeIsActive(pathname, item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-w-0 items-center gap-2 overflow-hidden rounded-sm px-2 py-1.5 text-sm leading-5 font-normal text-[var(--gray-12)] transition-colors",
                          "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary-8)]",
                          collapsed && "justify-center",
                          active
                            ? "bg-[var(--primary-6)] hover:bg-[var(--primary-6)]"
                            : "hover:bg-[var(--gray-3)]",
                        )}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                      >
                        <Image
                          alt=""
                          aria-hidden="true"
                          className="size-4 shrink-0 dark:invert"
                          height={16}
                          src={item.icon}
                          width={16}
                        />
                        <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>

          <footer className="w-full p-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    aria-label={collapsed ? `Abrir menu de ${user.name}` : undefined}
                    className={cn(
                      "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left transition-colors hover:bg-[var(--gray-3)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary-8)] data-popup-open:bg-[var(--gray-3)]",
                      collapsed && "justify-center",
                    )}
                    title={collapsed ? user.name : undefined}
                    type="button"
                  />
                }
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-6)] text-xs font-semibold text-[var(--primary-12)]">
                  {getInitials(user.name)}
                </span>
                <span className={cn("min-w-0 flex-1", collapsed && "sr-only")}>
                  <span className="block truncate text-sm leading-none font-semibold text-[var(--gray-12)]">
                    {user.name}
                  </span>
                  <span className="mt-1 block truncate text-xs leading-4 font-normal text-[var(--gray-11)]">
                    {roleLabels[user.role]}
                  </span>
                </span>
                <Image
                  alt=""
                  aria-hidden="true"
                  className={cn("size-4 shrink-0 dark:invert", collapsed && "sr-only")}
                  height={16}
                  src="/icons/sidebar/chevrons-up-down.svg"
                  width={16}
                />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align={collapsed ? "end" : "start"}
                className="w-[210px]"
                side={collapsed ? "right" : "top"}
                sideOffset={8}
              >
                {user.role === "admin" ? (
                  <>
                    <DropdownMenuItem render={<Link href="/configuracoes" />}>
                      <Cog6ToothIcon aria-hidden="true" />
                      Configurações
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                ) : null}
                <DropdownMenuItem
                  onClick={() => {
                    setLogoutError(null);
                    setLogoutDialogOpen(true);
                  }}
                  variant="destructive"
                >
                  <ArrowRightStartOnRectangleIcon aria-hidden="true" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </footer>
        </aside>
      </div>

      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent showCloseButton={!signingOut}>
          <DialogHeader>
            <DialogTitle>Sair da Central Comercial?</DialogTitle>
            <DialogDescription>
              Sua sessão será encerrada neste dispositivo e você voltará para a tela de acesso.
            </DialogDescription>
          </DialogHeader>

          {logoutError ? (
            <p className="rounded-lg border border-[var(--tomato-6)] bg-[var(--tomato-3)] px-3 py-2 text-sm text-[var(--tomato-11)]" role="alert">
              {logoutError}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button disabled={signingOut} variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button disabled={signingOut} onClick={handleLogout} variant="destructive">
              {signingOut ? "Saindo..." : "Sair"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
