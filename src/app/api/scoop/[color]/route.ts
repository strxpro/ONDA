import path from "node:path";
import sharp from "sharp";

export const runtime = "nodejs";

/** rendered scoops, per color and size: each one is made once per server instance */
const cache = new Map<string, Uint8Array>();

/**
 * A realistic gelato scoop in any color: one of six neutral scoop photos (public/img/ice/bases/b0…b5: smooth,
 * ridged, glossy, with bits, swirled…) multiplied by the flavor color, alpha kept — so flavors without a photo of
 * their own still look different from each other.
 *   /api/scoop/FFAA5C?b=2    → 700 px      /api/scoop/FFAA5C?b=2&s=sm → 360 px
 * Responses are immutable (the color is in the URL), so browsers and the CDN cache them forever.
 */
export async function GET(req: Request, { params }: { params: Promise<{ color: string }> }) {
  const hex = (await params).color.replace(/\.webp$/, "").replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return new Response("bad color", { status: 400 });
  const sp = new URL(req.url).searchParams;
  const small = sp.get("s") === "sm";
  const b = Math.max(0, Math.min(5, Number(sp.get("b") ?? 0) || 0)); // which scoop shape (public/img/ice/bases/b0…b5)
  const key = `${hex.toLowerCase()}:${small ? "sm" : "lg"}:${b}`;
  const headers = { "content-type": "image/webp", "cache-control": "public, max-age=31536000, immutable" };
  const hit = cache.get(key);
  if (hit) return new Response(hit.slice(), { headers });
  const file = path.join(process.cwd(), "public", "img", "ice", small ? "sm" : "", "bases", `b${b}.webp`);
  const base = await sharp(file).png().toBuffer();
  const { width, height } = await sharp(base).metadata();
  const color = await sharp({ create: { width: width!, height: height!, channels: 4, background: `#${hex}` } }).png().toBuffer();
  const tinted = await sharp(base).composite([{ input: color, blend: "multiply" }]).png().toBuffer();
  const out = await sharp(tinted).composite([{ input: base, blend: "dest-in" }]).webp({ quality: 82, alphaQuality: 90 }).toBuffer();
  const bytes = new Uint8Array(out);
  if (cache.size > 300) cache.clear();
  cache.set(key, bytes);
  return new Response(bytes.slice(), { headers });
}
