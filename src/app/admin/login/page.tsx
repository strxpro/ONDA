"use client";

import { EnvelopeSimple } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Button, inputCls } from "@/components/admin/ui";
import { Scoop } from "@/components/ice/Scoop";
import { hasSupabase } from "@/lib/env";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    const { error } = await getBrowserSupabase()!.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/admin/auth/callback`, shouldCreateUser: false },
    });
    if (error) {
      setError(error.message);
      setState("error");
    } else setState("sent");
  };

  return (
    <main className="grid min-h-svh place-items-center bg-pink-soft p-5">
      <div className="w-full max-w-sm rounded-[2rem] bg-cream p-7 text-center shadow-float">
        <Scoop color="#FF8FB8" texture="chunks" color2="#E5243F" className="mx-auto w-20" />
        <h1 className="mt-3 font-display text-3xl font-bold">Onda · Admin</h1>
        {!hasSupabase ? (
          <>
            <p className="mt-3 font-semibold text-chocolate/70">Modalità locale (senza database): il pannello è aperto solo su questo computer.</p>
            <Link href="/admin" className="mt-5 inline-flex min-h-12 items-center rounded-2xl bg-chocolate px-5 font-display font-semibold text-cream">
              Entra
            </Link>
          </>
        ) : state === "sent" ? (
          <p className="mt-4 font-semibold">Controlla la tua email: ti abbiamo mandato il link per entrare.</p>
        ) : (
          <form onSubmit={send} className="mt-5 space-y-3 text-left">
            <input type="email" required autoComplete="email" placeholder="La tua email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            <Button type="submit" disabled={state === "sending"} className="w-full">
              <EnvelopeSimple weight="bold" className="size-5" /> Mandami il link
            </Button>
            {state === "error" && <p className="text-sm font-bold text-cherry">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
