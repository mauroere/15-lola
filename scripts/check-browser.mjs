import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
const baseUrl = process.env.INVITATION_TEST_URL || "http://127.0.0.1:3030";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  });
  await context.addInitScript(() =>
    Object.defineProperty(navigator, "share", { value: undefined }),
  );
  const page = await context.newPage();
  const errors = [],
    failedResources = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().endsWith("/api/calendar"))
      failedResources.push(response.url());
  });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width > 768 ? 1080 : 844 });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(
      await page.locator("#hero-title").evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const bounds = range.getBoundingClientRect();
        return bounds.left >= 15 && bounds.right <= innerWidth - 15;
      }),
      true,
      `Name clipped at ${width}px`,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `Overflow at ${width}px`,
    );
    assert.equal(
      await page.getByRole("heading", { name: "Lola", exact: true }).count(),
      1,
    );
    assert.equal(
      await page
        .getByRole("heading", { name: "Elegante", exact: true })
        .count(),
      1,
    );
    for (const color of ["Bordó", "Plateado", "Blanco"])
      assert.equal(
        await page
          .locator(".color-list")
          .getByText(color, { exact: true })
          .count(),
        1,
      );
    assert.equal(await page.locator('a[href="/api/calendar"]').count(), 1);
    await expect(page.locator("time")).toHaveAttribute(
      "datetime",
      "2027-02-07",
    );
    await expect(page.locator("#hero-title")).toHaveCSS(
      "font-family",
      /UnifrakturMaguntia/,
    );
    assert.equal(await page.locator("form").count(), 2);
    await expect(
      page.getByRole("button", { name: "Enviar respuesta", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Sugerir canción", exact: true }),
    ).toBeDisabled();
    await expect(
      page.locator("#inicio").getByText("21:00 hs", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Cómo llegar/ }),
    ).toHaveAttribute("href", /maps.app.goo.gl\/f5aZKBZheer29YDGA/);
    assert.equal(
      await page
        .locator(".roses")
        .evaluateAll((images) =>
          images.every((img) => img.complete && img.naturalWidth > 0),
        ),
      true,
    );
    if (width === 390) {
      await page.screenshot({
        path: "/tmp/lola-medieval-mobile.png",
        fullPage: true,
      });
      await page.screenshot({ path: "/tmp/lola-medieval-mobile-portada.png" });
    }
    if (width === 1440) {
      await page.screenshot({
        path: "/tmp/lola-medieval-desktop.png",
        fullPage: true,
      });
      await page.screenshot({ path: "/tmp/lola-medieval-portada.png" });
    }
    const result = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
      `Accessibility at ${width}px`,
    );
    console.log(`${width}px: layout, images, dress code and accessibility OK`);
  }
  await page.getByRole("link", { name: "Dress code", exact: true }).click();
  await page.waitForURL("**/#vestimenta");
  await page.getByRole("button", { name: "Compartir invitación" }).click();
  await expect(page.locator(".share-control").getByRole("status")).toHaveText(
    "Enlace copiado.",
  );
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    `${baseUrl}/`,
  );
  const calendar = await page.request.get(`${baseUrl}/api/calendar`);
  assert.equal(calendar.status(), 200);
  const calendarText = await calendar.text();
  assert.match(calendarText, /DTSTART:20270208T000000Z/);
  assert.match(calendarText, /LOCATION:La Quinta Eventos/);
  assert.match(calendarText, /SUMMARY:Los XV de Lola/);
  assert.doesNotMatch(calendarText, /DTEND/);
  for (const line of calendarText.split("\r\n"))
    assert(Buffer.byteLength(line, "utf8") <= 75);
  const og = await page.request.get(`${baseUrl}/opengraph-image`);
  assert.equal(og.status(), 200);
  assert.match(og.headers()["content-type"], /image\/png/);
  assert.deepEqual(errors, []);
  assert.deepEqual(failedResources, []);
  console.log(
    "Navigation, sharing, confirmed date calendar, social preview and browser errors OK",
  );
} finally {
  await browser.close();
}
