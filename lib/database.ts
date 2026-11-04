import "server-only";
import { storageAvailable } from "./repository";
import { Pool } from "pg";
import { connectionConfig } from "@/scripts/postgres-config.cjs";
const globalPool = globalThis as unknown as { lolaPool?: Pool };
export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}
export function database() {
  if (!globalPool.lolaPool)
    globalPool.lolaPool = new Pool({
      ...connectionConfig(process.env.DATABASE_URL || process.env.POSTGRES_URL),
      max: 3,
      idleTimeoutMillis: 10000,
    }).on("error", () =>
      console.error("Lola database connection interrupted."),
    );
  return globalPool.lolaPool;
}
export async function storageReady() {
  if (!databaseConfigured()) return false;
  try {
    return await storageAvailable(database());
  } catch {
    return false;
  }
}
