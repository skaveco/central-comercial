"use client";

import {
  EllipsisVerticalIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  saveContactAction,
  setContactStatusAction,
} from "@/app/(app)/cadastros/contatos/actions";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type SourceOption = { id: string; name: string; is_active: boolean };

type CompanyLink = {
  is_active: boolean;
  company: { id: string; name: string; is_active: boolean } | null;
};

export type ContactListItem = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  source: { name: string } | null;
  company_contacts: CompanyLink[];
};

type Filters = {
  status: "active" | "inactive";
  query: string;
  source: string;
  page: number;
  pageSize: number;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value)).replace(",", " às");
}

function formatPhone(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length === 11) return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (digits.length === 10) return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return value || "—";
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return digits.replace(/^(\d{2})(\d+)/, "($1) $2");
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return digits.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR");
}

function avatarClasses(name: string) {
  const palettes = [
    "bg-[var(--indigo-4)] text-[var(--indigo-12)]",
    "bg-[var(--plum-4)] text-[var(--plum-12)]",
    "bg-[var(--grass-5)] text-[var(--grass-12)]",
  ];
  const index = Array.from(name).reduce((total, character) => total + character.charCodeAt(0), 0) % palettes.length;
  return palettes[index];
}

function buildHref(
  filters: Filters,
  changes: Partial<Record<"status" | "query" | "source" | "page" | "size", string | number>>,
) {
  const params = new URLSearchParams();
  params.set("status", String(changes.status ?? filters.status));
  const query = changes.query ?? filters.query;
  const source = changes.source ?? filters.source;
  const size = changes.size ?? filters.pageSize;
  const page = changes.page ?? filters.page;
  if (query) params.set("query", String(query));
  if (source) params.set("source", String(source));
  params.set("size", String(size));
  params.set("page", String(page));
  return `/cadastros/contatos?${params.toString()}`;
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit">{pending ? "Salvando..." : children}</Button>;
}

function FieldError({ children }: { children?: string }) {
  return children ? <p className="mt-1 text-xs text-[var(--tomato-11)]">{children}</p> : null;
}

export function ContactFormDialog({
  contact,
  open,
  sources,
  onOpenChange,
}: {
  contact: ContactListItem | null;
  open: boolean;
  sources: SourceOption[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [state, action] = useActionState(saveContactAction, null);
  const [phone, setPhone] = useState(() => maskPhone(contact?.phone ?? ""));

  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false);
      router.refresh();
    }
  }, [onOpenChange, router, state]);

  const availableSources = sources.filter((source) => source.is_active || source.id === contact?.source_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{contact ? "Editar contato" : "Novo contato"}</DialogTitle>
          <DialogDescription>
            {contact ? "Atualize as informações do cadastro." : "Preencha os dados do contato. Apenas o nome é obrigatório."}
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="grid grid-cols-2 gap-4">
          <input name="id" type="hidden" value={contact?.id ?? ""} />
          {state && !state.ok ? (
            <div className={`col-span-2 rounded-lg border px-3 py-2 text-sm ${state.duplicate ? "border-[var(--amber-6)] bg-[var(--amber-3)] text-[var(--amber-12)]" : "border-[var(--tomato-6)] bg-[var(--tomato-3)] text-[var(--tomato-11)]"}`} role="alert">
              <p>{state.message}</p>
              {state.duplicate ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => onOpenChange(false)}
                    render={<Link href={`/cadastros/contatos/${state.duplicate.id}`} />}
                    size="xs"
                    variant="outline"
                  >
                    Visualizar {state.duplicate.name}{state.duplicate.isActive ? "" : " (desativado)"}
                  </Button>
                  <Button name="allowDuplicate" size="xs" type="submit" value="true">Continuar mesmo assim</Button>
                </div>
              ) : null}
            </div>
          ) : null}

          <label className="col-span-2 text-sm font-medium">
            Nome <span className="text-[var(--tomato-11)]">*</span>
            <Input aria-invalid={Boolean(state?.fieldErrors?.name)} className="mt-1" defaultValue={contact?.name ?? ""} name="name" required />
            <FieldError>{state?.fieldErrors?.name}</FieldError>
          </label>

          <label className="text-sm font-medium">
            Telefone
            <Input
              aria-invalid={Boolean(state?.fieldErrors?.phone)}
              className="mt-1"
              inputMode="tel"
              maxLength={15}
              name="phone"
              onChange={(event) => setPhone(maskPhone(event.target.value))}
              placeholder="(00) 00000-0000"
              value={phone}
            />
            <FieldError>{state?.fieldErrors?.phone}</FieldError>
          </label>

          <label className="text-sm font-medium">
            E-mail
            <Input aria-invalid={Boolean(state?.fieldErrors?.email)} className="mt-1" defaultValue={contact?.email ?? ""} name="email" type="email" />
            <FieldError>{state?.fieldErrors?.email}</FieldError>
          </label>

          <label className="col-span-2 text-sm font-medium">
            Origem do contato
            <select
              aria-invalid={Boolean(state?.fieldErrors?.sourceId)}
              className="mt-1 h-8 w-full rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)] px-2.5 text-sm outline-none focus:border-[var(--primary-8)] focus:ring-3 focus:ring-[var(--primary-8)]/50 aria-invalid:border-[var(--tomato-9)]"
              defaultValue={contact?.source_id ?? ""}
              name="sourceId"
            >
              <option value="">Sem origem informada</option>
              {availableSources.map((source) => (
                <option key={source.id} value={source.id}>{source.name}{source.is_active ? "" : " (inativa)"}</option>
              ))}
            </select>
            <FieldError>{state?.fieldErrors?.sourceId}</FieldError>
            {sources.length === 0 ? <p className="mt-1 text-xs text-[var(--gray-11)]">Nenhuma origem foi cadastrada em Configurações.</p> : null}
          </label>

          <DialogFooter className="col-span-2 mt-1">
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <SubmitButton>Salvar</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatusDialog({ contact, onClose }: { contact: ContactListItem | null; onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(setContactStatusAction, null);
  const nextStatus = !contact?.is_active;

  useEffect(() => {
    if (state?.ok) {
      onClose();
      router.refresh();
    }
  }, [onClose, router, state]);

  return (
    <Dialog open={Boolean(contact)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar {nextStatus ? "reativação" : "desativação"}?</DialogTitle>
          <DialogDescription>
            {nextStatus
              ? "A edição e os novos vínculos serão liberados novamente. Os dados existentes serão preservados."
              : "Os dados, vínculos e histórico serão preservados. O contato ficará indisponível para edição, novos vínculos e novas oportunidades até ser reativado."}
          </DialogDescription>
        </DialogHeader>
        {state && !state.ok ? <p className="text-sm text-[var(--tomato-11)]" role="alert">{state.message}</p> : null}
        <form action={action}>
          <input name="id" type="hidden" value={contact?.id ?? ""} />
          <input name="nextStatus" type="hidden" value={String(nextStatus)} />
          <DialogFooter>
            <DialogClose render={<Button disabled={pending} type="button" variant="outline" />}>Cancelar</DialogClose>
            <Button disabled={pending} type="submit" variant={nextStatus ? "default" : "destructive"}>
              {pending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ContactsPanel({
  contacts,
  error,
  filters,
  sources,
  total,
  totalPages,
}: {
  contacts: ContactListItem[];
  error?: string;
  filters: Filters;
  sources: SourceOption[];
  total: number;
  totalPages: number;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [statusContact, setStatusContact] = useState<ContactListItem | null>(null);
  const firstItem = total ? (filters.page - 1) * filters.pageSize + 1 : 0;
  const lastItem = Math.min(filters.page * filters.pageSize, total);
  const emptyMessage = filters.query || filters.source
    ? "Nenhum contato corresponde aos critérios informados."
    : filters.status === "inactive"
      ? "Nenhum contato desativado."
      : "Nenhum contato cadastrado.";
  const activeSourceName = useMemo(
    () => sources.find((source) => source.id === filters.source)?.name,
    [filters.source, sources],
  );

  function openNewContact() {
    setFormOpen(true);
  }

  function changeStatusTab(value: string | number | null) {
    if (value !== "active" && value !== "inactive") return;
    if (value === filters.status) return;
    router.push(buildHref(filters, { status: value, page: 1 }));
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] p-5">
      <header className="mb-4">
        <h1 className="text-xl font-semibold leading-8">Contatos</h1>
        <p className="text-sm text-[var(--gray-11)]">Gerencie as pessoas vinculadas às empresas e oportunidades.</p>
      </header>

      <div className="overflow-hidden rounded-[10px] bg-[var(--gray-1)] p-3">
        <Tabs className="gap-0" onValueChange={changeStatusTab} value={filters.status}>
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <form className="flex items-center" method="get">
                <input name="status" type="hidden" value={filters.status} />
                <input name="size" type="hidden" value={filters.pageSize} />
                <input name="source" type="hidden" value={filters.source} />
                <label className="relative block w-[280px] max-w-[28vw]">
                  <span className="sr-only">Buscar contatos</span>
                  <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[var(--gray-11)]" />
                  <Input className="pl-8" defaultValue={filters.query} name="query" placeholder="Busque por um contato" />
                </label>
              </form>

              <TabsList aria-label="Status dos contatos">
                <TabsTrigger value="active">Ativos</TabsTrigger>
                <TabsTrigger value="inactive">Desativados</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button aria-label="Filtrar contatos" variant="outline" />}>
                  <FunnelIcon />
                  Filtros
                  {filters.source ? <span className="size-1.5 rounded-full bg-[var(--primary-11)]" /> : null}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(buildHref(filters, { source: "", page: 1 }))}>
                    Todas as origens
                  </DropdownMenuItem>
                  {sources.map((source) => (
                    <DropdownMenuItem
                      key={source.id}
                      onClick={() => router.push(buildHref(filters, { source: source.id, page: 1 }))}
                    >
                      {source.name}{source.is_active ? "" : " (inativa)"}
                    </DropdownMenuItem>
                  ))}
                  {sources.length === 0 ? <DropdownMenuItem disabled>Nenhuma origem cadastrada</DropdownMenuItem> : null}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={openNewContact}><PlusCircleIcon />Novo contato</Button>
            </div>
          </div>

          <TabsContent className="contents" value={filters.status}>
            {activeSourceName ? (
              <div className="mb-2 flex items-center gap-2 text-xs text-[var(--gray-11)]">
                <span className="rounded-full bg-[var(--gray-3)] px-2 py-1">Origem: {activeSourceName}</span>
                <Button render={<Link href={buildHref(filters, { source: "", page: 1 })} />} size="xs" variant="ghost">Limpar</Button>
              </div>
            ) : null}

            {error ? (
              <div className="p-10 text-center">
                <p className="text-sm text-[var(--tomato-11)]" role="alert">{error}</p>
                <Button className="mt-3" onClick={() => window.location.reload()} variant="outline">Tentar novamente</Button>
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-10 text-center">
                <UserGroupIcon className="size-8 text-[var(--gray-9)]" />
                <div>
                  <p className="text-sm font-medium">{emptyMessage}</p>
                  <p className="mt-1 text-sm text-[var(--gray-11)]">{filters.query || filters.source ? "Limpe os filtros para visualizar todos os cadastros." : "Cadastre o primeiro contato para começar."}</p>
                </div>
                {filters.query || filters.source ? (
                  <Button render={<Link href={buildHref(filters, { query: "", source: "", page: 1 })} />} variant="outline">Limpar critérios</Button>
                ) : filters.status === "active" ? <Button onClick={openNewContact}><PlusCircleIcon />Novo contato</Button> : null}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Contato</TableHead>
                    <TableHead className="w-[150px]">Telefone</TableHead>
                    <TableHead className="w-[235px]">E-mail</TableHead>
                    <TableHead className="w-[190px]">Data de cadastro</TableHead>
                    <TableHead className="w-[190px]">Última atualização</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="w-12"><span className="sr-only">Ações</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow
                      aria-label={`Visualizar dados de ${contact.name}`}
                      className="cursor-pointer focus-visible:bg-[var(--gray-2)] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--primary-8)]"
                      key={contact.id}
                      onClick={() => router.push(`/cadastros/contatos/${contact.id}`)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(`/cadastros/contatos/${contact.id}`);
                        }
                      }}
                      tabIndex={0}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${avatarClasses(contact.name)}`}>{initials(contact.name)}</span>
                          <span className="max-w-[280px] truncate">{contact.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatPhone(contact.phone)}</TableCell>
                      <TableCell className="max-w-[235px] truncate">{contact.email ?? "—"}</TableCell>
                      <TableCell>{formatDate(contact.created_at)}</TableCell>
                      <TableCell>{formatDate(contact.updated_at)}</TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <button
                          aria-label={`${contact.is_active ? "Desativar" : "Reativar"} ${contact.name}`}
                          aria-checked={contact.is_active}
                          className={`relative h-5 w-9 cursor-pointer rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-8)] ${contact.is_active ? "bg-[var(--primary-9)]" : "bg-[var(--gray-7)]"}`}
                          onClick={() => setStatusContact(contact)}
                          role="switch"
                          type="button"
                        >
                          <span className={`absolute top-0.5 size-4 rounded-full bg-[var(--gray-1)] shadow-sm transition-[left] ${contact.is_active ? "left-[18px]" : "left-0.5"}`} />
                        </button>
                      </TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button aria-label={`Ações de ${contact.name}`} size="icon-sm" variant="ghost" />}>
                            <EllipsisVerticalIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {contact.is_active ? (
                              <DropdownMenuItem onClick={() => router.push(`/cadastros/contatos/${contact.id}?edit=true`)}><PencilSquareIcon />Visualizar e editar</DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => router.push(`/cadastros/contatos/${contact.id}`)}>Visualizar</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex min-h-12 items-center justify-between gap-4 px-3 py-2">
              <p className="text-sm text-[var(--gray-11)]">Mostrando {firstItem}–{lastItem} de {total} contatos</p>
              <div className="flex items-center gap-4">
                <select
                  aria-label="Contatos por página"
                  className="h-7 rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)] px-2 text-xs"
                  onChange={(event) => router.push(buildHref(filters, { size: event.target.value, page: 1 }))}
                  value={filters.pageSize}
                >
                  <option value="10">10 por página</option><option value="20">20 por página</option><option value="50">50 por página</option>
                </select>
                <p className="text-sm text-[var(--gray-11)]">Página {filters.page} de {totalPages}</p>
                {filters.page <= 1 ? (
                  <Button disabled size="sm" variant="outline">Anterior</Button>
                ) : (
                  <Button render={<Link href={buildHref(filters, { page: filters.page - 1 })} />} size="sm" variant="outline">Anterior</Button>
                )}
                {filters.page >= totalPages ? (
                  <Button disabled size="sm" variant="outline">Próxima</Button>
                ) : (
                  <Button render={<Link href={buildHref(filters, { page: filters.page + 1 })} />} size="sm" variant="outline">Próxima</Button>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ContactFormDialog
        key={`new-${formOpen}`}
        contact={null}
        onOpenChange={setFormOpen}
        open={formOpen}
        sources={sources}
      />
      <StatusDialog contact={statusContact} onClose={() => setStatusContact(null)} />
    </main>
  );
}
