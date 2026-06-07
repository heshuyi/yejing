import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import type { UserDoc } from "../models/user.js";
import { ObjectId } from "mongodb";
import { connectDb } from "../db.js";

export interface AuthPayload {
  sub: string;
  email: string;
}

export interface AuthedRequest extends Request {
  user?: UserDoc;
}

export function signToken(user: UserDoc): string {
  const payload: AuthPayload = {
    sub: user._id.toHexString(),
    email: user.email,
  };
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "未登录" });
    return;
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;
    if (!ObjectId.isValid(payload.sub)) {
      res.status(401).json({ error: "无效令牌" });
      return;
    }

    const db = await connectDb();
    const user = await db.collection<UserDoc>("users").findOne({
      _id: new ObjectId(payload.sub),
    });

    if (!user) {
      res.status(401).json({ error: "用户不存在" });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "无效或已过期的令牌" });
  }
}
