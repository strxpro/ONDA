/**
 * Renders the presentation film (src/app/promo) to MP4 — frame by frame, so it is perfectly smooth at 60 fps
 * regardless of the machine: the GSAP timeline is seeked to each frame's exact time, the frame is captured,
 * and the frames are piped into ffmpeg together with the synthesized soundtrack.
 *   1. npm run dev
 *   2. node scripts/promo-assets.mjs     (stills of the live site; once, or after design changes)
 *   3. node scripts/record-promo.mjs [out.mp4]
 * Music: media/beyond-possible.mp3 (SONG=… overrides); the SFX layer from scripts/promo-audio.mjs is mixed under it.
 * Needs Google Chrome and ffmpeg. CHROME=… overrides the Chrome path.
 */
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const out = process.argv[2] ?? "media/onda-presentazione.mp4";
const base = process.env.SITE ?? "http://localhost:3000";
const chrome = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FPS = 60;
mkdirSync(".cache-raw", { recursive: true });
mkdirSync(path.dirname(out), { recursive: true });
const tmp = mkdtempSync(path.join(".cache-raw", "rec-"));
const wav = path.join(tmp, "sfx.wav");
const song = process.env.SONG ?? "media/beyond-possible.mp3";

execFileSync("node", ["scripts/promo-audio.mjs", wav, "29.2"], { stdio: "inherit" });

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  userDataDir: path.join(tmp, "profile"),
  args: ["--hide-scrollbars", "--force-color-profile=srgb", "--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto(base + "/promo", { waitUntil: "networkidle0", timeout: 180000 });
await page.waitForFunction("window.__promo && window.__promo.ready === true", { timeout: 120000 });
const duration = await page.evaluate("window.__promo.duration");
const frames = Math.round(duration * FPS);
const cdp = await page.createCDPSession();

const ff = spawn(
  "ffmpeg",
  ["-v", "error", "-y", "-f", "image2pipe", "-c:v", "png", "-framerate", String(FPS), "-i", "-", "-i", song, "-i", wav,
   "-filter_complex", "[1:a]aresample=48000,volume=1.0[m];[2:a]volume=0.8[f];[m][f]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95,afade=t=out:st=28.4:d=0.76[a]",
   "-map", "0:v", "-map", "[a]",
   "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-profile:v", "high", "-r", String(FPS),
   "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", "-t", String(duration), out],
  { stdio: ["pipe", "inherit", "inherit"] },
);

const t0 = Date.now();
for (let f = 0; f < frames; f++) {
  // seek, then wait two animation frames so the browser has painted exactly that moment
  await page.evaluate((t) => new Promise((r) => (window.__promo.seek(t), requestAnimationFrame(() => requestAnimationFrame(r)))), f / FPS);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true });
  if (!ff.stdin.write(Buffer.from(data, "base64"))) await new Promise((r) => ff.stdin.once("drain", r));
  if (f % 120 === 0) process.stdout.write(`\r${f}/${frames} frames · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
rmSync(tmp, { recursive: true, force: true });
console.log(`\nsaved ${out} (${frames} frames @ ${FPS} fps)`);
