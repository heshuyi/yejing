import { ObjectId } from "mongodb";
import { haversineMeters } from "../lib/geo.js";
import { connectDb } from "../db.js";
import { findRouteForUser, type GeoPoint, type RouteDoc } from "./route.js";

export type MarkerType =
  | "supply"
  | "photo"
  | "rest"
  | "view"
  | "fork"
  | "other";

const MARKER_TYPES: MarkerType[] = [
  "supply",
  "photo",
  "rest",
  "view",
  "fork",
  "other",
];

export interface MarkerDoc {
  _id: ObjectId;
  routeId: ObjectId;
  type: MarkerType;
  name: string;
  note?: string;
  distanceFromStart?: number;
  coordinate: GeoPoint;
  facing?: string;
  bestTime?: string;
  photos?: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MarkerPublic {
  id: string;
  routeId: string;
  routeName?: string;
  type: MarkerType;
  name: string;
  note: string | null;
  distanceFromStart: number | null;
  coordinate: GeoPoint;
  facing: string | null;
  bestTime: string | null;
  createdAt: string;
  updatedAt: string;
}

function toPublic(doc: MarkerDoc, routeName?: string): MarkerPublic {
  return {
    id: doc._id.toHexString(),
    routeId: doc.routeId.toHexString(),
    routeName,
    type: doc.type,
    name: doc.name,
    note: doc.note ?? null,
    distanceFromStart: doc.distanceFromStart ?? null,
    coordinate: doc.coordinate,
    facing: doc.facing ?? null,
    bestTime: doc.bestTime ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function isMarkerType(value: string): value is MarkerType {
  return MARKER_TYPES.includes(value as MarkerType);
}

function distanceFromStartKm(route: RouteDoc, coordinate: GeoPoint): number {
  if (!route.startCoordinate) return 0;
  const meters = haversineMeters(route.startCoordinate, coordinate);
  return Math.round((meters / 1000) * 100) / 100;
}

async function syncMarkerCount(routeId: ObjectId): Promise<void> {
  const db = await connectDb();
  const count = await db.collection<MarkerDoc>("markers").countDocuments({ routeId });
  await db.collection<RouteDoc>("routes").updateOne(
    { _id: routeId },
    { $set: { "stats.markerCount": count, updatedAt: new Date() } },
  );
}

export async function ensureMarkerIndexes(): Promise<void> {
  const db = await connectDb();
  const col = db.collection<MarkerDoc>("markers");
  await col.createIndex({ routeId: 1, distanceFromStart: 1 });
  await col.createIndex({ type: 1 });
  try {
    await db.command({ collMod: "markers", validationLevel: "off" });
  } catch {
    // ignore
  }
}

export async function listMarkersForRoute(
  userId: ObjectId,
  routeId: string,
  type?: MarkerType,
): Promise<MarkerPublic[] | null> {
  const route = await findRouteForUser(userId, routeId);
  if (!route) return null;

  const filter: Record<string, unknown> = { routeId: route._id };
  if (type) filter.type = type;

  const db = await connectDb();
  const docs = await db
    .collection<MarkerDoc>("markers")
    .find(filter)
    .sort({ distanceFromStart: 1, createdAt: 1 })
    .toArray();

  return docs.map((d) => toPublic(d, route.name));
}

export async function listMarkersForUser(
  userId: ObjectId,
  options: { routeId?: string; type?: MarkerType } = {},
): Promise<MarkerPublic[]> {
  const db = await connectDb();
  const routes = await db
    .collection<RouteDoc>("routes")
    .find({ userId })
    .project({ name: 1 })
    .toArray();

  const routeMap = new Map(
    routes.map((r) => [r._id.toHexString(), r.name as string]),
  );
  const routeIds = routes.map((r) => r._id);

  if (routeIds.length === 0) return [];

  const filter: Record<string, unknown> = { routeId: { $in: routeIds } };
  if (options.routeId && ObjectId.isValid(options.routeId)) {
    if (!routeMap.has(options.routeId)) return [];
    filter.routeId = new ObjectId(options.routeId);
  }
  if (options.type) filter.type = options.type;

  const docs = await db
    .collection<MarkerDoc>("markers")
    .find(filter)
    .sort({ distanceFromStart: 1 })
    .toArray();

  return docs.map((d) =>
    toPublic(d, routeMap.get(d.routeId.toHexString())),
  );
}

export async function createMarker(
  userId: ObjectId,
  routeId: string,
  input: {
    type: MarkerType;
    name: string;
    note?: string;
    coordinate: GeoPoint;
    facing?: string;
    bestTime?: string;
  },
): Promise<MarkerPublic | null> {
  const route = await findRouteForUser(userId, routeId);
  if (!route) return null;

  const now = new Date();
  const doc: Omit<MarkerDoc, "_id"> = {
    routeId: route._id,
    type: input.type,
    name: input.name.trim(),
    note: input.note?.trim() || undefined,
    coordinate: input.coordinate,
    distanceFromStart: distanceFromStartKm(route, input.coordinate),
    facing: input.facing?.trim() || undefined,
    bestTime: input.bestTime?.trim() || undefined,
    photos: [],
    createdAt: now,
    updatedAt: now,
  };

  const db = await connectDb();
  const result = await db.collection<MarkerDoc>("markers").insertOne(doc as MarkerDoc);
  await syncMarkerCount(route._id);

  return toPublic({ _id: result.insertedId, ...doc }, route.name);
}

export async function updateMarker(
  userId: ObjectId,
  routeId: string,
  markerId: string,
  patch: Partial<{
    type: MarkerType;
    name: string;
    note: string;
    coordinate: GeoPoint;
    facing: string;
    bestTime: string;
  }>,
): Promise<MarkerPublic | null> {
  const route = await findRouteForUser(userId, routeId);
  if (!route || !ObjectId.isValid(markerId)) return null;

  const db = await connectDb();
  const existing = await db.collection<MarkerDoc>("markers").findOne({
    _id: new ObjectId(markerId),
    routeId: route._id,
  });
  if (!existing) return null;

  const updates: Partial<MarkerDoc> = { updatedAt: new Date() };
  if (patch.type) updates.type = patch.type;
  if (typeof patch.name === "string" && patch.name.trim()) {
    updates.name = patch.name.trim();
  }
  if (typeof patch.note === "string") updates.note = patch.note.trim() || undefined;
  if (patch.coordinate) {
    updates.coordinate = patch.coordinate;
    updates.distanceFromStart = distanceFromStartKm(route, patch.coordinate);
  }
  if (typeof patch.facing === "string") updates.facing = patch.facing.trim() || undefined;
  if (typeof patch.bestTime === "string") {
    updates.bestTime = patch.bestTime.trim() || undefined;
  }

  await db
    .collection<MarkerDoc>("markers")
    .updateOne({ _id: existing._id }, { $set: updates });

  return toPublic({ ...existing, ...updates }, route.name);
}

export async function deleteMarker(
  userId: ObjectId,
  routeId: string,
  markerId: string,
): Promise<boolean> {
  const route = await findRouteForUser(userId, routeId);
  if (!route || !ObjectId.isValid(markerId)) return false;

  const db = await connectDb();
  const result = await db.collection<MarkerDoc>("markers").deleteOne({
    _id: new ObjectId(markerId),
    routeId: route._id,
  });
  if (result.deletedCount === 0) return false;

  await syncMarkerCount(route._id);
  return true;
}
