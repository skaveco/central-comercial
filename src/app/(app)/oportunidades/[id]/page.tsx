import { notFound, redirect } from "next/navigation";

import {
  OpportunityDetails,
  type OpportunityActivityItem,
  type OpportunityAttachmentItem,
  type OpportunityNoteItem,
  type OpportunityTaskItem,
} from "@/components/opportunities/opportunity-details";
import type {
  CompanyOption,
  ContactOption,
  OpportunityCardItem,
  OpportunityPipeline,
  ProductOption,
  ProfileOption,
  SimpleOption,
} from "@/components/opportunities/opportunities-pipeline";
import { mapRelatedTask, relatedTaskSelect, type RelatedTaskRecord } from "@/lib/tasks/related-task-record";
import { createClient } from "@/lib/supabase/server";

type OpportunityDetailsPageProps = {
  params: Promise<{ id: string }>;
};

type AppRole = "admin" | "pre_sales" | "commercial";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function OpportunityDetailsPage({ params }: OpportunityDetailsPageProps) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();

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

  const [
    opportunityResult,
    pipelinesResult,
    linkedProductsResult,
    qualificationAnswersResult,
    qualificationParametersResult,
    tasksResult,
    attachmentsResult,
    notesResult,
    activitiesResult,
    profilesResult,
    companiesResult,
    contactsResult,
    sourcesResult,
    catalogProductsResult,
    lossReasonsResult,
  ] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id, name, company_id, contact_id, source_id, responsible_id, current_pipeline_id, current_stage_id, commercial_status, post_sale_status, temperature, description, expected_close_date, value_mode, final_value, last_contact_at, created_at, company:companies(name), contact:contacts(name), source:opportunity_sources(name)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("pipelines")
      .select("id, code, name, sort_order, stages:pipeline_stages(id, pipeline_id, code, name, sort_order, is_terminal_action)")
      .order("sort_order"),
    supabase
      .from("opportunity_products")
      .select("product_id, product_name, quantity, unit_price")
      .eq("opportunity_id", id)
      .order("created_at"),
    supabase
      .from("opportunity_qualification_answers")
      .select("parameter_id, parameter_name, answer")
      .eq("opportunity_id", id),
    supabase
      .from("qualification_parameters")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    supabase
      .from("tasks")
      .select(relatedTaskSelect)
      .eq("opportunity_id", id)
      .is("deleted_at", null)
      .order("due_date", { ascending: false })
      .limit(20),
    supabase
      .from("attachments")
      .select("id, original_name, mime_type, size_bytes, uploaded_at")
      .eq("opportunity_id", id)
      .is("removed_at", null)
      .order("uploaded_at", { ascending: false })
      .limit(20),
    supabase
      .from("opportunity_notes")
      .select("id, body, created_by, created_at")
      .eq("opportunity_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("activity_events")
      .select("id, summary, event_type, actor_id, occurred_at")
      .eq("opportunity_id", id)
      .order("occurred_at", { ascending: false })
      .limit(50),
    supabase.rpc("list_assignable_profiles"),
    supabase.from("companies").select("id, name").eq("is_active", true).order("name"),
    supabase.from("contacts").select("id, name").eq("is_active", true).order("name"),
    supabase.from("opportunity_sources").select("id, name").eq("is_active", true).order("sort_order").order("name"),
    supabase
      .from("products")
      .select("id, name, base_price, category:product_categories(name)")
      .eq("is_active", true)
      .not("base_price", "is", null)
      .order("name"),
    supabase.from("loss_reasons").select("id, name").eq("is_active", true).order("sort_order").order("name"),
  ]);

  const rawOpportunity = opportunityResult.data;
  if (!rawOpportunity || opportunityResult.error) notFound();

  const profiles = (profilesResult.data ?? []) as ProfileOption[];
  const profileNames = new Map(profiles.map((item) => [item.id, item.name]));
  const pipelines = ((pipelinesResult.data ?? []) as unknown as OpportunityPipeline[]).map((pipeline) => ({
    ...pipeline,
    stages: [...pipeline.stages].sort((left, right) => left.sort_order - right.sort_order),
  }));
  const currentPipeline = pipelines.find((pipeline) => pipeline.id === rawOpportunity.current_pipeline_id) ?? null;
  const company = rawOpportunity.company as unknown as { name: string } | null;
  const contact = rawOpportunity.contact as unknown as { name: string } | null;
  const source = rawOpportunity.source as unknown as { name: string } | null;
  const linkedProducts = (linkedProductsResult.data ?? []).map((product) => ({
    product_id: product.product_id,
    name: product.product_name,
    quantity: product.quantity,
    unit_price: product.unit_price,
  }));

  const opportunity = {
    id: rawOpportunity.id,
    name: rawOpportunity.name,
    company_id: rawOpportunity.company_id,
    contact_id: rawOpportunity.contact_id,
    source_id: rawOpportunity.source_id,
    responsible_id: rawOpportunity.responsible_id,
    current_pipeline_id: rawOpportunity.current_pipeline_id,
    current_stage_id: rawOpportunity.current_stage_id,
    commercial_status: rawOpportunity.commercial_status,
    post_sale_status: rawOpportunity.post_sale_status,
    temperature: rawOpportunity.temperature,
    description: rawOpportunity.description,
    expected_close_date: rawOpportunity.expected_close_date,
    value_mode: rawOpportunity.value_mode as "calculated" | "manual",
    final_value: rawOpportunity.final_value,
    last_contact_at: rawOpportunity.last_contact_at,
    created_at: rawOpportunity.created_at,
    company_name: company?.name ?? null,
    contact_name: contact?.name ?? null,
    source_name: source?.name ?? null,
    responsible_name: profileNames.get(rawOpportunity.responsible_id) ?? "Responsável indisponível",
    products: linkedProducts,
    qualification_answers: (qualificationAnswersResult.data ?? []).map((answer) => ({
      parameter_id: answer.parameter_id,
      answer: answer.answer,
    })),
  } satisfies OpportunityCardItem & {
    commercial_status: string;
    current_pipeline_id: string | null;
    description: string | null;
    expected_close_date: string | null;
    last_contact_at: string | null;
    post_sale_status: string | null;
    source_name: string | null;
    source_id: string | null;
    temperature: "cold" | "warm" | "hot" | null;
  };

  const answerByParameter = new Map(
    (qualificationAnswersResult.data ?? []).map((answer) => [answer.parameter_id, answer]),
  );
  const qualification = [
    ...(qualificationParametersResult.data ?? []).map((parameter) => ({
      id: parameter.id,
      name: parameter.name,
      answer: answerByParameter.get(parameter.id)?.answer ?? null,
      isActive: true,
    })),
    ...(qualificationAnswersResult.data ?? [])
      .filter((answer) => !(qualificationParametersResult.data ?? []).some((parameter) => parameter.id === answer.parameter_id))
      .map((answer) => ({
        id: answer.parameter_id,
        name: answer.parameter_name,
        answer: answer.answer,
        isActive: false,
      })),
  ];

  const tasks = (tasksResult.data ?? []).map((task) => mapRelatedTask(task as unknown as RelatedTaskRecord)) satisfies OpportunityTaskItem[];

  const attachments = (attachmentsResult.data ?? []) satisfies OpportunityAttachmentItem[];
  const notes = (notesResult.data ?? []).map((note) => ({
    id: note.id,
    body: note.body,
    author_name: profileNames.get(note.created_by) ?? "Usuário",
    created_at: note.created_at,
  })) satisfies OpportunityNoteItem[];
  const activities = (activitiesResult.data ?? []).map((activity) => ({
    id: activity.id,
    summary: activity.summary,
    event_type: activity.event_type,
    author_name: activity.actor_id ? profileNames.get(activity.actor_id) ?? "Usuário" : "Sistema",
    occurred_at: activity.occurred_at,
  })) satisfies OpportunityActivityItem[];

  const loadError = [
    pipelinesResult.error,
    linkedProductsResult.error,
    qualificationAnswersResult.error,
    qualificationParametersResult.error,
    tasksResult.error,
    attachmentsResult.error,
    notesResult.error,
    activitiesResult.error,
    profilesResult.error,
    companiesResult.error,
    contactsResult.error,
    sourcesResult.error,
    catalogProductsResult.error,
    lossReasonsResult.error,
  ].some(Boolean);
  if (loadError) {
    return <main className="p-5"><p className="rounded-lg bg-[var(--tomato-3)] p-3 text-sm text-[var(--tomato-11)]">Não foi possível carregar todos os detalhes desta oportunidade.</p></main>;
  }

  return (
    <OpportunityDetails
      actorRole={profile.role}
      activities={activities}
      attachments={attachments}
      companies={(companiesResult.data ?? []) as CompanyOption[]}
      contacts={(contactsResult.data ?? []) as ContactOption[]}
      currentPipeline={currentPipeline}
      lossReasons={(lossReasonsResult.data ?? []) as SimpleOption[]}
      notes={notes}
      opportunity={opportunity}
      products={(catalogProductsResult.data ?? []) as unknown as ProductOption[]}
      profiles={profiles}
      qualification={qualification}
      qualificationParameters={(qualificationParametersResult.data ?? []) as SimpleOption[]}
      sources={(sourcesResult.data ?? []) as SimpleOption[]}
      tasks={tasks}
    />
  );
}
