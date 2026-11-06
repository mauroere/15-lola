import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const baseUrl = process.env.INVITATION_TEST_URL || "http://127.0.0.1:3030";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
async function verify({ allowed, mobile = false }) {
  const browser = await chromium.launch({
    executablePath,
    args: [
      "--no-sandbox",
      `--autoplay-policy=${allowed ? "no-user-gesture-required" : "document-user-activation-required"}`,
    ],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: mobile,
      hasTouch: mobile,
    });
    await context.addInitScript(() => {
      window.musicAudit = { attempts: [], starts: [] };
      const original = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        const attempt = {
          activation: navigator.userActivation?.isActive,
          result: "pending",
        };
        window.musicAudit.attempts.push(attempt);
        return original.call(this).then(
          (value) => {
            attempt.result = "playing";
            return value;
          },
          (error) => {
            attempt.result = error.name;
            throw error;
          },
        );
      };
      document.addEventListener(
        "playing",
        (event) => {
          if (event.target instanceof HTMLAudioElement)
            window.musicAudit.starts.push(event.target.currentTime);
        },
        true,
      );
    });
    const page = await context.newPage(),
      cdp = await context.newCDPSession(page);
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    // Playwright page/locator evaluate can grant user activation via CDP. All
    // pre-gesture observations explicitly disable it, so the test cannot unlock sound.
    async function read() {
      const { result } = await cdp.send("Runtime.evaluate", {
        expression: `(()=>{const a=document.querySelector('.background-music audio');return {paused:a.paused,currentTime:a.currentTime,duration:a.duration,volume:a.volume,loop:a.loop,src:a.getAttribute('src'),scrollY,activation:navigator.userActivation.hasBeenActive,button:document.querySelector('.background-music button').textContent,hint:document.querySelector('.music-policy')?.textContent||'',...window.musicAudit};})()`,
        returnByValue: true,
        userGesture: false,
      });
      return result.value;
    }
    const playing = async () => {
      await expect
        .poll(async () => {
          const state = await read();
          return (
            !state.paused &&
            state.starts.length > 0 &&
            state.button.includes("Pausar música")
          );
        })
        .toBe(true);
    };
    if (allowed) {
      await playing();
      console.log("Autoplay permitted: playback starts on entry.");
    } else {
      await expect
        .poll(async () => {
          const state = await read();
          return state.attempts[0]?.result;
        })
        .toBe("NotAllowedError");
      const entry = await read();
      assert.equal(entry.paused, true);
      assert.equal(entry.activation, false);
      assert.equal(entry.starts.length, 0);
      assert(entry.hint.includes("necesita un toque"));
      assert(entry.button.includes("Activar música"));
      if (mobile) {
        const shot = await cdp.send("Page.captureScreenshot", {
          format: "png",
        });
        await writeFile(
          "/tmp/lola-audio-bloqueado.png",
          Buffer.from(shot.data, "base64"),
        );
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: 200, y: 650 }],
        });
        for (const y of [580, 500, 400, 300])
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: 200, y }],
          });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
      } else
        await cdp.send("Input.dispatchMouseEvent", {
          type: "mouseWheel",
          x: 200,
          y: 400,
          deltaX: 0,
          deltaY: 350,
        });
      await expect
        .poll(async () => {
          const state = await read();
          return (
            state.scrollY > 0 &&
            state.attempts.length >= 2 &&
            state.attempts.at(-1).result !== "pending"
          );
        })
        .toBe(true);
      const scrolled = await read();
      assert.equal(
        scrolled.paused,
        true,
        "Scroll alone does not authorize sound under the restrictive policy",
      );
      assert.equal(
        scrolled.activation,
        false,
        "Observation must not grant test activation",
      );
      assert.equal(scrolled.starts.length, 0);
      console.log(
        `${mobile ? "Android touch emulation" : "Desktop"}: entry and scroll stay blocked; the UI reports that a touch is needed.`,
      );
      if (mobile) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: 250, y: 250 }],
        });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
      } else {
        await cdp.send("Input.dispatchMouseEvent", {
          type: "mousePressed",
          x: 250,
          y: 250,
          button: "left",
          clickCount: 1,
        });
        await cdp.send("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x: 250,
          y: 250,
          button: "left",
          clickCount: 1,
        });
      }
      await playing();
      assert.equal((await read()).hint, "");
    }
    const initial = await read();
    assert.equal(initial.src, "/audio/thank-u-next.mp3");
    assert(
      initial.starts[0] >= 44.9 && initial.starts[0] < 46,
      `Unexpected initial position: ${initial.starts[0]}`,
    );
    assert.equal(initial.volume, 0.25);
    assert.equal(initial.loop, true);
    assert(initial.duration > 206 && initial.duration < 209);
    await page.getByRole("button", { name: /Pausar música/ }).click();
    await expect(
      page.getByRole("button", { name: /Escuchar música/ }),
    ).toBeVisible();
    await cdp.send("Runtime.evaluate", {
      expression: "document.querySelector('audio').currentTime=80",
      userGesture: false,
    });
    await page.getByRole("button", { name: /Escuchar música/ }).click();
    await playing();
    const resumed = await read();
    assert(resumed.currentTime >= 80 && resumed.currentTime < 82);
    await page.getByRole("button", { name: /Pausar música/ }).click();
    await page.getByRole("heading", { name: "Lola", exact: true }).click();
    assert.equal(
      (await read()).paused,
      true,
      "Manual pause must survive unrelated gestures",
    );
    const range = await page.request.get(`${baseUrl}/audio/thank-u-next.mp3`, {
      headers: { Range: "bytes=0-15" },
    });
    assert.equal(range.status(), 206);
    assert.equal((await range.body()).length, 16);
    assert.match(range.headers()["content-type"], /audio\/mpeg/);
    console.log(
      `${allowed ? "Permitted autoplay" : mobile ? "First Android touch" : "First mouse press"}: real MP3 starts at 0:45, resume and manual pause work.`,
    );
  } finally {
    await browser.close();
  }
}
await verify({ allowed: true });
await verify({ allowed: false });
await verify({ allowed: false, mobile: true });
