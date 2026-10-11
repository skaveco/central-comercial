import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import type { AuthenticatedProfile } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login?reason=expired");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("name, access_status, role")
    .eq("id", userId)
    .maybeSingle<AuthenticatedProfile>();

  if (error || !profile) redirect("/login?reason=invalid-profile");
  if (profile.access_status !== "active") {
    redirect(`/login?reason=${profile.access_status}`);
  }
  if (!profile.role) redirect("/login?reason=invalid-profile");

  return <AppShell user={{ name: profile.name, role: profile.role }}>{children}</AppShell>;
}
