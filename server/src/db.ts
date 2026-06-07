import { MongoClient, Db } from "mongodb";
import { config } from "./config.js";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDb(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(config.mongoUri);
  await client.connect();
  db = client.db(config.mongoDb);
  return db;
}

export async function pingDb(): Promise<boolean> {
  try {
    const database = await connectDb();
    await database.admin().ping();
    return true;
  } catch {
    return false;
  }
}

export async function closeDb(): Promise<void> {
  await client?.close();
  client = null;
  db = null;
}
