import type { GeoPoint } from "@/lib/api";

const EARTH_RADIUS_M = 6_371_000;

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

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function computeLiveStats(
  points: { location: GeoPoint; altitude?: number | null }[],
): { distanceKm: number; elevationGainM: number } {
  if (points.length < 2) return { distanceKm: 0, elevationGainM: 0 };
  let distanceM = 0;
  let elevationGainM = 0;
  let last = points[0];
  let lastAlt = last.altitude ?? undefined;

  for (let i = 1; i < points.length; i++) {
    const cur = points[i];
    const seg = haversineMeters(last.location, cur.location);
    if (seg >= 5) {
      distanceM += seg;
      last = cur;
    }
    const alt = cur.altitude ?? undefined;
    if (typeof alt === "number" && typeof lastAlt === "number") {
      const delta = alt - lastAlt;
      if (delta >= 5) {
        elevationGainM += delta;
        lastAlt = alt;
      } else if (delta <= -5) {
        lastAlt = alt;
      }
    } else if (typeof alt === "number") {
      lastAlt = alt;
    }
  }

  return {
    distanceKm: Math.round((distanceM / 1000) * 100) / 100,
    elevationGainM: Math.round(elevationGainM),
  };
}
