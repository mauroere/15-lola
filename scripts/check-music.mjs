import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const baseUrl = process.env.INVITATION_TEST_URL || "http://127.0.0.1:3030";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
async function verify(autoplayAllowed) {
  const browser = await chromium.launch({
    executablePath,
    args: [
      "--no-sandbox",
      `--autoplay-policy=${autoplayAllowed ? "no-user-gesture-required" : "user-gesture-required"}`,
    ],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addInitScript(() => {
      window.musicStarts = [];
      window.musicAttempts = 0;
      const originalPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        window.musicAttempts++;
        return originalPlay.call(this);
      };
      document.addEventListener(
        "playing",
        (event) => {
          if (event.target instanceof HTMLAudioElement)
            window.musicStarts.push(event.target.currentTime);
        },
        true,
      );
    });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    const audio = page.locator(".background-music audio");
    await expect(audio).toHaveAttribute("src", "/audio/thank-u-next.mp3");
    if (!autoplayAllowed) {
      await expect(
        page.getByRole("button", { name: /Escuchar música/ }),
      ).toBeVisible();
      assert.equal(await audio.evaluate((element) => element.paused), true);
      const attemptsBefore = await page.evaluate(() => window.musicAttempts);
      await page.mouse.wheel(0, 300);
      await expect
        .poll(() => page.evaluate(() => window.musicAttempts))
        .toBeGreaterThan(attemptsBefore);
      if (await audio.evaluate((element) => element.paused))
        await page.getByRole("heading", { name: "Lola", exact: true }).click();
    }
    await expect(
      page.getByRole("button", { name: /Pausar música/ }),
    ).toBeVisible();
    const firstPosition = await page.evaluate(() => window.musicStarts[0]);
    assert(
      firstPosition >= 44.9 && firstPosition < 46,
      `Unexpected initial position: ${firstPosition}`,
    );
    assert.equal(await audio.evaluate((element) => element.volume), 0.25);
    assert.equal(await audio.evaluate((element) => element.loop), true);
    const duration = await audio.evaluate((element) => element.duration);
    assert(
      duration > 206 && duration < 209,
      "The uploaded song should be about 3:27 long",
    );
    await page.getByRole("button", { name: /Pausar música/ }).click();
    await expect(
      page.getByRole("button", { name: /Escuchar música/ }),
    ).toBeVisible();
    await audio.evaluate((element) => {
      element.currentTime = 80;
    });
    await page.getByRole("button", { name: /Escuchar música/ }).click();
    await expect(
      page.getByRole("button", { name: /Pausar música/ }),
    ).toBeVisible();
    const resumedAt = await audio.evaluate((element) => element.currentTime);
    assert(
      resumedAt >= 80 && resumedAt < 82,
      "Resuming should preserve position",
    );
    await page.getByRole("button", { name: /Pausar música/ }).click();
    await page.getByRole("heading", { name: "Lola", exact: true }).click();
    assert.equal(
      await audio.evaluate((element) => element.paused),
      true,
      "A manual pause must survive unrelated clicks",
    );
    const range = await page.request.get(`${baseUrl}/audio/thank-u-next.mp3`, {
      headers: { Range: "bytes=0-15" },
    });
    assert.equal(range.status(), 206);
    assert.equal((await range.body()).length, 16);
    assert.match(range.headers()["content-type"], /audio\/mpeg/);
    console.log(
      `${autoplayAllowed ? "Autoplay" : "First gesture"}: real uploaded MP3 starts at 0:45, resumes correctly and supports seeking.`,
    );
  } finally {
    await browser.close();
  }
}
await verify(true);
await verify(false);
