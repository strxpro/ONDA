/**
 * Contact sheet of the film at given times (for reviewing the edit without rendering it):
 *   node scripts/promo-frames.mjs 0.5 2.9 4.6 …   → .cache-raw/frames/t-<time>.jpg + sheet.jpg
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const times = process.argv.slice(2).map(Number);
const base = process.env.SITE ?? "http://localhost:3000";
const chrome = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const dir = ".cache-raw/frames";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const prof = mkdtempSync(path.join(".cache-raw", "frames-"));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, userDataDir: prof, args: ["--hide-scrollbars", "--force-color-profile=srgb", "--enable-gpu", "--use-angle=d3d11"] });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("pageerror:", e.message));
await page.setViewport({ width: 1920, height: 1080 });
await page.goto(base + "/promo", { waitUntil: "networkidle0", timeout: 180000 });
await page.waitForFunction("window.__promo && window.__promo.ready === true", { timeout: 120000 });
const files = [];
for (const t of times) {
  await page.evaluate((t) => new Promise((r) => (window.__promo.seek(t), requestAnimationFrame(() => requestAnimationFrame(r)))), t);
  const f = path.join(dir, `t-${t.toFixed(2)}.jpg`);
  await page.screenshot({ path: f, type: "jpeg", quality: 80 });
  files.push(f);
}
await browser.close();
rmSync(prof, { recursive: true, force: true });
const cols = 4;
const args = files.flatMap((f) => ["-i", f]);
const rows = Math.ceil(files.length / cols);
const layout = files.map((_, i) => `${(i % cols) * 480}_${Math.floor(i / cols) * 270}`).join("|");
const scaled = files.map((_, i) => `[${i}:v]scale=480:270[v${i}]`).join(";");
execFileSync("ffmpeg", ["-v", "error", "-y", ...args, "-filter_complex", `${scaled};${files.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${files.length}:layout=${layout}:fill=black`, path.join(dir, "sheet.jpg")]);
console.log(`${files.length} frames, ${rows} rows → ${dir}/sheet.jpg`);
