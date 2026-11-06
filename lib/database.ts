import "server-only";
import { probeStorage } from "./repository";
import { storageErrorCode } from "./storage-status";
import { Pool } from "pg";
import { connectionConfig } from "@/scripts/postgres-config.cjs";
const globalPool = globalThis as unknown as { lolaPool?: Pool };
function connectionString() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING
  );
}
export function databaseConfigured() {
  return Boolean(connectionString());
}
export function database() {
  if (!globalPool.lolaPool)
    globalPool.lolaPool = new Pool({
      ...connectionConfig(connectionString()),
      max: 3,
      idleTimeoutMillis: 10000,
    }).on("error", () =>
      console.error("Lola database connection interrupted."),
    );
  return globalPool.lolaPool;
}
export async function storageStatus() {
  if (!databaseConfigured())
    return { storageReady: false, code: "DATABASE_NOT_CONFIGURED" };
  try {
    await probeStorage(database());
    return { storageReady: true, code: "OK" };
  } catch (error) {
    return { storageReady: false, code: storageErrorCode(error) };
  }
}
export async function storageReady() {
  return (await storageStatus()).storageReady;
}
