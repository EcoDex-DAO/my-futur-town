import type { Position } from "./project-zone";

export type Permission = "unknown" | "allowed" | "prohibited" | "conditional";
export type Destination = { enabled: "unknown" | "yes" | "no"; pedestrian: Permission; bicycle: Permission; vehicle: Permission; condition: string };
export type AccessReference = {
  id: string; name: string; position: Position;
  direction: "unknown" | "entry" | "exit" | "both";
  directionDetails: string;
  origin: "unknown" | "official" | "entered" | "assumption";
  source: string; date: string; notes: string;
  parking: Destination; street: Destination;
};
export type AccessStore = { version: 2; accesses: AccessReference[] };
export const accessKey = (projectId: string) => `mft-access-reference-v1:${projectId}`;
const destination = (): Destination => ({ enabled: "unknown", pedestrian: "unknown", bicycle: "unknown", vehicle: "unknown", condition: "" });
export const newAccess = (position: Position): AccessReference => ({ id: crypto.randomUUID(), name: "", position, direction: "unknown", directionDetails: "", origin: "unknown", source: "", date: "", notes: "", parking: destination(), street: destination() });

const permissions = ["unknown", "allowed", "prohibited", "conditional"];
function validDestination(value: Destination): boolean {
  return !!value && ["unknown", "yes", "no"].includes(value.enabled) && permissions.includes(value.pedestrian) && permissions.includes(value.bicycle) && permissions.includes(value.vehicle) && typeof value.condition === "string" && (value.enabled !== "yes" || ![value.pedestrian, value.bicycle, value.vehicle].includes("conditional") || !!value.condition.trim());
}
export function validAccess(item: AccessReference): boolean {
  return !!item && typeof item.id === "string" && !!item.id && typeof item.name === "string" && !!item.name.trim() && Array.isArray(item.position) && item.position.length === 2 && item.position.every(Number.isFinite) && Math.abs(item.position[0]) <= 180 && Math.abs(item.position[1]) <= 90 && ["unknown", "entry", "exit", "both"].includes(item.direction) && typeof item.directionDetails === "string" && ["unknown", "official", "entered", "assumption"].includes(item.origin) && typeof item.source === "string" && typeof item.date === "string" && typeof item.notes === "string" && (item.origin !== "official" || (!!item.source.trim() && !!item.date)) && validDestination(item.parking) && validDestination(item.street);
}
export function readAccesses(raw: string | null): AccessStore {
  if (raw === null) return { version: 2, accesses: [] };
  const value = JSON.parse(raw) as { version: number; accesses: AccessReference[] };
  if (!value || ![1, 2].includes(value.version) || !Array.isArray(value.accesses)) throw Error("Données incompatibles");
  const accesses = value.version === 1 ? value.accesses.map((item) => {
    const migrate = (entry: Destination) => ({ ...entry, enabled: (entry?.enabled as unknown) === true ? "yes" : (entry?.enabled as unknown) === false ? "no" : entry?.enabled }) as Destination;
    return { ...item, parking: migrate(item.parking), street: migrate(item.street) };
  }) : value.accesses;
  if (!accesses.every(validAccess) || new Set(accesses.map((item) => item.id)).size !== accesses.length) throw Error("Données incompatibles");
  return { version: 2, accesses };
}
export function saveAccesses(storage: Storage, key: string, snapshot: string | null, accesses: AccessReference[]): string {
  const raw = JSON.stringify({ version: 2, accesses });
  readAccesses(raw);
  if (storage.getItem(key) !== snapshot) throw Error("Conflit entre onglets");
  storage.setItem(key, raw);
  return raw;
}
