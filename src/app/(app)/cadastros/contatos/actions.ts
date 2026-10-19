"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ContactActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<"name" | "phone" | "email" | "sourceId", string>>;
  duplicate?: { id: string; name: string; isActive: boolean };
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanOptional(value: FormDataEntryValue | null) {
  const cleaned = String(value ?? "").trim();
  return cleaned || null;
}

async function authenticatedContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return userId ? { supabase, userId } : null;
}

export async function saveContactAction(
  _previousState: ContactActionState | null,
  formData: FormData,
): Promise<ContactActionState> {
  const id = cleanOptional(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const phone = cleanOptional(formData.get("phone"));
  const phoneNormalized = phone?.replace(/\D/g, "") ?? null;
  const email = cleanOptional(formData.get("email"));
  const emailNormalized = email?.toLocaleLowerCase("pt-BR") ?? null;
  const sourceId = cleanOptional(formData.get("sourceId"));
  const allowDuplicate = String(formData.get("allowDuplicate") ?? "") === "true";
  const fieldErrors: ContactActionState["fieldErrors"] = {};

  if (!name) fieldErrors.name = "Informe o nome do contato.";
  if (phoneNormalized && !/^\d{10,11}$/.test(phoneNormalized)) fieldErrors.phone = "Informe um telefone com DDD.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Informe um e-mail válido.";
  if (sourceId && !uuidPattern.test(sourceId)) fieldErrors.sourceId = "Selecione uma origem válida.";
  if (id && !uuidPattern.test(id)) return { ok: false, message: "Contato inválido." };
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Revise os campos destacados.", fieldErrors };

  const context = await authenticatedContext();
  if (!context) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const { supabase, userId } = context;

  if (sourceId) {
    const { data: source, error: sourceError } = await supabase
      .from("opportunity_sources")
      .select("id, is_active")
      .eq("id", sourceId)
      .maybeSingle<{ id: string; is_active: boolean }>();

    if (sourceError || !source) return { ok: false, message: "Não foi possível validar a origem.", fieldErrors: { sourceId: "Origem indisponível." } };
    if (!source.is_active) {
      const { data: currentContact } = id
        ? await supabase.from("contacts").select("source_id").eq("id", id).maybeSingle<{ source_id: string | null }>()
        : { data: null };
      if (currentContact?.source_id !== sourceId) {
        return { ok: false, message: "Selecione uma origem ativa.", fieldErrors: { sourceId: "Origem indisponível para novas seleções." } };
      }
    }
  }

  if (!allowDuplicate && (emailNormalized || phoneNormalized)) {
    const findDuplicate = async (column: "email_normalized" | "phone_normalized", value: string) => {
      let duplicateQuery = supabase
        .from("contacts")
        .select("id, name, is_active")
        .eq(column, value)
        .limit(1);
      if (id) duplicateQuery = duplicateQuery.neq("id", id);
      return duplicateQuery.maybeSingle<{ id: string; name: string; is_active: boolean }>();
    };
    const [emailResult, phoneResult] = await Promise.all([
      emailNormalized ? findDuplicate("email_normalized", emailNormalized) : Promise.resolve({ data: null, error: null }),
      phoneNormalized ? findDuplicate("phone_normalized", phoneNormalized) : Promise.resolve({ data: null, error: null }),
    ]);
    if (emailResult.error || phoneResult.error) return { ok: false, message: "Não foi possível verificar possíveis duplicidades." };
    const duplicate = emailResult.data ?? phoneResult.data;
    if (duplicate) {
      return {
        ok: false,
        message: `Já existe um contato com o mesmo ${emailNormalized && phoneNormalized ? "e-mail ou telefone" : emailNormalized ? "e-mail" : "telefone"}. Confirme para continuar mesmo assim.`,
        duplicate: { id: duplicate.id, name: duplicate.name, isActive: duplicate.is_active },
      };
    }
  }

  const values = {
    name,
    phone,
    phone_normalized: phoneNormalized,
    email,
    email_normalized: emailNormalized,
    source_id: sourceId,
    updated_by: userId,
  };

  const result = id
    ? await supabase.from("contacts").update(values).eq("id", id).select("id").single()
    : await supabase.from("contacts").insert({ ...values, created_by: userId }).select("id").single();

  if (result.error) return { ok: false, message: "Não foi possível salvar o contato. Tente novamente." };
  revalidatePath("/cadastros/contatos");
  if (result.data?.id) revalidatePath(`/cadastros/contatos/${result.data.id}`);
  return { ok: true, message: id ? "Contato atualizado com sucesso." : "Contato cadastrado com sucesso." };
}

export async function setContactStatusAction(
  _previousState: ContactActionState | null,
  formData: FormData,
): Promise<ContactActionState> {
  const id = String(formData.get("id") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "") === "true";
  if (!uuidPattern.test(id)) return { ok: false, message: "Contato inválido." };

  const context = await authenticatedContext();
  if (!context) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const { supabase, userId } = context;
  const { error } = await supabase
    .from("contacts")
    .update({ is_active: nextStatus, updated_by: userId, status_changed_by: userId, status_changed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, message: `Não foi possível ${nextStatus ? "reativar" : "desativar"} o contato.` };
  revalidatePath("/cadastros/contatos");
  revalidatePath(`/cadastros/contatos/${id}`);
  return { ok: true, message: `Contato ${nextStatus ? "reativado" : "desativado"} com sucesso.` };
}
