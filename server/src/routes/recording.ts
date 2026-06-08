import { ObjectId } from "mongodb";
import type { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import {
  finishRecording,
  pauseRecording,
  resumeRecording,
  startRecording,
} from "../models/recording.js";
import { findRouteForUser, parseGeoPoint } from "../models/route.js";
import { insertTrackPoints, listTrackPoints } from "../models/trackPoint.js";

function routeIdParam(raw: unknown): string {
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw ?? "");
}

function recordingError(res: import("express").Response, reason: string) {
  if (reason === "not_found") {
    res.status(404).json({ error: "路线不存在" });
    return;
  }
  res.status(409).json({ error: "当前状态不允许此操作" });
}

export function registerRecordingRoutes(router: Router): void {
  router.post("/:id/recording/start", requireAuth, async (req: AuthedRequest, res) => {
    const result = await startRecording(req.user!._id, routeIdParam(req.params.id));
    if (!result.ok) {
      recordingError(res, result.reason);
      return;
    }
    res.json({ route: result.route });
  });

  router.post("/:id/recording/pause", requireAuth, async (req: AuthedRequest, res) => {
    const result = await pauseRecording(req.user!._id, routeIdParam(req.params.id));
    if (!result.ok) {
      recordingError(res, result.reason);
      return;
    }
    res.json({ route: result.route });
  });

  router.post("/:id/recording/resume", requireAuth, async (req: AuthedRequest, res) => {
    const result = await resumeRecording(req.user!._id, routeIdParam(req.params.id));
    if (!result.ok) {
      recordingError(res, result.reason);
      return;
    }
    res.json({ route: result.route });
  });

  router.post("/:id/recording/finish", requireAuth, async (req: AuthedRequest, res) => {
    const durationSec = Number(req.body?.durationSec);
    if (!Number.isFinite(durationSec) || durationSec < 0) {
      res.status(400).json({ error: "请提供有效 durationSec" });
      return;
    }
    const result = await finishRecording(
      req.user!._id,
      routeIdParam(req.params.id),
      durationSec,
    );
    if (!result.ok) {
      recordingError(res, result.reason);
      return;
    }
    res.json({ route: result.route });
  });

  router.get("/:id/track-points", requireAuth, async (req: AuthedRequest, res) => {
    const route = await findRouteForUser(req.user!._id, routeIdParam(req.params.id));
    if (!route) {
      res.status(404).json({ error: "路线不存在" });
      return;
    }
    const points = await listTrackPoints(route._id);
    res.json({ points });
  });

  router.post("/:id/track-points", requireAuth, async (req: AuthedRequest, res) => {
    const route = await findRouteForUser(req.user!._id, routeIdParam(req.params.id));
    if (!route) {
      res.status(404).json({ error: "路线不存在" });
      return;
    }
    if (route.status !== "active") {
      res.status(409).json({ error: "仅进行中的路线可写入轨迹点" });
      return;
    }

    const rawPoints = req.body?.points;
    if (!Array.isArray(rawPoints) || rawPoints.length === 0) {
      res.status(400).json({ error: "请提供 points 数组" });
      return;
    }
    if (rawPoints.length > 200) {
      res.status(400).json({ error: "单次最多 200 个轨迹点" });
      return;
    }

    const parsed = [];
    for (const item of rawPoints) {
      const location = parseGeoPoint(item?.location);
      if (!location || !item?.timestamp) {
        res.status(400).json({ error: "轨迹点格式无效" });
        return;
      }
      parsed.push({
        timestamp: item.timestamp,
        location,
        altitude: item.altitude === undefined ? undefined : Number(item.altitude),
        speed: item.speed === undefined ? undefined : Number(item.speed),
        accuracy: item.accuracy === undefined ? undefined : Number(item.accuracy),
      });
    }

    const inserted = await insertTrackPoints(route._id as ObjectId, parsed);
    res.status(201).json({ inserted });
  });
}
