"use client";

import {
  ArrowDownTrayIcon,
  BuildingOffice2Icon,
  EllipsisVerticalIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  saveCompanyAction,
  setCompanyStatusAction,
} from "@/app/(app)/cadastros/empresas/actions";
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
import { Textarea } from "@/components/ui/textarea";

export type SegmentOption = { id: string; name: string; is_active: boolean };

export type CompanyListItem = {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  segment_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  segment: { name: string } | null;
};

type Filters = {
  status: "active" | "inactive";
  query: string;
  segment: string;
  page: number;
  pageSize: number;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatCnpj(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length !== 14) return value || "—";
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function maskCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
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
    "bg-[var(--tomato-4)] text-[var(--tomato-12)]",
    "bg-[var(--amber-4)] text-[var(--amber-12)]",
  ];
  const index = Array.from(name).reduce((total, character) => total + character.charCodeAt(0), 0) % palettes.length;
  return palettes[index];
}

function buildHref(filters: Filters, changes: Partial<Record<"status" | "query" | "segment" | "page" | "size", string | number>>) {
  const params = new URLSearchParams();
  params.set("status", String(changes.status ?? filters.status));
  const query = changes.query ?? filters.query;
  const segment = changes.segment ?? filters.segment;
  const size = changes.size ?? filters.pageSize;
  const page = changes.page ?? filters.page;
  if (query) params.set("query", String(query));
  if (segment) params.set("segment", String(segment));
  params.set("size", String(size));
  params.set("page", String(page));
  return `/cadastros/empresas?${params.toString()}`;
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit">{pending ? "Salvando..." : children}</Button>;
}

function FieldError({ children }: { children?: string }) {
  return children ? <p className="mt-1 text-xs text-[var(--tomato-11)]">{children}</p> : null;
}

export function CompanyFormDialog({
  company,
  open,
  segments,
  onOpenChange,
}: {
  company: CompanyListItem | null;
  open: boolean;
  segments: SegmentOption[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [state, action] = useActionState(saveCompanyAction, null);
  const [cnpj, setCnpj] = useState(() => maskCnpj(company?.cnpj ?? ""));

  useEffect(() => {
    if (state?.ok) {
      onOpenChange(false);
      router.refresh();
    }
  }, [onOpenChange, router, state]);

  const availableSegments = segments.filter((segment) => segment.is_active || segment.id === company?.segment_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{company ? "Editar empresa" : "Nova empresa"}</DialogTitle>
          <DialogDescription>
            {company ? "Atualize as informações do cadastro." : "Preencha os dados da empresa. Apenas o nome é obrigatório."}
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="grid grid-cols-2 gap-4">
          <input name="id" type="hidden" value={company?.id ?? ""} />
          {state && !state.ok ? (
            <p className="col-span-2 rounded-lg border border-[var(--tomato-6)] bg-[var(--tomato-3)] px-3 py-2 text-sm text-[var(--tomato-11)]" role="alert">
              {state.message}
            </p>
          ) : null}

          <label className="col-span-2 text-sm font-medium">
            Nome <span className="text-[var(--tomato-11)]">*</span>
            <Input aria-invalid={Boolean(state?.fieldErrors?.name)} className="mt-1" defaultValue={company?.name ?? ""} name="name" required />
            <FieldError>{state?.fieldErrors?.name}</FieldError>
          </label>

          <label className="text-sm font-medium">
            CNPJ
            <Input
              aria-invalid={Boolean(state?.fieldErrors?.cnpj)}
              className="mt-1"
              inputMode="numeric"
              maxLength={18}
              name="cnpj"
              onChange={(event) => setCnpj(maskCnpj(event.target.value))}
              placeholder="00.000.000/0000-00"
              value={cnpj}
            />
            <FieldError>{state?.fieldErrors?.cnpj}</FieldError>
          </label>

          <label className="text-sm font-medium">
            Segmento
            <select
              aria-invalid={Boolean(state?.fieldErrors?.segmentId)}
              className="mt-1 h-8 w-full rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)] px-2.5 text-sm outline-none focus:border-[var(--primary-8)] focus:ring-3 focus:ring-[var(--primary-8)]/50 aria-invalid:border-[var(--tomato-9)]"
              defaultValue={company?.segment_id ?? ""}
              name="segmentId"
            >
              <option value="">Sem segmento</option>
              {availableSegments.map((segment) => (
                <option key={segment.id} value={segment.id}>{segment.name}{segment.is_active ? "" : " (inativo)"}</option>
              ))}
            </select>
            <FieldError>{state?.fieldErrors?.segmentId}</FieldError>
          </label>

          <label className="text-sm font-medium">
            E-mail
            <Input aria-invalid={Boolean(state?.fieldErrors?.email)} className="mt-1" defaultValue={company?.email ?? ""} name="email" type="email" />
            <FieldError>{state?.fieldErrors?.email}</FieldError>
          </label>

          <label className="text-sm font-medium">
            Telefone
            <Input aria-invalid={Boolean(state?.fieldErrors?.phone)} className="mt-1" defaultValue={company?.phone ?? ""} inputMode="tel" name="phone" placeholder="(00) 00000-0000" />
            <FieldError>{state?.fieldErrors?.phone}</FieldError>
          </label>

          <label className="col-span-2 text-sm font-medium">
            Endereço
            <Textarea className="mt-1" defaultValue={company?.address ?? ""} name="address" rows={3} />
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

function CompanyDetailsDialog({
  company,
  onClose,
  onEdit,
}: {
  company: CompanyListItem | null;
  onClose: () => void;
  onEdit: (company: CompanyListItem) => void;
}) {
  const details = company
    ? [
        { label: "Nome", value: company.name },
        { label: "CNPJ", value: formatCnpj(company.cnpj) },
        { label: "Segmento", value: company.segment?.name ?? "Não informado" },
        { label: "E-mail", value: company.email ?? "Não informado" },
        { label: "Telefone", value: company.phone ?? "Não informado" },
        { label: "Endereço", value: company.address ?? "Não informado", fullWidth: true },
        { label: "Data de cadastro", value: formatDate(company.created_at) },
        { label: "Última atualização", value: formatDate(company.updated_at) },
      ]
    : [];

  return (
    <Dialog open={Boolean(company)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Dados da empresa</DialogTitle>
          <DialogDescription>Informações cadastradas na Central Comercial.</DialogDescription>
        </DialogHeader>

        {company ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {details.map((detail) => (
              <div className={detail.fullWidth ? "col-span-2" : undefined} key={detail.label}>
                <p className="text-xs font-medium text-[var(--gray-11)]">{detail.label}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--gray-12)]">{detail.value}</p>
              </div>
            ))}
            <div className="col-span-2">
              <p className="text-xs font-medium text-[var(--gray-11)]">Status</p>
              <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${company.is_active ? "bg-[var(--grass-3)] text-[var(--grass-11)]" : "bg-[var(--gray-3)] text-[var(--gray-11)]"}`}>
                {company.is_active ? "Ativa" : "Desativada"}
              </span>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Fechar</DialogClose>
          {company?.is_active ? (
            <Button onClick={() => onEdit(company)}><PencilSquareIcon />Editar empresa</Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusDialog({ company, onClose }: { company: CompanyListItem | null; onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(setCompanyStatusAction, null);
  const nextStatus = !company?.is_active;

  useEffect(() => {
    if (state?.ok) {
      onClose();
      router.refresh();
    }
  }, [onClose, router, state]);

  return (
    <Dialog open={Boolean(company)} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar {nextStatus ? "reativação" : "desativação"}?</DialogTitle>
          <DialogDescription>
            {nextStatus
              ? "A edição e os novos vínculos serão liberados novamente. Os dados existentes serão preservados."
              : "Os dados, vínculos e histórico serão preservados. A empresa ficará indisponível para edição, novos vínculos e novas oportunidades até ser reativada."}
          </DialogDescription>
        </DialogHeader>
        {state && !state.ok ? <p className="text-sm text-[var(--tomato-11)]" role="alert">{state.message}</p> : null}
        <form action={action}>
          <input name="id" type="hidden" value={company?.id ?? ""} />
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

export function CompaniesPanel({
  companies,
  error,
  filters,
  segments,
  total,
  totalPages,
}: {
  companies: CompanyListItem[];
  error?: string;
  filters: Filters;
  segments: SegmentOption[];
  total: number;
  totalPages: number;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyListItem | null>(null);
  const [viewingCompany, setViewingCompany] = useState<CompanyListItem | null>(null);
  const [statusCompany, setStatusCompany] = useState<CompanyListItem | null>(null);
  const firstItem = total ? (filters.page - 1) * filters.pageSize + 1 : 0;
  const lastItem = Math.min(filters.page * filters.pageSize, total);
  const emptyMessage = filters.query || filters.segment
    ? "Nenhuma empresa corresponde aos critérios informados."
    : filters.status === "inactive"
      ? "Nenhuma empresa desativada."
      : "Nenhuma empresa cadastrada.";

  const activeSegmentName = useMemo(
    () => segments.find((segment) => segment.id === filters.segment)?.name,
    [filters.segment, segments],
  );

  function openNewCompany() {
    setEditingCompany(null);
    setFormOpen(true);
  }

  function openEditCompany(company: CompanyListItem) {
    setViewingCompany(null);
    setEditingCompany(company);
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
        <h1 className="text-xl font-semibold leading-8">Empresas</h1>
        <p className="text-sm text-[var(--gray-11)]">Gerencie as empresas vinculadas a contatos e oportunidades.</p>
      </header>

      <div className="overflow-hidden rounded-[10px] bg-[var(--gray-1)] p-3">
        <Tabs className="gap-0" onValueChange={changeStatusTab} value={filters.status}>
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <form className="flex items-center" method="get">
                <input name="status" type="hidden" value={filters.status} />
                <input name="size" type="hidden" value={filters.pageSize} />
                <input name="segment" type="hidden" value={filters.segment} />
                <label className="relative block w-[280px] max-w-[28vw]">
                  <span className="sr-only">Buscar empresas</span>
                  <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[var(--gray-11)]" />
                  <Input className="pl-8" defaultValue={filters.query} name="query" placeholder="Buscar empresas..." />
                </label>
              </form>

              <TabsList aria-label="Status das empresas">
                <TabsTrigger value="active">Ativas</TabsTrigger>
                <TabsTrigger value="inactive">Desativadas</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button aria-label="Filtrar empresas" variant="outline" />}
                >
                  <FunnelIcon />
                  Filtros
                  {filters.segment ? <span className="size-1.5 rounded-full bg-[var(--primary-11)]" /> : null}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(buildHref(filters, { segment: "", page: 1 }))}>
                    Todos os segmentos
                  </DropdownMenuItem>
                  {segments.map((segment) => (
                    <DropdownMenuItem
                      key={segment.id}
                      onClick={() => router.push(buildHref(filters, { segment: segment.id, page: 1 }))}
                    >
                      {segment.name}{segment.is_active ? "" : " (inativo)"}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button disabled title="Exportação ainda não disponível" variant="outline"><ArrowDownTrayIcon />Exportar</Button>
              <Button onClick={openNewCompany}><PlusCircleIcon />Nova empresa</Button>
            </div>
          </div>

          <TabsContent className="contents" value={filters.status}>
            {activeSegmentName ? (
              <div className="mb-2 flex items-center gap-2 text-xs text-[var(--gray-11)]">
                <span className="rounded-full bg-[var(--gray-3)] px-2 py-1">Segmento: {activeSegmentName}</span>
                <Button render={<Link href={buildHref(filters, { segment: "", page: 1 })} />} size="xs" variant="ghost">Limpar</Button>
              </div>
            ) : null}

        {error ? (
          <div className="p-10 text-center">
            <p className="text-sm text-[var(--tomato-11)]" role="alert">{error}</p>
            <Button className="mt-3" onClick={() => window.location.reload()} variant="outline">Tentar novamente</Button>
          </div>
        ) : companies.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-10 text-center">
            <BuildingOffice2Icon className="size-8 text-[var(--gray-9)]" />
            <div><p className="text-sm font-medium">{emptyMessage}</p><p className="mt-1 text-sm text-[var(--gray-11)]">{filters.query || filters.segment ? "Limpe os filtros para visualizar todos os cadastros." : "Cadastre a primeira empresa para começar."}</p></div>
            {filters.query || filters.segment ? (
              <Button render={<Link href={buildHref(filters, { query: "", segment: "", page: 1 })} />} variant="outline">Limpar critérios</Button>
            ) : filters.status === "active" ? <Button onClick={openNewCompany}><PlusCircleIcon />Nova empresa</Button> : null}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Empresa</TableHead>
                <TableHead className="w-[150px]">Segmento</TableHead>
                <TableHead className="w-[170px]">CNPJ</TableHead>
                <TableHead className="w-[180px]">Data de cadastro</TableHead>
                <TableHead className="w-[180px]">Última atualização</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
                <TableHead className="w-12"><span className="sr-only">Ações</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow
                  aria-label={`Visualizar dados de ${company.name}`}
                  className="cursor-pointer focus-visible:bg-[var(--gray-2)] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--primary-8)]"
                  key={company.id}
                  onClick={() => router.push(`/cadastros/empresas/${company.id}`)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/cadastros/empresas/${company.id}`);
                    }
                  }}
                  tabIndex={0}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${avatarClasses(company.name)}`}>{initials(company.name)}</span>
                      <span className="max-w-[280px] truncate">{company.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">{company.segment?.name ?? "—"}</TableCell>
                  <TableCell>{formatCnpj(company.cnpj)}</TableCell>
                  <TableCell>{formatDate(company.created_at)}</TableCell>
                  <TableCell>{formatDate(company.updated_at)}</TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <button
                      aria-label={`${company.is_active ? "Desativar" : "Reativar"} ${company.name}`}
                      aria-checked={company.is_active}
                      className={`relative h-5 w-9 cursor-pointer rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-8)] ${company.is_active ? "bg-[var(--primary-9)]" : "bg-[var(--gray-7)]"}`}
                      onClick={() => setStatusCompany(company)}
                      role="switch"
                      type="button"
                    >
                      <span className={`absolute top-0.5 size-4 rounded-full bg-[var(--gray-1)] shadow-sm transition-[left] ${company.is_active ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                  </TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button aria-label={`Ações de ${company.name}`} size="icon-sm" variant="ghost" />}>
                        <EllipsisVerticalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {company.is_active ? (
                          <DropdownMenuItem onClick={() => openEditCompany(company)}><PencilSquareIcon />Visualizar e editar</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem disabled>Somente visualização</DropdownMenuItem>
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
              <p className="text-sm text-[var(--gray-11)]">Mostrando {firstItem}–{lastItem} de {total} empresas</p>
              <div className="flex items-center gap-4">
                <select
                  aria-label="Empresas por página"
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

      <CompanyFormDialog
        key={`${editingCompany?.id ?? "new"}-${formOpen}`}
        company={editingCompany}
        onOpenChange={setFormOpen}
        open={formOpen}
        segments={segments}
      />
      <CompanyDetailsDialog
        company={viewingCompany}
        onClose={() => setViewingCompany(null)}
        onEdit={openEditCompany}
      />
      <StatusDialog company={statusCompany} onClose={() => setStatusCompany(null)} />
    </main>
  );
}
