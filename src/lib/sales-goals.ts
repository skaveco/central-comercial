const commercialTimeZone = "America/Sao_Paulo";

export function getCurrentCommercialMonthStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    timeZone: commercialTimeZone,
    year: "numeric",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new Error("Não foi possível determinar o mês comercial atual.");
  return `${year}-${month}-01`;
}
