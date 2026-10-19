"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type CompanyActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<"name" | "cnpj" | "email" | "phone" | "segmentId", string>>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanOptional(value: FormDataEntryValue | null) {
  const cleaned = String(value ?? "").trim();
  return cleaned || null;
}

function isValidCnpj(cnpj: string) {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calculateDigit = (base: string, weights: number[]) => {
    const sum = base.split("").reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const first = calculateDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = calculateDigit(cnpj.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cnpj.endsWith(`${first}${second}`);
}

async function authenticatedContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  return userId ? { supabase, userId } : null;
}

export async function saveCompanyAction(
  _previousState: CompanyActionState | null,
  formData: FormData,
): Promise<CompanyActionState> {
  const id = cleanOptional(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const cnpj = cleanOptional(formData.get("cnpj"));
  const cnpjNormalized = cnpj?.replace(/\D/g, "") ?? null;
  const email = cleanOptional(formData.get("email"));
  const phone = cleanOptional(formData.get("phone"));
  const phoneNormalized = phone?.replace(/\D/g, "") ?? null;
  const address = cleanOptional(formData.get("address"));
  const segmentId = cleanOptional(formData.get("segmentId"));
  const fieldErrors: CompanyActionState["fieldErrors"] = {};

  if (!name) fieldErrors.name = "Informe o nome da empresa.";
  if (cnpjNormalized && !isValidCnpj(cnpjNormalized)) fieldErrors.cnpj = "Informe um CNPJ válido.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Informe um e-mail válido.";
  if (phoneNormalized && !/^\d{10,11}$/.test(phoneNormalized)) fieldErrors.phone = "Informe um telefone com DDD.";
  if (segmentId && !uuidPattern.test(segmentId)) fieldErrors.segmentId = "Selecione um segmento válido.";
  if (id && !uuidPattern.test(id)) return { ok: false, message: "Empresa inválida." };
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Revise os campos destacados.", fieldErrors };

  const context = await authenticatedContext();
  if (!context) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const { supabase, userId } = context;

  if (segmentId) {
    const [{ data: segment, error: segmentError }, currentCompanyResult] = await Promise.all([
      supabase
        .from("segments")
        .select("id, is_active")
        .eq("id", segmentId)
        .maybeSingle<{ id: string; is_active: boolean }>(),
      id
        ? supabase.from("companies").select("segment_id").eq("id", id).maybeSingle<{ segment_id: string | null }>()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (segmentError || currentCompanyResult.error || !segment) {
      return {
        ok: false,
        message: "Não foi possível validar o segmento.",
        fieldErrors: { segmentId: "Segmento indisponível." },
      };
    }
    if (!segment.is_active && currentCompanyResult.data?.segment_id !== segmentId) {
      return {
        ok: false,
        message: "Selecione um segmento ativo.",
        fieldErrors: { segmentId: "Segmento indisponível para novos vínculos." },
      };
    }
  }

  if (cnpjNormalized) {
    let duplicateQuery = supabase.from("companies").select("id, name, is_active").eq("cnpj_normalized", cnpjNormalized);
    if (id) duplicateQuery = duplicateQuery.neq("id", id);
    const { data: duplicate, error: duplicateError } = await duplicateQuery.maybeSingle<{
      id: string;
      name: string;
      is_active: boolean;
    }>();
    if (duplicateError) return { ok: false, message: "Não foi possível validar o CNPJ." };
    if (duplicate) {
      return {
        ok: false,
        message: `Este CNPJ já pertence à empresa ${duplicate.name}${duplicate.is_active ? "" : " (desativada)"}.`,
        fieldErrors: { cnpj: "CNPJ já cadastrado." },
      };
    }
  }

  const values = {
    name,
    cnpj,
    cnpj_normalized: cnpjNormalized,
    email,
    phone,
    address,
    segment_id: segmentId,
    updated_by: userId,
  };

  const result = id
    ? await supabase.from("companies").update(values).eq("id", id).select("id").single()
    : await supabase.from("companies").insert({ ...values, created_by: userId }).select("id").single();

  if (result.error) return { ok: false, message: "Não foi possível salvar a empresa. Tente novamente." };
  revalidatePath("/cadastros/empresas");
  if (id) revalidatePath(`/cadastros/empresas/${id}`);
  return { ok: true, message: id ? "Empresa atualizada com sucesso." : "Empresa cadastrada com sucesso." };
}

export async function setCompanyStatusAction(
  _previousState: CompanyActionState | null,
  formData: FormData,
): Promise<CompanyActionState> {
  const id = String(formData.get("id") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "") === "true";
  if (!uuidPattern.test(id)) return { ok: false, message: "Empresa inválida." };

  const context = await authenticatedContext();
  if (!context) return { ok: false, message: "Sua sessão expirou. Entre novamente." };
  const { supabase, userId } = context;
  const { error } = await supabase
    .from("companies")
    .update({ is_active: nextStatus, updated_by: userId, status_changed_by: userId, status_changed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, message: `Não foi possível ${nextStatus ? "reativar" : "desativar"} a empresa.` };
  revalidatePath("/cadastros/empresas");
  revalidatePath(`/cadastros/empresas/${id}`);
  return { ok: true, message: `Empresa ${nextStatus ? "reativada" : "desativada"} com sucesso.` };
}
