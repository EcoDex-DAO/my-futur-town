import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import type { BusCoordinate } from "./bus-line";

type OSMNode = { id: number; lon: number; lat: number; tags?: Record<string, string> };
type OSMWay = { id: number; nodes: number[]; tags: Record<string, string> };
type OSMRestriction = { id: number; members: { type: string; ref: number; role: string }[]; tags: Record<string, string> };
type OSMArchive = { metadata: { bbox_south_west_north_east: [number, number, number, number]; archive_sha256: string }; nodes: OSMNode[]; ways: OSMWay[]; restrictions: OSMRestriction[] };
type Edge = { to: string; way: string; distance: number; warnings: string[] };
type TurnRule = { kind: string; toWay: string; relationId: number };
type GraphNode = { id: string; coordinates: BusCoordinate };
type BusRoadGraph = { nodes: Map<string, GraphNode>; adjacency: Map<string, Edge[]>; activeNodes: Set<string>; wayIdsByNode: Map<string, Set<string>>; restrictions: Map<string, TurnRule[]>; unknownRestrictions: number; bounds: [number, number, number, number]; spatial: Map<string, string[]> };
type QueueState = { key: string; current: string; previousNode: string | null; previousWay: string | null; distance: number; priority: number };
type Snap = { nodeId: string; coordinates: BusCoordinate; distanceM: number; ambiguous: boolean };

const archiveName = "grand-annecy-20261108.osm.json.gz";
const manifestName = "grand-annecy-20261108.manifest.json";
let graphPromise: Promise<BusRoadGraph> | null = null;

function distanceM(first: BusCoordinate, second: BusCoordinate): number {
  const radians = Math.PI / 180;
  const lat1 = first[1] * radians;
  const lat2 = second[1] * radians;
  const latDiff = (second[1] - first[1]) * radians;
  const lonDiff = (second[0] - first[0]) * radians;
  const haversine = Math.sin(latDiff / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(lonDiff / 2) ** 2;
  return 12_742_000 * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

function spatialKey(lon: number, lat: number): string {
  return `${Math.floor(lon * 1000)}:${Math.floor(lat * 1000)}`;
}

function createGraph(data: OSMArchive): BusRoadGraph {
  const nodes = new Map<string, GraphNode>();
  const adjacency = new Map<string, Edge[]>();
  const activeNodes = new Set<string>();
  const wayIdsByNode = new Map<string, Set<string>>();
  const spatial = new Map<string, string[]>();
  const warningsByWay = new Map<string, string[]>();
  const accessForbidden = new Set(["footway", "cycleway", "path", "steps", "pedestrian", "platform", "track", "corridor", "elevator"]);

  for (const node of data.nodes) {
    const id = String(node.id);
    const coordinates: BusCoordinate = [node.lon, node.lat];
    nodes.set(id, { id, coordinates });
    const key = spatialKey(node.lon, node.lat);
    const bucket = spatial.get(key) ?? [];
    bucket.push(id);
    spatial.set(key, bucket);
  }

  function addWayNode(nodeId: string, wayId: string) {
    const set = wayIdsByNode.get(nodeId) ?? new Set<string>();
    set.add(wayId);
    wayIdsByNode.set(nodeId, set);
  }

  function addEdge(from: string, to: string, way: string, length: number, warnings: string[]) {
    const edges = adjacency.get(from) ?? [];
    edges.push({ to, way, distance: length, warnings });
    adjacency.set(from, edges);
    activeNodes.add(from);
    activeNodes.add(to);
  }

  for (const way of data.ways) {
    const tags = way.tags ?? {};
    if (!tags.highway) continue;
    const busMode = tags.bus ?? tags.psv;
    const busAccessOverride = busMode === "yes" || busMode === "designated" || busMode === "permissive";
    const busSpecific = Object.keys(tags).some((key) => key.startsWith("bus:") || key.startsWith("psv:"));
    if (accessForbidden.has(tags.highway) && busMode !== "yes" && busMode !== "designated") continue;
    if (busMode === "no" || busMode === "private") continue;
    if ([tags.access, tags.vehicle, tags.motor_vehicle].some((value) => value === "no" || value === "private") && !busAccessOverride) continue;
    if (tags["bus:conditional"] === "no" || tags["psv:conditional"] === "no") continue;

    const warnings = new Set<string>();
    if (busMode !== "yes" && busMode !== "designated") warnings.add("Accès bus non confirmé par un tag explicite.");
    if ([tags.access, tags.vehicle, tags.motor_vehicle].some((value) => value === "destination" || value === "customers")) warnings.add("Accès réservé ou limité à vérifier.");
    if (Object.keys(tags).some((key) => key.includes("conditional"))) warnings.add("Une condition d’accès ou de sens n’est pas interprétée.");
    if (Object.keys(tags).some((key) => key.startsWith("bus:") || key.startsWith("psv:"))) warnings.add("Un tag bus directionnel ou spécifique nécessite une vérification.");
    if (Object.keys(tags).some((key) => /^(maxheight|maxwidth|maxlength|maxweight|maxaxleload)/.test(key))) warnings.add("Le gabarit du bus n’est pas vérifié.");

    const oneway = tags["oneway:bus"] ?? tags["oneway:psv"] ?? tags.oneway ?? (tags.junction === "roundabout" ? "yes" : undefined);
    let forward = true;
    let reverse = true;
    if (oneway === "yes" || oneway === "1" || oneway === "true") reverse = false;
    else if (oneway === "-1") forward = false;
    else if (oneway === "no" || oneway === "0" || oneway === "false") { forward = true; reverse = true; }
    else warnings.add("Sens de circulation non confirmé.");
    if (Object.keys(tags).some((key) => key.startsWith("oneway:") && key.includes("conditional")) || Object.keys(tags).some((key) => key.startsWith("busway"))) {
      forward = true;
      reverse = true;
      warnings.add("Sens conditionnel ou voie bus non interprété.");
    }

    const wayId = String(way.id);
    const wayWarnings = [...warnings];
    warningsByWay.set(wayId, wayWarnings);
    for (const [firstRef, secondRef] of way.nodes.slice(1).map((second, index) => [way.nodes[index], second] as const)) {
      const first = String(firstRef);
      const second = String(secondRef);
      const firstNode = nodes.get(first);
      const secondNode = nodes.get(second);
      if (!firstNode || !secondNode || first === second) continue;
      if (firstNode.coordinates[0] === secondNode.coordinates[0] && firstNode.coordinates[1] === secondNode.coordinates[1]) continue;
      const length = distanceM(firstNode.coordinates, secondNode.coordinates);
      if (!Number.isFinite(length) || length <= 0) continue;
      addWayNode(first, wayId);
      addWayNode(second, wayId);
      if (forward) addEdge(first, second, wayId, length, wayWarnings);
      if (reverse) addEdge(second, first, wayId, length, wayWarnings);
    }
  }

  const restrictions = new Map<string, TurnRule[]>();
  let unknownRestrictions = 0;
  const knownRestrictions = new Set(["no_left_turn", "no_right_turn", "no_straight_on", "no_u_turn", "only_left_turn", "only_right_turn", "only_straight_on", "only_u_turn"]);
  for (const relation of data.restrictions ?? []) {
    const tags = relation.tags ?? {};
    if (!tags.type?.startsWith("restriction")) { unknownRestrictions += 1; continue; }
    if (tags["restriction:bicycle"] === "give_way" && Object.keys(tags).length === 2) continue;
    if (Object.keys(tags).some((key) => key.includes("conditional"))) { unknownRestrictions += 1; continue; }
    const exception = new Set((tags.except ?? "").split(/[;, ]+/).filter(Boolean));
    const specific = tags["restriction:bus"] ?? tags["restriction:psv"];
    if (!specific && (exception.has("bus") || exception.has("psv"))) continue;
    const kind = specific ?? tags.restriction;
    const incoming = relation.members.filter((member) => member.role === "from" && member.type === "way");
    const via = relation.members.filter((member) => member.role === "via" && member.type === "node");
    const outgoing = relation.members.filter((member) => member.role === "to" && member.type === "way");
    if (!kind || !knownRestrictions.has(kind) || incoming.length !== 1 || via.length !== 1 || outgoing.length !== 1 || relation.members.length !== 3) { unknownRestrictions += 1; continue; }
    const fromWay = String(incoming[0].ref);
    const viaNode = String(via[0].ref);
    const toWay = String(outgoing[0].ref);
    if (!wayIdsByNode.get(viaNode)?.has(fromWay) || !wayIdsByNode.get(viaNode)?.has(toWay)) { unknownRestrictions += 1; continue; }
    const key = `${viaNode}:${fromWay}`;
    const rules = restrictions.get(key) ?? [];
    rules.push({ kind, toWay, relationId: relation.id });
    restrictions.set(key, rules);
  }

  return { nodes, adjacency, activeNodes, wayIdsByNode, restrictions, unknownRestrictions, bounds: data.metadata.bbox_south_west_north_east, spatial };
}

async function loadGraph(): Promise<BusRoadGraph> {
  if (!graphPromise) {
    graphPromise = (async () => {
      const root = process.cwd();
      const [archive, manifestText] = await Promise.all([
        readFile(path.join(root, "data/reference/osm", archiveName)),
        readFile(path.join(root, "data/reference/osm", manifestName), "utf8"),
      ]);
      const manifest = JSON.parse(manifestText) as { archive_sha256?: string; bbox_south_west_north_east?: [number, number, number, number] };
      if (!manifest.archive_sha256 || createHash("sha256").update(archive).digest("hex") !== manifest.archive_sha256 || !manifest.bbox_south_west_north_east) throw new Error("L’archive OSM ne correspond pas à son manifeste.");
      const data = JSON.parse(gunzipSync(archive).toString("utf8")) as OSMArchive;
      if (data.metadata.bbox_south_west_north_east.join(",") !== manifest.bbox_south_west_north_east.join(",")) throw new Error("L’étendue OSM ne correspond pas au manifeste.");
      return createGraph(data);
    })().catch((error) => {
      graphPromise = null;
      throw error;
    });
  }
  return graphPromise;
}

function nearestNode(graph: BusRoadGraph, coordinate: BusCoordinate, maxDistance = 40): Snap | null {
  const [lon, lat] = coordinate;
  const centerX = Math.floor(lon * 1000);
  const centerY = Math.floor(lat * 1000);
  let nearest: { nodeId: string; distanceM: number; coordinates: BusCoordinate } | null = null;
  let second = Infinity;
  for (let x = centerX - 1; x <= centerX + 1; x += 1) for (let y = centerY - 1; y <= centerY + 1; y += 1) {
    for (const nodeId of graph.spatial.get(`${x}:${y}`) ?? []) {
      if (!graph.activeNodes.has(nodeId)) continue;
      const node = graph.nodes.get(nodeId);
      if (!node) continue;
      const distance = distanceM(coordinate, node.coordinates);
      if (distance < (nearest?.distanceM ?? Infinity)) {
        second = nearest?.distanceM ?? second;
        nearest = { nodeId, distanceM: distance, coordinates: node.coordinates };
      } else if (distance < second) second = distance;
    }
  }
  if (!nearest || nearest.distanceM > maxDistance) return null;
  return { ...nearest, ambiguous: second <= nearest.distanceM + 3 };
}

function turnAllowed(graph: BusRoadGraph, previousNode: string | null, currentNode: string, previousWay: string | null, nextNode: string, nextWay: string): boolean {
  if (!previousWay) return true;
  for (const rule of graph.restrictions.get(`${currentNode}:${previousWay}`) ?? []) {
    const isUTurn = previousNode === nextNode;
    const matches = nextWay === rule.toWay && (!rule.kind.endsWith("u_turn") || previousWay !== rule.toWay || isUTurn);
    if (rule.kind.startsWith("no_") && matches) return false;
    if (rule.kind.startsWith("only_") && !matches) return false;
  }
  return true;
}

function stateKey(current: string, previousNode: string | null, previousWay: string | null): string {
  return `${current}|${previousNode ?? ""}|${previousWay ?? ""}`;
}

class MinHeap {
  private values: QueueState[] = [];
  push(value: QueueState) {
    this.values.push(value);
    let index = this.values.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.values[parent].priority <= value.priority) break;
      this.values[index] = this.values[parent];
      index = parent;
    }
    this.values[index] = value;
  }
  pop(): QueueState | undefined {
    const first = this.values[0];
    const last = this.values.pop();
    if (!first || !last || this.values.length === 0) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.values.length) break;
      const child = right < this.values.length && this.values[right].priority < this.values[left].priority ? right : left;
      if (this.values[child].priority >= last.priority) break;
      this.values[index] = this.values[child];
      index = child;
    }
    this.values[index] = last;
    return first;
  }
  get size() { return this.values.length; }
}

function routeBetween(graph: BusRoadGraph, start: string, end: string): { coordinates: BusCoordinate[]; warnings: Set<string> } | null {
  const initialKey = stateKey(start, null, null);
  const initial: QueueState = { key: initialKey, current: start, previousNode: null, previousWay: null, distance: 0, priority: distanceM(graph.nodes.get(start)!.coordinates, graph.nodes.get(end)!.coordinates) };
  const frontier = new MinHeap();
  frontier.push(initial);
  const best = new Map([[initialKey, 0]]);
  const previous = new Map<string, { stateKey: string; edge: Edge }>();
  const states = new Map([[initialKey, initial]]);
  let goal: QueueState | null = null;
  let visited = 0;
  while (frontier.size > 0 && visited < 500_000) {
    const current = frontier.pop();
    if (!current || current.distance !== best.get(current.key)) continue;
    visited += 1;
    if (current.current === end) { goal = current; break; }
    for (const edge of graph.adjacency.get(current.current) ?? []) {
      if (!turnAllowed(graph, current.previousNode, current.current, current.previousWay, edge.to, edge.way)) continue;
      const nextDistance = current.distance + edge.distance;
      const key = stateKey(edge.to, current.current, edge.way);
      if (nextDistance >= (best.get(key) ?? Infinity)) continue;
      const nextNode = graph.nodes.get(edge.to);
      const goalNode = graph.nodes.get(end);
      if (!nextNode || !goalNode) continue;
      const state: QueueState = { key, current: edge.to, previousNode: current.current, previousWay: edge.way, distance: nextDistance, priority: nextDistance + distanceM(nextNode.coordinates, goalNode.coordinates) };
      best.set(key, nextDistance);
      previous.set(key, { stateKey: current.key, edge });
      states.set(key, state);
      frontier.push(state);
    }
  }
  if (!goal) return null;
  const path: string[] = [goal.current];
  const warnings = new Set<string>();
  let cursor = goal.key;
  while (cursor !== initialKey) {
    const link = previous.get(cursor);
    if (!link) return null;
    link.edge.warnings.forEach((warning) => warnings.add(warning));
    cursor = link.stateKey;
    path.push(states.get(cursor)!.current);
  }
  path.reverse();
  return { coordinates: path.map((nodeId) => graph.nodes.get(nodeId)!.coordinates), warnings };
}

export async function calculateBusRoute(points: BusCoordinate[]) {
  const graph = await loadGraph();
  const [south, west, north, east] = graph.bounds;
  if (points.some(([lon, lat]) => lon < west || lon > east || lat < south || lat > north)) return { status: "unavailable" as const, warnings: ["Un point est hors de la couverture OSM Grand Annecy ; aucun tracé n’a été inventé."] };
  const snaps = points.map((point) => nearestNode(graph, point));
  if (snaps.some((snap) => snap === null)) return { status: "unavailable" as const, warnings: ["Aucun nœud routier assez proche d’un point. Déplacez-le près d’une rue de l’extrait OSM."] };
  const resolvedSnaps = snaps as Snap[];
  const warnings = new Set<string>([
    "Proposition théorique calculée sur OpenStreetMap (8 novembre 2026) ; la couverture du réseau n’est pas garantie.",
    "Accès bus et restrictions de tournant incomplets ; vérifiez la praticabilité avant de retenir le tracé.",
  ]);
  if (graph.unknownRestrictions > 0) warnings.add(`${graph.unknownRestrictions} restrictions OSM ne sont pas interprétées par le prototype.`);
  resolvedSnaps.forEach((snap, index) => {
    if (snap.distanceM > 3) warnings.add(`Le point ${index + 1} a été raccordé au nœud OSM le plus proche (${snap.distanceM.toFixed(1)} m).`);
    if (snap.ambiguous) warnings.add(`Raccordement du point ${index + 1} ambigu : un autre nœud est à moins de 3 m.`);
  });
  const geometry: BusCoordinate[] = [];
  let distance = 0;
  for (let index = 1; index < resolvedSnaps.length; index += 1) {
    const segment = routeBetween(graph, resolvedSnaps[index - 1].nodeId, resolvedSnaps[index].nodeId);
    if (!segment || segment.coordinates.length < 2) return { status: "unavailable" as const, warnings: [...warnings, "Aucun chemin complet trouvé dans l’extrait OSM. Modifiez les points ou réessayez sur une zone couverte."] };
    segment.warnings.forEach((warning) => warnings.add(warning));
    if (geometry.length) segment.coordinates.shift();
    geometry.push(...segment.coordinates);
  }
  distance = geometry.slice(1).reduce((sum, point, index) => sum + distanceM(geometry[index], point), 0);
  return {
    status: "candidate" as const,
    geometry,
    snaps: resolvedSnaps.map(({ coordinates, distanceM: snapDistanceM, ambiguous }) => ({ coordinates, distanceM: snapDistanceM, ambiguous })),
    distanceM: Math.round(distance * 10) / 10,
    warnings: [...warnings],
  };
}
