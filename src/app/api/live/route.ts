import { bus, type ChangeEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Local-dev live updates (server-sent events). In production the site uses Supabase Realtime instead. */
export async function GET(req: Request) {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (e: ChangeEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      const ping = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), 25_000);
      bus.on("change", send);
      cleanup = () => {
        clearInterval(ping);
        bus.off("change", send);
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
