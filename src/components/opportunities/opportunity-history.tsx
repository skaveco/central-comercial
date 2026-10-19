"use client";

import {
  ArrowPathIcon,
  CalendarDaysIcon,
  EllipsisVerticalIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { restoreOpportunityAction, type RestoreOpportunityState } from "@/app/(app)/historico/actions";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export type HistoryResult = "won" | "lost" | "disqualified" | "archived";
export type HistoryOption = { id: string; name: string };
export type HistoryPipeline = {
  id: string;
  code: "pre_sales" | "sales";
  name: string;
  stages: Array<{ id: string; code: string; name: string; sort_order: number }>;
};

export type HistoryItem = {
  id: string;
  opportunityId: string;
  opportunityName: string;
  result: HistoryResult;
  finalValue: number | null;
  responsibleId: string;
  responsibleName: string;
  closedAt: string;
  reason: string | null;
  postSaleStatus: string | null;
  qualificationAnswerCount: number;
};

export type HistoryFilters = {
  query: string;
  closedFrom: string;
  closedTo: string;
  results: HistoryResult[];
  responsibleIds: string[];
  companyIds: string[];
  contactIds: string[];
  productIds: string[];
  reasonIds: string[];
  page: number;
  pageSize: number;
};

type OpportunityHistoryProps = {
  actor: { id: string; role: "admin" | "pre_sales" | "commercial" };
  companies: HistoryOption[];
  contacts: HistoryOption[];
  defaultPeriod: { from: string; to: string };
  error?: string;
  filters: HistoryFilters;
  items: HistoryItem[];
  lossReasons: HistoryOption[];
  pipelines: HistoryPipeline[];
  products: HistoryOption[];
  profiles: Array<HistoryOption & { role: "admin" | "pre_sales" | "commercial" }>;
  total: number;
};

const resultLabels: Record<HistoryResult, string> = {
  won: "Ganha",
  lost: "Perdida",
  disqualified: "Desqualificada",
  archived: "Arquivada",
};

const resultClasses: Record<HistoryResult, string> = {
  won: "bg-[var(--grass-3)] text-[var(--grass-11)]",
  lost: "bg-[var(--tomato-3)] text-[var(--tomato-11)]",
  disqualified: "bg-[var(--amber-3)] text-[var(--amber-11)]",
  archived: "bg-[var(--gray-3)] text-[var(--gray-11)]",
};

const selectClassName = "mt-1 h-8 w-full rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)] px-2.5 text-sm outline-none focus:border-[var(--primary-8)] focus:ring-3 focus:ring-[var(--primary-8)]/50 aria-invalid:border-[var(--tomato-9)]";

function formatCurrency(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

function formatMonth(value: string) {
  const [year, month] = value.split("-");
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(new Date(`${year}-${month}-15T12:00:00Z`));
  return `${label[0]?.toUpperCase()}${label.slice(1)}/${year}`;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("pt-BR");
}

function csv(values: string[]) {
  return values.join(",");
}

function buildHref(filters: HistoryFilters, changes: Partial<HistoryFilters>) {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (next.query) params.set("query", next.query);
  params.set("from", next.closedFrom);
  params.set("to", next.closedTo);
  if (next.results.length) params.set("results", csv(next.results));
  if (next.responsibleIds.length) params.set("responsibles", csv(next.responsibleIds));
  if (next.companyIds.length) params.set("companies", csv(next.companyIds));
  if (next.contactIds.length) params.set("contacts", csv(next.contactIds));
  if (next.productIds.length) params.set("products", csv(next.productIds));
  if (next.reasonIds.length) params.set("reasons", csv(next.reasonIds));
  params.set("size", String(next.pageSize));
  params.set("page", String(next.page));
  return `/historico?${params.toString()}`;
}

function FieldError({ children }: { children?: string }) {
  return children ? <p className="mt-1 text-xs text-[var(--tomato-11)]">{children}</p> : null;
}

function RestoreDialog({ actor, item, onClose, pipelines, profiles }: {
  actor: OpportunityHistoryProps["actor"];
  item: HistoryItem;
  onClose: () => void;
  pipelines: HistoryPipeline[];
  profiles: OpportunityHistoryProps["profiles"];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<RestoreOpportunityState | null, FormData>(restoreOpportunityAction, null);
  const [requestKey] = useState(() => crypto.randomUUID());
  const [pipelineId, setPipelineId] = useState(pipelines[0]?.id ?? "");
  const selectedPipeline = pipelines.find((pipeline) => pipeline.id === pipelineId) ?? null;
  const [stageId, setStageId] = useState(selectedPipeline?.stages[0]?.id ?? "");
  const selectedStage = selectedPipeline?.stages.find((stage) => stage.id === stageId) ?? null;
  const needsSchedule = selectedStage?.code === "diagnosis" || selectedStage?.code === "negotiation";
  const lacksSalesQualification = selectedPipeline?.code === "sales" && item.qualificationAnswerCount < 2;
  const defaultResponsible = profiles.some((profile) => profile.id === item.responsibleId)
    ? item.responsibleId
    : profiles.some((profile) => profile.id === actor.id)
      ? actor.id
      : profiles[0]?.id ?? "";

  useEffect(() => {
    if (!state?.ok) return;
    onClose();
    router.refresh();
  }, [onClose, router, state]);

  function changePipeline(nextPipelineId: string) {
    const nextPipeline = pipelines.find((pipeline) => pipeline.id === nextPipelineId);
    setPipelineId(nextPipelineId);
    setStageId(nextPipeline?.stages[0]?.id ?? "");
  }

  const actionLabel = item.result === "won" ? "Reabrir negociação" : "Restaurar negociação";

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader><DialogTitle>{actionLabel}</DialogTitle><DialogDescription>Escolha obrigatoriamente o funil e a etapa de destino para {item.opportunityName}.</DialogDescription></DialogHeader>
        <form action={action} className="grid grid-cols-2 gap-4">
          <input name="requestKey" type="hidden" value={requestKey} />
          <input name="opportunityId" type="hidden" value={item.opportunityId} />
          {state && !state.ok ? <p className="col-span-2 rounded-lg bg-[var(--tomato-3)] p-3 text-sm text-[var(--tomato-11)]" role="alert">{state.message}</p> : null}
          <label className="text-sm font-medium">Funil de destino <span className="text-[var(--tomato-11)]">*</span><select className={selectClassName} name="pipelineId" onChange={(event) => changePipeline(event.target.value)} value={pipelineId}>{pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}</select><FieldError>{state?.fieldErrors?.pipelineId}</FieldError></label>
          <label className="text-sm font-medium">Etapa de destino <span className="text-[var(--tomato-11)]">*</span><select className={selectClassName} name="stageId" onChange={(event) => setStageId(event.target.value)} value={stageId}>{selectedPipeline?.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select><FieldError>{state?.fieldErrors?.stageId}</FieldError></label>
          <label className="col-span-2 text-sm font-medium">Responsável <span className="text-[var(--tomato-11)]">*</span><select className={selectClassName} defaultValue={defaultResponsible} name="responsibleId">{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select><FieldError>{state?.fieldErrors?.responsibleId}</FieldError></label>
          {lacksSalesQualification ? <p className="col-span-2 rounded-lg bg-[var(--amber-3)] p-3 text-sm text-[var(--amber-11)]">Esta negociação possui {item.qualificationAnswerCount} resposta(s) ativa(s) de qualificação. Para entrar em Venda são necessárias pelo menos duas; restaure primeiro em Pré-venda · Qualificação.</p> : null}
          {needsSchedule ? <><label className="text-sm font-medium">Data da atividade <span className="text-[var(--tomato-11)]">*</span><Input className="mt-1" name="taskDueDate" required type="date" /><FieldError>{state?.fieldErrors?.taskDueDate}</FieldError></label><label className="text-sm font-medium">Horário <span className="text-[var(--tomato-11)]">*</span><Input className="mt-1" name="taskDueTime" required type="time" /><FieldError>{state?.fieldErrors?.taskDueTime}</FieldError></label><label className="col-span-2 text-sm font-medium">Objetivo da atividade<Textarea className="mt-1 min-h-20" maxLength={4000} name="taskNote" /></label></> : null}
          <DialogFooter className="col-span-2"><DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose><Button disabled={pending || lacksSalesQualification} type="submit">{pending ? "Processando..." : actionLabel}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Checklist({ children, label }: { children: ReactNode; label: string }) {
  return <fieldset><legend className="mb-2 text-sm font-semibold">{label}</legend><div className="grid max-h-36 gap-1 overflow-y-auto rounded-lg border border-[var(--gray-6)] p-2">{children}</div></fieldset>;
}

function CheckboxOption({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--gray-3)]"><input checked={checked} onChange={onChange} type="checkbox" />{label}</label>;
}

function FilterPanel({ companies, contacts, defaultPeriod, filters, lossReasons, onClose, products, profiles }: {
  companies: HistoryOption[];
  contacts: HistoryOption[];
  defaultPeriod: OpportunityHistoryProps["defaultPeriod"];
  filters: HistoryFilters;
  lossReasons: HistoryOption[];
  onClose: () => void;
  products: HistoryOption[];
  profiles: OpportunityHistoryProps["profiles"];
}) {
  const router = useRouter();
  const [values, setValues] = useState(filters);
  function toggle<K extends "results" | "responsibleIds" | "companyIds" | "contactIds" | "productIds" | "reasonIds">(key: K, value: HistoryFilters[K][number]) {
    setValues((current) => ({ ...current, [key]: current[key].includes(value as never) ? current[key].filter((item) => item !== value) : [...current[key], value] }));
  }
  function apply(event: FormEvent) {
    event.preventDefault();
    onClose();
    router.push(buildHref(filters, { ...values, page: 1 }));
  }
  function clear() {
    setValues((current) => ({ ...current, closedFrom: defaultPeriod.from, closedTo: defaultPeriod.to, results: [], responsibleIds: [], companyIds: [], contactIds: [], productIds: [], reasonIds: [] }));
  }
  return (
    <div className="fixed inset-0 z-40 bg-[var(--fixed-dark)]/15" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside aria-label="Filtros do Histórico" className="absolute top-0 right-0 flex h-full w-[440px] max-w-[42vw] flex-col border-l border-[var(--gray-6)] bg-[var(--gray-1)] shadow-xl">
        <header className="flex items-center justify-between border-b border-[var(--gray-6)] p-5"><div><h2 className="text-lg font-semibold">Filtros</h2><p className="mt-1 text-xs text-[var(--gray-11)]">Combine critérios para refinar o Histórico.</p></div><Button aria-label="Fechar filtros" onClick={onClose} size="icon-sm" variant="ghost"><XMarkIcon /></Button></header>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={apply}>
          <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5">
            <div><p className="mb-2 text-sm font-semibold">Período de encerramento</p><div className="grid grid-cols-2 gap-3"><label className="text-xs text-[var(--gray-11)]">De<Input className="mt-1" onChange={(event) => setValues((current) => ({ ...current, closedFrom: event.target.value }))} type="date" value={values.closedFrom} /></label><label className="text-xs text-[var(--gray-11)]">Até<Input className="mt-1" onChange={(event) => setValues((current) => ({ ...current, closedTo: event.target.value }))} type="date" value={values.closedTo} /></label></div></div>
            <Checklist label="Resultado">{(Object.entries(resultLabels) as Array<[HistoryResult, string]>).map(([value, label]) => <CheckboxOption checked={values.results.includes(value)} key={value} label={label} onChange={() => toggle("results", value)} />)}</Checklist>
            <Checklist label="Responsável">{profiles.map((option) => <CheckboxOption checked={values.responsibleIds.includes(option.id)} key={option.id} label={option.name} onChange={() => toggle("responsibleIds", option.id)} />)}</Checklist>
            <Checklist label="Empresa">{companies.map((option) => <CheckboxOption checked={values.companyIds.includes(option.id)} key={option.id} label={option.name} onChange={() => toggle("companyIds", option.id)} />)}</Checklist>
            <Checklist label="Contato">{contacts.map((option) => <CheckboxOption checked={values.contactIds.includes(option.id)} key={option.id} label={option.name} onChange={() => toggle("contactIds", option.id)} />)}</Checklist>
            <Checklist label="Produto ou serviço">{products.map((option) => <CheckboxOption checked={values.productIds.includes(option.id)} key={option.id} label={option.name} onChange={() => toggle("productIds", option.id)} />)}</Checklist>
            <Checklist label="Motivo da perda">{lossReasons.map((option) => <CheckboxOption checked={values.reasonIds.includes(option.id)} key={option.id} label={option.name} onChange={() => toggle("reasonIds", option.id)} />)}</Checklist>
          </div>
          <footer className="flex justify-end gap-2 border-t border-[var(--gray-6)] p-4"><Button onClick={clear} type="button" variant="ghost">Limpar</Button><Button onClick={onClose} type="button" variant="outline">Cancelar</Button><Button type="submit">Aplicar</Button></footer>
        </form>
      </aside>
    </div>
  );
}

export function OpportunityHistory({ actor, companies, contacts, defaultPeriod, error, filters, items, lossReasons, pipelines, products, profiles, total }: OpportunityHistoryProps) {
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [restoring, setRestoring] = useState<HistoryItem | null>(null);
  const [query, setQuery] = useState(filters.query);
  const [closedFrom, setClosedFrom] = useState(filters.closedFrom);
  const [closedTo, setClosedTo] = useState(filters.closedTo);
  const pages = Math.max(1, Math.ceil(total / filters.pageSize));
  const first = total ? (filters.page - 1) * filters.pageSize + 1 : 0;
  const last = Math.min(filters.page * filters.pageSize, total);
  const activeFilterCount = filters.results.length + filters.responsibleIds.length + filters.companyIds.length + filters.contactIds.length + filters.productIds.length + filters.reasonIds.length;
  const isDefaultMonth = filters.closedFrom === defaultPeriod.from && filters.closedTo === defaultPeriod.to;

  function applyQuickFilters(event: FormEvent) {
    event.preventDefault();
    if (closedFrom > closedTo) return;
    router.push(buildHref(filters, { query: query.trim(), closedFrom, closedTo, page: 1 }));
  }

  function clearCriteria() {
    router.push(buildHref(filters, { query: "", closedFrom: defaultPeriod.from, closedTo: defaultPeriod.to, results: [], responsibleIds: [], companyIds: [], contactIds: [], productIds: [], reasonIds: [], page: 1 }));
  }

  const periodLabel = useMemo(() => isDefaultMonth ? `Período: ${formatMonth(filters.closedFrom)}` : `${formatDate(`${filters.closedFrom}T12:00:00-03:00`)} – ${formatDate(`${filters.closedTo}T12:00:00-03:00`)}`, [filters.closedFrom, filters.closedTo, isDefaultMonth]);

  return (
    <main className="mx-auto w-full max-w-[1440px] p-5">
      <header className="mb-4"><h1 className="text-xl font-semibold leading-8">Histórico</h1><p className="text-sm text-[var(--gray-11)]">Consulte negociações ganhas, perdidas, desqualificadas e arquivadas.</p></header>
      {error ? <p className="mb-4 rounded-lg bg-[var(--tomato-3)] p-3 text-sm text-[var(--tomato-11)]" role="alert">{error}</p> : null}
      <section className="overflow-hidden rounded-lg bg-[var(--gray-1)]">
        <form className="flex items-start justify-between gap-4 p-5" onSubmit={applyQuickFilters}>
          <div><div className="relative w-[310px]"><MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--gray-10)]" /><Input className="pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Busque por uma oportunidade" value={query} /></div><span className="mt-2 inline-flex rounded-md bg-[var(--gray-3)] px-2 py-1 text-[10px] text-[var(--gray-11)]">{periodLabel}</span></div>
          <div className="flex items-center gap-2"><label className="flex h-8 items-center gap-2 rounded-lg border border-[var(--gray-6)] px-2.5 text-xs"><CalendarDaysIcon className="size-4" /><Input aria-label="Início do período" className="h-6 w-[112px] border-0 p-0 shadow-none focus-visible:ring-0" onChange={(event) => setClosedFrom(event.target.value)} type="date" value={closedFrom} /><span>–</span><Input aria-label="Fim do período" className="h-6 w-[112px] border-0 p-0 shadow-none focus-visible:ring-0" onChange={(event) => setClosedTo(event.target.value)} type="date" value={closedTo} /></label><Button type="submit" variant="outline">Aplicar</Button><Button onClick={() => setFiltersOpen(true)} type="button" variant="outline"><FunnelIcon />{activeFilterCount ? `Filtrando (${activeFilterCount})` : "Filtros"}</Button></div>
        </form>
        {closedFrom > closedTo ? <p className="mx-5 mb-3 rounded-lg bg-[var(--tomato-3)] p-2 text-xs text-[var(--tomato-11)]">A data inicial não pode ser posterior à data final.</p> : null}
        {items.length ? (
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Oportunidade</TableHead><TableHead className="w-[140px]">Resultado</TableHead><TableHead className="w-[140px]">Valor</TableHead><TableHead className="w-[210px]">Responsável</TableHead><TableHead className="w-[140px]">Encerramento</TableHead><TableHead className="w-[220px]">Motivo</TableHead><TableHead className="w-12"><span className="sr-only">Ações</span></TableHead></TableRow></TableHeader>
            <TableBody>{items.map((item) => <TableRow className="cursor-pointer" key={item.id} onClick={() => router.push(`/oportunidades/${item.opportunityId}`)}><TableCell className="font-medium">{item.opportunityName}</TableCell><TableCell><span className={`rounded-full px-2 py-1 text-xs ${resultClasses[item.result]}`}>{resultLabels[item.result]}</span></TableCell><TableCell>{formatCurrency(item.finalValue)}</TableCell><TableCell><span className="flex items-center gap-2"><span className="inline-grid size-7 place-items-center rounded-full bg-[var(--indigo-3)] text-[10px] font-semibold text-[var(--indigo-11)]">{initials(item.responsibleName)}</span><span className="truncate">{item.responsibleName}</span></span></TableCell><TableCell>{formatDate(item.closedAt)}</TableCell><TableCell className="max-w-[220px] truncate">{item.reason ?? "—"}</TableCell><TableCell onClick={(event) => event.stopPropagation()}><DropdownMenu><DropdownMenuTrigger render={<Button aria-label={`Ações de ${item.opportunityName}`} size="icon-sm" variant="ghost" />}><EllipsisVerticalIcon /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem render={<Link href={`/oportunidades/${item.opportunityId}`} />}>Visualizar</DropdownMenuItem>{item.result === "won" ? <DropdownMenuItem render={<Link href={`/oportunidades/${item.opportunityId}`} />}>Ver pós-venda</DropdownMenuItem> : null}{item.result !== "won" || actor.role === "admin" ? <DropdownMenuItem onClick={() => setRestoring(item)}><ArrowPathIcon />{actor.role === "admin" ? "Reabrir negociação" : "Restaurar"}</DropdownMenuItem> : null}</DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}</TableBody>
          </Table>
        ) : <div className="flex min-h-60 flex-col items-center justify-center gap-3 p-10 text-center"><CalendarDaysIcon className="size-9 text-[var(--gray-9)]" /><div><p className="text-sm font-medium">{filters.query || activeFilterCount ? "Nenhuma negociação encontrada para os critérios informados." : "Nenhuma negociação no histórico."}</p><p className="mt-1 text-sm text-[var(--gray-11)]">Altere o período ou revise os filtros aplicados.</p></div>{filters.query || activeFilterCount || !isDefaultMonth ? <Button onClick={clearCriteria} variant="outline">Limpar busca e filtros</Button> : null}</div>}
        <footer className="flex min-h-14 items-center justify-between gap-4 border-t border-[var(--gray-6)] px-5 py-2"><p className="text-sm text-[var(--gray-11)]">Mostrando {first}–{last} de {total} oportunidades</p><div className="flex items-center gap-3"><select aria-label="Registros por página" className="h-8 rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)] px-2 text-xs" onChange={(event) => router.push(buildHref(filters, { pageSize: Number(event.target.value), page: 1 }))} value={filters.pageSize}><option value={10}>10 por página</option><option value={20}>20 por página</option><option value={50}>50 por página</option></select><span className="text-sm text-[var(--gray-11)]">Página {filters.page} de {pages}</span><Button disabled={filters.page <= 1} onClick={() => router.push(buildHref(filters, { page: filters.page - 1 }))} size="sm" variant="outline">Anterior</Button><Button disabled={filters.page >= pages} onClick={() => router.push(buildHref(filters, { page: filters.page + 1 }))} size="sm" variant="outline">Próxima</Button></div></footer>
      </section>
      {filtersOpen ? <FilterPanel companies={companies} contacts={contacts} defaultPeriod={defaultPeriod} filters={filters} lossReasons={lossReasons} onClose={() => setFiltersOpen(false)} products={products} profiles={profiles} /> : null}
      {restoring ? <RestoreDialog actor={actor} item={restoring} key={restoring.id} onClose={() => setRestoring(null)} pipelines={pipelines} profiles={profiles} /> : null}
    </main>
  );
}
