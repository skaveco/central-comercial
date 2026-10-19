import { ProductsPanel, type ProductCategory, type ProductListItem } from "@/components/registries/products-panel";
import { createClient } from "@/lib/supabase/server";

type ProductsPageProps = {
  searchParams: Promise<{
    status?: string;
    query?: string;
    category?: string;
    page?: string;
    size?: string;
  }>;
};

const validPageSizes = new Set([10, 20, 50]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const status = params.status === "active" || params.status === "inactive" ? params.status : "all";
  const query = (params.query ?? "").trim().slice(0, 100);
  const category = uuidPattern.test(params.category ?? "") ? params.category! : "";
  const requestedSize = Number(params.size ?? 10);
  const pageSize = validPageSizes.has(requestedSize) ? requestedSize : 10;
  const requestedPage = Number(params.page ?? 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const from = (page - 1) * pageSize;
  const supabase = await createClient();

  let productsQuery = supabase
    .from("products")
    .select("id, category_id, name, description, base_price, is_active, created_at, updated_at, category:product_categories(id, name, is_active)", { count: "exact" })
    .order("name", { ascending: true })
    .range(from, from + pageSize - 1);
  if (status !== "all") productsQuery = productsQuery.eq("is_active", status === "active");
  if (category) productsQuery = productsQuery.eq("category_id", category);
  if (query) {
    const safeText = query.replace(/[,()*%_"]/g, " ").trim();
    if (safeText) productsQuery = productsQuery.or(`name.ilike.*${safeText}*,description.ilike.*${safeText}*`);
  }

  const [productsResult, categoriesResult, claimsResult] = await Promise.all([
    productsQuery,
    supabase
      .from("product_categories")
      .select("id, name, is_active, sort_order, products(id)")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.auth.getClaims(),
  ]);

  const userId = claimsResult.data?.claims?.sub;
  const profileResult = userId
    ? await supabase.from("profiles").select("role, access_status").eq("id", userId).maybeSingle<{ role: string | null; access_status: string }>()
    : { data: null, error: null };
  const canManage = profileResult.data?.role === "admin" && profileResult.data.access_status === "active";
  const categories = (categoriesResult.data ?? [])
    .filter((item) => item.is_active || item.products.length > 0)
    .map((item) => ({ id: item.id, name: item.name, is_active: item.is_active, sort_order: item.sort_order }));
  const total = productsResult.count ?? 0;

  return (
    <ProductsPanel
      canManage={canManage}
      categories={categories as ProductCategory[]}
      error={productsResult.error || categoriesResult.error ? "Não foi possível carregar o catálogo." : undefined}
      filters={{ status, query, category, page, pageSize }}
      products={(productsResult.data ?? []) as unknown as ProductListItem[]}
      total={total}
      totalPages={Math.max(1, Math.ceil(total / pageSize))}
    />
  );
}
