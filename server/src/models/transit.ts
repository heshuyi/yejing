import { ObjectId } from "mongodb";
import { findRouteForUser, type GeoPoint } from "./route.js";

export interface TransitEndpoint {
  place: string | null;
  coordinate: GeoPoint | null;
}

export interface TransitInfo {
  routeId: string;
  routeName: string;
  isLoop: boolean;
  loopHint: string | null;
  start: TransitEndpoint;
  end: TransitEndpoint;
}

export type TransitResult =
  | { ok: true; transit: TransitInfo }
  | { ok: false; reason: "not_found" | "no_coordinates" };

export async function getTransitInfo(
  userId: ObjectId,
  routeId: string,
): Promise<TransitResult> {
  const route = await findRouteForUser(userId, routeId);
  if (!route) return { ok: false, reason: "not_found" };

  const start: TransitEndpoint = {
    place: route.startPlace ?? null,
    coordinate: route.startCoordinate ?? null,
  };

  let end: TransitEndpoint = {
    place: route.endPlace ?? null,
    coordinate: route.endCoordinate ?? null,
  };

  if (route.isLoop && start.coordinate) {
    end = {
      place: start.place,
      coordinate: start.coordinate,
    };
  }

  if (!start.coordinate && !end.coordinate) {
    return { ok: false, reason: "no_coordinates" };
  }

  const loopHint =
    route.isLoop && start.place
      ? "环线：回程与起点相同"
      : route.isLoop
        ? "环线：终点与起点一致"
        : null;

  return {
    ok: true,
    transit: {
      routeId: route._id.toHexString(),
      routeName: route.name,
      isLoop: route.isLoop ?? false,
      loopHint,
      start,
      end,
    },
  };
}
