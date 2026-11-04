import { storageReady } from "@/lib/database";
export const dynamic = "force-dynamic";
export async function GET() {
  const ready = await storageReady();
  return Response.json(
    { status: ready ? "ok" : "not_ready", storageReady: ready },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
