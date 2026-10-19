import { redirect } from "next/navigation";

import { DashboardView, type DashboardFilters, type DashboardMetrics } from "@/components/dashboard/dashboard-view";
import { createClient } from "@/lib/supabase/server";

type DashboardPageProps = {
  searchParams: Promise<{
    from?: string;
    products?: string;
    responsibles?: string;
    segments?: string;
    sources?: string;
    to?: string;
  }>;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function currentMonthPeriod() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  const lastDay = new Date(Date.UTC(Number(parts.year), Number(parts.month), 0)).getUTCDate();
  return {
    from: `${parts.year}-${parts.month}-01`,
    to: `${parts.year}-${parts.month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function parseIds(value?: string) {
  return [...new Set((value ?? "").split(",").filter((item) => uuidPattern.test(item)))].slice(0, 100);
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const defaultPeriod = currentMonthPeriod();
  const requestedFrom = datePattern.test(params.from ?? "") ? params.from! : defaultPeriod.from;
  const requestedTo = datePattern.test(params.to ?? "") ? params.to! : defaultPeriod.to;
  const periodIsValid = requestedFrom <= requestedTo;
  const filters: DashboardFilters = {
    from: periodIsValid ? requestedFrom : defaultPeriod.from,
    to: periodIsValid ? requestedTo : defaultPeriod.to,
    responsibleIds: parseIds(params.responsibles),
    sourceIds: parseIds(params.sources),
    productIds: parseIds(params.products),
    segmentIds: parseIds(params.segments),
  };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/login?reason=expired");

  const { data: profile } = await supabase
    .from("profiles")
    .select("access_status")
    .eq("id", claimsData.claims.sub)
    .maybeSingle<{ access_status: string }>();
  if (profile?.access_status !== "active") redirect("/login?reason=invalid-profile");

  const { data, error } = await supabase.rpc("get_dashboard_metrics", {
    period_from: filters.from,
    period_to: filters.to,
    responsible_ids: filters.responsibleIds,
    source_ids: filters.sourceIds,
    product_ids: filters.productIds,
    segment_ids: filters.segmentIds,
  });

  return (
    <DashboardView
      defaultPeriod={defaultPeriod}
      error={error ? "Não foi possível carregar os indicadores da Dashboard." : undefined}
      filters={filters}
      key={JSON.stringify(filters)}
      metrics={(data ?? null) as DashboardMetrics | null}
    />
  );
}
