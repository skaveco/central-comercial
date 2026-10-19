"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type OpportunityField =
  | "name"
  | "responsibleId"
  | "pipelineId"
  | "stageId"
  | "companyId"
  | "contactId"
  | "sourceId"
  | "products"
  | "qualification"
  | "lossReasonId"
  | "finalValue"
  | "taskDueDate"
  | "taskDueTime";

export type CreateOpportunityState = {
  ok: boolean;
  message: string;
  opportunityId?: string;
  fieldErrors?: Partial<Record<OpportunityField, string>>;
};

type AppRole = "admin" | "pre_sales" | "commercial";
type PipelineCode = "pre_sales" | "sales" | "post_sales";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const saoPauloDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function parseSaoPauloLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const desiredWallClock = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
  let candidate = new Date(desiredWallClock);
  for (let iteration = 0; iteration < 2; iteration += 1) {
    const parts = Object.fromEntries(
      saoPauloDateTimeFormatter.formatToParts(candidate).map((part) => [part.type, part.value]),
    );
    const candidateWallClock = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    candidate = new Date(candidate.getTime() + desiredWallClock - candidateWallClock);
  }
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}

function optionalText(value: FormDataEntryValue | null, maxLength = 2_000) {
  const cleaned = String(value ?? "").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function optionalUuid(value: FormDataEntryValue | null) {
  const cleaned = String(value ?? "").trim();
  return cleaned && uuidPattern.test(cleaned) ? cleaned : null;
}

function parseCurrency(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(/\u00a0/g, " ");
  if (!raw) return { value: null, valid: true };

  const formatted = /^R\$\s\d{1,3}(?:\.\d{3})*,\d{2}$/;
  const decimal = /^\d{1,12}(?:[.,]\d{1,2})?$/;
  const number = formatted.test(raw)
    ? Number(raw.replace(/\D/g, "")) / 100
    : decimal.test(raw)
      ? Number(raw.replace(",", "."))
      : Number.NaN;

  return {
    value: Number.isFinite(number) && number >= 0 && number <= 999_999_999_999.99 ? number.toFixed(2) : null,
    valid: Number.isFinite(number) && number >= 0 && number <= 999_999_999_999.99,
  };
}

function roleCanAccessPipeline(role: AppRole, pipeline: PipelineCode) {
  return role === "admin" || pipeline !== "post_sales" || role === "commercial";
}

export async function createOpportunityAction(
  _previousState: CreateOpportunityState | null,
  formData: FormData,
): Promise<CreateOpportunityState> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 180);
  const requestKey = String(formData.get("requestKey") ?? "");
  const pipelineId = String(formData.get("pipelineId") ?? "");
  const stageId = String(formData.get("stageId") ?? "");
  const responsibleId = String(formData.get("responsibleId") ?? "");
  const companyId = optionalUuid(formData.get("companyId"));
  const contactId = optionalUuid(formData.get("contactId"));
  const sourceId = optionalUuid(formData.get("sourceId"));
  const lossReasonId = optionalUuid(formData.get("lossReasonId"));
  const description = optionalText(formData.get("description"));
  const closureNote = optionalText(formData.get("closureNote"));
  const taskNote = optionalText(formData.get("taskNote"));
  const expectedCloseDate = String(formData.get("expectedCloseDate") ?? "");
  const taskDueDate = String(formData.get("taskDueDate") ?? "");
  const taskDueTime = String(formData.get("taskDueTime") ?? "");
  const valueMode = formData.get("valueMode") === "manual" ? "manual" : "calculated";
  const finalValue = parseCurrency(formData.get("finalValue"));
  const fieldErrors: CreateOpportunityState["fieldErrors"] = {};

  if (!name) fieldErrors.name = "Informe o nome da oportunidade.";
  if (!uuidPattern.test(requestKey)) return { ok: false, message: "Não foi possível iniciar o cadastro. Abra o formulário novamente." };
  if (!uuidPattern.test(pipelineId)) fieldErrors.pipelineId = "Selecione um funil.";
  if (!uuidPattern.test(stageId)) fieldErrors.stageId = "Selecione uma etapa.";
  if (!uuidPattern.test(responsibleId)) fieldErrors.responsibleId = "Selecione um responsável.";
  if (formData.get("companyId") && !companyId) fieldErrors.companyId = "Selecione uma empresa válida.";
  if (formData.get("contactId") && !contactId) fieldErrors.contactId = "Selecione um contato válido.";
  if (formData.get("sourceId") && !sourceId) fieldErrors.sourceId = "Selecione uma origem válida.";
  if (valueMode === "manual" && (!finalValue.valid || finalValue.value === null)) fieldErrors.finalValue = "Informe um valor final válido.";
  if (expectedCloseDate && !datePattern.test(expectedCloseDate)) return { ok: false, message: "Informe uma previsão de fechamento válida." };
  if (taskDueDate && !datePattern.test(taskDueDate)) fieldErrors.taskDueDate = "Informe uma data válida.";
  if (taskDueTime && !timePattern.test(taskDueTime)) fieldErrors.taskDueTime = "Informe um horário válido.";
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Revise os campos destacados.", fieldErrors };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, message: "Sua sessão expirou. Entre novamente." };

  const [profileResult, pipelineResult, stageResult, assignableProfilesResult] = await Promise.all([
    supabase.from("profiles").select("role, access_status").eq("id", userId).maybeSingle<{ role: AppRole | null; access_status: string }>(),
    supabase.from("pipelines").select("id, code").eq("id", pipelineId).maybeSingle<{ id: string; code: PipelineCode }>(),
    supabase.from("pipeline_stages").select("id, pipeline_id, code").eq("id", stageId).maybeSingle<{ id: string; pipeline_id: string; code: string }>(),
    supabase.rpc("list_assignable_profiles"),
  ]);

  const profile = profileResult.data;
  const pipeline = pipelineResult.data;
  const stage = stageResult.data;
  const responsible = (assignableProfilesResult.data as Array<{ id: string; role: AppRole | null }> | null)?.find((item) => item.id === responsibleId);
  if (!profile || profile.access_status !== "active" || !profile.role) return { ok: false, message: "Você não tem permissão para criar oportunidades." };
  if (!pipeline || !roleCanAccessPipeline(profile.role, pipeline.code)) return { ok: false, message: "Você não pode operar o funil selecionado.", fieldErrors: { pipelineId: "Funil indisponível." } };
  if (!stage || stage.pipeline_id !== pipeline.id) return { ok: false, message: "A etapa não pertence ao funil selecionado.", fieldErrors: { stageId: "Selecione novamente a etapa." } };
  if (!responsible || !responsible.role || !roleCanAccessPipeline(responsible.role, pipeline.code)) {
    return { ok: false, message: "Selecione um responsável ativo habilitado para este funil.", fieldErrors: { responsibleId: "Responsável indisponível." } };
  }

  const selectedProductIds = [...new Set(formData.getAll("productId").map(String).filter((id) => uuidPattern.test(id)))];
  const productItems: Array<{ product_id: string; quantity: number }> = [];
  let calculatedTotal = 0;
  if (selectedProductIds.length) {
    const { data: products, error } = await supabase
      .from("products")
      .select("id, base_price, is_active")
      .in("id", selectedProductIds);
    if (error || products?.length !== selectedProductIds.length) return { ok: false, message: "Não foi possível validar os produtos selecionados.", fieldErrors: { products: "Revise a seleção." } };

    for (const product of products) {
      const quantity = Number(formData.get(`quantity:${product.id}`));
      if (!product.is_active || product.base_price === null || !Number.isInteger(quantity) || quantity <= 0) {
        fieldErrors.products = "Use apenas produtos ativos com valor base e quantidade inteira maior que zero.";
        break;
      }
      productItems.push({ product_id: product.id, quantity });
      calculatedTotal += Number(product.base_price) * quantity;
    }
  }

  const qualificationAnswers = formData
    .getAll("qualificationParameterId")
    .map(String)
    .filter((id) => uuidPattern.test(id))
    .flatMap((parameterId) => {
      const answer = formData.get(`qualification:${parameterId}`);
      return answer === "true" || answer === "false" ? [{ parameter_id: parameterId, answer: answer === "true" }] : [];
    });
  const needsQualification = pipeline.code === "sales" || pipeline.code === "post_sales" || stage.code === "scheduled";
  const needsWonData = pipeline.code === "post_sales" || stage.code === "won";
  const needsTaskSchedule = stage.code === "scheduled" || stage.code === "diagnosis" || stage.code === "negotiation" || stage.code === "follow_up";

  if (needsQualification && qualificationAnswers.length < 2) fieldErrors.qualification = "Responda ao menos dois parâmetros ativos.";
  if (needsWonData && !companyId) fieldErrors.companyId = "Empresa obrigatória para Ganho ou Pós-venda.";
  if (needsWonData && !contactId) fieldErrors.contactId = "Contato obrigatório para Ganho ou Pós-venda.";
  if (needsWonData && productItems.length === 0) fieldErrors.products = "Selecione ao menos um produto válido.";
  if (needsWonData && valueMode === "manual" && Number(finalValue.value) <= 0) fieldErrors.finalValue = "O valor final deve ser maior que zero.";
  if (needsWonData && valueMode === "calculated" && calculatedTotal <= 0) fieldErrors.products = fieldErrors.products ?? "O valor calculado deve ser maior que zero.";
  if (stage.code === "lost" && !lossReasonId) fieldErrors.lossReasonId = "Selecione um motivo da perda.";
  if (needsTaskSchedule && !taskDueDate) fieldErrors.taskDueDate = "Informe a data da tarefa.";
  if (needsTaskSchedule && !taskDueTime) fieldErrors.taskDueTime = "Informe o horário da tarefa.";
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Revise os requisitos da etapa escolhida.", fieldErrors };

  const optionalChecks = [
    companyId ? supabase.from("companies").select("id").eq("id", companyId).eq("is_active", true).maybeSingle() : Promise.resolve({ data: {}, error: null }),
    contactId ? supabase.from("contacts").select("id").eq("id", contactId).eq("is_active", true).maybeSingle() : Promise.resolve({ data: {}, error: null }),
    sourceId ? supabase.from("opportunity_sources").select("id").eq("id", sourceId).eq("is_active", true).maybeSingle() : Promise.resolve({ data: {}, error: null }),
    lossReasonId ? supabase.from("loss_reasons").select("id").eq("id", lossReasonId).eq("is_active", true).maybeSingle() : Promise.resolve({ data: {}, error: null }),
  ];
  const [companyCheck, contactCheck, sourceCheck, lossReasonCheck] = await Promise.all(optionalChecks);
  if (companyId && (!companyCheck.data || companyCheck.error)) fieldErrors.companyId = "Empresa ativa não encontrada.";
  if (contactId && (!contactCheck.data || contactCheck.error)) fieldErrors.contactId = "Contato ativo não encontrado.";
  if (sourceId && (!sourceCheck.data || sourceCheck.error)) fieldErrors.sourceId = "Origem ativa não encontrada.";
  if (lossReasonId && (!lossReasonCheck.data || lossReasonCheck.error)) fieldErrors.lossReasonId = "Motivo ativo não encontrado.";
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Alguns vínculos não estão mais disponíveis.", fieldErrors };

  const { data, error } = await supabase.rpc("create_opportunity", {
    request_key: requestKey,
    opportunity_name: name,
    target_pipeline_id: pipeline.id,
    target_stage_id: stage.id,
    target_responsible_id: responsible.id,
    target_company_id: companyId,
    target_contact_id: contactId,
    target_source_id: sourceId,
    opportunity_description: description,
    target_expected_close_date: expectedCloseDate || null,
    target_value_mode: valueMode,
    requested_final_value: valueMode === "manual" ? finalValue.value : null,
    product_items: productItems,
    qualification_answers: qualificationAnswers,
    target_loss_reason_id: lossReasonId,
    closure_note: closureNote,
    task_due_date: taskDueDate || null,
    task_due_time: taskDueTime || null,
    task_note: taskNote,
  });

  if (error) {
    const safeDatabaseCodes = new Set(["22023", "23514", "42501"]);
    return { ok: false, message: safeDatabaseCodes.has(error.code ?? "") ? error.message : "Não foi possível criar a oportunidade. Tente novamente." };
  }

  const result = data as { opportunity_id?: string } | null;
  revalidatePath("/oportunidades");
  return { ok: true, message: "Oportunidade criada com sucesso.", opportunityId: result?.opportunity_id };
}

type MoveOpportunityField =
  | "companyId"
  | "contactId"
  | "responsibleId"
  | "products"
  | "qualification"
  | "lossReasonId"
  | "finalValue"
  | "taskDueDate"
  | "taskDueTime";

export type MoveOpportunityState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<MoveOpportunityField, string>>;
};

export async function moveOpportunityAction(
  _previousState: MoveOpportunityState | null,
  formData: FormData,
): Promise<MoveOpportunityState> {
  const requestKey = String(formData.get("requestKey") ?? "");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const targetStageId = String(formData.get("targetStageId") ?? "");
  const fieldErrors: MoveOpportunityState["fieldErrors"] = {};

  if (!uuidPattern.test(requestKey) || !uuidPattern.test(opportunityId) || !uuidPattern.test(targetStageId)) {
    return { ok: false, message: "Não foi possível identificar a movimentação. Tente novamente." };
  }

  const taskDueDate = String(formData.get("taskDueDate") ?? "");
  const taskDueTime = String(formData.get("taskDueTime") ?? "");
  const taskNote = optionalText(formData.get("taskNote"));
  const closureNote = optionalText(formData.get("closureNote"));
  if (taskDueDate && !datePattern.test(taskDueDate)) fieldErrors.taskDueDate = "Informe uma data válida.";
  if (taskDueTime && !timePattern.test(taskDueTime)) fieldErrors.taskDueTime = "Informe um horário válido.";
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Revise os campos destacados.", fieldErrors };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, message: "Sua sessão expirou. Entre novamente." };

  const [profileResult, opportunityResult, stageResult, pipelinesResult] = await Promise.all([
    supabase.from("profiles").select("role, access_status").eq("id", userId).maybeSingle<{ role: AppRole | null; access_status: string }>(),
    supabase
      .from("opportunities")
      .select("id, current_pipeline_id, current_stage_id, commercial_status, post_sale_status")
      .eq("id", opportunityId)
      .maybeSingle<{
        id: string;
        current_pipeline_id: string | null;
        current_stage_id: string | null;
        commercial_status: string;
        post_sale_status: string | null;
      }>(),
    supabase
      .from("pipeline_stages")
      .select("id, pipeline_id, code")
      .eq("id", targetStageId)
      .maybeSingle<{ id: string; pipeline_id: string; code: string }>(),
    supabase.from("pipelines").select("id, code"),
  ]);

  const profile = profileResult.data;
  const opportunity = opportunityResult.data;
  const targetStage = stageResult.data;
  const targetPipeline = (pipelinesResult.data as Array<{ id: string; code: PipelineCode }> | null)?.find(
    (pipeline) => pipeline.id === targetStage?.pipeline_id,
  );
  const currentPipeline = (pipelinesResult.data as Array<{ id: string; code: PipelineCode }> | null)?.find(
    (pipeline) => pipeline.id === opportunity?.current_pipeline_id,
  );

  if (!profile || profile.access_status !== "active" || !profile.role) {
    return { ok: false, message: "Você não tem permissão para movimentar oportunidades." };
  }
  if (!opportunity || !currentPipeline) return { ok: false, message: "Oportunidade indisponível." };
  if (!targetStage || !targetPipeline || !roleCanAccessPipeline(profile.role, targetPipeline.code)) {
    return { ok: false, message: "Etapa de destino indisponível." };
  }
  if (opportunity.current_stage_id === targetStage.id) {
    return { ok: false, message: "A oportunidade já está nesta etapa." };
  }
  if (targetPipeline.id !== currentPipeline.id) {
    return { ok: false, message: "A transferência entre funis deve usar a etapa de saída correspondente." };
  }

  const needsTaskSchedule = ["scheduled", "diagnosis", "negotiation", "follow_up"].includes(targetStage.code);
  if (needsTaskSchedule && !taskDueDate) fieldErrors.taskDueDate = "Informe a data da próxima tarefa.";
  if (needsTaskSchedule && !taskDueTime) fieldErrors.taskDueTime = "Informe o horário da próxima tarefa.";

  let rpcName: "move_opportunity" | "transfer_to_sales" | "close_opportunity" | "move_post_sale" | "win_opportunity";
  let rpcArguments: Record<string, unknown>;

  if (currentPipeline.code === "post_sales") {
    if (opportunity.commercial_status !== "won" || opportunity.post_sale_status !== "active") {
      return { ok: false, message: "O acompanhamento de Pós-venda não está ativo." };
    }
    rpcName = "move_post_sale";
    rpcArguments = {
      request_key: requestKey,
      target_opportunity_id: opportunity.id,
      target_stage_id: targetStage.id,
      follow_up_due_date: taskDueDate || null,
      follow_up_due_time: taskDueTime || null,
      follow_up_note: taskNote,
    };
  } else if (targetStage.code === "scheduled") {
    const responsibleId = String(formData.get("responsibleId") ?? "");
    if (!uuidPattern.test(responsibleId)) fieldErrors.responsibleId = "Selecione um responsável.";

    const qualificationAnswers = [...new Set(formData.getAll("qualificationParameterId").map(String))]
      .filter((id) => uuidPattern.test(id))
      .flatMap((parameterId) => {
        const answer = formData.get(`qualification:${parameterId}`);
        return answer === "true" || answer === "false" ? [{ parameter_id: parameterId, answer: answer === "true" }] : [];
      });
    if (qualificationAnswers.length < 2) fieldErrors.qualification = "Responda ao menos dois parâmetros ativos.";

    rpcName = "transfer_to_sales";
    rpcArguments = {
      request_key: requestKey,
      target_opportunity_id: opportunity.id,
      target_responsible_id: responsibleId,
      qualification_answers: qualificationAnswers,
      diagnosis_due_date: taskDueDate || null,
      diagnosis_due_time: taskDueTime || null,
      diagnosis_note: taskNote,
    };
  } else if (targetStage.code === "won") {
    const companyId = String(formData.get("companyId") ?? "");
    const contactId = String(formData.get("contactId") ?? "");
    const responsibleId = String(formData.get("responsibleId") ?? "");
    const valueMode = formData.get("valueMode") === "manual" ? "manual" : "calculated";
    const finalValue = parseCurrency(formData.get("finalValue"));
    if (!uuidPattern.test(companyId)) fieldErrors.companyId = "Selecione uma empresa ativa.";
    if (!uuidPattern.test(contactId)) fieldErrors.contactId = "Selecione um contato ativo.";
    if (!uuidPattern.test(responsibleId)) fieldErrors.responsibleId = "Selecione um responsável ativo.";
    if (valueMode === "manual" && (!finalValue.valid || finalValue.value === null || Number(finalValue.value) <= 0)) {
      fieldErrors.finalValue = "Informe um valor final maior que zero.";
    }

    const selectedProductIds = [...new Set(formData.getAll("productId").map(String).filter((id) => uuidPattern.test(id)))];
    const productItems: Array<{ product_id: string; quantity: number }> = [];
    let calculatedTotal = 0;
    if (!selectedProductIds.length) {
      fieldErrors.products = "Selecione ao menos um produto.";
    } else {
      const [linkedResult, catalogResult] = await Promise.all([
        supabase
          .from("opportunity_products")
          .select("product_id, unit_price")
          .eq("opportunity_id", opportunity.id)
          .in("product_id", selectedProductIds),
        supabase
          .from("products")
          .select("id, base_price, is_active")
          .in("id", selectedProductIds),
      ]);
      const linkedPrices = new Map((linkedResult.data ?? []).map((product) => [product.product_id, Number(product.unit_price)]));
      const catalogProducts = new Map((catalogResult.data ?? []).map((product) => [product.id, product]));

      for (const productId of selectedProductIds) {
        const quantity = Number(formData.get(`quantity:${productId}`));
        const catalogProduct = catalogProducts.get(productId);
        const unitPrice = linkedPrices.get(productId) ?? Number(catalogProduct?.base_price);
        const canLink = linkedPrices.has(productId) || Boolean(catalogProduct?.is_active && catalogProduct.base_price !== null);
        if (!canLink || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(unitPrice)) {
          fieldErrors.products = "Use produtos disponíveis e quantidades inteiras maiores que zero.";
          break;
        }
        productItems.push({ product_id: productId, quantity });
        calculatedTotal += unitPrice * quantity;
      }
    }
    if (valueMode === "calculated" && calculatedTotal <= 0) {
      fieldErrors.products = fieldErrors.products ?? "O valor calculado deve ser maior que zero.";
    }

    const [companyCheck, contactCheck, profilesCheck] = await Promise.all([
      uuidPattern.test(companyId)
        ? supabase.from("companies").select("id").eq("id", companyId).eq("is_active", true).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      uuidPattern.test(contactId)
        ? supabase.from("contacts").select("id").eq("id", contactId).eq("is_active", true).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.rpc("list_assignable_profiles"),
    ]);
    if (uuidPattern.test(companyId) && (!companyCheck.data || companyCheck.error)) fieldErrors.companyId = "Empresa ativa não encontrada.";
    if (uuidPattern.test(contactId) && (!contactCheck.data || contactCheck.error)) fieldErrors.contactId = "Contato ativo não encontrado.";
    if (!(profilesCheck.data as Array<{ id: string }> | null)?.some((item) => item.id === responsibleId)) {
      fieldErrors.responsibleId = "Responsável ativo não encontrado.";
    }

    rpcName = "win_opportunity";
    rpcArguments = {
      request_key: requestKey,
      target_opportunity_id: opportunity.id,
      target_company_id: companyId,
      target_contact_id: contactId,
      target_responsible_id: responsibleId,
      product_items: productItems,
      requested_value_mode: valueMode,
      requested_final_value: valueMode === "manual" ? finalValue.value : null,
    };
  } else if (["lost", "disqualified", "no_response"].includes(targetStage.code)) {
    const lossReasonId = optionalUuid(formData.get("lossReasonId"));
    if (targetStage.code === "lost" && !lossReasonId) fieldErrors.lossReasonId = "Selecione um motivo da perda.";
    rpcName = "close_opportunity";
    rpcArguments = {
      request_key: requestKey,
      target_opportunity_id: opportunity.id,
      closure_result: targetStage.code === "lost" ? "lost" : targetStage.code === "disqualified" ? "disqualified" : "archived",
      target_loss_reason_id: lossReasonId,
      closure_note: closureNote,
    };
  } else {
    rpcName = "move_opportunity";
    rpcArguments = {
      request_key: requestKey,
      target_opportunity_id: opportunity.id,
      target_pipeline_id: targetPipeline.id,
      target_stage_id: targetStage.id,
      task_due_date: taskDueDate || null,
      task_due_time: taskDueTime || null,
      task_note: taskNote,
    };
  }

  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: "Revise os requisitos da etapa escolhida.", fieldErrors };
  }

  const { error } = await supabase.rpc(rpcName, rpcArguments);
  if (error) {
    const safeDatabaseCodes = new Set(["22023", "23505", "23514", "42501"]);
    return {
      ok: false,
      message: safeDatabaseCodes.has(error.code ?? "")
        ? error.message
        : "Não foi possível movimentar a oportunidade. Tente novamente.",
    };
  }

  revalidatePath("/oportunidades");
  revalidatePath(`/oportunidades/${opportunity.id}`);
  return {
    ok: true,
    message: targetStage.code === "won"
      ? "Venda confirmada e Onboarding iniciado."
      : `Oportunidade movida para ${targetStage.code === "scheduled" ? "Venda · Diagnóstico" : "a etapa selecionada"}.`,
  };
}

export type RegisterOpportunityContactState = {
  ok: boolean;
  message: string;
};

const contactChannels = new Set(["whatsapp", "phone", "email", "online_meeting", "in_person_meeting", "other"]);

export async function registerOpportunityContactAction(
  _previousState: RegisterOpportunityContactState | null,
  formData: FormData,
): Promise<RegisterOpportunityContactState> {
  const requestKey = String(formData.get("requestKey") ?? "");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const channel = String(formData.get("channel") ?? "");
  const localOccurredAt = String(formData.get("occurredAt") ?? "");
  const notes = optionalText(formData.get("notes"));

  if (!uuidPattern.test(requestKey) || !uuidPattern.test(opportunityId)) {
    return { ok: false, message: "Não foi possível identificar a oportunidade." };
  }
  if (!contactChannels.has(channel)) return { ok: false, message: "Selecione um canal de contato válido." };
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localOccurredAt)) {
    return { ok: false, message: "Informe a data e o horário do contato." };
  }

  const occurredAt = parseSaoPauloLocalDateTime(localOccurredAt);
  if (!occurredAt || occurredAt.getTime() > Date.now()) {
    return { ok: false, message: "A data do contato deve ser válida e não pode estar no futuro." };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) return { ok: false, message: "Sua sessão expirou. Entre novamente." };

  const { error } = await supabase.rpc("register_contact", {
    request_key: requestKey,
    target_opportunity_id: opportunityId,
    contact_channel_value: channel,
    contact_occurred_at: occurredAt.toISOString(),
    contact_notes: notes,
  });
  if (error) {
    const safeDatabaseCodes = new Set(["22007", "22023", "23514", "42501"]);
    return {
      ok: false,
      message: safeDatabaseCodes.has(error.code ?? "") ? error.message : "Não foi possível registrar o contato.",
    };
  }

  revalidatePath("/oportunidades");
  revalidatePath(`/oportunidades/${opportunityId}`);
  return { ok: true, message: "Contato registrado com sucesso." };
}

export type OpportunityDetailActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<
    | "body"
    | "companyId"
    | "contactId"
    | "dueDate"
    | "expectedCloseDate"
    | "finalValue"
    | "name"
    | "products"
    | "qualification"
    | "responsibleId"
    | "sourceId"
    | "temperature"
    | "title"
    | "type",
    string
  >>;
};

const taskTypes = new Set(["first_contact", "qualification", "follow_up", "scheduling", "proposal", "management"]);

function refreshOpportunity(opportunityId: string) {
  revalidatePath("/oportunidades");
  revalidatePath(`/oportunidades/${opportunityId}`);
}

export async function addOpportunityNoteAction(
  _previousState: OpportunityDetailActionState | null,
  formData: FormData,
): Promise<OpportunityDetailActionState> {
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 4_000);
  if (!uuidPattern.test(opportunityId)) return { ok: false, message: "Oportunidade inválida." };
  if (!body) return { ok: false, message: "Escreva uma nota antes de salvar.", fieldErrors: { body: "A nota não pode ficar vazia." } };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, message: "Sua sessão expirou. Entre novamente." };

  const { error } = await supabase.from("opportunity_notes").insert({
    opportunity_id: opportunityId,
    body,
    created_by: userId,
    updated_by: userId,
  });
  if (error) return { ok: false, message: "Não foi possível adicionar a nota nesta oportunidade." };
  refreshOpportunity(opportunityId);
  return { ok: true, message: "Nota adicionada com sucesso." };
}

export async function deleteOpportunityNoteAction(
  opportunityId: string,
  noteId: string,
): Promise<OpportunityDetailActionState> {
  if (!uuidPattern.test(opportunityId) || !uuidPattern.test(noteId)) return { ok: false, message: "Nota inválida." };
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const { data, error } = await supabase
    .from("opportunity_notes")
    .update({ deleted_at: new Date().toISOString(), deleted_by: userId, updated_by: userId })
    .eq("id", noteId)
    .eq("opportunity_id", opportunityId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "Não foi possível excluir a nota." };
  refreshOpportunity(opportunityId);
  return { ok: true, message: "Nota excluída com sucesso." };
}

export async function createOpportunityTaskAction(
  _previousState: OpportunityDetailActionState | null,
  formData: FormData,
): Promise<OpportunityDetailActionState> {
  const requestKey = String(formData.get("requestKey") ?? "");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 180);
  const type = String(formData.get("type") ?? "");
  const responsibleId = String(formData.get("responsibleId") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "");
  const dueTime = String(formData.get("dueTime") ?? "");
  const description = optionalText(formData.get("description"));
  const fieldErrors: OpportunityDetailActionState["fieldErrors"] = {};

  if (!uuidPattern.test(requestKey) || !uuidPattern.test(opportunityId)) return { ok: false, message: "Não foi possível identificar a tarefa." };
  if (!title) fieldErrors.title = "Informe o nome da tarefa.";
  if (!taskTypes.has(type)) fieldErrors.type = "Selecione um tipo válido.";
  if (!uuidPattern.test(responsibleId)) fieldErrors.responsibleId = "Selecione um responsável.";
  if (!datePattern.test(dueDate)) fieldErrors.dueDate = "Informe uma data válida.";
  if (dueTime && !timePattern.test(dueTime)) fieldErrors.dueDate = "Informe um horário válido.";
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Revise os campos destacados.", fieldErrors };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) return { ok: false, message: "Sua sessão expirou. Entre novamente." };

  const { error } = await supabase.rpc("create_task", {
    request_key: requestKey,
    task_title: title,
    task_type_value: type,
    target_responsible_id: responsibleId,
    target_due_date: dueDate,
    target_due_time: dueTime || null,
    task_description: description,
    target_opportunity_id: opportunityId,
    target_company_id: null,
    target_contact_id: null,
    target_post_sale_cycle_id: null,
  });
  if (error) {
    const safeDatabaseCodes = new Set(["22023", "23514", "42501"]);
    return { ok: false, message: safeDatabaseCodes.has(error.code ?? "") ? error.message : "Não foi possível criar a tarefa." };
  }
  refreshOpportunity(opportunityId);
  return { ok: true, message: "Tarefa criada com sucesso." };
}

export async function saveOpportunityQualificationAction(
  _previousState: OpportunityDetailActionState | null,
  formData: FormData,
): Promise<OpportunityDetailActionState> {
  const requestKey = String(formData.get("requestKey") ?? "");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  if (!uuidPattern.test(requestKey) || !uuidPattern.test(opportunityId)) {
    return { ok: false, message: "Não foi possível identificar a oportunidade." };
  }

  const parameterIds = [...new Set(
    formData.getAll("parameterId").map(String).filter((id) => uuidPattern.test(id)),
  )];
  const qualificationAnswers = parameterIds.flatMap((parameterId) => {
    const answer = String(formData.get(`answer:${parameterId}`) ?? "");
    if (answer !== "true" && answer !== "false") return [];
    return [{ parameter_id: parameterId, answer: answer === "true" }];
  });
  if (!qualificationAnswers.length) {
    return {
      ok: false,
      message: "Responda ao menos um critério antes de salvar.",
      fieldErrors: { qualification: "Selecione Sim ou Não em pelo menos um critério." },
    };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  }

  const { error } = await supabase.rpc("set_qualification_answers", {
    request_key: requestKey,
    target_opportunity_id: opportunityId,
    qualification_answers: qualificationAnswers,
  });
  if (error) {
    const safeDatabaseCodes = new Set(["22023", "23514", "42501"]);
    return {
      ok: false,
      message: safeDatabaseCodes.has(error.code ?? "")
        ? error.message
        : "Não foi possível atualizar a qualificação.",
    };
  }

  refreshOpportunity(opportunityId);
  return { ok: true, message: "Qualificação atualizada com sucesso." };
}

export async function updateOpportunityDetailsAction(
  _previousState: OpportunityDetailActionState | null,
  formData: FormData,
): Promise<OpportunityDetailActionState> {
  const requestKey = String(formData.get("requestKey") ?? "");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 180);
  const rawCompanyId = String(formData.get("companyId") ?? "");
  const rawContactId = String(formData.get("contactId") ?? "");
  const rawSourceId = String(formData.get("sourceId") ?? "");
  const companyId = optionalUuid(formData.get("companyId"));
  const contactId = optionalUuid(formData.get("contactId"));
  const sourceId = optionalUuid(formData.get("sourceId"));
  const description = optionalText(formData.get("description"));
  const expectedCloseDate = String(formData.get("expectedCloseDate") ?? "");
  const temperature = String(formData.get("temperature") ?? "");
  const fieldErrors: OpportunityDetailActionState["fieldErrors"] = {};

  if (!uuidPattern.test(requestKey) || !uuidPattern.test(opportunityId)) {
    return { ok: false, message: "Não foi possível identificar a oportunidade." };
  }
  if (!name) fieldErrors.name = "Informe o nome da oportunidade.";
  if (rawCompanyId && !companyId) fieldErrors.companyId = "Selecione uma empresa válida.";
  if (rawContactId && !contactId) fieldErrors.contactId = "Selecione um contato válido.";
  if (rawSourceId && !sourceId) fieldErrors.sourceId = "Selecione uma origem válida.";
  if (expectedCloseDate && !datePattern.test(expectedCloseDate)) {
    fieldErrors.expectedCloseDate = "Informe uma data válida.";
  }
  if (temperature && !["cold", "warm", "hot"].includes(temperature)) {
    fieldErrors.temperature = "Selecione uma temperatura válida.";
  }
  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: "Revise os campos destacados.", fieldErrors };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  }

  const { error } = await supabase.rpc("update_opportunity_details", {
    request_key: requestKey,
    target_opportunity_id: opportunityId,
    opportunity_name: name,
    target_company_id: companyId,
    target_contact_id: contactId,
    target_source_id: sourceId,
    opportunity_description: description,
    target_expected_close_date: expectedCloseDate || null,
    target_temperature: temperature || null,
  });
  if (error) {
    const safeDatabaseCodes = new Set(["22007", "22023", "23514", "42501"]);
    return {
      ok: false,
      message: safeDatabaseCodes.has(error.code ?? "")
        ? error.message
        : "Não foi possível atualizar os dados da oportunidade.",
    };
  }

  refreshOpportunity(opportunityId);
  return { ok: true, message: "Oportunidade atualizada com sucesso." };
}

export async function changeOpportunityResponsibleAction(
  _previousState: OpportunityDetailActionState | null,
  formData: FormData,
): Promise<OpportunityDetailActionState> {
  const requestKey = String(formData.get("requestKey") ?? "");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const responsibleId = String(formData.get("responsibleId") ?? "");
  if (!uuidPattern.test(requestKey) || !uuidPattern.test(opportunityId)) {
    return { ok: false, message: "Não foi possível identificar a oportunidade." };
  }
  if (!uuidPattern.test(responsibleId)) {
    return {
      ok: false,
      message: "Revise o responsável selecionado.",
      fieldErrors: { responsibleId: "Selecione um responsável válido." },
    };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  }

  const [{ data: opportunity }, { data: assignableProfiles }] = await Promise.all([
    supabase
      .from("opportunities")
      .select("current_pipeline_id")
      .eq("id", opportunityId)
      .maybeSingle<{ current_pipeline_id: string | null }>(),
    supabase.rpc("list_assignable_profiles"),
  ]);
  if (!opportunity?.current_pipeline_id) {
    return { ok: false, message: "Oportunidade indisponível para troca de responsável." };
  }
  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("code")
    .eq("id", opportunity.current_pipeline_id)
    .maybeSingle<{ code: PipelineCode }>();
  const responsible = (assignableProfiles as Array<{ id: string; role: AppRole | null }> | null)
    ?.find((profile) => profile.id === responsibleId);
  if (!pipeline || !responsible?.role || !roleCanAccessPipeline(responsible.role, pipeline.code)) {
    return {
      ok: false,
      message: "Selecione um responsável ativo habilitado para este funil.",
      fieldErrors: { responsibleId: "Responsável indisponível para o funil atual." },
    };
  }

  const { error } = await supabase.rpc("change_opportunity_responsible", {
    request_key: requestKey,
    target_opportunity_id: opportunityId,
    target_responsible_id: responsibleId,
  });
  if (error) {
    const safeDatabaseCodes = new Set(["22023", "23514", "42501"]);
    return {
      ok: false,
      message: safeDatabaseCodes.has(error.code ?? "")
        ? error.message
        : "Não foi possível trocar o responsável.",
    };
  }

  refreshOpportunity(opportunityId);
  return { ok: true, message: "Responsável alterado com sucesso." };
}

export async function saveOpportunityProductsAction(
  _previousState: OpportunityDetailActionState | null,
  formData: FormData,
): Promise<OpportunityDetailActionState> {
  const requestKey = String(formData.get("requestKey") ?? "");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  if (!uuidPattern.test(requestKey) || !uuidPattern.test(opportunityId)) return { ok: false, message: "Não foi possível identificar a oportunidade." };

  const selectedIds = [...new Set(formData.getAll("productId").map(String).filter((id) => uuidPattern.test(id)))];
  const productItems: Array<{ product_id: string; quantity: number }> = [];
  for (const productId of selectedIds) {
    const quantity = Number(formData.get(`quantity:${productId}`));
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { ok: false, message: "Use quantidades inteiras maiores que zero.", fieldErrors: { products: "Revise as quantidades." } };
    }
    productItems.push({ product_id: productId, quantity });
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const [{ data: opportunity }, { data: catalogProducts }] = await Promise.all([
    supabase.from("opportunities").select("value_mode, final_value").eq("id", opportunityId).maybeSingle<{ value_mode: "calculated" | "manual"; final_value: number | string | null }>(),
    selectedIds.length ? supabase.from("products").select("id, base_price, is_active").in("id", selectedIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (!opportunity) return { ok: false, message: "Oportunidade indisponível." };
  if ((catalogProducts ?? []).length !== selectedIds.length || (catalogProducts ?? []).some((product) => !product.is_active || product.base_price === null)) {
    return { ok: false, message: "Um dos produtos selecionados não está mais disponível.", fieldErrors: { products: "Revise os produtos." } };
  }

  const { error } = await supabase.rpc("set_opportunity_products", {
    request_key: requestKey,
    target_opportunity_id: opportunityId,
    product_items: productItems,
    requested_value_mode: opportunity.value_mode,
    requested_final_value: opportunity.value_mode === "manual" ? opportunity.final_value : null,
  });
  if (error) {
    const safeDatabaseCodes = new Set(["22023", "23514", "42501"]);
    return { ok: false, message: safeDatabaseCodes.has(error.code ?? "") ? error.message : "Não foi possível atualizar os produtos." };
  }
  refreshOpportunity(opportunityId);
  return { ok: true, message: "Produtos atualizados com sucesso." };
}

export async function setOpportunityValueAction(
  _previousState: OpportunityDetailActionState | null,
  formData: FormData,
): Promise<OpportunityDetailActionState> {
  const requestKey = String(formData.get("requestKey") ?? "");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const valueMode = String(formData.get("valueMode") ?? "");
  const finalValue = parseCurrency(formData.get("finalValue"));

  if (!uuidPattern.test(requestKey) || !uuidPattern.test(opportunityId)) {
    return { ok: false, message: "Não foi possível identificar a oportunidade." };
  }
  if (valueMode !== "calculated" && valueMode !== "manual") {
    return { ok: false, message: "Tipo de valor inválido." };
  }
  if (valueMode === "manual" && (!finalValue.valid || finalValue.value === null)) {
    return {
      ok: false,
      message: "Revise o valor informado.",
      fieldErrors: { finalValue: "Informe um valor final válido." },
    };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  }

  const { error } = await supabase.rpc("set_opportunity_value", {
    request_key: requestKey,
    target_opportunity_id: opportunityId,
    requested_value_mode: valueMode,
    requested_final_value: valueMode === "manual" ? finalValue.value : null,
  });
  if (error) {
    const safeDatabaseCodes = new Set(["22023", "23514", "42501"]);
    return {
      ok: false,
      message: safeDatabaseCodes.has(error.code ?? "")
        ? error.message
        : "Não foi possível atualizar o valor da oportunidade.",
    };
  }

  refreshOpportunity(opportunityId);
  return {
    ok: true,
    message: valueMode === "manual"
      ? "Valor final atualizado com sucesso."
      : "Valor recalculado pelos produtos.",
  };
}

export type OpportunityAttachmentActionState = { ok: boolean; message: string };

const opportunityAttachmentMimeTypes = new Map([
  ["pdf", "application/pdf"],
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["svg", "image/svg+xml"],
]);

function opportunityAttachmentExtension(fileName: string) {
  return fileName.split(".").at(-1)?.toLocaleLowerCase("pt-BR") ?? "";
}

function validOpportunityAttachmentPath(opportunityId: string, objectPath: string, expectedMimeType?: string) {
  const [parentId, objectName, extra] = objectPath.split("/");
  const [objectId, extension, extraExtension] = (objectName ?? "").split(".");
  return parentId === opportunityId
    && uuidPattern.test(objectId ?? "")
    && !extra
    && !extraExtension
    && Boolean(extension && opportunityAttachmentMimeTypes.has(extension))
    && (!expectedMimeType || opportunityAttachmentMimeTypes.get(extension) === expectedMimeType);
}

export async function registerOpportunityAttachmentAction(input: {
  opportunityId: string;
  mimeType: string;
  objectPath: string;
  originalName: string;
  sizeBytes: number;
}): Promise<OpportunityAttachmentActionState> {
  const originalName = input.originalName.trim();
  const originalMimeType = opportunityAttachmentMimeTypes.get(opportunityAttachmentExtension(originalName));
  if (
    !uuidPattern.test(input.opportunityId)
    || !originalName
    || originalMimeType !== input.mimeType
    || !Number.isSafeInteger(input.sizeBytes)
    || input.sizeBytes <= 0
    || input.sizeBytes > 20 * 1024 * 1024
    || !validOpportunityAttachmentPath(input.opportunityId, input.objectPath, input.mimeType)
  ) return { ok: false, message: "Os dados do anexo são inválidos." };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const { error } = await supabase.rpc("register_attachment", {
    request_key: crypto.randomUUID(),
    target_bucket_id: "opportunity-attachments",
    target_object_path: input.objectPath,
    target_original_name: originalName,
    target_mime_type: input.mimeType,
    target_size_bytes: input.sizeBytes,
    target_company_id: null,
    target_opportunity_id: input.opportunityId,
  });
  if (error) {
    await supabase.storage.from("opportunity-attachments").remove([input.objectPath]);
    return { ok: false, message: "O arquivo foi enviado, mas não pôde ser registrado." };
  }
  refreshOpportunity(input.opportunityId);
  return { ok: true, message: "Anexo adicionado com sucesso." };
}

export async function removeOpportunityAttachmentAction(
  opportunityId: string,
  attachmentId: string,
): Promise<OpportunityAttachmentActionState> {
  if (!uuidPattern.test(opportunityId) || !uuidPattern.test(attachmentId)) return { ok: false, message: "Anexo inválido." };
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const { data: attachment } = await supabase
    .from("attachments")
    .select("bucket_id, object_path")
    .eq("id", attachmentId)
    .eq("opportunity_id", opportunityId)
    .is("removed_at", null)
    .maybeSingle<{ bucket_id: string; object_path: string }>();
  if (!attachment || attachment.bucket_id !== "opportunity-attachments" || !validOpportunityAttachmentPath(opportunityId, attachment.object_path)) {
    return { ok: false, message: "O anexo não está disponível para remoção." };
  }
  const { error: storageError } = await supabase.storage.from("opportunity-attachments").remove([attachment.object_path]);
  if (storageError) return { ok: false, message: "Não foi possível remover o arquivo." };
  const { error } = await supabase.rpc("remove_attachment", { request_key: crypto.randomUUID(), target_attachment_id: attachmentId });
  if (error) return { ok: false, message: "O arquivo foi removido, mas o histórico ainda precisa ser atualizado." };
  refreshOpportunity(opportunityId);
  return { ok: true, message: "Anexo removido com sucesso." };
}
