"use server";
import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PoolClient } from "pg";
import { database, storageReady } from "@/lib/database";
import { rsvpSchema, songSchema } from "@/lib/validation";
import {
  consumeLimit,
  saveGuestRequest,
  reviewGuestRequest,
} from "@/lib/repository";
import {
  hash,
  isAdmin,
  adminConfigured,
  passwordMatches,
  createSession,
  adminCookie,
} from "@/lib/admin";
const unavailable =
  "No se pudo guardar. Tu respuesta sigue en el formulario; volvé a intentar en unos instantes.";
function refreshDashboard() {
  try {
    revalidatePath("/dashboard");
  } catch {
    console.error("Lola dashboard refresh failed after a completed operation.");
  }
}
async function clientKey() {
  const h = await headers();
  return hash(
    (
      (h.get("x-vercel-forwarded-for") || h.get("x-forwarded-for"))?.split(
        ",",
      )[0] || "local"
    )
      .trim()
      .slice(0, 100),
  );
}
async function save(kind: "rsvp" | "song", value: unknown) {
  const parsed =
    kind === "rsvp" ? rsvpSchema.safeParse(value) : songSchema.safeParse(value);
  if (!parsed.success)
    return {
      success: false,
      error:
        parsed.error.issues.find((issue) => issue.code === "custom")?.message ||
        (kind === "song"
          ? "Revisá tu nombre, la canción y el artista."
          : "Revisá los nombres, el WhatsApp y los datos del formulario."),
    };
  if (!(await storageReady()))
    return {
      success: false,
      error:
        "El formulario estará disponible muy pronto. Todavía no se envió tu respuesta.",
    };
  let client: PoolClient | undefined;
  try {
    client = await database().connect();
    await saveGuestRequest(client, kind, parsed.data, await clientKey());
    refreshDashboard();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error && error.message === "RATE_LIMIT"
          ? "Ya recibimos varios envíos. Esperá unos minutos para volver a intentar."
          : error instanceof Error && error.message === "IDEMPOTENCY_CONFLICT"
            ? "Ese envío ya fue recibido con otros datos. Enviá una corrección para registrar el cambio."
            : unavailable,
    };
  } finally {
    client?.release();
  }
}
export async function submitRSVP(value: unknown) {
  return save("rsvp", value);
}
export async function suggestSong(value: unknown) {
  return save("song", value);
}
export async function loginAdmin(password: string) {
  try {
    if (!adminConfigured() || !(await storageReady()))
      return { success: false, error: "El panel todavía no está disponible." };
    if (
      !(await consumeLimit(database(), "login:" + (await clientKey()), 6, 900))
    )
      return {
        success: false,
        error: "Esperá unos minutos antes de volver a intentar.",
      };
    if (typeof password !== "string" || !passwordMatches(password))
      return { success: false, error: "Contraseña incorrecta." };
    await createSession();
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo ingresar. Volvé a intentar." };
  }
}
export async function logoutAdmin() {
  try {
    const cookieStore = await cookies(),
      token = cookieStore.get(adminCookie)?.value;
    if (token)
      await database().query(
        "delete from lola15.sessions where token_hash=$1",
        [hash(token)],
      );
    cookieStore.delete(adminCookie);
    refreshDashboard();
    return { success: true };
  } catch {
    return {
      success: false,
      error: "No se pudo cerrar la sesión. Volvé a intentar.",
    };
  }
}
export async function reviewRSVP(
  id: string,
  status: "approved" | "rejected",
  expectedStatus: unknown,
) {
  try {
    if (!(await isAdmin()))
      return {
        success: false,
        error: "Ingresá al panel para revisar respuestas.",
        authRequired: true,
      };
    if (
      !z.uuid().safeParse(id).success ||
      !["approved", "rejected"].includes(status) ||
      !z.enum(["pending", "approved", "rejected"]).safeParse(expectedStatus)
        .success
    )
      return { success: false, error: "Respuesta inválida." };
    const client = await database().connect();
    try {
      await reviewGuestRequest(
        client,
        id,
        status,
        expectedStatus as "pending" | "approved" | "rejected",
      );
    } finally {
      client.release();
    }
    refreshDashboard();
    return { success: true };
  } catch (error) {
    const messages: Record<string, string> = {
      NOT_FOUND: "La respuesta ya no está disponible. Actualizá el panel.",
      OBSOLETE_RESPONSE:
        "Esta respuesta fue reemplazada. Revisá la más reciente.",
      STALE_REVIEW:
        "Otra persona ya revisó esta respuesta. Actualizá el panel antes de continuar.",
      NEWER_RESPONSE:
        "Hay una respuesta más reciente de este contacto. Revisá esa para contar la asistencia actual.",
    };
    return {
      success: false,
      error:
        (error instanceof Error && messages[error.message]) ||
        "No se pudo guardar la revisión. Volvé a intentar.",
    };
  }
}
