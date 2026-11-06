import { PGlite } from "@electric-sql/pglite";
import { createServer } from "node:http";
import { readFile, readdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { rsvpSchema, songSchema } from "../lib/validation";
import { saveGuestRequest, reviewGuestRequest } from "../lib/repository";
const root = process.cwd(),
  output = await mkdtemp(path.join(tmpdir(), "lola-fixture-")),
  db = new PGlite();
for (const migration of (await readdir("db/migrations")).sort())
  await db.exec(await readFile(`db/migrations/${migration}`, "utf8"));
await build({
  entryPoints: ["tests/fixture-entry.tsx"],
  outdir: output,
  bundle: true,
  format: "esm",
  jsx: "automatic",
  loader: { ".woff2": "file", ".woff": "file" },
  alias: {
    "@/app/actions": path.join(root, "tests/fixture-actions.ts"),
    "next/navigation": path.join(root, "tests/fixture-navigation.ts"),
  },
});
let failure = false;
const send = (res: any, status: number, data: unknown) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
};
const server = createServer(async (req, res) => {
  try {
    const route = new URL(req.url!, "http://localhost").pathname;
    if (req.method === "POST") {
      if (req.headers.authorization !== "isolated-fixture")
        return send(res, 401, {});
      let body = "";
      for await (const chunk of req) body += chunk;
      const input = JSON.parse(body);
      if (failure)
        return send(res, 503, {
          success: false,
          error: "No se pudo guardar. Reintentá.",
        });
      if (route === "/__review") {
        await reviewGuestRequest(
          db,
          input.id,
          input.status,
          input.expectedStatus,
        );
        return send(res, 200, { success: true });
      }
      const parsed =
        route === "/__rsvp" ? rsvpSchema.parse(input) : songSchema.parse(input);
      await saveGuestRequest(
        db,
        route === "/__rsvp" ? "rsvp" : "song",
        parsed,
        "isolated-browser",
      );
      return send(res, 200, { success: true });
    }
    if (route === "/__data")
      return send(res, 200, {
        rsvps: (
          await db.query("select * from lola15.rsvps order by created_at desc")
        ).rows,
        songs: (await db.query("select * from lola15.songs")).rows,
      });
    if (route === "/__audio.wav") {
      const rate = 8000,
        length = rate * 60,
        wav = Buffer.alloc(44 + length * 2);
      wav.write("RIFF");
      wav.writeUInt32LE(wav.length - 8, 4);
      wav.write("WAVEfmt ", 8);
      wav.writeUInt32LE(16, 16);
      wav.writeUInt16LE(1, 20);
      wav.writeUInt16LE(1, 22);
      wav.writeUInt32LE(rate, 24);
      wav.writeUInt32LE(rate * 2, 28);
      wav.writeUInt16LE(2, 32);
      wav.writeUInt16LE(16, 34);
      wav.write("data", 36);
      wav.writeUInt32LE(length * 2, 40);
      res.writeHead(200, { "Content-Type": "audio/wav" });
      return res.end(wav);
    }
    if (route === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(
        '<html lang="es"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Fixture local</title><link rel="stylesheet" href="/files/fixture-entry.css"></head><body><div id="root"></div><script type="module" src="/files/fixture-entry.js"></script></body></html>',
      );
    }
    const file = route.startsWith("/files/")
      ? path.join(output, path.basename(route))
      : route === "/brand/lola-escudo.svg"
        ? path.join(root, "public", route)
        : null;
    if (!file) {
      res.writeHead(404);
      return res.end();
    }
    const ext = path.extname(file),
      type =
        ext === ".js"
          ? "application/javascript"
          : ext === ".css"
            ? "text/css"
            : ext === ".svg"
              ? "image/svg+xml"
              : "font/woff2";
    res.writeHead(200, { "Content-Type": type });
    res.end(await readFile(file));
  } catch {
    send(res, 500, { success: false, error: "Fixture failed" });
  }
});
await new Promise<void>((resolve) => server.listen(3041, "127.0.0.1", resolve));
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
});
try {
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage(),
    origin = "http://127.0.0.1:3041";
  await page.goto(origin);
  await page
    .getByLabel("Tu nombre y apellido", { exact: true })
    .fill("Persona aislada");
  await page
    .getByLabel("WhatsApp de contacto", { exact: true })
    .fill("11 3154 5678");
  await page.locator("#guest-main-menu").selectOption("gluten_free");
  await page
    .getByRole("button", { name: "+ Agregar persona invitada", exact: true })
    .click();
  await page
    .getByLabel("Nombre y apellido de la persona invitada 1", { exact: true })
    .fill("Acompañante local");
  await page.locator("#companion-0-menu").selectOption("vegan");
  failure = true;
  await page
    .getByRole("button", { name: "Enviar respuesta", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("No se pudo guardar");
  await expect(
    page.getByLabel("Tu nombre y apellido", { exact: true }),
  ).toHaveValue("Persona aislada");
  assert.equal(
    (await db.query<any>("select count(*)::int n from lola15.rsvps")).rows[0].n,
    0,
  );
  failure = false;
  const axe = await new AxeBuilder({ page }).analyze();
  assert.deepEqual(
    axe.violations.map((v) => v.id),
    [],
  );
  await page
    .getByRole("button", { name: "Enviar respuesta", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("pendiente de revisión");
  const saved = (await db.query<any>("select * from lola15.rsvps")).rows[0];
  assert.equal(saved.status, "pending");
  assert.deepEqual(
    saved.members.map((m: any) => m.menu),
    ["gluten_free", "vegan"],
  );
  await page.getByLabel("Tu nombre", { exact: true }).fill("Persona musical");
  await page
    .getByLabel("Canción y artista", { exact: true })
    .fill("Tema de prueba — Artista local");
  await page
    .getByRole("button", { name: "Sugerir canción", exact: true })
    .click();
  await expect(
    page.getByText(
      "¡Gracias por tu sugerencia! Ya quedó guardada para la fiesta.",
    ),
  ).toBeVisible();
  assert.equal(
    (await db.query<any>("select count(*)::int n from lola15.songs")).rows[0].n,
    1,
  );
  await page.goto(origin + "/?screen=admin");
  await expect(
    page.getByRole("heading", {
      name: "Respondió: Persona aislada",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Aprobar respuesta de Persona aislada",
      exact: true,
    })
    .click();
  await expect(page.getByText(/2 asistentes aprobados/)).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar asistentes y menús", exact: true })
    .click();
  const exportFile = await downloaded;
  const exported = await readFile((await exportFile.path())!, "utf8");
  assert(exported.includes("Persona aislada"));
  assert(exported.includes("Acompañante local"));
  assert(exported.includes("Sin TACC"));
  assert.deepEqual(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id),
    [],
  );
  await page.goto(origin);
  await page
    .getByLabel("Tu nombre y apellido", { exact: true })
    .fill("Persona aislada");
  await page
    .getByLabel("WhatsApp de contacto", { exact: true })
    .fill("11 3154 5678");
  await page.getByLabel("¿Van a venir?").selectOption("no");
  await page
    .getByRole("button", { name: "Enviar respuesta", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("pendiente de revisión");
  await page.goto(origin + "/?screen=admin");
  await page
    .getByRole("button", {
      name: "Aprobar respuesta de Persona aislada",
      exact: true,
    })
    .click();
  await expect(page.getByText(/0 asistentes aprobados/)).toBeVisible();
  // A parent can respond for someone else, without becoming an attendee.
  await page.goto(origin);
  await page
    .getByLabel("Tu nombre y apellido", { exact: true })
    .fill("Madre de prueba");
  await page
    .getByLabel("WhatsApp de contacto", { exact: true })
    .fill("2324 456789");
  await page
    .getByRole("checkbox", { name: "Yo también voy a asistir" })
    .uncheck();
  await page
    .getByLabel("Nombre y apellido de la persona invitada 1", { exact: true })
    .fill("Hija invitada");
  await page.locator("#companion-0-menu").selectOption("other");
  await page.locator("#companion-0-notes").fill("Menú especial de prueba");
  await page
    .getByRole("button", { name: "Enviar respuesta", exact: true })
    .click();
  await expect(page.locator("#confirmacion").getByRole("status")).toContainText(
    "pendiente de revisión",
  );
  const proxy = (
    await db.query<any>(
      "select members from lola15.rsvps where contact_name='Madre de prueba'",
    )
  ).rows[0];
  assert.deepEqual(
    proxy.members.map((member: any) => member.name),
    ["Hija invitada"],
  );
  await page
    .getByRole("button", { name: "Corregir mi respuesta", exact: true })
    .click();
  await expect(
    page.getByLabel("Tu nombre y apellido", { exact: true }),
  ).toHaveValue("Madre de prueba");
  await expect(
    page.getByRole("checkbox", { name: "Yo también voy a asistir" }),
  ).not.toBeChecked();
  await expect(
    page.getByLabel("Nombre y apellido de la persona invitada 1", {
      exact: true,
    }),
  ).toHaveValue("Hija invitada");
  // Simulate a successful database commit followed by a lost response, then edit and retry.
  await page.goto(origin);
  await page
    .getByLabel("Tu nombre y apellido", { exact: true })
    .fill("Persona reintento");
  await page
    .getByLabel("WhatsApp de contacto", { exact: true })
    .fill("11 4111 5678");
  await page.route(
    "**/__rsvp",
    async (route) => {
      await route.fetch();
      await route.abort("failed");
    },
    { times: 1 },
  );
  await page
    .getByRole("button", { name: "Enviar respuesta", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("No se pudo conectar");
  await page.locator("#guest-main-menu").selectOption("vegan");
  await page
    .getByRole("button", { name: "Enviar respuesta", exact: true })
    .click();
  await expect(page.locator("#confirmacion").getByRole("status")).toContainText(
    "pendiente de revisión",
  );
  const retried = (
    await db.query<any>(
      "select id,members from lola15.rsvps where contact_name='Persona reintento' order by created_at,id",
    )
  ).rows;
  assert.equal(retried.length, 2);
  assert.notEqual(retried[0].id, retried[1].id);
  assert.equal(retried[0].members[0].menu, "standard");
  assert.equal(retried[1].members[0].menu, "vegan");
  await page.goto(origin + "/?screen=music");
  await expect(
    page.getByRole("button", { name: /Pausar música/ }),
  ).toBeVisible();
  const audio = page.locator("audio");
  assert.equal(await audio.evaluate((a: HTMLAudioElement) => a.paused), false);
  await page.getByRole("button", { name: /Pausar música/ }).click();
  assert.equal(await audio.evaluate((a: HTMLAudioElement) => a.paused), true);
  await page.getByRole("heading", { name: "Audio aislado" }).click();
  assert.equal(await audio.evaluate((a: HTMLAudioElement) => a.paused), true);
  console.log(
    "RSVP, menus per guest, error recovery, durable songs, admin review, replacement, accessibility and audio passed with isolated PostgreSQL and a synthetic audio file.",
  );
} finally {
  await browser.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db.close();
  await rm(output, { recursive: true, force: true });
}
