/** Only compare a positive autonomy explicitly expressed in kilometres. */
export function declaredRangeKm(value: string): number | null {
  const match = /^\s*(\d+(?:[.,]\d+)?)\s*km(?:\s|\(|$)/i.exec(value);
  if (!match) return null;
  const number = Number(match[1].replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : null;
}
