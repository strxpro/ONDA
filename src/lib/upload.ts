import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasSupabase } from "./env";
import { getServiceSupabase } from "./supabase/server";

/**
 * Store an uploaded photo (from the admin panel or a Telegram message): auto-rotated, max 1600 px, WebP.
 * Supabase Storage "gallery" bucket in production, public/uploads in local development.
 */
export async function saveImage(input: ArrayBuffer | Buffer) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  if (buf.byteLength > 15 * 1024 * 1024) throw new Error("File troppo grande (max 15 MB)");
  const { default: sharp } = await import("sharp"); // lazy: text-only bot messages never load the image library
  const webp = await sharp(buf).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
  const name = `${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}.webp`;
  let url: string;
  if (hasSupabase) {
    const sb = getServiceSupabase();
    const up = await sb.storage.from("gallery").upload(name, webp.data, { contentType: "image/webp", upsert: false });
    if (up.error) throw new Error(up.error.message);
    url = sb.storage.from("gallery").getPublicUrl(name).data.publicUrl;
  } else {
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), webp.data);
    url = `/uploads/${name}`;
  }
  return { url, width: webp.info.width, height: webp.info.height };
}
