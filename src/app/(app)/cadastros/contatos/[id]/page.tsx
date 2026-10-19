import { notFound, redirect } from "next/navigation";

import {
  ContactDetailsPanel,
  type CompanyOption,
  type ContactActivityItem,
  type ContactCompanyItem,
  type ContactMetrics,
  type ContactNoteItem,
  type ContactOpportunityItem,
} from "@/components/registries/contact-details-panel";
import type { ContactListItem, SourceOption } from "@/components/registries/contacts-panel";
import type { TaskProfileOption } from "@/components/tasks/tasks-workspace";
import { mapRelatedTask, relatedTaskSelect, type RelatedTaskRecord } from "@/lib/tasks/related-task-record";
import { createClient } from "@/lib/supabase/server";

type ContactDetailsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ activities?: string; edit?: string; oppPage?: string }>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ContactDetailsPage({ params, searchParams }: ContactDetailsPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!uuidPattern.test(id)) notFound();

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login?reason=expired");
  const { data: contactData, error: contactError } = await supabase
    .from("contacts")
    .select("id, name, phone, email, source_id, is_active, created_at, updated_at, source:opportunity_sources(name), company_contacts(is_active, company:companies(id, name, is_active))")
    .eq("id", id)
    .maybeSingle();
  if (contactError || !contactData) notFound();

  const requestedOpportunityPage = Number(query.oppPage ?? 1);
  const opportunityPage = Number.isInteger(requestedOpportunityPage) && requestedOpportunityPage > 0 ? requestedOpportunityPage : 1;
  const opportunityFrom = (opportunityPage - 1) * 10;
  const requestedActivityLimit = Number(query.activities ?? 20);
  const activityLimit = [20, 40, 60, 80, 100].includes(requestedActivityLimit) ? requestedActivityLimit : 20;

  const [companiesResult, opportunitiesResult, metricsResult, notesResult, companyOptionsResult, sourcesResult, tasksResult, profilesResult] = await Promise.all([
    supabase
      .from("company_contacts")
      .select("company_id, job_title, linked_at, company:companies(id, name, is_active, segment:segments(name))")
      .eq("contact_id", id)
      .eq("is_active", true)
      .order("linked_at", { ascending: true }),
    supabase
      .from("opportunities")
      .select("id, name, commercial_status, final_value, created_at, responsible:profiles!opportunities_responsible_id_fkey(name), company:companies(name), stage:pipeline_stages(name)", { count: "exact" })
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .range(opportunityFrom, opportunityFrom + 9),
    supabase.from("opportunities").select("id, commercial_status, final_value").eq("contact_id", id),
    supabase
      .from("contact_notes")
      .select("id, body, created_at, updated_at, creator:profiles!contact_notes_created_by_fkey(name)")
      .eq("contact_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("companies")
      .select("id, name, is_active, segment:segments(name)")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase.from("opportunity_sources").select("id, name, is_active").order("name", { ascending: true }),
    supabase
      .from("tasks")
      .select(relatedTaskSelect)
      .eq("contact_id", id)
      .is("deleted_at", null)
      .order("due_date", { ascending: false })
      .limit(100),
    supabase.rpc("list_assignable_profiles"),
  ]);

  const dataError = companiesResult.error
    ?? opportunitiesResult.error
    ?? metricsResult.error
    ?? notesResult.error
    ?? companyOptionsResult.error
    ?? sourcesResult.error
    ?? tasksResult.error
    ?? profilesResult.error;
  if (dataError) throw new Error("Não foi possível carregar os detalhes do contato.");

  const metricsRows = (metricsResult.data ?? []) as Array<{ id: string; commercial_status: string; final_value: number | null }>;
  const opportunityIds = metricsRows.map((opportunity) => opportunity.id);
  const activityScope = opportunityIds.length
    ? `contact_id.eq.${id},opportunity_id.in.(${opportunityIds.join(",")})`
    : `contact_id.eq.${id}`;
  const activitiesResult = await supabase
    .from("activity_events")
    .select("id, event_type, summary, metadata, occurred_at, actor:profiles!activity_events_actor_id_fkey(name)", { count: "exact" })
    .or(activityScope)
    .order("occurred_at", { ascending: false })
    .limit(activityLimit);
  if (activitiesResult.error) throw new Error("Não foi possível carregar o histórico do contato.");

  const won = metricsRows.filter((opportunity) => opportunity.commercial_status === "won");
  const lost = metricsRows.filter((opportunity) => opportunity.commercial_status === "lost");
  const metrics: ContactMetrics = {
    total: metricsRows.length,
    won: won.length,
    lost: lost.length,
    wonValue: won.reduce((total, opportunity) => total + Number(opportunity.final_value ?? 0), 0),
  };
  const activeCompanyIds = new Set((companiesResult.data ?? []).map((link) => link.company_id));
  const availableCompanies = (companyOptionsResult.data ?? []).filter((company) => !activeCompanyIds.has(company.id));
  const opportunityTotal = opportunitiesResult.count ?? 0;

  return (
    <ContactDetailsPanel
      actorId={userId}
      activities={(activitiesResult.data ?? []) as unknown as ContactActivityItem[]}
      activityCount={activitiesResult.count ?? 0}
      activityLimit={activityLimit}
      availableCompanies={availableCompanies as unknown as CompanyOption[]}
      companies={(companiesResult.data ?? []) as unknown as ContactCompanyItem[]}
      contact={contactData as unknown as ContactListItem}
      initialEditOpen={query.edit === "true" && contactData.is_active}
      metrics={metrics}
      notes={(notesResult.data ?? []) as unknown as ContactNoteItem[]}
      opportunities={(opportunitiesResult.data ?? []) as unknown as ContactOpportunityItem[]}
      opportunityPage={opportunityPage}
      opportunityPages={Math.max(1, Math.ceil(opportunityTotal / 10))}
      opportunityTotal={opportunityTotal}
      sources={(sourcesResult.data ?? []) as SourceOption[]}
      taskProfiles={(profilesResult.data ?? []) as TaskProfileOption[]}
      tasks={(tasksResult.data ?? []).map((task) => mapRelatedTask(task as unknown as RelatedTaskRecord))}
    />
  );
}
