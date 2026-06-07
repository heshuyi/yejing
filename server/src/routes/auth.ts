import { Router } from "express";
import {
  createUser,
  findUserByEmail,
  toPublicUser,
  verifyPassword,
} from "../models/user.js";
import { requireAuth, signToken, type AuthedRequest } from "../middleware/auth.js";

export const authRouter = Router();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

authRouter.post("/register", async (req, res) => {
  const { email, password, displayName } = req.body ?? {};

  if (typeof email !== "string" || !isValidEmail(email)) {
    res.status(400).json({ error: "请提供有效邮箱" });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "密码至少 8 位" });
    return;
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: "该邮箱已注册" });
    return;
  }

  const user = await createUser({
    email,
    password,
    displayName: typeof displayName === "string" ? displayName : undefined,
  });

  res.status(201).json({
    token: signToken(user),
    user: toPublicUser(user),
  });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "请提供邮箱和密码" });
    return;
  }

  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(user, password))) {
    res.status(401).json({ error: "邮箱或密码错误" });
    return;
  }

  res.json({
    token: signToken(user),
    user: toPublicUser(user),
  });
});

authRouter.get("/me", requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: toPublicUser(req.user!) });
});
