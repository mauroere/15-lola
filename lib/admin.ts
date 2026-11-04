import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { database, databaseConfigured } from "./database";
export const adminCookie = "lola15_admin";
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function adminConfigured() {
  const password = process.env.ADMIN_PASSWORD;
  return Boolean(password && password.length >= 12 && password.length <= 256);
}
export function passwordMatches(value: string) {
  return (
    adminConfigured() &&
    value.length <= 256 &&
    timingSafeEqual(
      Buffer.from(hash(value), "hex"),
      Buffer.from(hash(process.env.ADMIN_PASSWORD!), "hex"),
    )
  );
}
export async function isAdmin() {
  if (!databaseConfigured() || !adminConfigured()) return false;
  const token = (await cookies()).get(adminCookie)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  const { rows } = await database().query(
    "select 1 from lola15.sessions where token_hash=$1 and password_version=$2 and expires_at>now()",
    [hash(token), hash(process.env.ADMIN_PASSWORD!)],
  );
  return rows.length === 1;
}
export async function createSession() {
  const token = randomBytes(32).toString("hex");
  await database().query(
    "delete from lola15.sessions where expires_at<now() or password_version<>$1",
    [hash(process.env.ADMIN_PASSWORD!)],
  );
  await database().query(
    "insert into lola15.sessions values($1,$2,now()+interval '8 hours')",
    [hash(token), hash(process.env.ADMIN_PASSWORD!)],
  );
  (await cookies()).set(adminCookie, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 3600,
    path: "/",
  });
}
