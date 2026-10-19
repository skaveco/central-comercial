"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type RestoreOpportunityState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<"pipelineId" | "responsibleId" | "stageId" | "taskDueDate" | "taskDueTime", string>>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const allowedPipelineCodes = new Set(["pre_sales", "sales"]);
const allowedStageCodes = new Set(["lead", "first_contact", "qualification", "diagnosis", "proposal_in_progress", "proposal_sent", "negotiation"]);
const scheduledStageCodes = new Set(["diagnosis", "negotiation"]);
const safeDatabaseCodes = new Set(["22023", "23505", "23514", "42501"]);

export async function restoreOpportunityAction(
  _previousState: RestoreOpportunityState | null,
  formData: FormData,
): Promise<RestoreOpportunityState> {
  const requestKey = String(formData.get("requestKey") ?? "");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const pipelineId = String(formData.get("pipelineId") ?? "");
  const stageId = String(formData.get("stageId") ?? "");
  const responsibleId = String(formData.get("responsibleId") ?? "");
  const taskDueDate = String(formData.get("taskDueDate") ?? "");
  const taskDueTime = String(formData.get("taskDueTime") ?? "");
  const taskNote = String(formData.get("taskNote") ?? "").trim().slice(0, 4000) || null;
  const fieldErrors: RestoreOpportunityState["fieldErrors"] = {};

  if (!uuidPattern.test(requestKey) || !uuidPattern.test(opportunityId)) {
    return { ok: false, message: "Não foi possível identificar esta negociação." };
  }
  if (!uuidPattern.test(pipelineId)) fieldErrors.pipelineId = "Selecione o funil de destino.";
  if (!uuidPattern.test(stageId)) fieldErrors.stageId = "Selecione a etapa de destino.";
  if (!uuidPattern.test(responsibleId)) fieldErrors.responsibleId = "Selecione um responsável.";
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Revise os campos destacados.", fieldErrors };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, message: "Sua sessão expirou. Entre novamente." };

  const [profileResult, opportunityResult, pipelineResult, stageResult, profilesResult] = await Promise.all([
    supabase.from("profiles").select("role, access_status").eq("id", userId).maybeSingle<{ role: "admin" | "pre_sales" | "commercial" | null; access_status: string }>(),
    supabase.from("opportunities").select("id, commercial_status").eq("id", opportunityId).maybeSingle(),
    supabase.from("pipelines").select("id, code").eq("id", pipelineId).maybeSingle(),
    supabase.from("pipeline_stages").select("id, pipeline_id, code").eq("id", stageId).maybeSingle(),
    supabase.rpc("list_assignable_profiles"),
  ]);

  const profile = profileResult.data;
  if (!profile || profile.access_status !== "active" || !profile.role) {
    return { ok: false, message: "Seu perfil não possui acesso a esta operação." };
  }
  if (!opportunityResult.data || opportunityResult.data.commercial_status === "active") {
    return { ok: false, message: "Esta negociação não está disponível no Histórico." };
  }
  if (opportunityResult.data.commercial_status === "won" && profile.role !== "admin") {
    return { ok: false, message: "Apenas Administradores podem reabrir negociações ganhas." };
  }
  if (!pipelineResult.data || !allowedPipelineCodes.has(pipelineResult.data.code)) {
    fieldErrors.pipelineId = "Selecione Pré-venda ou Venda.";
  }
  if (!stageResult.data || stageResult.data.pipeline_id !== pipelineId || !allowedStageCodes.has(stageResult.data.code)) {
    fieldErrors.stageId = "Selecione uma etapa válida para o funil.";
  }
  const assignableProfiles = (profilesResult.data ?? []) as Array<{ id: string }>;
  if (!assignableProfiles.some((item) => item.id === responsibleId)) {
    fieldErrors.responsibleId = "Selecione um responsável ativo habilitado.";
  }
  if (stageResult.data && scheduledStageCodes.has(stageResult.data.code)) {
    if (!datePattern.test(taskDueDate)) fieldErrors.taskDueDate = "Informe a data da atividade.";
    if (!timePattern.test(taskDueTime)) fieldErrors.taskDueTime = "Informe o horário da atividade.";
  }
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Revise os requisitos do destino.", fieldErrors };

  const { error } = await supabase.rpc("restore_opportunity", {
    request_key: requestKey,
    target_opportunity_id: opportunityId,
    target_pipeline_id: pipelineId,
    target_stage_id: stageId,
    target_responsible_id: responsibleId,
    task_due_date: scheduledStageCodes.has(stageResult.data!.code) ? taskDueDate : null,
    task_due_time: scheduledStageCodes.has(stageResult.data!.code) ? taskDueTime : null,
    task_note: scheduledStageCodes.has(stageResult.data!.code) ? taskNote : null,
  });

  if (error) {
    return {
      ok: false,
      message: safeDatabaseCodes.has(error.code ?? "")
        ? error.message
        : "Não foi possível restaurar a negociação. Tente novamente.",
    };
  }

  revalidatePath("/historico");
  revalidatePath("/oportunidades");
  revalidatePath(`/oportunidades/${opportunityId}`);
  return { ok: true, message: opportunityResult.data.commercial_status === "won" ? "Negociação reaberta com sucesso." : "Negociação restaurada com sucesso." };
}
