import { redirect } from "next/navigation";

import {
  OpportunityHistory,
  type HistoryFilters,
  type HistoryItem,
  type HistoryOption,
  type HistoryPipeline,
  type HistoryResult,
} from "@/components/opportunities/opportunity-history";
import { createClient } from "@/lib/supabase/server";

type AppRole = "admin" | "pre_sales" | "commercial";
type HistoryPageProps = {
  searchParams: Promise<{
    companies?: string;
    contacts?: string;
    from?: string;
    page?: string;
    products?: string;
    query?: string;
    reasons?: string;
    responsibles?: string;
    results?: string;
    size?: string;
    to?: string;
  }>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const validResults = new Set<HistoryResult>(["won", "lost", "disqualified", "archived"]);
const pageSizes = new Set([10, 20, 50]);
const allowedStageCodes = new Set(["lead", "first_contact", "qualification", "diagnosis", "proposal_in_progress", "proposal_sent", "negotiation"]);

function currentMonthPeriod() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  const lastDay = new Date(Date.UTC(Number(parts.year), Number(parts.month), 0)).getUTCDate();
  return { from: `${parts.year}-${parts.month}-01`, to: `${parts.year}-${parts.month}-${String(lastDay).padStart(2, "0")}` };
}

function parseUuidList(value?: string) {
  return [...new Set((value ?? "").split(",").filter((item) => uuidPattern.test(item)))].slice(0, 100);
}

function parseResults(value?: string) {
  return [...new Set((value ?? "").split(",").filter((item): item is HistoryResult => validResults.has(item as HistoryResult)))];
}

function relation<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const defaultPeriod = currentMonthPeriod();
  const requestedFrom = datePattern.test(params.from ?? "") ? params.from! : defaultPeriod.from;
  const requestedTo = datePattern.test(params.to ?? "") ? params.to! : defaultPeriod.to;
  const closedFrom = requestedFrom <= requestedTo ? requestedFrom : defaultPeriod.from;
  const closedTo = requestedFrom <= requestedTo ? requestedTo : defaultPeriod.to;
  const query = (params.query ?? "").trim().slice(0, 100);
  const results = parseResults(params.results);
  const responsibleIds = parseUuidList(params.responsibles);
  const companyIds = parseUuidList(params.companies);
  const contactIds = parseUuidList(params.contacts);
  const productIds = parseUuidList(params.products);
  const reasonIds = parseUuidList(params.reasons);
  const requestedPage = Number(params.page ?? 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedSize = Number(params.size ?? 10);
  const pageSize = pageSizes.has(requestedSize) ? requestedSize : 10;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login?reason=expired");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, access_status")
    .eq("id", userId)
    .maybeSingle<{ role: AppRole | null; access_status: string }>();
  if (!profile || profile.access_status !== "active" || !profile.role) redirect("/login?reason=invalid-profile");

  const [profilesResult, pipelinesResult, companiesResult, contactsResult, productsResult, lossReasonsResult, activeParametersResult] = await Promise.all([
    supabase.rpc("list_assignable_profiles"),
    supabase.from("pipelines").select("id, code, name, sort_order, stages:pipeline_stages(id, code, name, sort_order)").in("code", ["pre_sales", "sales"]).order("sort_order"),
    supabase.from("companies").select("id, name").order("name"),
    supabase.from("contacts").select("id, name").order("name"),
    supabase.from("products").select("id, name").order("name"),
    supabase.from("loss_reasons").select("id, name").order("sort_order").order("name"),
    supabase.from("qualification_parameters").select("id").eq("is_active", true),
  ]);

  const needsOpportunityScope = Boolean(query || companyIds.length || contactIds.length || productIds.length);
  let scopedOpportunityIds: string[] | null = null;
  let scopeError = null as { message: string } | null;

  if (needsOpportunityScope) {
    let productOpportunityIds: string[] | null = null;
    if (productIds.length) {
      const productLinksResult = await supabase.from("opportunity_products").select("opportunity_id").in("product_id", productIds).limit(5000);
      scopeError = productLinksResult.error;
      productOpportunityIds = [...new Set((productLinksResult.data ?? []).map((item) => item.opportunity_id))];
    }

    if (!productIds.length || productOpportunityIds?.length) {
      let opportunitiesQuery = supabase.from("opportunities").select("id").limit(5000);
      if (query) {
        const safeQuery = query.replace(/[,()*%_"]/g, " ").trim();
        if (safeQuery) opportunitiesQuery = opportunitiesQuery.ilike("name", `%${safeQuery}%`);
      }
      if (companyIds.length) opportunitiesQuery = opportunitiesQuery.in("company_id", companyIds);
      if (contactIds.length) opportunitiesQuery = opportunitiesQuery.in("contact_id", contactIds);
      if (productOpportunityIds?.length) opportunitiesQuery = opportunitiesQuery.in("id", productOpportunityIds);
      const opportunitiesResult = await opportunitiesQuery;
      scopeError = scopeError ?? opportunitiesResult.error;
      scopedOpportunityIds = (opportunitiesResult.data ?? []).map((item) => item.id);
    } else {
      scopedOpportunityIds = [];
    }
  }

  const from = (page - 1) * pageSize;
  const canQueryOutcomes = !needsOpportunityScope || Boolean(scopedOpportunityIds?.length);
  const outcomesResult = canQueryOutcomes
    ? await (() => {
        let outcomesQuery = supabase
          .from("opportunity_outcomes")
          .select("id, opportunity_id, result, loss_reason_id, archive_reason, notes, final_value, responsible_id, closed_at, opportunity:opportunities!inner(id, name, post_sale_status), loss_reason:loss_reasons(name)", { count: "exact" })
          .eq("is_current", true)
          .gte("closed_at", `${closedFrom}T00:00:00-03:00`)
          .lte("closed_at", `${closedTo}T23:59:59.999-03:00`)
          .order("name", { ascending: true, referencedTable: "opportunity" })
          .range(from, from + pageSize - 1);
        if (results.length) outcomesQuery = outcomesQuery.in("result", results);
        if (responsibleIds.length) outcomesQuery = outcomesQuery.in("responsible_id", responsibleIds);
        if (reasonIds.length) outcomesQuery = outcomesQuery.in("loss_reason_id", reasonIds);
        if (scopedOpportunityIds?.length) outcomesQuery = outcomesQuery.in("opportunity_id", scopedOpportunityIds);
        return outcomesQuery;
      })()
    : { data: [], error: null, count: 0 };

  const rawOutcomes = outcomesResult.data ?? [];
  const opportunityIds = rawOutcomes.map((outcome) => outcome.opportunity_id);
  const qualificationAnswersResult = opportunityIds.length
    ? await supabase.from("opportunity_qualification_answers").select("opportunity_id, parameter_id").in("opportunity_id", opportunityIds)
    : { data: [], error: null };
  const activeParameterIds = new Set((activeParametersResult.data ?? []).map((item) => item.id));
  const profileOptions = (profilesResult.data ?? []) as Array<HistoryOption & { role: AppRole }>;
  const profileNames = new Map(profileOptions.map((item) => [item.id, item.name]));

  const items = rawOutcomes.map((outcome) => {
    const opportunity = relation(outcome.opportunity as unknown as { id: string; name: string; post_sale_status: string | null } | Array<{ id: string; name: string; post_sale_status: string | null }> | null);
    const lossReason = relation(outcome.loss_reason as unknown as { name: string } | Array<{ name: string }> | null);
    return {
      id: outcome.id,
      opportunityId: outcome.opportunity_id,
      opportunityName: opportunity?.name ?? "Oportunidade indisponível",
      result: outcome.result as HistoryResult,
      finalValue: outcome.final_value,
      responsibleId: outcome.responsible_id,
      responsibleName: profileNames.get(outcome.responsible_id) ?? "Responsável indisponível",
      closedAt: outcome.closed_at,
      reason: lossReason?.name ?? outcome.archive_reason ?? outcome.notes ?? null,
      postSaleStatus: opportunity?.post_sale_status ?? null,
      qualificationAnswerCount: (qualificationAnswersResult.data ?? []).filter((answer) => answer.opportunity_id === outcome.opportunity_id && activeParameterIds.has(answer.parameter_id)).length,
    } satisfies HistoryItem;
  });

  const pipelines = ((pipelinesResult.data ?? []) as unknown as HistoryPipeline[]).map((pipeline) => ({
    ...pipeline,
    stages: pipeline.stages.filter((stage) => allowedStageCodes.has(stage.code)).sort((left, right) => left.sort_order - right.sort_order),
  }));
  const filters: HistoryFilters = { query, closedFrom, closedTo, results, responsibleIds, companyIds, contactIds, productIds, reasonIds, page, pageSize };
  const loadError = [profilesResult.error, pipelinesResult.error, companiesResult.error, contactsResult.error, productsResult.error, lossReasonsResult.error, activeParametersResult.error, outcomesResult.error, qualificationAnswersResult.error, scopeError].some(Boolean);

  return (
    <OpportunityHistory
      actor={{ id: userId, role: profile.role }}
      companies={(companiesResult.data ?? []) as HistoryOption[]}
      contacts={(contactsResult.data ?? []) as HistoryOption[]}
      defaultPeriod={defaultPeriod}
      error={loadError ? "Alguns dados do Histórico não puderam ser carregados." : undefined}
      filters={filters}
      items={items}
      key={JSON.stringify(filters)}
      lossReasons={(lossReasonsResult.data ?? []) as HistoryOption[]}
      pipelines={pipelines}
      products={(productsResult.data ?? []) as HistoryOption[]}
      profiles={profileOptions}
      total={outcomesResult.count ?? 0}
    />
  );
}
