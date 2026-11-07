import type { SibraData } from "./sibra";

export type ScheduleStop = { stopId: string; arrival: number; departure: number; progress: number };
export type ScheduleTrip = {
  id: string; lineId: string; variantId: string; directionId: string; serviceId: string;
  stops: ScheduleStop[];
};
export type Schedule = {
  metadata: { validFrom: string; validTo: string; timeZone: string };
  serviceDates: Record<string, string[]>;
  trips: ScheduleTrip[];
};
export type RushHour = { date: string; peakSecond: number; startSecond: number; endSecond: number; busCount: number };
export type ActiveVehicle = {
  id: string; lineId: string; variantId: string; directionId: string;
  position: [number, number]; bearing: number; atStop: boolean;
};

const daySeconds = 86400;
function dateDay(value: unknown): number {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp / 86400000 : NaN;
}

export function parseSchedule(value: unknown): Schedule {
  const fail = (): never => { throw new Error("Horaires SIBRA invalides"); };
  if (!value || typeof value !== "object") return fail();
  const schedule = value as Schedule;
  const metadata = schedule.metadata;
  if (!metadata || !Number.isFinite(dateDay(metadata.validFrom)) || !Number.isFinite(dateDay(metadata.validTo)) ||
    metadata.validFrom > metadata.validTo || typeof metadata.timeZone !== "string") return fail();
  try { new Intl.DateTimeFormat("fr", { timeZone: metadata.timeZone }); } catch { return fail(); }
  if (!schedule.serviceDates || typeof schedule.serviceDates !== "object" || Array.isArray(schedule.serviceDates) ||
    !Array.isArray(schedule.trips)) return fail();
  const serviceIds = new Set<string>();
  for (const [date, services] of Object.entries(schedule.serviceDates)) {
    if (!Number.isFinite(dateDay(date)) || date < metadata.validFrom || date > metadata.validTo ||
      !Array.isArray(services) || services.some((id) => typeof id !== "string" || !id) ||
      new Set(services).size !== services.length) return fail();
    for (const id of services) serviceIds.add(id);
  }
  const ids = new Set<string>();
  for (const trip of schedule.trips) {
    if (!trip || [trip.id, trip.lineId, trip.variantId, trip.directionId, trip.serviceId].some((id) => typeof id !== "string" || !id) ||
      ids.has(trip.id) || !serviceIds.has(trip.serviceId) || !Array.isArray(trip.stops) || trip.stops.length < 2) return fail();
    ids.add(trip.id);
    let previous: ScheduleStop | undefined;
    for (const stop of trip.stops) {
      if (!stop || typeof stop.stopId !== "string" || !stop.stopId ||
        !Number.isSafeInteger(stop.arrival) || !Number.isSafeInteger(stop.departure) || stop.arrival < 0 || stop.departure < stop.arrival ||
        !Number.isFinite(stop.progress) || stop.progress < 0 || stop.progress > 1 ||
        (previous && (stop.arrival < previous.departure || stop.progress < previous.progress))) return fail();
      previous = stop;
    }
    if (trip.stops.at(-1)!.arrival <= trip.stops[0].departure) return fail();
  }
  return schedule;
}

const serviceDateCache = new WeakMap<Schedule, Map<string, string[]>>();
function datesByService(schedule: Schedule): Map<string, string[]> {
  const cached = serviceDateCache.get(schedule);
  if (cached) return cached;
  const dates = new Map<string, string[]>();
  for (const [date, services] of Object.entries(schedule.serviceDates)) {
    for (const service of services) {
      const list = dates.get(service) ?? [];
      list.push(date);
      dates.set(service, list);
    }
  }
  serviceDateCache.set(schedule, dates);
  return dates;
}

const rushCache = new WeakMap<Schedule, Map<string, RushHour | null>>();

/** Counts scheduled trips, including spillover from previous service dates, on civil dates in the validity period. */
export function findRushHour(schedule: Schedule, lineId: string): RushHour | null {
  let cache = rushCache.get(schedule);
  if (!cache) { cache = new Map(); rushCache.set(schedule, cache); }
  if (cache.has(lineId)) return cache.get(lineId)!;
  const minimum = dateDay(schedule.metadata.validFrom) * daySeconds;
  const maximum = (dateDay(schedule.metadata.validTo) + 1) * daySeconds;
  const events = new Map<number, number>();
  for (const trip of schedule.trips) {
    if (trip.lineId !== lineId) continue;
    for (const date of datesByService(schedule).get(trip.serviceId) ?? []) {
      const origin = dateDay(date) * daySeconds;
      const start = Math.max(minimum, origin + trip.stops[0].departure);
      const end = Math.min(maximum, origin + trip.stops.at(-1)!.arrival);
      if (start >= end) continue;
      events.set(start, (events.get(start) ?? 0) + 1);
      events.set(end, (events.get(end) ?? 0) - 1);
    }
  }
  // Midnight matters for weekday tie-breaking even when no vehicle starts then.
  for (let midnight = minimum; midnight < maximum; midnight += daySeconds) {
    if (!events.has(midnight)) events.set(midnight, 0);
  }
  let count = 0;
  let best: RushHour | null = null;
  const weekday = (date: string) => { const day = new Date(`${date}T00:00:00Z`).getUTCDay(); return day !== 0 && day !== 6; };
  for (const [time, delta] of [...events].sort(([a], [b]) => a - b)) {
    count += delta;
    if (!count || time >= maximum) continue;
    const date = new Date(time * 1000).toISOString().slice(0, 10);
    if (best && (count < best.busCount || (count === best.busCount && (!weekday(date) || weekday(best.date))))) continue;
    const peakSecond = time - dateDay(date) * daySeconds;
    const startSecond = Math.max(0, peakSecond - 1800);
    best = { date, peakSecond, startSecond, endSecond: startSecond + 3600, busCount: count };
  }
  cache.set(lineId, best);
  return best;
}

const radians = (degrees: number) => degrees * Math.PI / 180;
function distance(a: [number, number], b: [number, number]): number {
  const latitude = radians(b[1] - a[1]);
  const longitude = radians(b[0] - a[0]);
  const h = Math.sin(latitude / 2) ** 2 + Math.cos(radians(a[1])) * Math.cos(radians(b[1])) * Math.sin(longitude / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
type Geometry = { coordinates: [number, number][]; cumulative: number[]; length: number };
const geometryCache = new WeakMap<SibraData, Map<string, Geometry>>();
function geometries(data: SibraData): Map<string, Geometry> {
  const cached = geometryCache.get(data);
  if (cached) return cached;
  const result = new Map<string, Geometry>();
  for (const line of data.lines) for (const variant of line.variants) {
    const coordinates = variant.coordinates;
    const cumulative = [0];
    for (let i = 1; i < coordinates.length; i++) cumulative.push(cumulative[i - 1] + distance(coordinates[i - 1], coordinates[i]));
    const length = cumulative.at(-1)!;
    if (coordinates.length >= 2 && length > 0) result.set(JSON.stringify([line.id, variant.id]), { coordinates, cumulative, length });
  }
  geometryCache.set(data, result);
  return result;
}

function locate(geometry: Geometry, progress: number): Pick<ActiveVehicle, "position" | "bearing"> {
  const target = progress * geometry.length;
  let low = 1;
  let high = geometry.cumulative.length - 1;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (geometry.cumulative[middle] <= target) low = middle + 1;
    else high = middle;
  }
  let segment = low;
  while (segment > 1 && geometry.cumulative[segment] === geometry.cumulative[segment - 1]) segment--;
  const a = geometry.coordinates[segment - 1];
  const b = geometry.coordinates[segment];
  const length = geometry.cumulative[segment] - geometry.cumulative[segment - 1];
  const ratio = length ? (target - geometry.cumulative[segment - 1]) / length : 0;
  const delta = radians(b[0] - a[0]);
  const y = Math.sin(delta) * Math.cos(radians(b[1]));
  const x = Math.cos(radians(a[1])) * Math.sin(radians(b[1])) - Math.sin(radians(a[1])) * Math.cos(radians(b[1])) * Math.cos(delta);
  return {
    position: [a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio],
    bearing: (Math.atan2(y, x) * 180 / Math.PI + 360) % 360,
  };
}

type Occurrence = { trip: ScheduleTrip; serviceDate: string; origin: number };
const occurrenceCache = new WeakMap<Schedule, Map<string, Occurrence[]>>();
function occurrencesOnDay(schedule: Schedule, day: number, lineId: string): Occurrence[] {
  let cache = occurrenceCache.get(schedule);
  if (!cache) { cache = new Map(); occurrenceCache.set(schedule, cache); }
  const key = JSON.stringify([day, lineId]);
  const cached = cache.get(key);
  if (cached) return cached;
  const occurrences: Occurrence[] = [];
  for (const trip of schedule.trips) {
    if (trip.lineId !== lineId) continue;
    for (const serviceDate of datesByService(schedule).get(trip.serviceId) ?? []) {
      const origin = dateDay(serviceDate) * daySeconds;
      if (origin + trip.stops[0].departure < (day + 1) * daySeconds && origin + trip.stops.at(-1)!.arrival > day * daySeconds) {
        occurrences.push({ trip, serviceDate, origin });
      }
    }
  }
  cache.set(key, occurrences);
  return occurrences;
}

export function getActiveVehicles(schedule: Schedule, data: SibraData, date: string, second: number, lineId: string): ActiveVehicle[] {
  const day = dateDay(date);
  if (!Number.isFinite(day) || !Number.isFinite(second) || second < 0) return [];
  const time = day * daySeconds + second;
  const routes = geometries(data);
  const vehicles: ActiveVehicle[] = [];
  for (const { trip, serviceDate, origin } of occurrencesOnDay(schedule, Math.floor(time / daySeconds), lineId)) {
    const geometry = routes.get(JSON.stringify([trip.lineId, trip.variantId]));
    if (!geometry) continue;
    const local = time - origin;
    if (local < trip.stops[0].departure || local >= trip.stops.at(-1)!.arrival) continue;
    let progress = trip.stops[0].progress;
    let atStop = false;
    for (let i = 0; i < trip.stops.length; i++) {
      const stop = trip.stops[i];
      if (local >= stop.arrival && local <= stop.departure) { progress = stop.progress; atStop = true; break; }
      const next = trip.stops[i + 1];
      if (next && local > stop.departure && local < next.arrival) {
        progress = stop.progress + (next.progress - stop.progress) * (local - stop.departure) / (next.arrival - stop.departure);
        break;
      }
    }
    vehicles.push({ id: `${trip.id}@${serviceDate}`, lineId: trip.lineId, variantId: trip.variantId, directionId: trip.directionId, ...locate(geometry, progress), atStop });
  }
  return vehicles;
}
