import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSafeInternalPath, type AuthenticatedProfile } from "@/lib/auth/access";
import { getSupabaseConfig, hasSupabaseConfig } from "@/lib/supabase/config";

const publicPaths = new Set([
  "/login",
  "/cadastro",
  "/recuperar-senha",
  "/redefinir-senha",
  "/auth/confirm",
]);

function isPublicPath(pathname: string) {
  return publicPaths.has(pathname);
}

function redirectWithSessionCookies(
  request: NextRequest,
  sourceResponse: NextResponse,
  destination: string,
) {
  const response = NextResponse.redirect(new URL(destination, request.url));
  sourceResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

function loginDestination(request: NextRequest, reason?: string) {
  const url = new URL("/login", request.url);

  if (reason) url.searchParams.set("reason", reason);
  if (!isPublicPath(request.nextUrl.pathname) && request.nextUrl.pathname !== "/") {
    url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  }

  return `${url.pathname}${url.search}`;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const publicPath = isPublicPath(pathname);

  if (!hasSupabaseConfig()) {
    return publicPath
      ? NextResponse.next({ request })
      : NextResponse.redirect(new URL("/login", request.url));
  }

  let supabaseResponse = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseConfig();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([name, value]) => {
          supabaseResponse.headers.set(name, value);
        });
      },
    },
  });

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return publicPath
      ? supabaseResponse
      : redirectWithSessionCookies(request, supabaseResponse, loginDestination(request, "expired"));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("name, access_status, role")
    .eq("id", userId)
    .maybeSingle<AuthenticatedProfile>();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return redirectWithSessionCookies(
      request,
      supabaseResponse,
      loginDestination(request, "invalid-profile"),
    );
  }

  if (profile.access_status !== "active") {
    await supabase.auth.signOut();
    return redirectWithSessionCookies(
      request,
      supabaseResponse,
      loginDestination(request, profile.access_status),
    );
  }

  if (!profile.role) {
    await supabase.auth.signOut();
    return redirectWithSessionCookies(
      request,
      supabaseResponse,
      loginDestination(request, "invalid-profile"),
    );
  }

  if (pathname === "/login" || pathname === "/cadastro" || pathname === "/recuperar-senha") {
    const destination = getSafeInternalPath(request.nextUrl.searchParams.get("next"));
    return redirectWithSessionCookies(request, supabaseResponse, destination);
  }

  return supabaseResponse;
}
