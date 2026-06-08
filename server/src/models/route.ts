import { ObjectId } from "mongodb";
import { connectDb } from "../db.js";

export type RouteStatus = "draft" | "active" | "completed";

export interface RouteStats {
  distanceKm?: number;
  elevationGainM?: number;
  durationSec?: number;
  avgHeartRate?: number;
  markerCount?: number;
}

export interface GeoPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface RouteDoc {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  status: RouteStatus;
  isLoop?: boolean;
  startPlace?: string;
  endPlace?: string;
  startCoordinate?: GeoPoint;
  endCoordinate?: GeoPoint;
  goalDistanceKm?: { min?: number; max?: number };
  stats?: RouteStats;
  startedAt?: Date;
  recordingState?: "recording" | "paused";
  createdAt: Date;
  updatedAt: Date;
}

export interface RouteSummary {
  id: string;
  name: string;
  status: RouteStatus;
  distanceKm: number | null;
  markerCount: number;
  startPlace: string | null;
  updatedAt: string;
}

export interface GoalDistanceKm {
  min?: number;
  max?: number;
}

export interface RoutePublic extends RouteSummary {
  isLoop: boolean;
  endPlace: string | null;
  startCoordinate?: GeoPoint;
  endCoordinate?: GeoPoint;
  goalDistanceKm?: GoalDistanceKm | null;
  stats?: RouteStats;
  startedAt: string | null;
  recordingState?: "recording" | "paused" | null;
  createdAt: string;
}

function toSummary(doc: RouteDoc): RouteSummary {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    status: doc.status,
    distanceKm: doc.stats?.distanceKm ?? null,
    markerCount: doc.stats?.markerCount ?? 0,
    startPlace: doc.startPlace ?? null,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function toPublicRoute(doc: RouteDoc): RoutePublic {
  return {
    ...toSummary(doc),
    isLoop: doc.isLoop ?? false,
    endPlace: doc.endPlace ?? null,
    startCoordinate: doc.startCoordinate,
    endCoordinate: doc.endCoordinate,
    goalDistanceKm: doc.goalDistanceKm,
    stats: doc.stats,
    startedAt: doc.startedAt?.toISOString() ?? null,
    recordingState: doc.recordingState ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function ensureRouteIndexes(): Promise<void> {
  const db = await connectDb();
  const col = db.collection<RouteDoc>("routes");
  await col.createIndex({ userId: 1, status: 1, updatedAt: -1 });

  try {
    // 开发库沿用 init 脚本较严的 schema；放宽校验避免新字段写入失败
    await db.command({
      collMod: "routes",
      validationLevel: "off",
    });
  } catch {
    // 集合尚未创建时忽略
  }
}

function sortRoutes(docs: RouteDoc[]): RouteDoc[] {
  const order: Record<RouteStatus, number> = {
    active: 0,
    draft: 1,
    completed: 2,
  };
  return [...docs].sort((a, b) => {
    const byStatus = order[a.status] - order[b.status];
    if (byStatus !== 0) return byStatus;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

export async function listRoutesForUser(
  userId: ObjectId,
  options: { status?: RouteStatus; q?: string } = {},
): Promise<RouteSummary[]> {
  const db = await connectDb();
  const filter: Record<string, unknown> = { userId };

  if (options.status) {
    filter.status = options.status;
  }

  if (options.q?.trim()) {
    const q = options.q.trim();
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { startPlace: { $regex: q, $options: "i" } },
      { endPlace: { $regex: q, $options: "i" } },
    ];
  }

  const docs = await db.collection<RouteDoc>("routes").find(filter).toArray();
  return sortRoutes(docs).map(toSummary);
}

export async function findRouteForUser(
  userId: ObjectId,
  routeId: string,
): Promise<RouteDoc | null> {
  if (!ObjectId.isValid(routeId)) return null;
  const db = await connectDb();
  return db.collection<RouteDoc>("routes").findOne({
    _id: new ObjectId(routeId),
    userId,
  });
}

export function parseGeoPoint(value: unknown): GeoPoint | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as { type?: string; coordinates?: unknown };
  if (raw.type !== "Point" || !Array.isArray(raw.coordinates)) return undefined;
  if (raw.coordinates.length !== 2) return undefined;
  const lng = Number(raw.coordinates[0]);
  const lat = Number(raw.coordinates[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return undefined;
  return { type: "Point", coordinates: [lng, lat] };
}

function applyLoopFields<
  T extends {
    isLoop?: boolean;
    startPlace?: string;
    endPlace?: string;
    startCoordinate?: GeoPoint;
    endCoordinate?: GeoPoint;
  },
>(input: T): T {
  if (!input.isLoop) return input;
  return {
    ...input,
    endPlace: input.startPlace ?? input.endPlace,
    endCoordinate: input.startCoordinate ?? input.endCoordinate,
  };
}

export async function createRoute(
  userId: ObjectId,
  input: {
    name: string;
    isLoop?: boolean;
    startPlace?: string;
    endPlace?: string;
    startCoordinate?: GeoPoint;
    endCoordinate?: GeoPoint;
    goalDistanceKm?: { min?: number; max?: number };
  },
): Promise<RouteDoc> {
  const normalized = applyLoopFields(input);
  const now = new Date();
  const doc: Omit<RouteDoc, "_id"> = {
    userId,
    name: normalized.name.trim(),
    status: "draft",
    isLoop: normalized.isLoop ?? false,
    startPlace: normalized.startPlace?.trim() || undefined,
    endPlace: normalized.endPlace?.trim() || undefined,
    startCoordinate: normalized.startCoordinate,
    endCoordinate: normalized.endCoordinate,
    goalDistanceKm: normalized.goalDistanceKm,
    stats: { markerCount: 0, distanceKm: 0 },
    createdAt: now,
    updatedAt: now,
  };

  const db = await connectDb();
  const result = await db.collection<RouteDoc>("routes").insertOne(doc as RouteDoc);
  return { _id: result.insertedId, ...doc };
}

export type RouteUpdateResult =
  | { ok: true; route: RouteDoc }
  | { ok: false; reason: "not_found" | "not_draft" };

const PLAN_FIELDS = [
  "name",
  "isLoop",
  "startPlace",
  "endPlace",
  "startCoordinate",
  "endCoordinate",
  "goalDistanceKm",
] as const;

export async function updateRoute(
  userId: ObjectId,
  routeId: string,
  patch: Partial<{
    name: string;
    status: RouteStatus;
    isLoop: boolean;
    startPlace: string;
    endPlace: string;
    startCoordinate: GeoPoint;
    endCoordinate: GeoPoint;
    goalDistanceKm: { min?: number; max?: number } | null;
  }>,
): Promise<RouteUpdateResult> {
  const existing = await findRouteForUser(userId, routeId);
  if (!existing) return { ok: false, reason: "not_found" };

  const touchesPlan = PLAN_FIELDS.some((key) => patch[key] !== undefined);
  if (touchesPlan && existing.status !== "draft") {
    return { ok: false, reason: "not_draft" };
  }

  const merged = applyLoopFields({
    isLoop: patch.isLoop ?? existing.isLoop,
    startPlace:
      typeof patch.startPlace === "string"
        ? patch.startPlace.trim() || undefined
        : existing.startPlace,
    endPlace:
      typeof patch.endPlace === "string"
        ? patch.endPlace.trim() || undefined
        : existing.endPlace,
    startCoordinate: patch.startCoordinate ?? existing.startCoordinate,
    endCoordinate: patch.endCoordinate ?? existing.endCoordinate,
  });

  const updates: Partial<RouteDoc> = { updatedAt: new Date() };
  if (typeof patch.name === "string" && patch.name.trim()) {
    updates.name = patch.name.trim();
  }
  if (patch.status) updates.status = patch.status;
  if (typeof patch.isLoop === "boolean") updates.isLoop = merged.isLoop;
  if (typeof patch.startPlace === "string" || patch.isLoop !== undefined) {
    updates.startPlace = merged.startPlace;
  }
  if (
    typeof patch.endPlace === "string" ||
    patch.isLoop !== undefined ||
    typeof patch.startPlace === "string"
  ) {
    updates.endPlace = merged.endPlace;
  }
  if (patch.startCoordinate !== undefined || patch.isLoop !== undefined) {
    updates.startCoordinate = merged.startCoordinate;
  }
  if (
    patch.endCoordinate !== undefined ||
    patch.isLoop !== undefined ||
    patch.startCoordinate !== undefined
  ) {
    updates.endCoordinate = merged.endCoordinate;
  }
  if (patch.goalDistanceKm !== undefined) {
    updates.goalDistanceKm = patch.goalDistanceKm ?? undefined;
  }

  const db = await connectDb();
  await db
    .collection<RouteDoc>("routes")
    .updateOne({ _id: existing._id, userId }, { $set: updates });

  return { ok: true, route: { ...existing, ...updates } };
}

export async function deleteRoute(
  userId: ObjectId,
  routeId: string,
): Promise<boolean> {
  if (!ObjectId.isValid(routeId)) return false;
  const db = await connectDb();
  const result = await db.collection<RouteDoc>("routes").deleteOne({
    _id: new ObjectId(routeId),
    userId,
  });
  return result.deletedCount === 1;
}
