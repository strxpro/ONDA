"use client";

import { Check, LockSimple, Star, Trash, X } from "@phosphor-icons/react";
import { deleteRowAction, saveRow } from "@/app/admin/actions";
import type { Comment } from "@/lib/shared";
import { Button, Card, PageTitle, useAction } from "../ui";

const LABEL = { pending: "Da approvare", approved: "Pubblicati", rejected: "Scartati" } as const;

/** Visitors' comments: approve (it appears on the site instantly), reject or delete. */
export function CommentsAdmin({ comments }: { comments: Comment[] }) {
  const { call } = useAction();
  const set = (c: Comment, status: Comment["status"]) => call(() => saveRow("comments", c.id, { status }), status === "approved" ? "Pubblicato" : "Scartato");
  return (
    <>
      <PageTitle title="Commenti" subtitle="Appaiono sul sito solo dopo la tua approvazione. Chi dà 4–5 stelle viene invitato su Google; da 1 a 3 è un feedback privato, solo per te" />
      <div className="space-y-6">
        {(["pending", "approved", "rejected"] as const).map((st) => {
          const list = comments.filter((c) => c.status === st);
          if (!list.length && st !== "pending") return null;
          return (
            <section key={st}>
              <h2 className="mb-2 font-display text-xl font-bold">
                {LABEL[st]} <span className="text-chocolate/40">{list.length}</span>
              </h2>
              {!list.length ? (
                <Card>
                  <p className="text-chocolate/60">Nessun commento in attesa.</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {list.map((c) => (
                    <Card key={c.id} className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        {c.rating != null && (
                          <p className="mb-1 flex items-center gap-2">
                            <span className="flex text-amber-500" aria-label={`${c.rating} stelle`}>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <Star key={n} weight={n <= c.rating! ? "fill" : "regular"} className="size-4" />
                              ))}
                            </span>
                            {c.rating <= 3 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-chocolate/8 px-2 py-0.5 text-xs font-bold text-chocolate/70">
                                <LockSimple weight="bold" className="size-3" /> privato
                              </span>
                            )}
                          </p>
                        )}
                        <p className="font-semibold">«{c.message}»</p>
                        <p className="text-sm text-chocolate/55">
                          — {c.name}
                          {c.flavor_slug ? ` · ${c.flavor_slug}` : ""} · {new Date(c.created_at).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                      </div>
                      {st !== "approved" && (
                        <Button onClick={() => set(c, "approved")} label="Pubblica">
                          <Check weight="bold" className="size-5" /> Pubblica
                        </Button>
                      )}
                      {st !== "rejected" && (
                        <Button variant="soft" onClick={() => set(c, "rejected")} label="Nascondi">
                          <X weight="bold" className="size-5" />
                        </Button>
                      )}
                      <Button variant="danger" label="Elimina" onClick={() => confirm("Eliminare il commento?") && call(() => deleteRowAction("comments", c.id), "Eliminato")}>
                        <Trash weight="bold" className="size-5" />
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
