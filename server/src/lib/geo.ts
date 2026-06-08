import type { GeoPoint } from "../models/route.js";

const EARTH_RADIUS_M = 6_371_000;
const MIN_SEGMENT_M = 5;
const ELEVATION_STEP_M = 5;

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const [lng1, lat1] = a.coordinates;
  const [lng2, lat2] = b.coordinates;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(x));
}

export interface TrackPointLike {
  location: GeoPoint;
  altitude?: number;
}

export function computeTrackStats(points: TrackPointLike[]): {
  distanceKm: number;
  elevationGainM: number;
} {
  if (points.length < 2) {
    return { distanceKm: 0, elevationGainM: 0 };
  }

  let distanceM = 0;
  let elevationGainM = 0;
  let lastDistancePoint = points[0];
  let lastElevation = points[0].altitude;

  for (let i = 1; i < points.length; i++) {
    const current = points[i];
    const segment = haversineMeters(lastDistancePoint.location, current.location);
    if (segment >= MIN_SEGMENT_M) {
      distanceM += segment;
      lastDistancePoint = current;
    }

    if (
      typeof current.altitude === "number" &&
      typeof lastElevation === "number"
    ) {
      const delta = current.altitude - lastElevation;
      if (delta >= ELEVATION_STEP_M) {
        elevationGainM += delta;
        lastElevation = current.altitude;
      } else if (delta <= -ELEVATION_STEP_M) {
        lastElevation = current.altitude;
      }
    } else if (typeof current.altitude === "number") {
      lastElevation = current.altitude;
    }
  }

  return {
    distanceKm: Math.round((distanceM / 1000) * 100) / 100,
    elevationGainM: Math.round(elevationGainM),
  };
}
