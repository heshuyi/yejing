import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { connectDb } from "../db.js";

export interface UserDoc {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
}

const SALT_ROUNDS = 10;

export function toPublicUser(doc: UserDoc): PublicUser {
  return {
    id: doc._id.toHexString(),
    email: doc.email,
    displayName: doc.displayName,
  };
}

export async function ensureUserIndexes(): Promise<void> {
  const db = await connectDb();
  await db.collection<UserDoc>("users").createIndex({ email: 1 }, { unique: true });
}

export async function findUserByEmail(email: string): Promise<UserDoc | null> {
  const db = await connectDb();
  return db.collection<UserDoc>("users").findOne({
    email: email.trim().toLowerCase(),
  });
}

export async function createUser(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<UserDoc> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const now = new Date();
  const displayName =
    input.displayName?.trim() ||
    email.split("@")[0] ||
    "徒步者";

  const doc: Omit<UserDoc, "_id"> = {
    email,
    passwordHash,
    displayName,
    createdAt: now,
    updatedAt: now,
  };

  const db = await connectDb();
  const result = await db.collection<UserDoc>("users").insertOne(doc as UserDoc);
  return { _id: result.insertedId, ...doc };
}

export async function verifyPassword(
  user: UserDoc,
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}
