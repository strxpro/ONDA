/**
 * Captures the stills the presentation film is built from (the real site, admin and live changes),
 * into public/promo/. Run with the dev server up:
 *   node scripts/promo-assets.mjs [site] [review] [voice] [admin]     (no args = all)
 * Everything the capture changes (a demo review, a price, a flavor) is put back at the end.
 */
import { mkdirSync, rmSync, writeFileSync, mkdtempSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const base = process.env.SITE ?? "http://localhost:3000";
const chrome = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const out = "public/promo";
const parts = new Set(process.argv.slice(2).length ? process.argv.slice(2) : ["site", "review", "voice", "admin"]);
mkdirSync(out, { recursive: true });
mkdirSync(".cache-raw", { recursive: true });
const prof = mkdtempSync(path.join(".cache-raw", "assets-"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bot = (body) => fetch(base + "/api/dev/bot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, userDataDir: prof, args: ["--enable-gpu", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--hide-scrollbars"] });

async function open(w, h, dpr, url = "/it") {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: dpr, isMobile: w < 768, hasTouch: w < 768 });
  await page.goto(base + url, { waitUntil: "load", timeout: 120000 });
  await sleep(url.startsWith("/it") ? 7500 : 2500); // the preloader on the site
  return page;
}
/** scroll like a person so every scroll-driven entrance has played, then rest on the target */
async function scrollTo(page, sel, off = 0, exactIndex = -1) {
  const target = await page.evaluate(
    (sel, off, i) => {
      const els = document.querySelectorAll(sel);
      const el = i >= 0 ? els[i] : els[0];
      const anchor = i >= 0 ? el : el.closest(".scene") ?? el;
      return anchor.getBoundingClientRect().top + scrollY + off;
    },
    sel,
    off,
    exactIndex,
  );
  let y = await page.evaluate(() => scrollY);
  while (Math.abs(target - y) > 8) {
    y += Math.sign(target - y) * Math.min(300, Math.abs(target - y));
    await page.evaluate((y) => scrollTo(0, y), y);
    await sleep(70);
  }
  await sleep(2200);
}
/** scroll so that an element found by `find` (run in the page) sits at `at` (0..1) of the viewport height */
async function scrollToEl(page, find, at = 0.4) {
  const top = await page.evaluate(`(${find})().getBoundingClientRect().top + scrollY - innerHeight * ${at}`);
  let y = await page.evaluate(() => scrollY);
  while (Math.abs(top - y) > 8) {
    y += Math.sign(top - y) * Math.min(300, Math.abs(top - y));
    await page.evaluate((y) => scrollTo(0, y), y);
    await sleep(70);
  }
  await sleep(2200);
}
const rectOf = (page, find) =>
  page.evaluate(`(() => { const r = (${find})().getBoundingClientRect(); return { x: r.left / innerWidth, y: r.top / innerHeight, w: r.width / innerWidth, h: r.height / innerHeight }; })()`);
const shot = (page, name) => page.screenshot({ path: path.join(out, name + ".jpg"), type: "jpeg", quality: 90 });

try {
  // ── the site, desktop (1440×900 @1.5) and phone (390×844 @3)
  if (parts.has("site")) {
    const d = await open(1440, 900, 1.5);
    await shot(d, "d-hero");
    await scrollTo(d, "#flavors", 40);
    await shot(d, "d-flavors");
    await scrollTo(d, "#lab");
    await shot(d, "d-lab");
    await scrollTo(d, "#prices");
    await shot(d, "d-treats");
    await scrollTo(d, "#flavors", 600);
    await d.evaluate(() => document.querySelector('a[href="#build"]').click());
    await sleep(1800);
    const balls = await d.$$("#build ul li button");
    for (const i of [0, 6, 13]) {
      await balls[i].click();
      await sleep(900);
    }
    await sleep(1500);
    await shot(d, "d-builder");
    await d.close();

    const p = await open(390, 844, 3);
    await shot(p, "m-hero");
    await scrollTo(p, "#flavors", 40);
    await shot(p, "m-flavors");
    await scrollTo(p, "#lab");
    await shot(p, "m-lab");
    await scrollTo(p, "#prices");
    await shot(p, "m-treats");
    await p.close();
  }

  // ── the review from the NFC / QR stand: stars → (4–5★) Google · (1–3★) private note → the owner's panel
  if (parts.has("review")) {
    const r = {};
    const p = await open(390, 844, 3, "/it?recensione=1");
    await sleep(4500); // the card opens after the preloader
    await shot(p, "m-rate");
    r.stars = [];
    for (let n = 1; n <= 5; n++) r.stars.push(await rectOf(p, `() => document.querySelector('[data-rate="${n}"]')`));
    await p.click('[data-rate="5"]');
    await sleep(1200);
    await shot(p, "m-rate-5");
    r.google = await rectOf(p, `() => document.querySelector('form [data-google]')`);
    await p.click('[aria-label="Cambia voto"]');
    await sleep(900);
    await p.click('[data-rate="3"]');
    await sleep(1200);
    await p.evaluate(() => document.querySelectorAll("input, textarea").forEach((e) => (e.spellcheck = false)));
    await shot(p, "m-rate-3");
    r.lock = await rectOf(p, `() => document.querySelector('[data-private]')`);
    r.name = await rectOf(p, `() => document.querySelector('form input[name="name"]')`);
    r.message = await rectOf(p, `() => document.querySelector('form textarea[name="message"]')`);
    r.send = await rectOf(p, `() => document.querySelector('form button[type="submit"]')`);
    await p.type('form input[name="name"]', "Marco");
    await p.type('form textarea[name="message"]', "Buono, ma alle 21 c'era tanta fila.");
    await sleep(500);
    await shot(p, "m-rate-3-filled");
    await p.click('form button[type="submit"]');
    await sleep(1800);
    await shot(p, "m-thanks-private");
    await p.close();

    const a = await open(1440, 900, 1.5, "/admin/commenti");
    const card = `() => [...document.querySelectorAll("main div")].filter((x) => /Marco/.test(x.textContent ?? "") && x.querySelector("button")).pop()`;
    await shot(a, "a-commenti");
    r.card = await rectOf(a, card);
    r.publish = await rectOf(a, `() => [...(${card})().querySelectorAll("button")].find((x) => /Pubblica/.test(x.textContent ?? ""))`);
    await bot({ tool: "moderate_comment", args: { comment: "fila", approve: true }, confirm: true });
    await a.reload({ waitUntil: "load" });
    await sleep(2500);
    await shot(a, "a-commenti-after");
    r.cardAfter = await rectOf(a, card);
    await a.close();
    writeFileSync(path.join(out, "review.json"), JSON.stringify(r, null, 1));
  }

  // ── by voice: how many people are on the site, a new price, a new flavor — and the site changing live
  if (parts.has("voice")) {
    const v = {};
    v.stats = (await bot({ tool: "get_stats", args: { period: "today" } })).result;
    const p = await open(390, 844, 3);
    // the price strip under the flavors' title
    const medio = `() => [...document.querySelectorAll("#flavors ul li")].find((x) => /Medio/.test(x.textContent ?? ""))`;
    await scrollToEl(p, medio, 0.38);
    v.price = await rectOf(p, medio);
    v.priceOld = (await bot({ tool: "list_prices" })).result.find((x) => x.item === "Cono medio").price_eur;
    await shot(p, "m-price-before");
    await bot({ tool: "update_price", args: { item: "cono medio", price_eur: 3.8 }, confirm: true });
    await sleep(3200); // live update + the rolling digits
    await shot(p, "m-price-after");
    v.priceAfter = await rectOf(p, medio);
    await bot({ tool: "update_price", args: { item: "cono medio", price_eur: v.priceOld }, confirm: true });
    await p.close();

    // a new flavor: it lands first in the menu (new + "speciali" come first)
    const q = await open(390, 844, 3);
    const first = `() => document.querySelector("#flavors ul li button[aria-label]")`;
    await scrollToEl(q, first, 0.3);
    await shot(q, "m-mirto-before");
    v.firstBefore = await rectOf(q, first);
    const res = await bot({ tool: "add_flavor", args: { name: "Mirto", category: "speciali", color: "#6E3B5E", description: "Mirto di Gallura, dolce e profumato" }, confirm: true });
    if (!res.applied) console.warn("add_flavor:", JSON.stringify(res).slice(0, 300));
    await sleep(3500);
    const mirto = `() => [...document.querySelectorAll("#flavors ul li button")].find((x) => /mirto/i.test(x.getAttribute("aria-label") ?? ""))`;
    v.mirto = await rectOf(q, mirto);
    await shot(q, "m-mirto-after");
    await q.close();
    writeFileSync(path.join(out, "voice.json"), JSON.stringify(v, null, 1));
  }

  if (parts.has("admin")) {
    const a = await open(1440, 900, 1.5, "/admin");
    await shot(a, "a-dashboard");
    await a.close();
  }
} finally {
  await bot({ cleanup: "promo" });
  await browser.close();
  rmSync(prof, { recursive: true, force: true });
}
console.log("assets in", out);
