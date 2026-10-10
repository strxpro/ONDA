import { renderMail } from "@/lib/mail";

export const runtime = "nodejs";

/** Local development only: how the customers' e-mail looks. */
export async function GET() {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  const html = renderMail({ lang: "pl", title: "Potwierdzone, Ania!", body: "Twoja rezerwacja jest potwierdzona — przygotujemy ją z sercem na sobota, 11 października, 17:00. Do zobaczenia!", message: "Dodamy też świeczki z numerem 7 — wszystkiego najlepszego dla Zosi!", details: [["Twoje zamówienie", "TORTA GELATO · Okrągły · 8 osób\nSmaki: Pistacja, Truskawka"], ["Odbiór", "sobota, 11 października, 17:00"]], address: "Via Amsicora 2, Santa Teresa Gallura", phone: "+39 0789 000000" });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
