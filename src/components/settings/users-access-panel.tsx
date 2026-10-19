"use client";

import {
  BanknotesIcon,
  CheckBadgeIcon,
  ClipboardDocumentIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import { useActionState, useMemo, useState } from "react";

import {
  approveUserAction,
  rejectUserAction,
  type UserAccessActionState,
} from "@/app/(app)/configuracoes/actions";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

type AppRole = "admin" | "pre_sales" | "commercial";
type AccessStatus = "pending" | "active" | "rejected" | "disabled";
type OutlineIcon = typeof CheckBadgeIcon;

export type AccessUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole | null;
  access_status: AccessStatus;
  last_seen_at: string | null;
  created_at: string;
};

const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  pre_sales: "Pré-venda",
  commercial: "Comercial",
};

const statusLabels: Record<AccessStatus, string> = {
  pending: "Aguardando aprovação",
  active: "Ativo",
  rejected: "Recusado",
  disabled: "Desativado",
};

const statusClasses: Record<AccessStatus, string> = {
  pending: "bg-[var(--amber-3)] text-[var(--amber-11)]",
  active: "bg-[var(--grass-3)] text-[var(--grass-11)]",
  rejected: "bg-[var(--tomato-3)] text-[var(--tomato-11)]",
  disabled: "bg-[var(--gray-3)] text-[var(--gray-11)]",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function ActionMessage({ state }: { state: UserAccessActionState | null }) {
  if (!state) return null;
  return (
    <p
      className={`rounded-lg border px-3 py-2 text-sm ${state.ok ? "border-[var(--grass-6)] bg-[var(--grass-3)] text-[var(--grass-11)]" : "border-[var(--tomato-6)] bg-[var(--tomato-3)] text-[var(--tomato-11)]"}`}
      role={state.ok ? "status" : "alert"}
    >
      {state.message}
    </p>
  );
}

function ReviewDialog({ user, onClose }: { user: AccessUser | null; onClose: () => void }) {
  const [approveState, approveAction, approving] = useActionState(approveUserAction, null);
  const [rejectState, rejectAction, rejecting] = useActionState(rejectUserAction, null);
  const [role, setRole] = useState<AppRole>(user?.role ?? "commercial");
  const busy = approving || rejecting;

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revisar acesso</DialogTitle>
          <DialogDescription>{user?.name} · {user?.email}</DialogDescription>
        </DialogHeader>

        <ActionMessage state={approveState ?? rejectState} />

        <form action={approveAction} className="space-y-2">
          <input name="userId" type="hidden" value={user?.id ?? ""} />
          <label className="block text-sm font-medium" htmlFor="approval-role">Cargo obrigatório para aprovação</label>
          <select
            className="h-9 w-full rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)] px-2.5 text-sm outline-none focus:border-[var(--primary-8)] focus:ring-3 focus:ring-[var(--primary-8)]/50"
            id="approval-role"
            name="role"
            onChange={(event) => setRole(event.target.value as AppRole)}
            value={role}
          >
            <option value="admin">Administrador</option>
            <option value="pre_sales">Pré-venda</option>
            <option value="commercial">Comercial</option>
          </select>
          <p className="text-xs text-[var(--gray-11)]">Aprovar libera o acesso imediatamente.</p>
          <Button className="w-full" disabled={busy} type="submit">
            {approving ? "Aprovando..." : `Aprovar como ${roleLabels[role]}`}
          </Button>
        </form>

        {user?.access_status === "pending" ? (
          <form action={rejectAction}>
            <input name="userId" type="hidden" value={user.id} />
            <Button className="w-full" disabled={busy} type="submit" variant="destructive">
              {rejecting ? "Recusando..." : "Recusar solicitação"}
            </Button>
          </form>
        ) : null}

        <DialogFooter>
          <DialogClose render={<Button disabled={busy} variant="outline" />}>Cancelar</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UsersAccessPanel({ users, initialError }: { users: AccessUser[]; initialError?: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AccessStatus | "all">("all");
  const [reviewingUser, setReviewingUser] = useState<AccessUser | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return users.filter((user) => {
      const matchesQuery = !normalized || `${user.name} ${user.email}`.toLocaleLowerCase("pt-BR").includes(normalized);
      return matchesQuery && (status === "all" || user.access_status === status);
    });
  }, [query, status, users]);

  const pendingCount = users.filter((user) => user.access_status === "pending").length;

  async function copySignupLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/cadastro`);
      setCopyMessage("Link copiado.");
    } catch {
      setCopyMessage("Não foi possível copiar o link.");
    }
  }

  return (
    <>
          <section className="overflow-hidden rounded-lg bg-[var(--gray-1)]">
            <div className="border-b border-[var(--gray-6)] p-5">
              <h2 className="text-sm font-semibold">Usuários e permissões</h2>
              <p className="text-sm text-[var(--gray-11)]">Defina quem pode acessar a plataforma e o cargo de cada pessoa.</p>
              <div className="mt-3 flex items-center gap-2">
                <Button onClick={copySignupLink}><ClipboardDocumentIcon />Copiar link de cadastro</Button>
                <Button
                  aria-pressed={status === "pending"}
                  className="cursor-pointer"
                  onClick={() => setStatus((current) => current === "pending" ? "all" : "pending")}
                  size="default"
                  type="button"
                  variant={status === "pending" ? "secondary" : "outline"}
                >
                  Solicitações de acesso ({pendingCount})
                </Button>
                {copyMessage ? <span className="text-xs text-[var(--gray-11)]" role="status">{copyMessage}</span> : null}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-[var(--gray-6)] p-4">
              <label className="relative block w-[280px]">
                <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[var(--gray-11)]" />
                <Input className="pl-8" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou e-mail..." value={query} />
              </label>
              <select className="h-8 rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)] px-2.5 text-sm" onChange={(event) => setStatus(event.target.value as AccessStatus | "all")} value={status}>
                <option value="all">Todos os status</option>
                <option value="pending">Aguardando aprovação</option>
                <option value="active">Ativo</option>
                <option value="rejected">Recusado</option>
                <option value="disabled">Desativado</option>
              </select>
            </div>

            {initialError ? <p className="m-4 rounded-lg bg-[var(--tomato-3)] p-3 text-sm text-[var(--tomato-11)]" role="alert">{initialError}</p> : null}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] table-fixed text-left text-sm">
                <thead><tr className="border-b border-[var(--gray-6)]">
                  <th className="w-[28%] px-3 py-3 font-semibold">Usuário</th><th className="w-[24%] px-3 py-3 font-semibold">E-mail de acesso</th><th className="w-[18%] px-3 py-3 font-semibold">Status</th><th className="w-[14%] px-3 py-3 font-semibold">Cargo</th><th className="w-[14%] px-3 py-3 font-semibold">Último acesso</th><th className="w-10" />
                </tr></thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr className="border-b border-[var(--gray-6)] last:border-0" key={user.id}>
                      <td className="truncate px-3 py-3">{user.name}</td><td className="truncate px-3 py-3">{user.email}</td>
                      <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${statusClasses[user.access_status]}`}>{statusLabels[user.access_status]}</span></td>
                      <td className="truncate px-3 py-3">{user.role ? roleLabels[user.role] : "—"}</td><td className="truncate px-3 py-3">{formatDate(user.last_seen_at)}</td>
                      <td className="px-2 py-2">
                        <DropdownMenu><DropdownMenuTrigger render={<Button aria-label={`Ações para ${user.name}`} size="icon-sm" variant="ghost" />}><EllipsisVerticalIcon /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.access_status !== "active" ? <DropdownMenuItem onClick={() => setReviewingUser(user)}><CheckBadgeIcon />Revisar acesso</DropdownMenuItem> : <DropdownMenuItem disabled>Desativação indisponível</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!initialError && filteredUsers.length === 0 ? <p className="p-8 text-center text-sm text-[var(--gray-11)]">Nenhum usuário encontrado.</p> : null}
            </div>
            <div className="border-t border-[var(--gray-6)] px-3 py-3 text-sm text-[var(--gray-11)]">Mostrando {filteredUsers.length} de {users.length} usuários</div>
          </section>

          <section className="rounded-lg bg-[var(--gray-1)] p-5">
            <h2 className="text-sm font-semibold">Permissões por cargo</h2>
            <p className="text-sm text-[var(--gray-11)]">Informações sobre cada cargo</p>
            <div className="mt-7 grid grid-cols-3 gap-5">
              {([
                { Icon: CheckBadgeIcon, title: "Administrador", description: "Acesso completo à plataforma e gestão de usuários." },
                { Icon: BanknotesIcon, title: "Pré-venda", description: "Atendimento, busca e qualificação de leads em Pré-venda e Venda." },
                { Icon: TrophyIcon, title: "Comercial", description: "Operação de Pré-venda, Venda e acompanhamento de Pós-venda." },
              ] satisfies Array<{ Icon: OutlineIcon; title: string; description: string }>).map(({ Icon, title, description }) => (
                <article className="flex gap-5 rounded-lg bg-[var(--gray-3)] p-5" key={title}><Icon className="size-[22px] shrink-0 text-[var(--primary-11)]" /><div><h3 className="text-sm font-semibold">{title}</h3><p className="text-sm text-[var(--gray-11)]">{description}</p></div></article>
              ))}
            </div>
          </section>

      <ReviewDialog key={reviewingUser?.id ?? "closed"} onClose={() => setReviewingUser(null)} user={reviewingUser} />
    </>
  );
}
