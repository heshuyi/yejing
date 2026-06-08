import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import {
  createRoute,
  deleteRoute,
  findRouteForUser,
  listRoutesForUser,
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

routesRouter.get("/:id", async (req: AuthedRequest, res) => {
  const route = await findRouteForUser(req.user!._id, routeIdParam(req.params.id));
  if (!route) {
    res.status(404).json({ error: "路线不存在" });
    return;
  }
  res.json({ route: toPublicRoute(route) });
});

routesRouter.post("/", async (req: AuthedRequest, res) => {
  const { name, isLoop, startPlace, endPlace } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "请提供路线名称" });
    return;
  }

  const route = await createRoute(req.user!._id, {
    name,
    isLoop: typeof isLoop === "boolean" ? isLoop : undefined,
    startPlace: typeof startPlace === "string" ? startPlace : undefined,
    endPlace: typeof endPlace === "string" ? endPlace : undefined,
  });

  res.status(201).json({ route: toPublicRoute(route) });
});

routesRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const { name, status, isLoop, startPlace, endPlace } = req.body ?? {};

  if (status !== undefined && !STATUSES.includes(status)) {
    res.status(400).json({ error: "无效的状态" });
    return;
  }

  const route = await updateRoute(req.user!._id, routeIdParam(req.params.id), {
    name: typeof name === "string" ? name : undefined,
    status,
    isLoop: typeof isLoop === "boolean" ? isLoop : undefined,
    startPlace: typeof startPlace === "string" ? startPlace : undefined,
    endPlace: typeof endPlace === "string" ? endPlace : undefined,
  });

  if (!route) {
    res.status(404).json({ error: "路线不存在" });
    return;
  }

  res.json({ route: toPublicRoute(route) });
});

routesRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const ok = await deleteRoute(req.user!._id, routeIdParam(req.params.id));
  if (!ok) {
    res.status(404).json({ error: "路线不存在" });
    return;
  }
  res.status(204).send();
});
