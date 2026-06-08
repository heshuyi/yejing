import assert from "node:assert/strict";
import { computeTrackStats, haversineMeters } from "./geo.js";

const p = (lng: number, lat: number, altitude?: number) => ({
  location: { type: "Point" as const, coordinates: [lng, lat] as [number, number] },
  altitude,
});

const dist = haversineMeters(
  { type: "Point", coordinates: [120, 30] },
  { type: "Point", coordinates: [120.001, 30] },
);
assert.ok(dist > 90 && dist < 120, `haversine expected ~111m, got ${dist}`);

const stats = computeTrackStats([
  p(120, 30, 100),
  p(120.001, 30, 110),
  p(120.002, 30, 120),
]);
assert.equal(stats.distanceKm > 0, true);
assert.equal(stats.elevationGainM, 20);

console.log("geo.test.ts: all passed");
