import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { closeDb, pingDb } from "./db.js";
import { ensureMarkerIndexes } from "./models/marker.js";
import { ensureRouteIndexes } from "./models/route.js";
import { ensureUserIndexes } from "./models/user.js";
import { authRouter } from "./routes/auth.js";
import { markersGlobalRouter } from "./routes/markers.js";
import { routesRouter } from "./routes/routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  const dbOk = await pingDb();
  res.json({
    ok: true,
    service: "yejing-api",
    db: dbOk ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRouter);
app.use("/api/routes", routesRouter);
app.use("/api/markers", markersGlobalRouter);

async function bootstrap() {
  await ensureUserIndexes();
  await ensureRouteIndexes();
  await ensureMarkerIndexes();
  const server = app.listen(config.port, () => {
    console.log(`yejing-api listening on http://localhost:${config.port}`);
  });

  async function shutdown() {
    server.close();
    await closeDb();
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
