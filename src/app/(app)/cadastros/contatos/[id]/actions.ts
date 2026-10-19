"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ContactDetailActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<"body" | "companyId" | "jobTitle", string>>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authenticatedContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return userId ? { supabase, userId } : null;
}

function invalidId(...values: string[]) {
  return values.some((value) => !uuidPattern.test(value));
}

function refreshContact(contactId: string) {
  revalidatePath(`/cadastros/contatos/${contactId}`);
  revalidatePath("/cadastros/contatos");
}

export async function addContactNoteAction(
  _previousState: ContactDetailActionState | null,
  formData: FormData,
): Promise<ContactDetailActionState> {
  const contactId = String(formData.get("contactId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (invalidId(contactId)) return { ok: false, message: "Contato inválido." };
  if (!body) return { ok: false, message: "Escreva uma nota antes de salvar.", fieldErrors: { body: "A nota não pode ficar vazia." } };

  const context = await authenticatedContext();
  if (!context) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const { error } = await context.supabase.from("contact_notes").insert({
    contact_id: contactId,
    body,
    created_by: context.userId,
    updated_by: context.userId,
  });
  if (error) return { ok: false, message: "Não foi possível adicionar a nota. Verifique se o contato está ativo." };
  refreshContact(contactId);
  return { ok: true, message: "Nota adicionada com sucesso." };
}

export async function updateContactNoteAction(
  _previousState: ContactDetailActionState | null,
  formData: FormData,
): Promise<ContactDetailActionState> {
  const contactId = String(formData.get("contactId") ?? "");
  const noteId = String(formData.get("noteId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (invalidId(contactId, noteId)) return { ok: false, message: "Nota inválida." };
  if (!body) return { ok: false, message: "A nota não pode ficar vazia.", fieldErrors: { body: "Informe o texto da nota." } };

  const context = await authenticatedContext();
  if (!context) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const { data, error } = await context.supabase
    .from("contact_notes")
    .update({ body, updated_by: context.userId })
    .eq("id", noteId)
    .eq("contact_id", contactId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "Não foi possível atualizar a nota." };
  refreshContact(contactId);
  return { ok: true, message: "Nota atualizada com sucesso." };
}

export async function deleteContactNoteAction(
  _previousState: ContactDetailActionState | null,
  formData: FormData,
): Promise<ContactDetailActionState> {
  const contactId = String(formData.get("contactId") ?? "");
  const noteId = String(formData.get("noteId") ?? "");
  if (invalidId(contactId, noteId)) return { ok: false, message: "Nota inválida." };

  const context = await authenticatedContext();
  if (!context) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const { data, error } = await context.supabase
    .from("contact_notes")
    .update({ deleted_by: context.userId, deleted_at: new Date().toISOString(), updated_by: context.userId })
    .eq("id", noteId)
    .eq("contact_id", contactId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "Não foi possível excluir a nota." };
  refreshContact(contactId);
  return { ok: true, message: "Nota excluída com sucesso." };
}

export async function linkContactCompanyAction(
  _previousState: ContactDetailActionState | null,
  formData: FormData,
): Promise<ContactDetailActionState> {
  const contactId = String(formData.get("contactId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  const jobTitle = String(formData.get("jobTitle") ?? "").trim() || null;
  if (invalidId(contactId, companyId)) return { ok: false, message: "Selecione uma empresa válida.", fieldErrors: { companyId: "Empresa obrigatória." } };

  const context = await authenticatedContext();
  if (!context) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const { supabase, userId } = context;
  const [{ data: contact }, { data: company }, existingResult] = await Promise.all([
    supabase.from("contacts").select("id").eq("id", contactId).eq("is_active", true).maybeSingle(),
    supabase.from("companies").select("id").eq("id", companyId).eq("is_active", true).maybeSingle(),
    supabase.from("company_contacts").select("is_active").eq("company_id", companyId).eq("contact_id", contactId).maybeSingle<{ is_active: boolean }>(),
  ]);
  if (!contact) return { ok: false, message: "O contato precisa estar ativo para receber novos vínculos." };
  if (!company) return { ok: false, message: "A empresa selecionada não está disponível." };
  if (existingResult.error) return { ok: false, message: "Não foi possível verificar o vínculo existente." };
  if (existingResult.data?.is_active) return { ok: false, message: "Este contato já está vinculado à empresa." };

  const result = existingResult.data
    ? await supabase.from("company_contacts").update({ job_title: jobTitle, is_active: true, unlinked_by: null, unlinked_at: null }).eq("company_id", companyId).eq("contact_id", contactId)
    : await supabase.from("company_contacts").insert({ company_id: companyId, contact_id: contactId, job_title: jobTitle, linked_by: userId });
  if (result.error) return { ok: false, message: "Não foi possível vincular a empresa." };
  refreshContact(contactId);
  revalidatePath(`/cadastros/empresas/${companyId}`);
  return { ok: true, message: "Empresa vinculada com sucesso." };
}

export async function unlinkContactCompanyAction(
  _previousState: ContactDetailActionState | null,
  formData: FormData,
): Promise<ContactDetailActionState> {
  const contactId = String(formData.get("contactId") ?? "");
  const companyId = String(formData.get("companyId") ?? "");
  if (invalidId(contactId, companyId)) return { ok: false, message: "Vínculo inválido." };

  const context = await authenticatedContext();
  if (!context) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const { data, error } = await context.supabase
    .from("company_contacts")
    .update({ is_active: false, unlinked_by: context.userId, unlinked_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("contact_id", contactId)
    .eq("is_active", true)
    .select("company_id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: "Não foi possível desvincular a empresa." };
  refreshContact(contactId);
  revalidatePath(`/cadastros/empresas/${companyId}`);
  return { ok: true, message: "Empresa desvinculada com sucesso." };
}
