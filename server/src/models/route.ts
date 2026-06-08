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

export interface RoutePublic extends RouteSummary {
  isLoop: boolean;
  endPlace: string | null;
  startCoordinate?: GeoPoint;
  endCoordinate?: GeoPoint;
  goalDistanceKm?: { min?: number; max?: number };
  stats?: RouteStats;
  startedAt: string | null;
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
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function ensureRouteIndexes(): Promise<void> {
  const db = await connectDb();
  const col = db.collection<RouteDoc>("routes");
  await col.createIndex({ userId: 1, status: 1, updatedAt: -1 });
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

export async function createRoute(
  userId: ObjectId,
  input: {
    name: string;
    isLoop?: boolean;
    startPlace?: string;
    endPlace?: string;
  },
): Promise<RouteDoc> {
  const now = new Date();
  const doc: Omit<RouteDoc, "_id"> = {
    userId,
    name: input.name.trim(),
    status: "draft",
    isLoop: input.isLoop ?? false,
    startPlace: input.startPlace?.trim() || undefined,
    endPlace: input.endPlace?.trim() || undefined,
    stats: { markerCount: 0, distanceKm: 0 },
    createdAt: now,
    updatedAt: now,
  };

  const db = await connectDb();
  const result = await db.collection<RouteDoc>("routes").insertOne(doc as RouteDoc);
  return { _id: result.insertedId, ...doc };
}

export async function updateRoute(
  userId: ObjectId,
  routeId: string,
  patch: Partial<{
    name: string;
    status: RouteStatus;
    isLoop: boolean;
    startPlace: string;
    endPlace: string;
  }>,
): Promise<RouteDoc | null> {
  const existing = await findRouteForUser(userId, routeId);
  if (!existing) return null;

  const updates: Partial<RouteDoc> = { updatedAt: new Date() };
  if (typeof patch.name === "string" && patch.name.trim()) {
    updates.name = patch.name.trim();
  }
  if (patch.status) updates.status = patch.status;
  if (typeof patch.isLoop === "boolean") updates.isLoop = patch.isLoop;
  if (typeof patch.startPlace === "string") {
    updates.startPlace = patch.startPlace.trim() || undefined;
  }
  if (typeof patch.endPlace === "string") {
    updates.endPlace = patch.endPlace.trim() || undefined;
  }

  const db = await connectDb();
  await db
    .collection<RouteDoc>("routes")
    .updateOne({ _id: existing._id, userId }, { $set: updates });

  return { ...existing, ...updates };
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
