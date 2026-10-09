/**
 * supabase/all-in-one.sql = every migration in order + seed.sql + the owner row, in one transaction —
 * for pasting into Supabase → SQL Editor on an empty project.   npm run db:all
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const dir = "supabase/migrations";
const parts = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().map((f) => `-- ═══ ${f} ═══\n${readFileSync(`${dir}/${f}`, "utf8")}`);
const email = process.env.ADMIN_EMAIL || "TWOJ@EMAIL.it";
const tg = process.env.ADMIN_TELEGRAM_ID || "123456789";
writeFileSync(
  "supabase/all-in-one.sql",
  [
    "-- Gelateria Onda — whole database in one file (paste into Supabase → SQL Editor → Run, on an EMPTY project).",
    "-- = supabase/migrations/*.sql in order + supabase/seed.sql. Regenerate with: npm run db:all",
    "-- At the end: check your e-mail and Telegram id in the admin_users insert.",
    "",
    "begin;",
    ...parts,
    `-- ═══ seed.sql ═══\n${readFileSync("supabase/seed.sql", "utf8")}`,
    "-- ═══ the owner: login e-mail + Telegram user id (from @userinfobot) ═══",
    `insert into public.admin_users (email, telegram_user_id, display_name, role) values ('${email.replace(/'/g, "''")}', ${Number(tg)}, 'Mauro', 'owner') on conflict do nothing;`,
    "",
    "commit;",
    "",
  ].join("\n"),
);
console.log("supabase/all-in-one.sql written");
