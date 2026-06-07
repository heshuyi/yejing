import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { closeDb, pingDb } from "./db.js";
import { ensureUserIndexes } from "./models/user.js";
import { authRouter } from "./routes/auth.js";

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

async function bootstrap() {
  await ensureUserIndexes();
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
