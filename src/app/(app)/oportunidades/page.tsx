import { redirect } from "next/navigation";

import {
  OpportunitiesPipeline,
  type CompanyOption,
  type ContactOption,
  type OpportunityCardItem,
  type OpportunityPipeline,
  type ProductOption,
  type ProfileOption,
  type SimpleOption,
} from "@/components/opportunities/opportunities-pipeline";
import { createClient } from "@/lib/supabase/server";

type OpportunitiesPageProps = {
  searchParams: Promise<{ pipeline?: string; query?: string }>;
};

type AppRole = "admin" | "pre_sales" | "commercial";
type PipelineCode = "pre_sales" | "sales" | "post_sales";

const pipelineCodes = new Set<PipelineCode>(["pre_sales", "sales", "post_sales"]);

function canAccessPipeline(role: AppRole, pipeline: PipelineCode) {
  return role === "admin" || pipeline !== "post_sales" || role === "commercial";
}

export default async function OpportunitiesPage({ searchParams }: OpportunitiesPageProps) {
  const params = await searchParams;
  const query = (params.query ?? "").trim().slice(0, 100);
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login?reason=expired");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, access_status")
    .eq("id", userId)
    .maybeSingle<{ name: string; role: AppRole | null; access_status: string }>();
  if (!profile || profile.access_status !== "active" || !profile.role) redirect("/login?reason=invalid-profile");

  const requestedPipeline = pipelineCodes.has(params.pipeline as PipelineCode) ? (params.pipeline as PipelineCode) : "pre_sales";
  const selectedPipelineCode = canAccessPipeline(profile.role, requestedPipeline) ? requestedPipeline : "pre_sales";

  const [pipelinesResult, companiesResult, contactsResult, sourcesResult, productsResult, qualificationResult, lossReasonsResult, profilesResult, preferencesResult] = await Promise.all([
    supabase.from("pipelines").select("id, code, name, sort_order, stages:pipeline_stages(id, pipeline_id, code, name, sort_order, is_terminal_action)").order("sort_order"),
    supabase.from("companies").select("id, name").eq("is_active", true).order("name"),
    supabase.from("contacts").select("id, name").eq("is_active", true).order("name"),
    supabase.from("opportunity_sources").select("id, name").eq("is_active", true).order("sort_order").order("name"),
    supabase.from("products").select("id, name, base_price, category:product_categories(name)").eq("is_active", true).not("base_price", "is", null).order("name"),
    supabase.from("qualification_parameters").select("id, name").eq("is_active", true).order("sort_order").order("name"),
    supabase.from("loss_reasons").select("id, name").eq("is_active", true).order("sort_order").order("name"),
    supabase.rpc("list_assignable_profiles"),
    supabase.from("user_stage_preferences").select("stage_id").eq("user_id", userId).eq("is_hidden", true),
  ]);

  const pipelines = ((pipelinesResult.data ?? []) as unknown as OpportunityPipeline[])
    .filter((pipeline) => canAccessPipeline(profile.role!, pipeline.code))
    .map((pipeline) => ({ ...pipeline, stages: [...pipeline.stages].sort((a, b) => a.sort_order - b.sort_order) }));
  const selectedPipeline = pipelines.find((pipeline) => pipeline.code === selectedPipelineCode) ?? pipelines[0];
  if (!selectedPipeline) return <main className="p-5">Nenhum funil disponível.</main>;

  let opportunitiesQuery = supabase
    .from("opportunities")
    .select("id, name, responsible_id, company_id, contact_id, current_stage_id, value_mode, final_value, created_at, company:companies(name), contact:contacts(name)")
    .eq("current_pipeline_id", selectedPipeline.id)
    .order("updated_at", { ascending: false })
    .limit(500);
  opportunitiesQuery = selectedPipeline.code === "post_sales"
    ? opportunitiesQuery.eq("commercial_status", "won").eq("post_sale_status", "active")
    : opportunitiesQuery.eq("commercial_status", "active");
  if (query) {
    const safeQuery = query.replace(/[,()*%_"]/g, " ").trim();
    if (safeQuery) opportunitiesQuery = opportunitiesQuery.ilike("name", `%${safeQuery}%`);
  }
  const opportunitiesResult = await opportunitiesQuery;

  const opportunityIds = (opportunitiesResult.data ?? []).map((opportunity) => opportunity.id);
  const [linkedProductsResult, qualificationAnswersResult] = opportunityIds.length
    ? await Promise.all([
        supabase
          .from("opportunity_products")
          .select("opportunity_id, product_id, product_name, quantity, unit_price")
          .in("opportunity_id", opportunityIds),
        supabase
          .from("opportunity_qualification_answers")
          .select("opportunity_id, parameter_id, answer")
          .in("opportunity_id", opportunityIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  const assignableProfiles = (profilesResult.data ?? []) as ProfileOption[];
  const opportunities = (opportunitiesResult.data ?? []).map((item) => {
    const company = item.company as unknown as { name: string } | null;
    const contact = item.contact as unknown as { name: string } | null;
    return {
      id: item.id,
      name: item.name,
      current_stage_id: item.current_stage_id,
      company_id: item.company_id,
      contact_id: item.contact_id,
      responsible_id: item.responsible_id,
      value_mode: item.value_mode as "calculated" | "manual",
      final_value: item.final_value,
      created_at: item.created_at,
      company_name: company?.name ?? null,
      contact_name: contact?.name ?? null,
      responsible_name: assignableProfiles.find((responsible) => responsible.id === item.responsible_id)?.name ?? "Responsável indisponível",
      products: (linkedProductsResult.data ?? [])
        .filter((product) => product.opportunity_id === item.id)
        .map((product) => ({
          product_id: product.product_id,
          name: product.product_name,
          quantity: product.quantity,
          unit_price: product.unit_price,
        })),
      qualification_answers: (qualificationAnswersResult.data ?? [])
        .filter((answer) => answer.opportunity_id === item.id)
        .map((answer) => ({ parameter_id: answer.parameter_id, answer: answer.answer })),
    } satisfies OpportunityCardItem;
  });

  const loadError = [
    pipelinesResult.error,
    companiesResult.error,
    contactsResult.error,
    sourcesResult.error,
    productsResult.error,
    qualificationResult.error,
    lossReasonsResult.error,
    profilesResult.error,
    preferencesResult.error,
    opportunitiesResult.error,
    linkedProductsResult.error,
    qualificationAnswersResult.error,
  ].some(Boolean);

  return (
    <OpportunitiesPipeline
      actor={{ id: userId, name: profile.name, role: profile.role }}
      companies={(companiesResult.data ?? []) as CompanyOption[]}
      contacts={(contactsResult.data ?? []) as ContactOption[]}
      error={loadError ? "Alguns dados da Pipeline não puderam ser carregados." : undefined}
      hiddenStageIds={(preferencesResult.data ?? []).map((preference) => preference.stage_id)}
      lossReasons={(lossReasonsResult.data ?? []) as SimpleOption[]}
      opportunities={opportunities}
      pipelines={pipelines}
      products={(productsResult.data ?? []) as unknown as ProductOption[]}
      profiles={assignableProfiles}
      qualificationParameters={(qualificationResult.data ?? []) as SimpleOption[]}
      query={query}
      selectedPipelineCode={selectedPipeline.code}
      sources={(sourcesResult.data ?? []) as SimpleOption[]}
    />
  );
}
