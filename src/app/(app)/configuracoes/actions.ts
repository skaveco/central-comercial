"use server";

import { revalidatePath } from "next/cache";

import { getCurrentCommercialMonthStart } from "@/lib/sales-goals";
import { createClient } from "@/lib/supabase/server";

export type UserAccessActionState = { ok: boolean; message: string };
export type ProductCategoryActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<"name", string>>;
};
export type SegmentActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<"name", string>>;
};
export type OpportunityCatalog = "loss-reason" | "qualification" | "source";
export type OpportunityCatalogActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<"name", string>>;
};
export type SalesGoalActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<"amount", string>>;
};

const validRoles = new Set(["admin", "pre_sales", "commercial"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const opportunityCatalogs = {
  "loss-reason": {
    itemLabel: "motivo de perda",
    table: "loss_reasons",
  },
  qualification: {
    itemLabel: "item de qualificação",
    table: "qualification_parameters",
  },
  source: {
    itemLabel: "origem",
    table: "opportunity_sources",
  },
} as const;

function getOpportunityCatalog(value: FormDataEntryValue | null) {
  const catalog = String(value ?? "") as OpportunityCatalog;
  return catalog in opportunityCatalogs ? catalog : null;
}

function parseGoalAmount(value: FormDataEntryValue | null) {
  const rawValue = String(value ?? "").trim().replace(/\u00a0/g, " ");
  if (!rawValue) return null;

  const formattedCurrency = /^R\$\s\d{1,3}(?:\.\d{3})*,\d{2}$/;
  const plainDecimal = /^\d{1,12}(?:[.,]\d{1,2})?$/;
  let numericValue: number;

  if (formattedCurrency.test(rawValue)) {
    numericValue = Number(rawValue.replace(/\D/g, "")) / 100;
  } else if (plainDecimal.test(rawValue)) {
    numericValue = Number(rawValue.replace(",", "."));
  } else {
    return null;
  }

  if (!Number.isFinite(numericValue) || numericValue <= 0 || numericValue > 999_999_999_999.99) return null;
  return numericValue.toFixed(2);
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, access_status")
    .eq("id", userId)
    .maybeSingle<{ role: string | null; access_status: string }>();

  if (!profile || profile.role !== "admin" || profile.access_status !== "active") return null;
  return { supabase, userId };
}

export async function approveUserAction(
  _previousState: UserAccessActionState | null,
  formData: FormData,
): Promise<UserAccessActionState> {
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !validRoles.has(role)) {
    return { ok: false, message: "Dados de aprovação inválidos." };
  }

  const context = await requireAdmin();
  if (!context) return { ok: false, message: "Você não tem permissão para aprovar usuários." };

  const { error } = await context.supabase.rpc("admin_approve_user", {
    target_user_id: userId,
    selected_role: role,
  });
  if (error) return { ok: false, message: "Não foi possível aprovar o acesso." };

  revalidatePath("/configuracoes");
  return { ok: true, message: "Acesso aprovado com sucesso." };
}

export async function rejectUserAction(
  _previousState: UserAccessActionState | null,
  formData: FormData,
): Promise<UserAccessActionState> {
  const userId = String(formData.get("userId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { ok: false, message: "Usuário inválido." };

  const context = await requireAdmin();
  if (!context) return { ok: false, message: "Você não tem permissão para recusar usuários." };

  const { error } = await context.supabase.rpc("admin_reject_user", { target_user_id: userId });
  if (error) return { ok: false, message: "Não foi possível recusar a solicitação." };

  revalidatePath("/configuracoes");
  return { ok: true, message: "Solicitação recusada." };
}

export async function saveProductCategoryAction(
  _previousState: ProductCategoryActionState | null,
  formData: FormData,
): Promise<ProductCategoryActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return {
      ok: false,
      message: "Revise o campo destacado.",
      fieldErrors: { name: "Informe o nome da categoria." },
    };
  }
  if (id && !uuidPattern.test(id)) return { ok: false, message: "Categoria inválida." };

  const context = await requireAdmin();
  if (!context) return { ok: false, message: "Você não tem permissão para alterar as categorias." };
  const { supabase, userId } = context;
  const normalizedName = name.toLocaleLowerCase("pt-BR");

  const { data: possibleDuplicates, error: duplicateError } = await supabase
    .from("product_categories")
    .select("id")
    .eq("normalized_name", normalizedName)
    .limit(1);
  if (duplicateError) return { ok: false, message: "Não foi possível validar a categoria." };
  if (possibleDuplicates?.some((category) => category.id !== id)) {
    return {
      ok: false,
      message: "Já existe uma categoria com este nome.",
      fieldErrors: { name: "Use um nome diferente." },
    };
  }

  if (id) {
    const { data, error } = await supabase
      .from("product_categories")
      .update({ name, updated_by: userId })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      const duplicated = error?.code === "23505";
      return {
        ok: false,
        message: duplicated ? "Já existe uma categoria com este nome." : "Não foi possível atualizar a categoria.",
        fieldErrors: duplicated ? { name: "Use um nome diferente." } : undefined,
      };
    }
  } else {
    const { data: lastCategory, error: sortOrderError } = await supabase
      .from("product_categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle<{ sort_order: number }>();
    if (sortOrderError) return { ok: false, message: "Não foi possível preparar a nova categoria." };

    const { error } = await supabase.from("product_categories").insert({
      created_by: userId,
      name,
      sort_order: (lastCategory?.sort_order ?? -1) + 1,
      updated_by: userId,
    });
    if (error) {
      const duplicated = error.code === "23505";
      return {
        ok: false,
        message: duplicated ? "Já existe uma categoria com este nome." : "Não foi possível criar a categoria.",
        fieldErrors: duplicated ? { name: "Use um nome diferente." } : undefined,
      };
    }
  }

  revalidatePath("/configuracoes");
  revalidatePath("/cadastros/produtos");
  return { ok: true, message: id ? "Categoria atualizada com sucesso." : "Categoria criada com sucesso." };
}

export async function setProductCategoryStatusAction(
  _previousState: ProductCategoryActionState | null,
  formData: FormData,
): Promise<ProductCategoryActionState> {
  const id = String(formData.get("id") ?? "");
  const nextStatusValue = String(formData.get("nextStatus") ?? "");
  if (!uuidPattern.test(id) || !["true", "false"].includes(nextStatusValue)) {
    return { ok: false, message: "Categoria inválida." };
  }
  const nextStatus = nextStatusValue === "true";

  const context = await requireAdmin();
  if (!context) return { ok: false, message: "Você não tem permissão para alterar as categorias." };

  const { data, error } = await context.supabase
    .from("product_categories")
    .update({ is_active: nextStatus, updated_by: context.userId })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: `Não foi possível ${nextStatus ? "reativar" : "desativar"} a categoria.` };
  }

  revalidatePath("/configuracoes");
  revalidatePath("/cadastros/produtos");
  return { ok: true, message: `Categoria ${nextStatus ? "reativada" : "desativada"} com sucesso.` };
}

export async function saveSegmentAction(
  _previousState: SegmentActionState | null,
  formData: FormData,
): Promise<SegmentActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return {
      ok: false,
      message: "Revise o campo destacado.",
      fieldErrors: { name: "Informe o nome do segmento." },
    };
  }
  if (id && !uuidPattern.test(id)) return { ok: false, message: "Segmento inválido." };

  const context = await requireAdmin();
  if (!context) return { ok: false, message: "Você não tem permissão para alterar os segmentos." };
  const { supabase, userId } = context;
  const normalizedName = name.toLocaleLowerCase("pt-BR");

  const { data: possibleDuplicates, error: duplicateError } = await supabase
    .from("segments")
    .select("id")
    .eq("normalized_name", normalizedName)
    .limit(1);
  if (duplicateError) return { ok: false, message: "Não foi possível validar o segmento." };
  if (possibleDuplicates?.some((segment) => segment.id !== id)) {
    return {
      ok: false,
      message: "Já existe um segmento com este nome.",
      fieldErrors: { name: "Use um nome diferente." },
    };
  }

  if (id) {
    const { data, error } = await supabase
      .from("segments")
      .update({ name, updated_by: userId })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      const duplicated = error?.code === "23505";
      return {
        ok: false,
        message: duplicated ? "Já existe um segmento com este nome." : "Não foi possível atualizar o segmento.",
        fieldErrors: duplicated ? { name: "Use um nome diferente." } : undefined,
      };
    }
  } else {
    const { data: lastSegment, error: sortOrderError } = await supabase
      .from("segments")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle<{ sort_order: number }>();
    if (sortOrderError) return { ok: false, message: "Não foi possível preparar o novo segmento." };

    const { error } = await supabase.from("segments").insert({
      created_by: userId,
      name,
      sort_order: (lastSegment?.sort_order ?? -1) + 1,
      updated_by: userId,
    });
    if (error) {
      const duplicated = error.code === "23505";
      return {
        ok: false,
        message: duplicated ? "Já existe um segmento com este nome." : "Não foi possível criar o segmento.",
        fieldErrors: duplicated ? { name: "Use um nome diferente." } : undefined,
      };
    }
  }

  revalidatePath("/configuracoes");
  revalidatePath("/cadastros/empresas");
  return { ok: true, message: id ? "Segmento atualizado com sucesso." : "Segmento criado com sucesso." };
}

export async function setSegmentStatusAction(
  _previousState: SegmentActionState | null,
  formData: FormData,
): Promise<SegmentActionState> {
  const id = String(formData.get("id") ?? "");
  const nextStatusValue = String(formData.get("nextStatus") ?? "");
  if (!uuidPattern.test(id) || !["true", "false"].includes(nextStatusValue)) {
    return { ok: false, message: "Segmento inválido." };
  }
  const nextStatus = nextStatusValue === "true";

  const context = await requireAdmin();
  if (!context) return { ok: false, message: "Você não tem permissão para alterar os segmentos." };

  const { data, error } = await context.supabase
    .from("segments")
    .update({ is_active: nextStatus, updated_by: context.userId })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: `Não foi possível ${nextStatus ? "reativar" : "desativar"} o segmento.` };
  }

  revalidatePath("/configuracoes");
  revalidatePath("/cadastros/empresas");
  return { ok: true, message: `Segmento ${nextStatus ? "reativado" : "desativado"} com sucesso.` };
}

export async function reorderSegmentAction(
  _previousState: SegmentActionState | null,
  formData: FormData,
): Promise<SegmentActionState> {
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!uuidPattern.test(id) || !["up", "down"].includes(direction)) {
    return { ok: false, message: "Reordenação inválida." };
  }

  const context = await requireAdmin();
  if (!context) return { ok: false, message: "Você não tem permissão para reordenar os segmentos." };
  const { supabase, userId } = context;
  const { data: segments, error: listError } = await supabase
    .from("segments")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (listError || !segments) return { ok: false, message: "Não foi possível carregar a ordem dos segmentos." };

  const currentIndex = segments.findIndex((segment) => segment.id === id);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= segments.length) {
    return { ok: false, message: "O segmento já está no limite da lista." };
  }

  const current = segments[currentIndex];
  const target = segments[targetIndex];
  const currentOrder = current.sort_order;
  const targetOrder = target.sort_order;
  const normalizedCurrentOrder = currentOrder === targetOrder ? currentIndex : currentOrder;
  const normalizedTargetOrder = currentOrder === targetOrder ? targetIndex : targetOrder;

  const [currentResult, targetResult] = await Promise.all([
    supabase.from("segments").update({ sort_order: normalizedTargetOrder, updated_by: userId }).eq("id", current.id),
    supabase.from("segments").update({ sort_order: normalizedCurrentOrder, updated_by: userId }).eq("id", target.id),
  ]);
  if (currentResult.error || targetResult.error) {
    return { ok: false, message: "Não foi possível reordenar os segmentos." };
  }

  revalidatePath("/configuracoes");
  return { ok: true, message: "Ordem atualizada." };
}

export async function saveOpportunityCatalogItemAction(
  _previousState: OpportunityCatalogActionState | null,
  formData: FormData,
): Promise<OpportunityCatalogActionState> {
  const catalog = getOpportunityCatalog(formData.get("catalog"));
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!catalog) return { ok: false, message: "Cadastro inválido." };

  const config = opportunityCatalogs[catalog];
  if (!name) {
    return {
      ok: false,
      message: "Revise o campo destacado.",
      fieldErrors: { name: `Informe o nome do ${config.itemLabel}.` },
    };
  }
  if (id && !uuidPattern.test(id)) return { ok: false, message: `${config.itemLabel} inválido.` };

  const context = await requireAdmin();
  if (!context) return { ok: false, message: "Você não tem permissão para alterar este cadastro." };
  const { supabase, userId } = context;
  const normalizedName = name.toLocaleLowerCase("pt-BR");

  const { data: possibleDuplicates, error: duplicateError } = await supabase
    .from(config.table)
    .select("id")
    .eq("normalized_name", normalizedName)
    .limit(1);
  if (duplicateError) return { ok: false, message: `Não foi possível validar o ${config.itemLabel}.` };
  if (possibleDuplicates?.some((item) => item.id !== id)) {
    return {
      ok: false,
      message: `Já existe um ${config.itemLabel} com este nome.`,
      fieldErrors: { name: "Use um nome diferente." },
    };
  }

  if (id) {
    const { data, error } = await supabase
      .from(config.table)
      .update({ name, updated_by: userId })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      const duplicated = error?.code === "23505";
      return {
        ok: false,
        message: duplicated
          ? `Já existe um ${config.itemLabel} com este nome.`
          : `Não foi possível atualizar o ${config.itemLabel}.`,
        fieldErrors: duplicated ? { name: "Use um nome diferente." } : undefined,
      };
    }
  } else {
    if (catalog === "qualification") {
      const { count, error: countError } = await supabase
        .from("qualification_parameters")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      if (countError) return { ok: false, message: "Não foi possível validar os itens ativos." };
      if ((count ?? 0) >= 5) {
        return {
          ok: false,
          message: "O limite de 5 itens de qualificação ativos já foi atingido.",
        };
      }
    }

    const { data: lastItem, error: sortOrderError } = await supabase
      .from(config.table)
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle<{ sort_order: number }>();
    if (sortOrderError) return { ok: false, message: `Não foi possível preparar o novo ${config.itemLabel}.` };

    const { error } = await supabase.from(config.table).insert({
      created_by: userId,
      name,
      sort_order: (lastItem?.sort_order ?? -1) + 1,
      updated_by: userId,
    });
    if (error) {
      const duplicated = error.code === "23505";
      return {
        ok: false,
        message: duplicated
          ? `Já existe um ${config.itemLabel} com este nome.`
          : `Não foi possível criar o ${config.itemLabel}.`,
        fieldErrors: duplicated ? { name: "Use um nome diferente." } : undefined,
      };
    }
  }

  revalidatePath("/configuracoes");
  return {
    ok: true,
    message: id ? "Cadastro atualizado com sucesso." : "Cadastro criado com sucesso.",
  };
}

export async function setOpportunityCatalogItemStatusAction(
  _previousState: OpportunityCatalogActionState | null,
  formData: FormData,
): Promise<OpportunityCatalogActionState> {
  const catalog = getOpportunityCatalog(formData.get("catalog"));
  const id = String(formData.get("id") ?? "");
  const nextStatusValue = String(formData.get("nextStatus") ?? "");
  if (!catalog || !uuidPattern.test(id) || !["true", "false"].includes(nextStatusValue)) {
    return { ok: false, message: "Alteração de status inválida." };
  }

  const context = await requireAdmin();
  if (!context) return { ok: false, message: "Você não tem permissão para alterar este cadastro." };
  const { supabase, userId } = context;
  const config = opportunityCatalogs[catalog];
  const nextStatus = nextStatusValue === "true";

  const { data: currentItem, error: currentItemError } = await supabase
    .from(config.table)
    .select("id, is_active")
    .eq("id", id)
    .maybeSingle<{ id: string; is_active: boolean }>();
  if (currentItemError || !currentItem) return { ok: false, message: `O ${config.itemLabel} não foi encontrado.` };
  if (currentItem.is_active === nextStatus) return { ok: true, message: "O status já estava atualizado." };

  if (catalog === "qualification") {
    const { count, error: countError } = await supabase
      .from("qualification_parameters")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);
    if (countError) return { ok: false, message: "Não foi possível validar os itens ativos." };
    if (nextStatus && (count ?? 0) >= 5) {
      return { ok: false, message: "Mantenha no máximo 5 itens de qualificação ativos." };
    }
    if (!nextStatus && (count ?? 0) <= 2) {
      return { ok: false, message: "Mantenha pelo menos 2 itens de qualificação ativos." };
    }
  }

  const { data, error } = await supabase
    .from(config.table)
    .update({ is_active: nextStatus, updated_by: userId })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return {
      ok: false,
      message: `Não foi possível ${nextStatus ? "reativar" : "desativar"} o ${config.itemLabel}.`,
    };
  }

  revalidatePath("/configuracoes");
  return { ok: true, message: `Cadastro ${nextStatus ? "reativado" : "desativado"} com sucesso.` };
}

export async function reorderOpportunityCatalogItemAction(
  _previousState: OpportunityCatalogActionState | null,
  formData: FormData,
): Promise<OpportunityCatalogActionState> {
  const catalog = getOpportunityCatalog(formData.get("catalog"));
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!catalog || !uuidPattern.test(id) || !["up", "down"].includes(direction)) {
    return { ok: false, message: "Reordenação inválida." };
  }

  const context = await requireAdmin();
  if (!context) return { ok: false, message: "Você não tem permissão para reordenar este cadastro." };
  const { supabase, userId } = context;
  const config = opportunityCatalogs[catalog];
  const { data: items, error: listError } = await supabase
    .from(config.table)
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (listError || !items) return { ok: false, message: "Não foi possível carregar a ordem dos itens." };

  const currentIndex = items.findIndex((item) => item.id === id);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= items.length) {
    return { ok: false, message: "O item já está no limite da lista." };
  }

  const current = items[currentIndex];
  const target = items[targetIndex];
  const normalizedCurrentOrder = current.sort_order === target.sort_order ? currentIndex : current.sort_order;
  const normalizedTargetOrder = current.sort_order === target.sort_order ? targetIndex : target.sort_order;
  const [currentResult, targetResult] = await Promise.all([
    supabase.from(config.table).update({ sort_order: normalizedTargetOrder, updated_by: userId }).eq("id", current.id),
    supabase.from(config.table).update({ sort_order: normalizedCurrentOrder, updated_by: userId }).eq("id", target.id),
  ]);
  if (currentResult.error || targetResult.error) return { ok: false, message: "Não foi possível reordenar os itens." };

  revalidatePath("/configuracoes");
  return { ok: true, message: "Ordem atualizada." };
}

export async function saveSalesGoalAction(
  _previousState: SalesGoalActionState | null,
  formData: FormData,
): Promise<SalesGoalActionState> {
  const amount = parseGoalAmount(formData.get("amount"));
  if (!amount) {
    return {
      ok: false,
      message: "Revise o campo destacado.",
      fieldErrors: { amount: "Informe uma meta maior que zero." },
    };
  }

  const context = await requireAdmin();
  if (!context) return { ok: false, message: "Você não tem permissão para alterar a meta." };
  const { supabase, userId } = context;
  const effectiveMonth = getCurrentCommercialMonthStart();

  const { data: currentMonthGoal, error: lookupError } = await supabase
    .from("sales_goal_changes")
    .select("id")
    .eq("effective_month", effectiveMonth)
    .maybeSingle<{ id: string }>();
  if (lookupError) return { ok: false, message: "Não foi possível verificar a meta do mês atual." };

  const result = currentMonthGoal
    ? await supabase
        .from("sales_goal_changes")
        .update({ amount, updated_by: userId })
        .eq("id", currentMonthGoal.id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("sales_goal_changes")
        .insert({
          amount,
          created_by: userId,
          effective_month: effectiveMonth,
          updated_by: userId,
        })
        .select("id")
        .maybeSingle();

  if (result.error || !result.data) {
    return { ok: false, message: "Não foi possível salvar a meta mensal. Tente novamente." };
  }

  revalidatePath("/configuracoes");
  revalidatePath("/");
  return { ok: true, message: "Meta mensal salva com sucesso." };
}
