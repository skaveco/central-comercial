import { redirect } from "next/navigation";

import {
  TasksWorkspace,
  type TaskCompanyOption,
  type TaskContactLink,
  type TaskContactOption,
  type TaskItem,
  type TaskOpportunityOption,
  type TaskProfileOption,
  type TaskTab,
} from "@/components/tasks/tasks-workspace";
import { createClient } from "@/lib/supabase/server";

type TasksPageProps = {
  searchParams: Promise<{
    company?: string;
    completedFrom?: string;
    completedTo?: string;
    contact?: string;
    dueFrom?: string;
    dueTo?: string;
    opportunity?: string;
    q?: string;
    responsible?: string;
    tab?: string;
    type?: string;
  }>;
};

type AppRole = "admin" | "pre_sales" | "commercial";

const validTabs = new Set<TaskTab>(["today", "overdue", "upcoming", "completed"]);
const validTypes = new Set(["first_contact", "qualification", "follow_up", "scheduling", "proposal", "management"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function saoPauloDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function relationName(value: unknown) {
  const relation = value as { name?: string } | Array<{ name?: string }> | null;
  return Array.isArray(relation) ? relation[0]?.name ?? null : relation?.name ?? null;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;
  const tab = validTabs.has(params.tab as TaskTab) ? (params.tab as TaskTab) : "today";
  const query = (params.q ?? "").trim().slice(0, 100);
  const type = validTypes.has(params.type ?? "") ? params.type ?? "" : "";
  const companyId = uuidPattern.test(params.company ?? "") ? params.company ?? "" : "";
  const contactId = uuidPattern.test(params.contact ?? "") ? params.contact ?? "" : "";
  const opportunityId = uuidPattern.test(params.opportunity ?? "") ? params.opportunity ?? "" : "";
  const dueFrom = datePattern.test(params.dueFrom ?? "") ? params.dueFrom ?? "" : "";
  const dueTo = datePattern.test(params.dueTo ?? "") ? params.dueTo ?? "" : "";
  const completedFrom = datePattern.test(params.completedFrom ?? "") ? params.completedFrom ?? "" : "";
  const completedTo = datePattern.test(params.completedTo ?? "") ? params.completedTo ?? "" : "";

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login?reason=expired");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role, access_status")
    .eq("id", userId)
    .maybeSingle<{ name: string; role: AppRole | null; access_status: string }>();
  if (!profile || profile.access_status !== "active" || !profile.role) {
    redirect("/login?reason=invalid-profile");
  }

  const responsibleFilter = params.responsible === "all"
    ? "all"
    : uuidPattern.test(params.responsible ?? "")
      ? params.responsible!
      : userId;
  const today = saoPauloDate();

  let tasksQuery = supabase
    .from("tasks")
    .select("id, title, type, responsible_id, due_date, due_time, description, opportunity_id, company_id, contact_id, post_sale_cycle_id, status, creation_source, created_by, completed_by, completed_at, cancelled_at, cancellation_reason, created_at, updated_at, responsible:profiles!tasks_responsible_id_fkey(name), creator:profiles!tasks_created_by_fkey(name), completed_profile:profiles!tasks_completed_by_fkey(name), opportunity:opportunities(id, name, current_pipeline_id, commercial_status, post_sale_status, company_id, contact_id), company:companies(id, name, is_active), contact:contacts(id, name, is_active)")
    .is("deleted_at", null)
    .limit(1000);

  if (tab === "completed") {
    tasksQuery = tasksQuery.eq("status", "completed").order("completed_at", { ascending: false });
    if (completedFrom) tasksQuery = tasksQuery.gte("completed_at", `${completedFrom}T00:00:00-03:00`);
    if (completedTo) tasksQuery = tasksQuery.lte("completed_at", `${completedTo}T23:59:59-03:00`);
  } else {
    tasksQuery = tasksQuery.eq("status", "pending").order("due_date", { ascending: tab !== "overdue" }).order("due_time");
    if (tab === "today") tasksQuery = tasksQuery.eq("due_date", today);
    if (tab === "overdue") tasksQuery = tasksQuery.lt("due_date", today);
    if (tab === "upcoming") tasksQuery = tasksQuery.gt("due_date", today);
    if (dueFrom) tasksQuery = tasksQuery.gte("due_date", dueFrom);
    if (dueTo) tasksQuery = tasksQuery.lte("due_date", dueTo);
  }
  if (responsibleFilter !== "all") tasksQuery = tasksQuery.eq("responsible_id", responsibleFilter);
  if (type) tasksQuery = tasksQuery.eq("type", type);
  if (companyId) tasksQuery = tasksQuery.eq("company_id", companyId);
  if (contactId) tasksQuery = tasksQuery.eq("contact_id", contactId);
  if (opportunityId) tasksQuery = tasksQuery.eq("opportunity_id", opportunityId);
  if (query) {
    const safeQuery = query.replace(/[,()*%_"]/g, " ").trim();
    if (safeQuery) tasksQuery = tasksQuery.ilike("title", `%${safeQuery}%`);
  }

  const [tasksResult, profilesResult, opportunitiesResult, companiesResult, contactsResult, linksResult, pipelinesResult] = await Promise.all([
    tasksQuery,
    supabase.rpc("list_assignable_profiles"),
    supabase
      .from("opportunities")
      .select("id, name, company_id, contact_id, current_pipeline_id, commercial_status, post_sale_status")
      .order("name")
      .limit(500),
    supabase.from("companies").select("id, name").eq("is_active", true).order("name"),
    supabase.from("contacts").select("id, name").eq("is_active", true).order("name"),
    supabase.from("company_contacts").select("company_id, contact_id").eq("is_active", true),
    supabase.from("pipelines").select("id, code"),
  ]);

  const pipelineCodeById = new Map((pipelinesResult.data ?? []).map((pipeline) => [pipeline.id, pipeline.code]));
  const opportunities = (opportunitiesResult.data ?? [])
    .filter((opportunity) => opportunity.commercial_status === "active" || (
      opportunity.commercial_status === "won" && opportunity.post_sale_status === "active"
    ))
    .map((opportunity) => ({
      ...opportunity,
      pipeline_code: pipelineCodeById.get(opportunity.current_pipeline_id) ?? null,
    })) as TaskOpportunityOption[];

  const tasks = (tasksResult.data ?? []).map((task) => {
    const opportunity = task.opportunity as unknown as TaskItem["opportunity"];
    const company = task.company as unknown as TaskItem["company"];
    const contact = task.contact as unknown as TaskItem["contact"];
    return {
      id: task.id,
      title: task.title,
      type: task.type,
      responsible_id: task.responsible_id,
      responsible_name: relationName(task.responsible) ?? "Responsável indisponível",
      due_date: task.due_date,
      due_time: task.due_time,
      description: task.description,
      opportunity_id: task.opportunity_id,
      company_id: task.company_id,
      contact_id: task.contact_id,
      post_sale_cycle_id: task.post_sale_cycle_id,
      status: task.status,
      creation_source: task.creation_source,
      created_by: task.created_by,
      creator_name: task.creation_source === "system" ? "Sistema" : relationName(task.creator) ?? "Usuário",
      completed_by: task.completed_by,
      completed_by_name: relationName(task.completed_profile),
      completed_at: task.completed_at,
      cancelled_at: task.cancelled_at,
      cancellation_reason: task.cancellation_reason,
      created_at: task.created_at,
      updated_at: task.updated_at,
      opportunity: opportunity ? { id: opportunity.id, name: opportunity.name } : null,
      company: company ? { id: company.id, name: company.name, is_active: company.is_active } : null,
      contact: contact ? { id: contact.id, name: contact.name, is_active: contact.is_active } : null,
    } satisfies TaskItem;
  });

  const loadError = [
    tasksResult.error,
    profilesResult.error,
    opportunitiesResult.error,
    companiesResult.error,
    contactsResult.error,
    linksResult.error,
    pipelinesResult.error,
  ].some(Boolean);

  return (
    <TasksWorkspace
      actor={{ id: userId, name: profile.name, role: profile.role }}
      companies={(companiesResult.data ?? []) as TaskCompanyOption[]}
      contactLinks={(linksResult.data ?? []) as TaskContactLink[]}
      contacts={(contactsResult.data ?? []) as TaskContactOption[]}
      error={loadError ? "Alguns dados de Tarefas não puderam ser carregados." : undefined}
      filters={{
        companyId,
        completedFrom,
        completedTo,
        contactId,
        dueFrom,
        dueTo,
        opportunityId,
        query,
        responsibleId: responsibleFilter,
        tab,
        type,
      }}
      opportunities={opportunities}
      profiles={(profilesResult.data ?? []) as TaskProfileOption[]}
      tasks={tasks}
      today={today}
    />
  );
}
