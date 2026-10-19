import { redirect } from "next/navigation";

import {
  ProductCategoriesPanel,
  type ProductCategory,
} from "@/components/settings/product-categories-panel";
import {
  OpportunitySettingsPanel,
  type OpportunityCatalogItem,
} from "@/components/settings/opportunity-settings-panel";
import { SalesGoalPanel, type SalesGoal } from "@/components/settings/sales-goal-panel";
import { SettingsLayout, type SettingsSection } from "@/components/settings/settings-layout";
import { SegmentsPanel, type Segment } from "@/components/settings/segments-panel";
import { UsersAccessPanel, type AccessUser } from "@/components/settings/users-access-panel";
import { getCurrentCommercialMonthStart } from "@/lib/sales-goals";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login?reason=expired");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, access_status")
    .eq("id", userId)
    .maybeSingle<{ role: string | null; access_status: string }>();

  if (!profile || profile.access_status !== "active") redirect("/login?reason=invalid-profile");
  if (profile.role !== "admin") redirect("/");

  const requestedSection = (await searchParams).section;
  const activeSection: SettingsSection =
    requestedSection === "goals" ||
    requestedSection === "opportunities" ||
    requestedSection === "product-categories" ||
    requestedSection === "segments"
      ? requestedSection
      : "users";

  if (activeSection === "goals") {
    const currentMonth = getCurrentCommercialMonthStart();
    const { data, error } = await supabase
      .from("sales_goal_changes")
      .select("id, effective_month, amount, updated_at")
      .lte("effective_month", currentMonth)
      .order("effective_month", { ascending: false })
      .limit(1)
      .maybeSingle();

    return (
      <SettingsLayout activeSection={activeSection}>
        <SalesGoalPanel
          currentGoal={(data as SalesGoal | null) ?? null}
          initialError={error ? "Não foi possível carregar a meta atual. Tente novamente." : undefined}
        />
      </SettingsLayout>
    );
  }

  if (activeSection === "product-categories") {
    const { data, error } = await supabase
      .from("product_categories")
      .select("id, name, is_active, sort_order, updated_at")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    return (
      <SettingsLayout activeSection={activeSection}>
        <ProductCategoriesPanel
          categories={(data ?? []) as ProductCategory[]}
          initialError={error ? "Não foi possível carregar as categorias. Tente novamente." : undefined}
        />
      </SettingsLayout>
    );
  }

  if (activeSection === "segments") {
    const { data, error } = await supabase
      .from("segments")
      .select("id, name, is_active, sort_order, updated_at")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    return (
      <SettingsLayout activeSection={activeSection}>
        <SegmentsPanel
          initialError={error ? "Não foi possível carregar os segmentos. Tente novamente." : undefined}
          segments={(data ?? []) as Segment[]}
        />
      </SettingsLayout>
    );
  }

  if (activeSection === "opportunities") {
    const [qualificationResult, sourceResult, lossReasonResult] = await Promise.all([
      supabase
        .from("qualification_parameters")
        .select("id, name, is_active, sort_order, updated_at")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("opportunity_sources")
        .select("id, name, is_active, sort_order, updated_at")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("loss_reasons")
        .select("id, name, is_active, sort_order, updated_at")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
    ]);

    return (
      <SettingsLayout activeSection={activeSection}>
        <OpportunitySettingsPanel
          initialErrors={{
            lossReason: lossReasonResult.error
              ? "Não foi possível carregar os motivos de perda. Tente novamente."
              : undefined,
            qualification: qualificationResult.error
              ? "Não foi possível carregar os itens de qualificação. Tente novamente."
              : undefined,
            source: sourceResult.error ? "Não foi possível carregar as origens. Tente novamente." : undefined,
          }}
          lossReasons={(lossReasonResult.data ?? []) as OpportunityCatalogItem[]}
          qualificationParameters={(qualificationResult.data ?? []) as OpportunityCatalogItem[]}
          sources={(sourceResult.data ?? []) as OpportunityCatalogItem[]}
        />
      </SettingsLayout>
    );
  }

  const { data, error } = await supabase.rpc("list_user_access_requests");

  return (
    <SettingsLayout activeSection={activeSection}>
      <UsersAccessPanel
        initialError={error ? "Não foi possível carregar os usuários. Tente novamente." : undefined}
        users={(data ?? []) as AccessUser[]}
      />
    </SettingsLayout>
  );
}
