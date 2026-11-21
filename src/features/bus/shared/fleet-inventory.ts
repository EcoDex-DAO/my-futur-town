export type FleetRecord = { network: string; scopeCategory: string; countYear: string; count: string; unavailable: string; seated: string; capacity: string };
export type FleetScopeTotal = { label: string; known: number; complete: boolean };
function integer(value: string): number | null { return value.trim() && Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null; }
export function summarizeFleet(records: readonly FleetRecord[]): FleetScopeTotal[] {
  const labels = [...new Set(records.map((record) => `${record.network} · ${record.scopeCategory} · effectifs ${record.countYear || "année inconnue"}`))];
  return labels.map((label) => {
    const subset = records.filter((record) => `${record.network} · ${record.scopeCategory} · effectifs ${record.countYear || "année inconnue"}` === label);
    return { label, known: subset.reduce((sum, record) => sum + (integer(record.count) ?? 0), 0), complete: subset.every((record) => integer(record.count) !== null) };
  });
}
export function validateFleetRecords(records: readonly FleetRecord[]): string | null {
  for (const record of records) {
    const amount = record.count === "" ? null : integer(record.count);
    const unavailable = record.unavailable === "" ? null : integer(record.unavailable);
    const seated = record.seated === "" ? null : integer(record.seated);
    const capacity = record.capacity === "" ? null : integer(record.capacity);
    if ((record.count !== "" && amount === null) || (record.unavailable !== "" && unavailable === null) || (record.seated !== "" && seated === null) || (record.capacity !== "" && capacity === null) || (amount !== null && unavailable !== null && unavailable > amount) || (seated !== null && capacity !== null && seated > capacity)) return "Vérifiez les nombres : entiers positifs, indisponibles ≤ effectif et places assises ≤ capacité totale.";
  }
  return null;
}
