/**
 * Video → WebP frame sequence for <FrameSequence>.
 *   node scripts/frames.mjs <video> <outDir> [count=72] [width=720] [--key]
 * --key removes the plain studio background (color sampled from the corners) → transparent frames.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [video, outDir, countArg = "72", widthArg = "720", ...flags] = process.argv.slice(2);
const count = Number(countArg);
const width = Number(widthArg);
const key = flags.includes("--key");

mkdirSync(".cache-raw", { recursive: true });
const tmp = mkdtempSync(path.join(".cache-raw", "frames-")); // project-local scratch (not public, not the system drive)
mkdirSync(outDir, { recursive: true });

// evenly spaced frames over the whole clip
const duration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video]).toString().trim());
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", video, "-vf", `fps=${count / duration},scale=${width}:-2:flags=lanczos`, "-frames:v", String(count), path.join(tmp, "%03d.png")]);

const files = readdirSync(tmp).filter((f) => f.endsWith(".png")).sort();
for (const f of files) {
  let img = sharp(path.join(tmp, f));
  if (key) {
    const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    // background = average of the four corner patches
    let r = 0, g = 0, b = 0, n = 0;
    for (const [cx, cy] of [[0, 0], [w - 12, 0], [0, h - 12], [w - 12, h - 12]]) {
      for (let y = cy; y < cy + 12; y++) for (let x = cx; x < cx + 12; x++) {
        const i = (y * w + x) * 4;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
      }
    }
    r /= n; g /= n; b /= n;
    const t0 = 16, t1 = 46; // distance ramp: <t0 fully transparent, >t1 fully opaque
    for (let i = 0; i < data.length; i += 4) {
      const d = Math.hypot(data[i] - r, data[i + 1] - g, data[i + 2] - b);
      const a = d <= t0 ? 0 : d >= t1 ? 1 : (d - t0) / (t1 - t0);
      data[i + 3] = Math.round(a * a * (3 - 2 * a) * 255);
    }
    img = sharp(data, { raw: { width: w, height: h, channels: 4 } });
  }
  await img.webp({ quality: 78, alphaQuality: 85, effort: 5 }).toFile(path.join(outDir, f.replace(".png", ".webp")));
}
rmSync(tmp, { recursive: true, force: true });
console.log(`${files.length} frames → ${outDir}`);
