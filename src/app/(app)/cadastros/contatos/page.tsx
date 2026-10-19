import {
  ContactsPanel,
  type ContactListItem,
  type SourceOption,
} from "@/components/registries/contacts-panel";
import { createClient } from "@/lib/supabase/server";

type ContactsPageProps = {
  searchParams: Promise<{
    status?: string;
    query?: string;
    source?: string;
    page?: string;
    size?: string;
  }>;
};

const validPageSizes = new Set([10, 20, 50]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const contactSelect = "id, name, phone, email, source_id, is_active, created_at, updated_at, source:opportunity_sources(name), company_contacts(is_active, company:companies(id, name, is_active))";

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const params = await searchParams;
  const status = params.status === "inactive" ? "inactive" : "active";
  const query = (params.query ?? "").trim().slice(0, 80);
  const source = uuidPattern.test(params.source ?? "") ? params.source! : "";
  const requestedSize = Number(params.size ?? 10);
  const pageSize = validPageSizes.has(requestedSize) ? requestedSize : 10;
  const requestedPage = Number(params.page ?? 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const supabase = await createClient();

  let contactsQuery = supabase
    .from("contacts")
    .select(contactSelect, { count: "exact" })
    .eq("is_active", status === "active")
    .order("name", { ascending: true })
    .range(from, to);

  if (source) contactsQuery = contactsQuery.eq("source_id", source);
  if (query) {
    const safeText = query.replace(/[,()*%_"]/g, " ").trim();
    const normalizedEmail = safeText.toLocaleLowerCase("pt-BR");
    const digits = query.replace(/\D/g, "");
    const filters = [
      safeText ? `name.ilike.*${safeText}*` : "",
      normalizedEmail ? `email_normalized.ilike.*${normalizedEmail}*` : "",
      digits ? `phone_normalized.ilike.*${digits}*` : "",
    ].filter(Boolean);
    if (filters.length) contactsQuery = contactsQuery.or(filters.join(","));
  }

  const [contactsResult, sourcesResult] = await Promise.all([
    contactsQuery,
    supabase.from("opportunity_sources").select("id, name, is_active").order("name", { ascending: true }),
  ]);

  const total = contactsResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <ContactsPanel
      contacts={(contactsResult.data ?? []) as unknown as ContactListItem[]}
      error={contactsResult.error ? "Não foi possível carregar os contatos." : undefined}
      filters={{ status, query, source, page, pageSize }}
      sources={(sourcesResult.data ?? []) as SourceOption[]}
      total={total}
      totalPages={totalPages}
    />
  );
}
