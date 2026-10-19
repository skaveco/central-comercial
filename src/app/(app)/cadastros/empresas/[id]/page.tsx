import { notFound, redirect } from "next/navigation";

import {
  CompanyDetailsPanel,
  type CompanyActivityItem,
  type CompanyContactItem,
  type CompanyNoteItem,
  type CompanyOpportunityItem,
  type ContactOption,
} from "@/components/registries/company-details-panel";
import type { CompanyAttachmentItem } from "@/components/registries/company-attachments";
import type { CompanyListItem, SegmentOption } from "@/components/registries/companies-panel";
import type { TaskProfileOption } from "@/components/tasks/tasks-workspace";
import { mapRelatedTask, relatedTaskSelect, type RelatedTaskRecord } from "@/lib/tasks/related-task-record";
import { createClient } from "@/lib/supabase/server";

type CompanyDetailsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ activities?: string; edit?: string; oppPage?: string }>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CompanyDetailsPage({ params, searchParams }: CompanyDetailsPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!uuidPattern.test(id)) notFound();

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login?reason=expired");
  const { data: companyData, error: companyError } = await supabase
    .from("companies")
    .select("id, name, cnpj, email, phone, address, segment_id, is_active, created_at, updated_at, segment:segments(name)")
    .eq("id", id)
    .maybeSingle();

  if (companyError || !companyData) notFound();

  const requestedOpportunityPage = Number(query.oppPage ?? 1);
  const opportunityPage = Number.isInteger(requestedOpportunityPage) && requestedOpportunityPage > 0 ? requestedOpportunityPage : 1;
  const opportunityFrom = (opportunityPage - 1) * 10;
  const requestedActivityLimit = Number(query.activities ?? 20);
  const activityLimit = [20, 40, 60, 80, 100].includes(requestedActivityLimit) ? requestedActivityLimit : 20;

  const [contactsResult, opportunitiesResult, metricsResult, notesResult, attachmentsResult, availableContactsResult, segmentsResult, tasksResult, profilesResult] = await Promise.all([
    supabase
      .from("company_contacts")
      .select("contact_id, job_title, contact:contacts(id, name, email, phone, is_active)")
      .eq("company_id", id)
      .eq("is_active", true)
      .order("linked_at", { ascending: true }),
    supabase
      .from("opportunities")
      .select("id, name, commercial_status, final_value, created_at, responsible:profiles!opportunities_responsible_id_fkey(name), contact:contacts(name), stage:pipeline_stages(name)", { count: "exact" })
      .eq("company_id", id)
      .order("created_at", { ascending: false })
      .range(opportunityFrom, opportunityFrom + 9),
    supabase.from("opportunities").select("id, commercial_status, final_value").eq("company_id", id),
    supabase
      .from("company_notes")
      .select("id, body, created_at, updated_at, creator:profiles!company_notes_created_by_fkey(name)")
      .eq("company_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("attachments")
      .select("id, bucket_id, object_path, original_name, mime_type, size_bytes, uploaded_at, uploader:profiles!attachments_uploaded_by_fkey(name)")
      .eq("company_id", id)
      .is("removed_at", null)
      .order("uploaded_at", { ascending: false }),
    supabase.from("contacts").select("id, name, email").eq("is_active", true).order("name", { ascending: true }),
    supabase.from("segments").select("id, name, is_active").order("name", { ascending: true }),
    supabase
      .from("tasks")
      .select(relatedTaskSelect)
      .eq("company_id", id)
      .is("deleted_at", null)
      .order("due_date", { ascending: false })
      .limit(100),
    supabase.rpc("list_assignable_profiles"),
  ]);

  const dataError = contactsResult.error
    ?? opportunitiesResult.error
    ?? metricsResult.error
    ?? notesResult.error
    ?? attachmentsResult.error
    ?? availableContactsResult.error
    ?? segmentsResult.error
    ?? tasksResult.error
    ?? profilesResult.error;
  if (dataError) throw new Error("Não foi possível carregar os detalhes da empresa.");

  const metricsRows = (metricsResult.data ?? []) as Array<{ commercial_status: string; final_value: number | null }>;
  const opportunityIds = (metricsResult.data ?? []).map((opportunity) => opportunity.id);
  const activityScope = opportunityIds.length
    ? `company_id.eq.${id},opportunity_id.in.(${opportunityIds.join(",")})`
    : `company_id.eq.${id}`;
  const activitiesResult = await supabase
    .from("activity_events")
    .select("id, event_type, summary, metadata, occurred_at, actor:profiles!activity_events_actor_id_fkey(name)", { count: "exact" })
    .or(activityScope)
    .order("occurred_at", { ascending: false })
    .limit(activityLimit);
  if (activitiesResult.error) throw new Error("Não foi possível carregar o histórico da empresa.");

  const won = metricsRows.filter((opportunity) => opportunity.commercial_status === "won");
  const lost = metricsRows.filter((opportunity) => opportunity.commercial_status === "lost");
  const metrics = {
    total: metricsRows.length,
    won: won.length,
    lost: lost.length,
    wonValue: won.reduce((total, opportunity) => total + Number(opportunity.final_value ?? 0), 0),
  };

  const attachments = await Promise.all((attachmentsResult.data ?? []).map(async (attachment) => {
    const [previewResult, downloadResult] = await Promise.all([
      supabase.storage.from(attachment.bucket_id).createSignedUrl(attachment.object_path, 600),
      supabase.storage.from(attachment.bucket_id).createSignedUrl(attachment.object_path, 600, { download: attachment.original_name }),
    ]);
    return {
      ...attachment,
      download_url: downloadResult.data?.signedUrl ?? null,
      signed_url: previewResult.data?.signedUrl ?? null,
    };
  }));
  const opportunityTotal = opportunitiesResult.count ?? 0;

  return (
    <CompanyDetailsPanel
      actorId={userId}
      activities={(activitiesResult.data ?? []) as unknown as CompanyActivityItem[]}
      activityCount={activitiesResult.count ?? 0}
      activityLimit={activityLimit}
      attachments={attachments as unknown as CompanyAttachmentItem[]}
      availableContacts={(availableContactsResult.data ?? []) as ContactOption[]}
      company={companyData as unknown as CompanyListItem}
      contacts={(contactsResult.data ?? []) as unknown as CompanyContactItem[]}
      initialEditOpen={query.edit === "true" && companyData.is_active}
      metrics={metrics}
      notes={(notesResult.data ?? []) as unknown as CompanyNoteItem[]}
      opportunities={(opportunitiesResult.data ?? []) as unknown as CompanyOpportunityItem[]}
      opportunityPage={opportunityPage}
      opportunityPages={Math.max(1, Math.ceil(opportunityTotal / 10))}
      opportunityTotal={opportunityTotal}
      segments={(segmentsResult.data ?? []) as SegmentOption[]}
      taskProfiles={(profilesResult.data ?? []) as TaskProfileOption[]}
      tasks={(tasksResult.data ?? []).map((task) => mapRelatedTask(task as unknown as RelatedTaskRecord))}
    />
  );
}
