import { Router, type Router as RouterType } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import {
  createMarker,
  deleteMarker,
  isMarkerType,
  listMarkersForRoute,
  listMarkersForUser,
  updateMarker,
  type MarkerType,
} from "../models/marker.js";
import { parseGeoPoint } from "../models/route.js";

function routeIdParam(raw: unknown): string {
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw ?? "");
}

function markerIdParam(raw: unknown): string {
  return routeIdParam(raw);
}

function parseTypeQuery(value: unknown): MarkerType | undefined {
  if (typeof value !== "string" || !isMarkerType(value)) return undefined;
  return value;
}

export function registerMarkerRoutes(router: RouterType): void {
  router.get("/:id/markers", requireAuth, async (req: AuthedRequest, res) => {
    const markers = await listMarkersForRoute(
      req.user!._id,
      routeIdParam(req.params.id),
      parseTypeQuery(req.query.type),
    );
    if (markers === null) {
      res.status(404).json({ error: "路线不存在" });
      return;
    }
    res.json({ markers });
  });

  router.post("/:id/markers", requireAuth, async (req: AuthedRequest, res) => {
    const { type, name, note, facing, bestTime } = req.body ?? {};
    const coordinate = parseGeoPoint(req.body?.coordinate);

    if (typeof type !== "string" || !isMarkerType(type)) {
      res.status(400).json({ error: "无效的标记类型" });
      return;
    }
    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "请提供标记名称" });
      return;
    }
    if (!coordinate) {
      res.status(400).json({ error: "请提供有效坐标" });
      return;
    }

    const marker = await createMarker(req.user!._id, routeIdParam(req.params.id), {
      type,
      name,
      note: typeof note === "string" ? note : undefined,
      coordinate,
      facing: typeof facing === "string" ? facing : undefined,
      bestTime: typeof bestTime === "string" ? bestTime : undefined,
    });

    if (!marker) {
      res.status(404).json({ error: "路线不存在" });
      return;
    }
    res.status(201).json({ marker });
  });

  router.patch(
    "/:id/markers/:markerId",
    requireAuth,
    async (req: AuthedRequest, res) => {
      const body = req.body ?? {};
      const coordinate =
        body.coordinate === undefined ? undefined : parseGeoPoint(body.coordinate);
      if (body.coordinate !== undefined && !coordinate) {
        res.status(400).json({ error: "无效的坐标" });
        return;
      }

      const marker = await updateMarker(
        req.user!._id,
        routeIdParam(req.params.id),
        markerIdParam(req.params.markerId),
        {
          type: typeof body.type === "string" && isMarkerType(body.type) ? body.type : undefined,
          name: typeof body.name === "string" ? body.name : undefined,
          note: typeof body.note === "string" ? body.note : undefined,
          coordinate,
          facing: typeof body.facing === "string" ? body.facing : undefined,
          bestTime: typeof body.bestTime === "string" ? body.bestTime : undefined,
        },
      );

      if (!marker) {
        res.status(404).json({ error: "标记不存在" });
        return;
      }
      res.json({ marker });
    },
  );

  router.delete(
    "/:id/markers/:markerId",
    requireAuth,
    async (req: AuthedRequest, res) => {
      const ok = await deleteMarker(
        req.user!._id,
        routeIdParam(req.params.id),
        markerIdParam(req.params.markerId),
      );
      if (!ok) {
        res.status(404).json({ error: "标记不存在" });
        return;
      }
      res.status(204).send();
    },
  );
}

export const markersGlobalRouter = Router();
markersGlobalRouter.use(requireAuth);

markersGlobalRouter.get("/", async (req: AuthedRequest, res) => {
  const routeId =
    typeof req.query.routeId === "string" ? req.query.routeId : undefined;
  const markers = await listMarkersForUser(req.user!._id, {
    routeId,
    type: parseTypeQuery(req.query.type),
  });
  res.json({ markers });
});
