"use client";

import {
  CalendarDaysIcon,
  ChartBarSquareIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";

export type DashboardFilters = {
  from: string;
  to: string;
  responsibleIds: string[];
  sourceIds: string[];
  productIds: string[];
  segmentIds: string[];
};

type DashboardOption = { id: string; name: string };
type MetricRow = { key: string; label: string; count: number };
type DistributionRow = { id: string; name: string; amount: number };

export type DashboardMetrics = {
  period: { from: string; to: string };
  global: null | { month: string; goal: number | null; sold: number; salesCount: number };
  activePipeline: { value: number; count: number; withoutValue: number; cooling: number };
  forecast: {
    current: { month: string; value: number; count: number; withoutValue: number };
    next: { month: string; value: number; count: number; withoutValue: number };
    withoutDate: number;
    overdue: number;
  };
  preSales: { baseCount: number; scheduledCount: number; rows: MetricRow[] };
  sales: { baseCount: number; diagnosisCount: number; diagnosisWonCount: number; wonValue: number; rows: MetricRow[] };
  leadOrigins: DistributionRow[];
  leadResponsibles: DistributionRow[];
  salesCategories: DistributionRow[];
  salesProducts: DistributionRow[];
  ticket: { value: number | null; soldValue: number; salesCount: number };
  cycle: { days: number | null; salesCount: number };
  lossReasons: DistributionRow[];
  options: {
    responsibles: DashboardOption[];
    sources: DashboardOption[];
    products: DashboardOption[];
    segments: DashboardOption[];
  };
};

type DashboardViewProps = {
  defaultPeriod: { from: string; to: string };
  error?: string;
  filters: DashboardFilters;
  metrics: DashboardMetrics | null;
};

const chartConfig = {
  count: { label: "Oportunidades", color: "var(--primary-9)" },
} satisfies ChartConfig;

function formatCurrency(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value);
}

function formatMonth(value: string) {
  const normalized = value.slice(0, 7);
  const [year, month] = normalized.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 15)));
}

function percentage(value: number, base: number) {
  return base > 0 ? (value / base) * 100 : null;
}

function buildHref(filters: DashboardFilters) {
  const params = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.responsibleIds.length) params.set("responsibles", filters.responsibleIds.join(","));
  if (filters.sourceIds.length) params.set("sources", filters.sourceIds.join(","));
  if (filters.productIds.length) params.set("products", filters.productIds.join(","));
  if (filters.segmentIds.length) params.set("segments", filters.segmentIds.join(","));
  return `/?${params.toString()}`;
}

function MetricCard({ title, value, description, accent = false, hint }: {
  title: string;
  value: string;
  description: string;
  accent?: boolean;
  hint?: string;
}) {
  return (
    <Card className={accent ? "gap-3 bg-[var(--gray-1)] py-4 text-[var(--dark-fixed)] ring-[var(--gray-6)]" : "gap-3 bg-[var(--gray-1)] py-4 text-[var(--gray-12)] ring-[var(--gray-6)]"}>
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {hint ? <InformationCircleIcon aria-label={hint} className="size-4 shrink-0" title={hint} /> : null}
        </div>
        <CardDescription className={accent ? "text-xs text-[var(--fixed-dark)]/75" : "text-xs text-[var(--gray-11)]"}>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-4"><p className="text-2xl font-semibold tracking-tight">{value}</p></CardContent>
    </Card>
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="gap-4 bg-[var(--gray-1)] py-5 text-[var(--gray-12)] ring-[var(--gray-6)]">
      <CardHeader className="px-5">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription className="text-xs text-[var(--gray-11)]">{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-5">{children}</CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="grid h-[240px] place-items-center rounded-lg border border-dashed border-[var(--gray-6)] text-center text-sm text-[var(--gray-11)]">
      <div><ChartBarSquareIcon className="mx-auto mb-2 size-7" /><p>{message}</p></div>
    </div>
  );
}

function HorizontalChart({ rows, base, color = "var(--primary-9)", emptyMessage }: {
  rows: Array<{ name: string; count: number }>;
  base: number;
  color?: string;
  emptyMessage: string;
}) {
  if (!rows.length || rows.every((row) => row.count === 0)) return <EmptyChart message={emptyMessage} />;
  return (
    <ChartContainer className="h-[240px] w-full" config={chartConfig}>
      <BarChart accessibilityLayer data={rows} layout="vertical" margin={{ left: 4, right: 20 }}>
        <CartesianGrid horizontal={false} stroke="var(--gray-5)" />
        <XAxis axisLine={false} tickLine={false} type="number" allowDecimals={false} tick={{ fill: "var(--gray-11)", fontSize: 11 }} />
        <YAxis axisLine={false} dataKey="name" tickLine={false} type="category" width={145} tick={{ fill: "var(--gray-11)", fontSize: 11 }} />
        <ChartTooltip
          cursor={{ fill: "var(--gray-3)" }}
          content={<ChartTooltipContent
            className="border-[var(--gray-6)] bg-[var(--gray-1)] text-[var(--gray-12)]"
            hideLabel
            formatter={(value, _name, item) => {
              const count = Number(value);
              const share = percentage(count, base);
              return <div className="grid gap-1"><span className="font-medium">{String(item.payload.name)}</span><span>{count} oportunidade(s){share === null ? "" : ` · ${share.toFixed(1)}% da base`}</span></div>;
            }}
          />}
        />
        <Bar dataKey="count" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

function Checklist({ label, options, selected, onToggle }: {
  label: string;
  options: DashboardOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border border-[var(--gray-6)] p-2">
        {options.length ? options.map((option) => (
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--gray-3)]" key={option.id}>
            <input checked={selected.includes(option.id)} onChange={() => onToggle(option.id)} type="checkbox" />
            {option.name}
          </label>
        )) : <p className="px-2 py-1 text-sm text-[var(--gray-11)]">Nenhuma opção disponível.</p>}
      </div>
    </fieldset>
  );
}

function FiltersPanel({ filters, options, onClose }: {
  filters: DashboardFilters;
  options: DashboardMetrics["options"];
  onClose: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState(filters);
  function toggle(key: "responsibleIds" | "sourceIds" | "productIds" | "segmentIds", id: string) {
    setValues((current) => ({
      ...current,
      [key]: current[key].includes(id) ? current[key].filter((item) => item !== id) : [...current[key], id],
    }));
  }
  function apply(event: FormEvent) {
    event.preventDefault();
    onClose();
    router.push(buildHref(values));
  }
  return (
    <div className="fixed inset-0 z-40 bg-[var(--fixed-dark)]/15" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside aria-label="Filtros da Dashboard" className="absolute top-0 right-0 flex h-full w-[440px] max-w-[42vw] flex-col border-l border-[var(--gray-6)] bg-[var(--gray-1)] shadow-xl">
        <header className="flex items-center justify-between border-b border-[var(--gray-6)] p-5">
          <div><h2 className="text-lg font-semibold">Filtros</h2><p className="mt-1 text-xs text-[var(--gray-11)]">As referências temporais de cada indicador são preservadas.</p></div>
          <Button aria-label="Fechar filtros" onClick={onClose} size="icon-sm" variant="ghost"><XMarkIcon /></Button>
        </header>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={apply}>
          <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5">
            <Checklist label="Responsável" onToggle={(id) => toggle("responsibleIds", id)} options={options.responsibles} selected={values.responsibleIds} />
            <Checklist label="Origem" onToggle={(id) => toggle("sourceIds", id)} options={options.sources} selected={values.sourceIds} />
            <Checklist label="Produto ou serviço" onToggle={(id) => toggle("productIds", id)} options={options.products} selected={values.productIds} />
            <Checklist label="Segmento da empresa" onToggle={(id) => toggle("segmentIds", id)} options={options.segments} selected={values.segmentIds} />
          </div>
          <footer className="flex justify-end gap-2 border-t border-[var(--gray-6)] p-4">
            <Button onClick={() => setValues((current) => ({ ...current, responsibleIds: [], sourceIds: [], productIds: [], segmentIds: [] }))} type="button" variant="ghost">Limpar</Button>
            <Button onClick={onClose} type="button" variant="outline">Cancelar</Button>
            <Button type="submit">Aplicar</Button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

export function DashboardView({ defaultPeriod, error, filters, metrics }: DashboardViewProps) {
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const activeFilterCount = filters.responsibleIds.length + filters.sourceIds.length + filters.productIds.length + filters.segmentIds.length;

  const globalValues = useMemo(() => {
    if (!metrics?.global) return null;
    const goal = metrics.global.goal;
    const sold = metrics.global.sold;
    return {
      goal,
      sold,
      remaining: goal === null ? null : Math.max(goal - sold, 0),
      achieved: goal && goal > 0 ? (sold / goal) * 100 : null,
    };
  }, [metrics]);

  function applyPeriod(event: FormEvent) {
    event.preventDefault();
    if (from > to) return;
    router.push(buildHref({ ...filters, from, to }));
  }

  if (!metrics) {
    return (
      <main className="mx-auto w-full max-w-[1440px] p-5">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="mt-5 rounded-xl border border-[var(--tomato-6)] bg-[var(--tomato-3)] p-5 text-sm text-[var(--tomato-11)]" role="alert">
          {error ?? "Os indicadores não estão disponíveis neste momento."}
        </div>
      </main>
    );
  }

  const preConversion = percentage(metrics.preSales.scheduledCount, metrics.preSales.baseCount);
  const salesConversion = percentage(metrics.sales.diagnosisWonCount, metrics.sales.diagnosisCount);
  const lossTotal = metrics.lossReasons.reduce((total, item) => total + item.amount, 0);

  return (
    <main className="mx-auto w-full max-w-[1440px] p-5">
      <header className="mb-4 flex items-start justify-between gap-6">
        <div><h1 className="text-xl font-semibold leading-8">Dashboard</h1><p className="text-sm text-[var(--gray-11)]">Resultado, potencial comercial e evolução das oportunidades.</p></div>
        <form className="flex items-center gap-2" onSubmit={applyPeriod}>
          <label className="flex h-8 items-center gap-2 rounded-lg border border-[var(--gray-6)] bg-[var(--gray-1)] px-2.5 text-xs">
            <CalendarDaysIcon className="size-4" />
            <Input aria-label="Início do período" className="h-6 w-[112px] border-0 p-0 shadow-none focus-visible:ring-0" onChange={(event) => setFrom(event.target.value)} type="date" value={from} />
            <span>–</span>
            <Input aria-label="Fim do período" className="h-6 w-[112px] border-0 p-0 shadow-none focus-visible:ring-0" onChange={(event) => setTo(event.target.value)} type="date" value={to} />
          </label>
          <Button type="submit" variant="outline">Aplicar</Button>
          <Button onClick={() => setFiltersOpen(true)} type="button" variant="outline"><FunnelIcon />{activeFilterCount ? `Filtrando (${activeFilterCount})` : "Filtros"}</Button>
        </form>
      </header>

      {from > to ? <p className="mb-4 rounded-lg bg-[var(--tomato-3)] p-3 text-sm text-[var(--tomato-11)]">A data inicial não pode ser posterior à data final.</p> : null}
      {error ? <p className="mb-4 rounded-lg bg-[var(--tomato-3)] p-3 text-sm text-[var(--tomato-11)]" role="alert">{error}</p> : null}

      {globalValues && metrics.global ? (
        <section aria-label="Resultado global do mês" className="mb-4 grid grid-cols-3 gap-3">
          <MetricCard description={`Meta global de ${formatMonth(metrics.global.month)}`} hint="A meta é global e ignora os filtros da Dashboard." title="Meta" value={globalValues.goal === null ? "Meta não definida" : formatCurrency(globalValues.goal)} />
          <MetricCard accent description={`${metrics.global.salesCount} venda(s) no mês vigente`} hint="Soma dos ganhos vigentes do mês atual, sem duplicar o Pós-venda." title="Valor vendido" value={formatCurrency(globalValues.sold)} />
          <MetricCard description={globalValues.goal === null ? "Meta não definida" : globalValues.remaining === 0 ? "Meta atingida" : `${(100 - (globalValues.achieved ?? 0)).toFixed(1)}% para atingir a meta`} hint="O valor restante nunca fica negativo e ignora os filtros globais." title="Valor restante" value={formatCurrency(globalValues.remaining)} />
        </section>
      ) : null}

      <section aria-label="Resumo comercial" className="mb-4 grid grid-cols-4 gap-3">
        <MetricCard description={`${metrics.activePipeline.count} oportunidade(s) · ${metrics.activePipeline.withoutValue} sem valor`} hint="Situação atual das oportunidades abertas em Pré-venda e Venda." title="Valor ativo no funil" value={formatCurrency(metrics.activePipeline.value)} />
        <MetricCard description={metrics.ticket.salesCount ? `Valor médio por ${metrics.ticket.salesCount} venda(s)` : "Sem vendas no período"} title="Ticket médio" value={formatCurrency(metrics.ticket.value)} />
        <MetricCard description={metrics.cycle.salesCount ? `${metrics.cycle.salesCount} venda(s) consideradas` : "Sem vendas elegíveis no período"} hint="Exclui oportunidades cadastradas diretamente como Ganhas ou em Pós-venda." title="Ciclo médio de venda" value={metrics.cycle.days === null ? "—" : `${metrics.cycle.days.toLocaleString("pt-BR")} dias`} />
        <MetricCard description="Oportunidades abertas há três dias úteis sem contato" hint="Usa o último contato confirmado ou, na ausência, a criação." title="Oportunidades esfriando" value={String(metrics.activePipeline.cooling)} />
      </section>

      <section className="mb-4 grid grid-cols-2 gap-4">
        <ChartCard description={`Grupo criado entre ${new Date(`${filters.from}T12:00:00`).toLocaleDateString("pt-BR")} e ${new Date(`${filters.to}T12:00:00`).toLocaleDateString("pt-BR")} · Conversão geral ${preConversion === null ? "—" : `${preConversion.toFixed(1)}%`}`} title="Evolução da Pré-venda">
          <HorizontalChart base={metrics.preSales.baseCount} emptyMessage="Nenhum lead gerado no período." rows={metrics.preSales.rows.map((row) => ({ name: row.label, count: row.count }))} />
        </ChartCard>
        <ChartCard description={`Primeira entrada em Venda no período · Diagnóstico → Ganho ${salesConversion === null ? "—" : `${salesConversion.toFixed(1)}%`}`} title="Evolução de Venda">
          <HorizontalChart base={metrics.sales.baseCount} color="var(--indigo-9)" emptyMessage="Nenhuma oportunidade entrou em Venda no período." rows={metrics.sales.rows.map((row) => ({ name: row.label, count: row.count }))} />
        </ChartCard>
      </section>

      <section className="mb-4 grid grid-cols-2 gap-4">
        <ChartCard description="Origem registrada na geração dos leads do período" title="Leads por origem"><HorizontalChart base={metrics.preSales.baseCount} color="var(--amber-9)" emptyMessage="Nenhum lead para distribuir por origem." rows={metrics.leadOrigins.map((item) => ({ name: item.name, count: item.amount }))} /></ChartCard>
        <ChartCard description="Responsável na entrada inicial da Pré-venda" title="Leads por responsável"><HorizontalChart base={metrics.preSales.baseCount} color="var(--indigo-9)" emptyMessage="Nenhum lead para distribuir por responsável." rows={metrics.leadResponsibles.map((item) => ({ name: item.name, count: item.amount }))} /></ChartCard>
      </section>

      <section className="mb-4 grid grid-cols-2 gap-4">
        <ChartCard description="Quantidade de vendas que incluem cada categoria; uma venda pode aparecer em mais de um grupo" title="Vendas por categoria"><HorizontalChart base={metrics.ticket.salesCount} color="var(--grass-9)" emptyMessage="Nenhuma venda por categoria no período." rows={metrics.salesCategories.map((item) => ({ name: item.name, count: item.amount }))} /></ChartCard>
        <ChartCard description="Quantidade de vendas que incluem cada produto ou serviço" title="Vendas por produto"><HorizontalChart base={metrics.ticket.salesCount} color="var(--plum-9)" emptyMessage="Nenhuma venda por produto no período." rows={metrics.salesProducts.map((item) => ({ name: item.name, count: item.amount }))} /></ChartCard>
      </section>

      <section className="mb-4 grid grid-cols-4 gap-3">
        <MetricCard description={`${metrics.forecast.current.count} oportunidade(s) · ${metrics.forecast.current.withoutValue} sem valor`} hint="Considera previsões ainda válidas no mês, sem aplicar probabilidade." title={`Previsão · ${formatMonth(metrics.forecast.current.month)}`} value={formatCurrency(metrics.forecast.current.value)} />
        <MetricCard description={`${metrics.forecast.next.count} oportunidade(s) · ${metrics.forecast.next.withoutValue} sem valor`} hint="Ignora o período global e usa a data prevista de fechamento." title={`Previsão · ${formatMonth(metrics.forecast.next.month)}`} value={formatCurrency(metrics.forecast.next.value)} />
        <MetricCard description="Oportunidades abertas sem data prevista" title="Sem previsão" value={String(metrics.forecast.withoutDate)} />
        <MetricCard description="Previsões anteriores à data atual" title="Previsão vencida" value={String(metrics.forecast.overdue)} />
      </section>

      <ChartCard description={`${lossTotal} perda(s) vigente(s) no período selecionado`} title="Motivos de perda">
        <HorizontalChart base={lossTotal} color="var(--tomato-9)" emptyMessage="Nenhuma oportunidade perdida no período." rows={metrics.lossReasons.map((item) => ({ name: item.name, count: item.amount }))} />
      </ChartCard>

      {metrics.activePipeline.cooling > 0 ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--amber-3)] px-4 py-3 text-sm text-[var(--amber-11)]"><ExclamationTriangleIcon className="size-5" />Há {metrics.activePipeline.cooling} oportunidade(s) atualmente esfriando.</div>
      ) : null}

      {filtersOpen ? <FiltersPanel filters={filters} onClose={() => setFiltersOpen(false)} options={metrics.options} /> : null}
      {activeFilterCount || filters.from !== defaultPeriod.from || filters.to !== defaultPeriod.to ? (
        <div className="mt-4 flex justify-end"><Button onClick={() => router.push(buildHref({ ...filters, ...defaultPeriod, responsibleIds: [], sourceIds: [], productIds: [], segmentIds: [] }))} variant="ghost">Restaurar período e filtros</Button></div>
      ) : null}
    </main>
  );
}
