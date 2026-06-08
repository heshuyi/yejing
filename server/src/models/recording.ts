import { ObjectId } from "mongodb";
import { computeTrackStats } from "../lib/geo.js";
import { connectDb } from "../db.js";
import {
  findRouteForUser,
  toPublicRoute,
  type RouteDoc,
  type RoutePublic,
} from "./route.js";
import {
  listTrackPointsForStats,
  type TrackPointDoc,
} from "./trackPoint.js";

export type RecordingState = "recording" | "paused";

export type RecordingResult =
  | { ok: true; route: RoutePublic }
  | { ok: false; reason: "not_found" | "invalid_state" };

async function saveRoute(
  userId: ObjectId,
  route: RouteDoc,
  updates: Partial<RouteDoc>,
): Promise<RoutePublic> {
  const db = await connectDb();
  const next = { ...route, ...updates, updatedAt: new Date() };
  await db
    .collection<RouteDoc>("routes")
    .updateOne({ _id: route._id, userId }, { $set: updates });
  return toPublicRoute({ ...route, ...updates, updatedAt: new Date() });
}

export async function startRecording(
  userId: ObjectId,
  routeId: string,
): Promise<RecordingResult> {
  const route = await findRouteForUser(userId, routeId);
  if (!route) return { ok: false, reason: "not_found" };

  if (route.status === "completed") {
    return { ok: false, reason: "invalid_state" };
  }

  const updates: Partial<RouteDoc> = {
    status: "active",
    recordingState: "recording",
    updatedAt: new Date(),
  };
  if (!route.startedAt) {
    updates.startedAt = new Date();
  }

  const saved = await saveRoute(userId, route, updates);
  return { ok: true, route: saved };
}

export async function pauseRecording(
  userId: ObjectId,
  routeId: string,
): Promise<RecordingResult> {
  const route = await findRouteForUser(userId, routeId);
  if (!route) return { ok: false, reason: "not_found" };
  if (route.status !== "active" || route.recordingState !== "recording") {
    return { ok: false, reason: "invalid_state" };
  }

  const saved = await saveRoute(userId, route, {
    recordingState: "paused",
    updatedAt: new Date(),
  });
  return { ok: true, route: saved };
}

export async function resumeRecording(
  userId: ObjectId,
  routeId: string,
): Promise<RecordingResult> {
  const route = await findRouteForUser(userId, routeId);
  if (!route) return { ok: false, reason: "not_found" };
  if (route.status !== "active" || route.recordingState !== "paused") {
    return { ok: false, reason: "invalid_state" };
  }

  const saved = await saveRoute(userId, route, {
    recordingState: "recording",
    updatedAt: new Date(),
  });
  return { ok: true, route: saved };
}

export async function finishRecording(
  userId: ObjectId,
  routeId: string,
  durationSec: number,
): Promise<RecordingResult> {
  const route = await findRouteForUser(userId, routeId);
  if (!route) return { ok: false, reason: "not_found" };
  if (route.status !== "active") {
    return { ok: false, reason: "invalid_state" };
  }

  const points = await listTrackPointsForStats(route._id);
  const { distanceKm, elevationGainM } = computeTrackStats(
    points as TrackPointDoc[],
  );

  const stats = {
    ...route.stats,
    distanceKm,
    elevationGainM,
    durationSec: Math.max(0, Math.round(durationSec)),
    markerCount: route.stats?.markerCount ?? 0,
  };

  const db = await connectDb();
  const updates: Partial<RouteDoc> = {
    status: "completed",
    recordingState: undefined,
    stats,
    updatedAt: new Date(),
  };

  await db.collection<RouteDoc>("routes").updateOne(
    { _id: route._id, userId },
    {
      $set: {
        status: "completed",
        stats,
        updatedAt: new Date(),
      },
      $unset: { recordingState: "" },
    },
  );

  return {
    ok: true,
    route: toPublicRoute({
      ...route,
      status: "completed",
      stats,
      updatedAt: new Date(),
    }),
  };
}
