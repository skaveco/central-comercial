export type AccessStatus = "pending" | "active" | "rejected" | "disabled";

export type AuthenticatedProfile = {
  name: string;
  access_status: AccessStatus;
  role: "admin" | "pre_sales" | "commercial" | null;
};

export const accessReasonMessages: Record<string, string> = {
  pending: "Seu cadastro está aguardando aprovação de um administrador.",
  rejected: "Sua solicitação de acesso não foi aprovada. Fale com um administrador.",
  disabled: "Seu acesso está desativado. Fale com um administrador.",
  "invalid-profile": "Não foi possível validar sua permissão. Fale com um administrador.",
  expired: "Sua sessão expirou. Entre novamente.",
};

export function getSafeInternalPath(path: string | null | undefined, fallback = "/") {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(path, "http://local");
    if (parsed.origin !== "http://local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
