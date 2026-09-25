/**
 * Utility to calculate calendar duration (dias corridos) between start and end dates.
 * Both start and end dates are inclusive:
 * - Same day (e.g. 01/05 to 01/05): 1 dia corrido
 * - Consecutive day (e.g. 01/05 to 02/05): 2 dias corridos
 * - Spanning months/years: total calendar days inclusive
 */
export function calculateDurationInDays(
  startDate?: string | null,
  endDate?: string | null
): number | null {
  if (!startDate || !endDate) return null;
  try {
    const sClean = String(startDate).split("T")[0].trim();
    const eClean = String(endDate).split("T")[0].trim();
    if (!sClean || !eClean) return null;

    const sParts = sClean.split("-").map(Number);
    const eParts = eClean.split("-").map(Number);
    if (sParts.length !== 3 || eParts.length !== 3) return null;

    const sMs = Date.UTC(sParts[0], sParts[1] - 1, sParts[2]);
    const eMs = Date.UTC(eParts[0], eParts[1] - 1, eParts[2]);

    if (isNaN(sMs) || isNaN(eMs)) return null;

    const diffDays = Math.round((eMs - sMs) / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : null;
  } catch {
    return null;
  }
}

export function formatDurationDays(days: number | null | undefined, fullLabel: boolean = true): string {
  if (!days || days <= 0) return "-";
  if (!fullLabel) return `${days} ${days === 1 ? "dia" : "dias"}`;
  return `${days} ${days === 1 ? "dia corrido" : "dias corridos"}`;
}
