"use server";

import { revalidatePath } from "next/cache";

import {
  COMPANY_ATTACHMENTS_BUCKET,
  COMPANY_ATTACHMENT_MAX_BYTES,
  getCompanyAttachmentMimeType,
  isCompanyAttachmentObjectPath,
} from "@/lib/company-attachments";
import { createClient } from "@/lib/supabase/server";

export type CompanyDetailActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<"body" | "contactId" | "jobTitle", string>>;
};

export type AttachmentActionState = {
  ok: boolean;
  message: string;
};

type RegisterCompanyAttachmentInput = {
  companyId: string;
  mimeType: string;
  objectPath: string;
  originalName: string;
  sizeBytes: number;
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

function refreshCompany(companyId: string) {
  revalidatePath(`/cadastros/empresas/${companyId}`);
  revalidatePath("/cadastros/empresas");
}

export async function addCompanyNoteAction(
  _previousState: CompanyDetailActionState | null,
  formData: FormData,
): Promise<CompanyDetailActionState> {
  const companyId = String(formData.get("companyId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (invalidId(companyId)) return { ok: false, message: "Empresa inválida." };
  if (!body) return { ok: false, message: "Escreva uma nota antes de salvar.", fieldErrors: { body: "A nota não pode ficar vazia." } };

  const context = await authenticatedContext();
  if (!context) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const { error } = await context.supabase.from("company_notes").insert({
    company_id: companyId,
    body,
    created_by: context.userId,
    updated_by: context.userId,
  });
  if (error) return { ok: false, message: "Não foi possível adicionar a nota. Verifique se a empresa está ativa." };
  refreshCompany(companyId);
  return { ok: true, message: "Nota adicionada com sucesso." };
}

export async function updateCompanyNoteAction(
  _previousState: CompanyDetailActionState | null,
  formData: FormData,
): Promise<CompanyDetailActionState> {
  const companyId = String(formData.get("companyId") ?? "");
  const noteId = String(formData.get("noteId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (invalidId(companyId, noteId)) return { ok: false, message: "Nota inválida." };
  if (!body) return { ok: false, message: "A nota não pode ficar vazia.", fieldErrors: { body: "Informe o texto da nota." } };

  const context = await authenticatedContext();
  if (!context) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const { data: updatedNote, error } = await context.supabase
    .from("company_notes")
    .update({ body, updated_by: context.userId })
    .eq("id", noteId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error || !updatedNote) return { ok: false, message: "Não foi possível atualizar a nota." };
  refreshCompany(companyId);
  return { ok: true, message: "Nota atualizada com sucesso." };
}

export async function deleteCompanyNoteAction(
  _previousState: CompanyDetailActionState | null,
  formData: FormData,
): Promise<CompanyDetailActionState> {
  const companyId = String(formData.get("companyId") ?? "");
  const noteId = String(formData.get("noteId") ?? "");
  if (invalidId(companyId, noteId)) return { ok: false, message: "Nota inválida." };

  const context = await authenticatedContext();
  if (!context) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const deletedAt = new Date().toISOString();
  const { data: deletedNote, error } = await context.supabase
    .from("company_notes")
    .update({ deleted_by: context.userId, deleted_at: deletedAt, updated_by: context.userId })
    .eq("id", noteId)
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error || !deletedNote) return { ok: false, message: "Não foi possível excluir a nota." };
  refreshCompany(companyId);
  return { ok: true, message: "Nota excluída com sucesso." };
}

export async function linkCompanyContactAction(
  _previousState: CompanyDetailActionState | null,
  formData: FormData,
): Promise<CompanyDetailActionState> {
  const companyId = String(formData.get("companyId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  const jobTitle = String(formData.get("jobTitle") ?? "").trim() || null;
  if (invalidId(companyId, contactId)) return { ok: false, message: "Selecione um contato válido.", fieldErrors: { contactId: "Contato obrigatório." } };

  const context = await authenticatedContext();
  if (!context) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const { supabase, userId } = context;
  const [{ data: company }, { data: contact }, existingResult] = await Promise.all([
    supabase.from("companies").select("id").eq("id", companyId).eq("is_active", true).maybeSingle(),
    supabase.from("contacts").select("id").eq("id", contactId).eq("is_active", true).maybeSingle(),
    supabase.from("company_contacts").select("is_active").eq("company_id", companyId).eq("contact_id", contactId).maybeSingle<{ is_active: boolean }>(),
  ]);
  if (!company) return { ok: false, message: "A empresa precisa estar ativa para receber novos vínculos." };
  if (!contact) return { ok: false, message: "O contato selecionado não está disponível." };
  if (existingResult.error) return { ok: false, message: "Não foi possível verificar o vínculo existente." };
  if (existingResult.data?.is_active) return { ok: false, message: "Este contato já está vinculado à empresa." };

  const result = existingResult.data
    ? await supabase.from("company_contacts").update({ job_title: jobTitle, is_active: true, unlinked_by: null, unlinked_at: null }).eq("company_id", companyId).eq("contact_id", contactId)
    : await supabase.from("company_contacts").insert({ company_id: companyId, contact_id: contactId, job_title: jobTitle, linked_by: userId });
  if (result.error) return { ok: false, message: "Não foi possível vincular o contato." };
  refreshCompany(companyId);
  return { ok: true, message: "Contato vinculado com sucesso." };
}

export async function unlinkCompanyContactAction(
  _previousState: CompanyDetailActionState | null,
  formData: FormData,
): Promise<CompanyDetailActionState> {
  const companyId = String(formData.get("companyId") ?? "");
  const contactId = String(formData.get("contactId") ?? "");
  if (invalidId(companyId, contactId)) return { ok: false, message: "Vínculo inválido." };

  const context = await authenticatedContext();
  if (!context) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const unlinkedAt = new Date().toISOString();
  const { data: unlinkedContact, error } = await context.supabase
    .from("company_contacts")
    .update({ is_active: false, unlinked_by: context.userId, unlinked_at: unlinkedAt })
    .eq("company_id", companyId)
    .eq("contact_id", contactId)
    .eq("is_active", true)
    .select("contact_id")
    .maybeSingle();
  if (error || !unlinkedContact) return { ok: false, message: "Não foi possível desvincular o contato." };
  refreshCompany(companyId);
  return { ok: true, message: "Contato desvinculado com sucesso." };
}

export async function registerCompanyAttachmentAction(
  input: RegisterCompanyAttachmentInput,
): Promise<AttachmentActionState> {
  const originalName = input.originalName.trim();
  const expectedMimeType = getCompanyAttachmentMimeType(originalName);
  const validSize = Number.isSafeInteger(input.sizeBytes)
    && input.sizeBytes > 0
    && input.sizeBytes <= COMPANY_ATTACHMENT_MAX_BYTES;

  if (
    invalidId(input.companyId)
    || !originalName
    || !expectedMimeType
    || expectedMimeType !== input.mimeType
    || !validSize
    || !isCompanyAttachmentObjectPath(input.companyId, input.objectPath)
  ) {
    return { ok: false, message: "Os dados do anexo são inválidos." };
  }

  const context = await authenticatedContext();
  if (!context) return { ok: false, message: "Sua sessão expirou. Entre novamente." };

  const { error } = await context.supabase.rpc("register_attachment", {
    request_key: crypto.randomUUID(),
    target_bucket_id: COMPANY_ATTACHMENTS_BUCKET,
    target_company_id: input.companyId,
    target_mime_type: input.mimeType,
    target_object_path: input.objectPath,
    target_opportunity_id: null,
    target_original_name: originalName,
    target_size_bytes: input.sizeBytes,
  });

  if (error) {
    await context.supabase.storage.from(COMPANY_ATTACHMENTS_BUCKET).remove([input.objectPath]);
    return { ok: false, message: "O arquivo foi enviado, mas não pôde ser registrado. Tente novamente." };
  }

  refreshCompany(input.companyId);
  return { ok: true, message: "Anexo adicionado com sucesso." };
}

export async function removeCompanyAttachmentAction(
  companyId: string,
  attachmentId: string,
): Promise<AttachmentActionState> {
  if (invalidId(companyId, attachmentId)) return { ok: false, message: "Anexo inválido." };

  const context = await authenticatedContext();
  if (!context) return { ok: false, message: "Sua sessão expirou. Entre novamente." };

  const { data: attachment, error: attachmentError } = await context.supabase
    .from("attachments")
    .select("bucket_id, object_path")
    .eq("id", attachmentId)
    .eq("company_id", companyId)
    .is("removed_at", null)
    .maybeSingle<{ bucket_id: string; object_path: string }>();

  if (
    attachmentError
    || !attachment
    || attachment.bucket_id !== COMPANY_ATTACHMENTS_BUCKET
    || !isCompanyAttachmentObjectPath(companyId, attachment.object_path)
  ) {
    return { ok: false, message: "O anexo não está disponível para remoção." };
  }

  const { error: storageError } = await context.supabase.storage
    .from(COMPANY_ATTACHMENTS_BUCKET)
    .remove([attachment.object_path]);
  if (storageError) return { ok: false, message: "Não foi possível remover o arquivo do armazenamento." };

  const { error: registerError } = await context.supabase.rpc("remove_attachment", {
    request_key: crypto.randomUUID(),
    target_attachment_id: attachmentId,
  });
  if (registerError) {
    return { ok: false, message: "O arquivo foi removido, mas o histórico ainda precisa ser atualizado. Tente novamente." };
  }

  refreshCompany(companyId);
  return { ok: true, message: "Anexo removido com sucesso." };
}
