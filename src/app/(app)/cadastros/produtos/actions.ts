"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ProductActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<Record<"name" | "categoryId" | "basePrice", string>>;
  duplicate?: { id: string; name: string; isActive: boolean };
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanOptional(value: FormDataEntryValue | null) {
  const cleaned = String(value ?? "").trim();
  return cleaned || null;
}

function normalizeProductName(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function parseBasePrice(value: FormDataEntryValue | null) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return { value: null, valid: true };
  const normalizedSpace = rawValue.replace(/\u00a0/g, " ");
  const formattedCurrency = /^R\$\s\d{1,3}(?:\.\d{3})*,\d{2}$/;
  const plainDecimal = /^\d{1,12}(?:[.,]\d{1,2})?$/;
  let numericValue: number;

  if (formattedCurrency.test(normalizedSpace)) {
    const cents = Number(normalizedSpace.replace(/\D/g, ""));
    if (!Number.isSafeInteger(cents)) return { value: null, valid: false };
    numericValue = cents / 100;
  } else if (plainDecimal.test(normalizedSpace)) {
    numericValue = Number(normalizedSpace.replace(",", "."));
  } else {
    return { value: null, valid: false };
  }

  if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 999_999_999_999.99) {
    return { value: null, valid: false };
  }
  return { value: numericValue.toFixed(2), valid: true };
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

export async function saveProductAction(
  _previousState: ProductActionState | null,
  formData: FormData,
): Promise<ProductActionState> {
  const id = cleanOptional(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const description = cleanOptional(formData.get("description"));
  const categoryId = String(formData.get("categoryId") ?? "");
  const basePrice = parseBasePrice(formData.get("basePrice"));
  const allowDuplicate = String(formData.get("allowDuplicate") ?? "") === "true";
  const fieldErrors: ProductActionState["fieldErrors"] = {};

  if (!name) fieldErrors.name = "Informe o nome do produto.";
  if (!uuidPattern.test(categoryId)) fieldErrors.categoryId = "Selecione uma categoria válida.";
  if (!basePrice.valid) fieldErrors.basePrice = "Informe um valor não negativo, com até duas casas decimais.";
  if (id && !uuidPattern.test(id)) return { ok: false, message: "Produto inválido." };
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Revise os campos destacados.", fieldErrors };

  const context = await requireAdmin();
  if (!context) return { ok: false, message: "Você não tem permissão para alterar o catálogo." };
  const { supabase, userId } = context;

  const [{ data: category, error: categoryError }, currentProductResult] = await Promise.all([
    supabase.from("product_categories").select("id, is_active").eq("id", categoryId).maybeSingle<{ id: string; is_active: boolean }>(),
    id
      ? supabase.from("products").select("category_id").eq("id", id).maybeSingle<{ category_id: string }>()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (categoryError || !category) return { ok: false, message: "Não foi possível validar a categoria.", fieldErrors: { categoryId: "Categoria indisponível." } };
  if (!category.is_active && currentProductResult.data?.category_id !== categoryId) {
    return { ok: false, message: "Selecione uma categoria ativa.", fieldErrors: { categoryId: "Categoria indisponível para novas seleções." } };
  }

  if (!allowDuplicate) {
    const { data: productsInCategory, error: duplicateError } = await supabase
      .from("products")
      .select("id, name, is_active")
      .eq("category_id", categoryId);
    if (duplicateError) return { ok: false, message: "Não foi possível verificar possíveis duplicidades." };
    const normalizedName = normalizeProductName(name);
    const duplicate = productsInCategory?.find((product) => product.id !== id && normalizeProductName(product.name) === normalizedName);
    if (duplicate) {
      return {
        ok: false,
        message: "Já existe um produto com este nome na mesma categoria. Confirme para continuar mesmo assim.",
        duplicate: { id: duplicate.id, name: duplicate.name, isActive: duplicate.is_active },
      };
    }
  }

  const values = {
    category_id: categoryId,
    name,
    description,
    base_price: basePrice.value,
    updated_by: userId,
  };
  const result = id
    ? await supabase.from("products").update(values).eq("id", id).select("id").maybeSingle()
    : await supabase.from("products").insert({ ...values, created_by: userId }).select("id").maybeSingle();
  if (result.error || !result.data) return { ok: false, message: "Não foi possível salvar o produto. Tente novamente." };

  revalidatePath("/cadastros/produtos");
  return { ok: true, message: id ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso." };
}

export async function setProductStatusAction(
  _previousState: ProductActionState | null,
  formData: FormData,
): Promise<ProductActionState> {
  const id = String(formData.get("id") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "") === "true";
  if (!uuidPattern.test(id)) return { ok: false, message: "Produto inválido." };

  const context = await requireAdmin();
  if (!context) return { ok: false, message: "Você não tem permissão para alterar o catálogo." };
  const { data, error } = await context.supabase
    .from("products")
    .update({
      is_active: nextStatus,
      updated_by: context.userId,
      status_changed_by: context.userId,
      status_changed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, message: `Não foi possível ${nextStatus ? "reativar" : "desativar"} o produto.` };

  revalidatePath("/cadastros/produtos");
  return { ok: true, message: `Produto ${nextStatus ? "reativado" : "desativado"} com sucesso.` };
}
