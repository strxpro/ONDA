/**
 * Builds the site's cursors from the artwork (white background removed, trimmed, a soft shadow baked in —
 * CSS cannot shadow a cursor). Prints the hotspot of each one.
 *   node scripts/make-cursors.mjs <cone> <hand> <text>
 */
import sharp from "sharp";

const [cone, hand, text] = process.argv.slice(2);

async function cutout(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const min = Math.min(r, g, b), sat = Math.max(r, g, b) - min;
    if (min > 238 && sat < 16) data[i + 3] = 0;
    else if (min > 218 && sat < 26) data[i + 3] = Math.round(((238 - min) / 20) * 255);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer();
}

/** the picture at height h, with a soft shadow (down-right), on a canvas with a small margin */
async function withShadow(png, h, pad) {
  const img = await sharp(png).resize({ height: h }).png().toBuffer();
  const { width, height } = await sharp(img).metadata();
  const W = width + pad * 2 + 3, H = height + pad * 2 + 4;
  const alpha = await sharp(img).extractChannel("alpha").toBuffer();
  const shadow = await sharp({ create: { width, height, channels: 3, background: "#4B2A20" } }).joinChannel(alpha).png().toBuffer();
  const soft = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: shadow, left: pad + 2, top: pad + 3 }])
    .blur(1.6)
    .png()
    .toBuffer();
  // fade the shadow to ~35 %
  const { data, info } = await sharp(soft).raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * 0.35);
  const faded = await sharp(data, { raw: info }).png().toBuffer();
  return { buf: await sharp(faded).composite([{ input: img, left: pad, top: pad }]).png().toBuffer(), width, height, pad };
}

for (const [name, src, h, hot] of [
  ["cursor-cone", cone, 40, (w, hh, p) => [p + 2, p + 2]], // the tip, top-left
  ["cursor-hand", hand, 40, (w, hh, p) => [p + Math.round(w * 0.38), p + 1]], // the tip of the index finger
  ["cursor-text", text, 30, (w, hh, p) => [p + Math.round(w / 2), p + Math.round(hh / 2)]], // the middle of the I
]) {
  if (!src) continue;
  const cut = await cutout(src);
  for (const [scale, suffix] of [[1, ""], [2, "@2x"]]) {
    const r = await withShadow(cut, h * scale, 2 * scale);
    await sharp(r.buf).png().toFile(`public/img/${name}${suffix}.png`);
    if (scale === 1) console.log(name, "size", r.width + r.pad * 2 + 3, "x", r.height + r.pad * 2 + 4, "hotspot", hot(r.width, r.height, r.pad).join(" "));
  }
}
