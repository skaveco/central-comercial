"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type TaskActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<
    | "companyId"
    | "contactId"
    | "contactOccurredAt"
    | "dueDate"
    | "dueTime"
    | "hadContact"
    | "opportunityId"
    | "responsibleId"
    | "title"
    | "type",
    string
  >>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateTimeLocalPattern = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;
const taskTypes = new Set(["first_contact", "qualification", "follow_up", "scheduling", "proposal", "management"]);
const contactChannels = new Set(["whatsapp", "phone", "email", "online_meeting", "in_person_meeting", "other"]);
const safeDatabaseCodes = new Set(["22007", "22023", "23503", "23514", "42501"]);

function optionalUuid(value: FormDataEntryValue | null) {
  const parsed = String(value ?? "");
  return uuidPattern.test(parsed) ? parsed : null;
}

function optionalText(value: FormDataEntryValue | null, maxLength = 4000) {
  const parsed = String(value ?? "").trim();
  return parsed ? parsed.slice(0, maxLength) : null;
}

type TaskLinks = {
  opportunity_id: string | null;
  company_id: string | null;
  contact_id: string | null;
};

function refreshTasks(links?: Partial<TaskLinks> | null) {
  revalidatePath("/tarefas");
  if (links?.opportunity_id) revalidatePath(`/oportunidades/${links.opportunity_id}`);
  if (links?.company_id) revalidatePath(`/cadastros/empresas/${links.company_id}`);
  if (links?.contact_id) revalidatePath(`/cadastros/contatos/${links.contact_id}`);
}

async function taskLinksById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskId: string,
) {
  const { data } = await supabase
    .from("tasks")
    .select("opportunity_id, company_id, contact_id")
    .eq("id", taskId)
    .maybeSingle<TaskLinks>();
  return data;
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  return { supabase, userId: claimsData?.claims?.sub ?? null };
}

function databaseMessage(error: { code?: string; message: string }, fallback: string) {
  return safeDatabaseCodes.has(error.code ?? "") ? error.message : fallback;
}

function parseTaskForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 180);
  const type = String(formData.get("type") ?? "");
  const responsibleId = String(formData.get("responsibleId") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "");
  const dueTime = String(formData.get("dueTime") ?? "");
  const rawOpportunityId = String(formData.get("opportunityId") ?? "");
  const rawCompanyId = String(formData.get("companyId") ?? "");
  const rawContactId = String(formData.get("contactId") ?? "");
  const opportunityId = optionalUuid(formData.get("opportunityId"));
  const companyId = optionalUuid(formData.get("companyId"));
  const contactId = optionalUuid(formData.get("contactId"));
  const postSaleCycleId = optionalUuid(formData.get("postSaleCycleId"));
  const fieldErrors: TaskActionState["fieldErrors"] = {};

  if (!title) fieldErrors.title = "Informe o nome da tarefa.";
  if (!taskTypes.has(type)) fieldErrors.type = "Selecione um tipo válido.";
  if (!uuidPattern.test(responsibleId)) fieldErrors.responsibleId = "Selecione um responsável.";
  if (!datePattern.test(dueDate)) fieldErrors.dueDate = "Informe uma data válida.";
  if (dueTime && !timePattern.test(dueTime)) fieldErrors.dueTime = "Informe um horário válido.";
  if (rawOpportunityId && !opportunityId) fieldErrors.opportunityId = "Selecione uma oportunidade válida.";
  if (rawCompanyId && !companyId) fieldErrors.companyId = "Selecione uma empresa válida.";
  if (rawContactId && !contactId) fieldErrors.contactId = "Selecione um contato válido.";
  if (type === "management" && opportunityId) {
    fieldErrors.opportunityId = "Tarefas de Gestão não são vinculadas a oportunidades.";
  }

  return {
    companyId,
    contactId,
    description: optionalText(formData.get("description")),
    dueDate,
    dueTime,
    fieldErrors,
    opportunityId,
    postSaleCycleId,
    responsibleId,
    title,
    type,
  };
}

export async function saveTaskAction(
  _previousState: TaskActionState | null,
  formData: FormData,
): Promise<TaskActionState> {
  const requestKey = String(formData.get("requestKey") ?? "");
  const taskId = optionalUuid(formData.get("taskId"));
  const parsed = parseTaskForm(formData);

  if (!uuidPattern.test(requestKey)) {
    return { ok: false, message: "Não foi possível identificar esta operação." };
  }
  if (String(formData.get("taskId") ?? "") && !taskId) {
    return { ok: false, message: "Não foi possível identificar a tarefa." };
  }
  if (Object.keys(parsed.fieldErrors).length) {
    return { ok: false, message: "Revise os campos destacados.", fieldErrors: parsed.fieldErrors };
  }

  const { supabase, userId } = await authenticatedClient();
  if (!userId) return { ok: false, message: "Sua sessão expirou. Entre novamente." };

  const payload = {
    request_key: requestKey,
    task_title: parsed.title,
    task_type_value: parsed.type,
    target_responsible_id: parsed.responsibleId,
    target_due_date: parsed.dueDate,
    target_due_time: parsed.dueTime || null,
    task_description: parsed.description,
    target_opportunity_id: parsed.opportunityId,
    target_company_id: parsed.opportunityId ? null : parsed.companyId,
    target_contact_id: parsed.opportunityId ? null : parsed.contactId,
    target_post_sale_cycle_id: parsed.postSaleCycleId,
  };

  const result = taskId
    ? await supabase.rpc("update_task_with_links", { ...payload, target_task_id: taskId })
    : await supabase.rpc("create_task", payload);

  if (result.error) {
    return {
      ok: false,
      message: databaseMessage(
        result.error,
        taskId ? "Não foi possível atualizar a tarefa." : "Não foi possível criar a tarefa.",
      ),
    };
  }

  const resultTaskId = typeof result.data === "object" && result.data !== null && "task_id" in result.data
    ? String(result.data.task_id)
    : typeof result.data === "string"
      ? result.data
      : null;
  const savedTaskId = resultTaskId && uuidPattern.test(resultTaskId) ? resultTaskId : taskId;
  const links = savedTaskId ? await taskLinksById(supabase, savedTaskId) : null;
  refreshTasks(links ?? {
    opportunity_id: parsed.opportunityId,
    company_id: parsed.companyId,
    contact_id: parsed.contactId,
  });
  return { ok: true, message: taskId ? "Tarefa atualizada com sucesso." : "Tarefa criada com sucesso." };
}

export async function completeTaskAction(
  _previousState: TaskActionState | null,
  formData: FormData,
): Promise<TaskActionState> {
  const requestKey = String(formData.get("requestKey") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const taskType = String(formData.get("taskType") ?? "");
  const hadContactValue = String(formData.get("hadContact") ?? "");
  const channel = String(formData.get("contactChannel") ?? "");
  const occurredAtLocal = String(formData.get("contactOccurredAt") ?? "");
  const fieldErrors: TaskActionState["fieldErrors"] = {};

  if (!uuidPattern.test(requestKey) || !uuidPattern.test(taskId)) {
    return { ok: false, message: "Não foi possível identificar a tarefa." };
  }
  if (!taskTypes.has(taskType)) return { ok: false, message: "Tipo de tarefa inválido." };

  const isManagement = taskType === "management";
  if (!isManagement && hadContactValue !== "yes" && hadContactValue !== "no") {
    fieldErrors.hadContact = "Informe se houve contato.";
  }
  const hadContact = isManagement ? null : hadContactValue === "yes";
  let occurredAt: string | null = null;

  if (hadContact) {
    if (!contactChannels.has(channel)) fieldErrors.hadContact = "Selecione o canal do contato.";
    if (!dateTimeLocalPattern.test(occurredAtLocal)) {
      fieldErrors.contactOccurredAt = "Informe a data e o horário do contato.";
    } else {
      occurredAt = new Date(`${occurredAtLocal}:00-03:00`).toISOString();
      if (new Date(occurredAt).getTime() > Date.now()) {
        fieldErrors.contactOccurredAt = "A data do contato não pode estar no futuro.";
      }
    }
  }
  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: "Revise os dados da conclusão.", fieldErrors };
  }

  const { supabase, userId } = await authenticatedClient();
  if (!userId) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const task = await taskLinksById(supabase, taskId);

  const { error } = await supabase.rpc("complete_task", {
    request_key: requestKey,
    target_task_id: taskId,
    had_contact: hadContact,
    contact_channel_value: hadContact ? channel : null,
    contact_occurred_at: hadContact ? occurredAt : null,
    contact_notes: hadContact ? optionalText(formData.get("contactNotes")) : null,
  });

  if (error) return { ok: false, message: databaseMessage(error, "Não foi possível concluir a tarefa.") };
  refreshTasks(task);
  return { ok: true, message: "Tarefa concluída com sucesso." };
}

export async function reopenTaskAction(
  _previousState: TaskActionState | null,
  formData: FormData,
): Promise<TaskActionState> {
  return runSimpleTaskRpc(formData, "reopen_task", "Tarefa marcada como pendente.", "Não foi possível reabrir a tarefa.");
}

export async function deleteTaskAction(
  _previousState: TaskActionState | null,
  formData: FormData,
): Promise<TaskActionState> {
  return runSimpleTaskRpc(formData, "delete_task", "Tarefa excluída com sucesso.", "Não foi possível excluir a tarefa.");
}

async function runSimpleTaskRpc(
  formData: FormData,
  rpcName: "reopen_task" | "delete_task",
  successMessage: string,
  fallbackMessage: string,
): Promise<TaskActionState> {
  const requestKey = String(formData.get("requestKey") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  if (!uuidPattern.test(requestKey) || !uuidPattern.test(taskId)) {
    return { ok: false, message: "Não foi possível identificar a tarefa." };
  }

  const { supabase, userId } = await authenticatedClient();
  if (!userId) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const task = await taskLinksById(supabase, taskId);
  const { error } = await supabase.rpc(rpcName, { request_key: requestKey, target_task_id: taskId });
  if (error) return { ok: false, message: databaseMessage(error, fallbackMessage) };
  refreshTasks(task);
  return { ok: true, message: successMessage };
}

export async function rescheduleTaskAction(
  _previousState: TaskActionState | null,
  formData: FormData,
): Promise<TaskActionState> {
  const requestKey = String(formData.get("requestKey") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "");
  const dueTime = String(formData.get("dueTime") ?? "");
  const fieldErrors: TaskActionState["fieldErrors"] = {};

  if (!uuidPattern.test(requestKey) || !uuidPattern.test(taskId)) {
    return { ok: false, message: "Não foi possível identificar a tarefa." };
  }
  if (!datePattern.test(dueDate)) fieldErrors.dueDate = "Informe uma data válida.";
  if (dueTime && !timePattern.test(dueTime)) fieldErrors.dueTime = "Informe um horário válido.";
  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: "Revise o novo vencimento.", fieldErrors };
  }

  const { supabase, userId } = await authenticatedClient();
  if (!userId) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const task = await taskLinksById(supabase, taskId);
  const { error } = await supabase.rpc("reschedule_task", {
    request_key: requestKey,
    target_task_id: taskId,
    target_due_date: dueDate,
    target_due_time: dueTime || null,
  });
  if (error) return { ok: false, message: databaseMessage(error, "Não foi possível reagendar a tarefa.") };
  refreshTasks(task);
  return { ok: true, message: "Tarefa reagendada com sucesso." };
}
