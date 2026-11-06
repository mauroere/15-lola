import { storageStatus, databaseConfigured } from "@/lib/database";
import { adminConfigured } from "@/lib/admin";
export const dynamic = "force-dynamic";
export async function GET() {
  const check = await storageStatus();
  const ready = check.storageReady;
  return Response.json(
    {
      status: ready ? "ok" : "not_ready",
      storageReady: ready,
      databaseConfigured: databaseConfigured(),
      adminConfigured: adminConfigured(),
      code: check.code,
    },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
