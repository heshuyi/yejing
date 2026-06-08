import { ObjectId } from "mongodb";
import { connectDb } from "../db.js";
import type { GeoPoint } from "./route.js";

export interface TrackPointDoc {
  _id?: ObjectId;
  routeId: ObjectId;
  timestamp: Date;
  location: GeoPoint;
  altitude?: number;
  speed?: number;
  accuracy?: number;
}

export interface TrackPointInput {
  timestamp: string | Date;
  location: GeoPoint;
  altitude?: number;
  speed?: number;
  accuracy?: number;
}

export interface TrackPointPublic {
  id: string;
  timestamp: string;
  location: GeoPoint;
  altitude: number | null;
  speed: number | null;
  accuracy: number | null;
}

function toPublic(doc: TrackPointDoc & { _id: ObjectId }): TrackPointPublic {
  return {
    id: doc._id.toHexString(),
    timestamp: doc.timestamp.toISOString(),
    location: doc.location,
    altitude: doc.altitude ?? null,
    speed: doc.speed ?? null,
    accuracy: doc.accuracy ?? null,
  };
}

export async function insertTrackPoints(
  routeId: ObjectId,
  points: TrackPointInput[],
): Promise<number> {
  if (points.length === 0) return 0;
  const docs: TrackPointDoc[] = points.map((p) => ({
    routeId,
    timestamp: new Date(p.timestamp),
    location: p.location,
    altitude: p.altitude,
    speed: p.speed,
    accuracy: p.accuracy,
  }));

  const db = await connectDb();
  const result = await db.collection<TrackPointDoc>("track_points").insertMany(docs);
  return result.insertedCount;
}

export async function listTrackPoints(routeId: ObjectId): Promise<TrackPointPublic[]> {
  const db = await connectDb();
  const docs = await db
    .collection<TrackPointDoc>("track_points")
    .find({ routeId })
    .sort({ timestamp: 1 })
    .toArray();
  return docs.map((doc) => toPublic(doc as TrackPointDoc & { _id: ObjectId }));
}

export async function listTrackPointsForStats(
  routeId: ObjectId,
): Promise<TrackPointDoc[]> {
  const db = await connectDb();
  return db
    .collection<TrackPointDoc>("track_points")
    .find({ routeId })
    .sort({ timestamp: 1 })
    .toArray();
}
