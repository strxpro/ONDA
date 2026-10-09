/**
 * Full-height screenshots of site sections, to review a layout without scrolling by hand:
 *   node scripts/shot-sections.mjs flavors prices reviews visit   → .cache-raw/shots/<w>-<id>.jpg (desktop 1440 + phone 390)
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const ids = process.argv.slice(2);
const base = process.env.SITE ?? "http://localhost:3000";
const chrome = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const dir = ".cache-raw/shots";
mkdirSync(dir, { recursive: true });
const prof = mkdtempSync(path.join(".cache-raw", "shots-"));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, userDataDir: prof, args: ["--hide-scrollbars"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [w, h, dpr] of [[1440, 900, 1], [390, 844, 2]]) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("pageerror:", e.message));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: dpr, isMobile: w < 768, hasTouch: w < 768 });
  await page.goto(base + "/it", { waitUntil: "load", timeout: 120000 });
  await sleep(7000);
  // scroll through the page so every in-view animation has played
  const total = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < total; y += 400) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await sleep(60);
  }
  await sleep(1500);
  for (const id of ids) {
    const el = await page.$(`#${id}`);
    if (!el) {
      console.warn("no #" + id);
      continue;
    }
    await el.evaluate((e) => e.scrollIntoView());
    await sleep(1800);
    await el.screenshot({ path: path.join(dir, `${w}-${id}.jpg`), type: "jpeg", quality: 70 });
  }
  await page.close();
}
await browser.close();
rmSync(prof, { recursive: true, force: true });
console.log("shots in", dir);
