import { ObjectId } from "mongodb";
import { computeTrackStats } from "../lib/geo.js";
import { listMarkersForRoute } from "./marker.js";
import { findRouteForUser, toPublicRoute } from "./route.js";
import { listTrackPointsForStats } from "./trackPoint.js";

export interface RouteDetailAggregate {
  route: ReturnType<typeof toPublicRoute>;
  track: {
    pointCount: number;
    coordinates: [number, number][];
  };
  markers: NonNullable<Awaited<ReturnType<typeof listMarkersForRoute>>>;
  summary: {
    distanceKm: number;
    elevationGainM: number;
    durationSec: number;
    markerCount: number;
  };
}

export async function getRouteDetail(
  userId: ObjectId,
  routeId: string,
): Promise<RouteDetailAggregate | null> {
  const route = await findRouteForUser(userId, routeId);
  if (!route) return null;

  const [trackDocs, markers] = await Promise.all([
    listTrackPointsForStats(route._id),
    listMarkersForRoute(userId, routeId),
  ]);

  const trackPoints = trackDocs.map((p) => ({
    location: p.location,
    altitude: p.altitude,
  }));

  const computed = computeTrackStats(trackPoints);
  const distanceKm = route.stats?.distanceKm ?? computed.distanceKm;
  const elevationGainM = route.stats?.elevationGainM ?? computed.elevationGainM;
  const durationSec = route.stats?.durationSec ?? 0;
  const markerCount = markers?.length ?? route.stats?.markerCount ?? 0;

  const coordinates: [number, number][] = trackDocs.map(
    (p) => p.location.coordinates as [number, number],
  );

  return {
    route: toPublicRoute(route),
    track: {
      pointCount: trackDocs.length,
      coordinates,
    },
    markers: markers ?? [],
    summary: {
      distanceKm,
      elevationGainM,
      durationSec,
      markerCount,
    },
  };
}
