import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { registerMarkerRoutes } from "./markers.js";
import { registerRecordingRoutes } from "./recording.js";
import { getRouteDetail } from "../models/routeDetail.js";
import { getTransitInfo } from "../models/transit.js";
import {
  createRoute,
  deleteRoute,
  findRouteForUser,
  listRoutesForUser,
  parseGeoPoint,
  toPublicRoute,
  updateRoute,
  type RouteStatus,
} from "../models/route.js";

export const routesRouter = Router();

routesRouter.use(requireAuth);

const STATUSES: RouteStatus[] = ["draft", "active", "completed"];

function routeIdParam(raw: unknown): string {
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw ?? "");
}

function parseGoalDistance(
  value: unknown,
): { min?: number; max?: number } | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== "object") return undefined;
  const raw = value as { min?: unknown; max?: unknown };
  const min = raw.min === undefined ? undefined : Number(raw.min);
  const max = raw.max === undefined ? undefined : Number(raw.max);
  if (
    (min !== undefined && !Number.isFinite(min)) ||
    (max !== undefined && !Number.isFinite(max))
  ) {
    return undefined;
  }
  return { min, max };
}

routesRouter.get("/", async (req: AuthedRequest, res) => {
  const statusParam = req.query.status;
  const q = typeof req.query.q === "string" ? req.query.q : undefined;

  let status: RouteStatus | undefined;
  if (typeof statusParam === "string") {
    if (!STATUSES.includes(statusParam as RouteStatus)) {
      res.status(400).json({ error: "无效的状态筛选" });
      return;
    }
    status = statusParam as RouteStatus;
  }

  const routes = await listRoutesForUser(req.user!._id, { status, q });
  res.json({ routes });
});

registerMarkerRoutes(routesRouter);
registerRecordingRoutes(routesRouter);

routesRouter.get("/:id/transit", async (req: AuthedRequest, res) => {
  const result = await getTransitInfo(req.user!._id, routeIdParam(req.params.id));
  if (!result.ok) {
    if (result.reason === "no_coordinates") {
      res.status(400).json({ error: "请先在规划中设置起终点坐标" });
      return;
    }
    res.status(404).json({ error: "路线不存在" });
    return;
  }
  res.json(result.transit);
});

routesRouter.get("/:id/detail", async (req: AuthedRequest, res) => {
  const detail = await getRouteDetail(req.user!._id, routeIdParam(req.params.id));
  if (!detail) {
    res.status(404).json({ error: "路线不存在" });
    return;
  }
  res.json(detail);
});

routesRouter.get("/:id", async (req: AuthedRequest, res) => {
  const route = await findRouteForUser(req.user!._id, routeIdParam(req.params.id));
  if (!route) {
    res.status(404).json({ error: "路线不存在" });
    return;
  }
  res.json({ route: toPublicRoute(route) });
});

routesRouter.post("/", async (req: AuthedRequest, res) => {
  const body = req.body ?? {};
  const { name, isLoop, startPlace, endPlace, goalDistanceKm } = body;

  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "请提供路线名称" });
    return;
  }

  const startCoordinate = parseGeoPoint(body.startCoordinate);
  const endCoordinate = parseGeoPoint(body.endCoordinate);
  const goal = parseGoalDistance(goalDistanceKm);
  if (goalDistanceKm !== undefined && goal === undefined) {
    res.status(400).json({ error: "无效的目标距离" });
    return;
  }

  const route = await createRoute(req.user!._id, {
    name,
    isLoop: typeof isLoop === "boolean" ? isLoop : undefined,
    startPlace: typeof startPlace === "string" ? startPlace : undefined,
    endPlace: typeof endPlace === "string" ? endPlace : undefined,
    startCoordinate,
    endCoordinate,
    goalDistanceKm: goal ?? undefined,
  });

  res.status(201).json({ route: toPublicRoute(route) });
});

routesRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const body = req.body ?? {};
  const { name, status, isLoop, startPlace, endPlace, goalDistanceKm } = body;

  if (status !== undefined && !STATUSES.includes(status)) {
    res.status(400).json({ error: "无效的状态" });
    return;
  }

  const startCoordinate =
    body.startCoordinate === undefined
      ? undefined
      : parseGeoPoint(body.startCoordinate);
  if (body.startCoordinate !== undefined && !startCoordinate) {
    res.status(400).json({ error: "无效的起点坐标" });
    return;
  }

  const endCoordinate =
    body.endCoordinate === undefined ? undefined : parseGeoPoint(body.endCoordinate);
  if (body.endCoordinate !== undefined && !endCoordinate) {
    res.status(400).json({ error: "无效的终点坐标" });
    return;
  }

  const goal = parseGoalDistance(goalDistanceKm);
  if (goalDistanceKm !== undefined && goal === undefined) {
    res.status(400).json({ error: "无效的目标距离" });
    return;
  }

  const result = await updateRoute(req.user!._id, routeIdParam(req.params.id), {
    name: typeof name === "string" ? name : undefined,
    status,
    isLoop: typeof isLoop === "boolean" ? isLoop : undefined,
    startPlace: typeof startPlace === "string" ? startPlace : undefined,
    endPlace: typeof endPlace === "string" ? endPlace : undefined,
    startCoordinate,
    endCoordinate,
    goalDistanceKm: goal,
  });

  if (!result.ok) {
    if (result.reason === "not_draft") {
      res.status(409).json({ error: "仅草稿路线可编辑规划信息" });
      return;
    }
    res.status(404).json({ error: "路线不存在" });
    return;
  }

  res.json({ route: toPublicRoute(result.route) });
});

routesRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const ok = await deleteRoute(req.user!._id, routeIdParam(req.params.id));
  if (!ok) {
    res.status(404).json({ error: "路线不存在" });
    return;
  }
  res.status(204).send();
});
