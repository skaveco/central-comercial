import type { TaskItem } from "@/components/tasks/tasks-workspace";

export const relatedTaskSelect = "id, title, type, responsible_id, due_date, due_time, description, opportunity_id, company_id, contact_id, post_sale_cycle_id, status, creation_source, created_by, completed_by, completed_at, cancelled_at, cancellation_reason, created_at, updated_at, responsible:profiles!tasks_responsible_id_fkey(name), creator:profiles!tasks_created_by_fkey(name), completed_profile:profiles!tasks_completed_by_fkey(name), opportunity:opportunities(id, name), company:companies(id, name, is_active), contact:contacts(id, name, is_active)";

type TaskRelation = { id: string; name: string; is_active?: boolean } | Array<{ id: string; name: string; is_active?: boolean }> | null;
type ProfileRelation = { name: string } | Array<{ name: string }> | null;

type RelatedTaskRecord = Omit<TaskItem, "responsible_name" | "creator_name" | "completed_by_name" | "opportunity" | "company" | "contact"> & {
  responsible: ProfileRelation;
  creator: ProfileRelation;
  completed_profile: ProfileRelation;
  opportunity: TaskRelation;
  company: TaskRelation;
  contact: TaskRelation;
};

function firstRelation<T>(relation: T | T[] | null) {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export function mapRelatedTask(record: RelatedTaskRecord): TaskItem {
  const responsible = firstRelation(record.responsible);
  const creator = firstRelation(record.creator);
  const completedProfile = firstRelation(record.completed_profile);
  const opportunity = firstRelation(record.opportunity);
  const company = firstRelation(record.company);
  const contact = firstRelation(record.contact);

  return {
    id: record.id,
    title: record.title,
    type: record.type,
    responsible_id: record.responsible_id,
    responsible_name: responsible?.name ?? "Responsável indisponível",
    due_date: record.due_date,
    due_time: record.due_time,
    description: record.description,
    opportunity_id: record.opportunity_id,
    company_id: record.company_id,
    contact_id: record.contact_id,
    post_sale_cycle_id: record.post_sale_cycle_id,
    status: record.status,
    creation_source: record.creation_source,
    created_by: record.created_by,
    creator_name: record.creation_source === "system" ? "Sistema" : creator?.name ?? "Usuário",
    completed_by: record.completed_by,
    completed_by_name: completedProfile?.name ?? null,
    completed_at: record.completed_at,
    cancelled_at: record.cancelled_at,
    cancellation_reason: record.cancellation_reason,
    created_at: record.created_at,
    updated_at: record.updated_at,
    opportunity: opportunity ? { id: opportunity.id, name: opportunity.name } : null,
    company: company ? { id: company.id, name: company.name, is_active: company.is_active ?? true } : null,
    contact: contact ? { id: contact.id, name: contact.name, is_active: contact.is_active ?? true } : null,
  };
}

export type { RelatedTaskRecord };
