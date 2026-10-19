import { CompaniesPanel, type CompanyListItem, type SegmentOption } from "@/components/registries/companies-panel";
import { createClient } from "@/lib/supabase/server";

type CompaniesPageProps = {
  searchParams: Promise<{ status?: string; query?: string; segment?: string; page?: string; size?: string }>;
};

const validPageSizes = new Set([10, 20, 50]);

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const params = await searchParams;
  const status = params.status === "inactive" ? "inactive" : "active";
  const query = (params.query ?? "").trim().slice(0, 80);
  const segment = params.segment ?? "";
  const requestedSize = Number(params.size ?? 10);
  const pageSize = validPageSizes.has(requestedSize) ? requestedSize : 10;
  const requestedPage = Number(params.page ?? 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const supabase = await createClient();

  let companiesQuery = supabase
    .from("companies")
    .select("id, name, cnpj, email, phone, address, segment_id, is_active, created_at, updated_at, segment:segments(name)", { count: "exact" })
    .eq("is_active", status === "active")
    .order("name", { ascending: true })
    .range(from, to);

  if (segment) companiesQuery = companiesQuery.eq("segment_id", segment);
  if (query) {
    const safeText = query.replace(/[,()*%_"]/g, " ").trim();
    const digits = query.replace(/\D/g, "");
    const filters = [safeText ? `name.ilike.*${safeText}*` : "", digits ? `cnpj_normalized.ilike.*${digits}*` : ""].filter(Boolean);
    if (filters.length) companiesQuery = companiesQuery.or(filters.join(","));
  }

  const [companiesResult, segmentsResult] = await Promise.all([
    companiesQuery,
    supabase.from("segments").select("id, name, is_active").order("name", { ascending: true }),
  ]);

  const total = companiesResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <CompaniesPanel
      companies={(companiesResult.data ?? []) as unknown as CompanyListItem[]}
      error={companiesResult.error ? "Não foi possível carregar as empresas." : undefined}
      filters={{ status, query, segment, page, pageSize }}
      segments={(segmentsResult.data ?? []) as SegmentOption[]}
      total={total}
      totalPages={totalPages}
    />
  );
}
