"use client";

import { CheckCircle, Translate, WarningCircle, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { translateAction } from "@/app/admin/actions";
import { LOCALE_NAMES, LOCALES, type I18nText, type Locale } from "@/lib/shared";
import { Flag } from "../ui/Flag";

/* ─── Toasts ─────────────────────────────────────────────────────────────── */
type Toast = { id: number; ok: boolean; text: string };
const ToastCtx = createContext<(ok: boolean, text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((ok: boolean, text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, ok, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ok ? 2200 : 6000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[200] flex flex-col items-center gap-2 px-4 md:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ y: 30, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.9 }}
              className={`pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl px-4 py-3 font-bold shadow-float ${t.ok ? "bg-chocolate text-cream" : "bg-cherry text-white"}`}
            >
              {t.ok ? <CheckCircle weight="fill" className="size-5 shrink-0 text-mint" /> : <WarningCircle weight="fill" className="size-5 shrink-0" />}
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/** Run a server action with toast + refresh. Returns the action's data (or undefined on error). */
export function useAction() {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const call = useCallback(
    async <T,>(fn: () => Promise<{ ok: true; data?: T } | { ok: false; error: string }>, okText = "Salvato! Il sito è aggiornato.") => {
      const res = await fn();
      if (res.ok) {
        if (okText) toast(true, okText);
        start(() => router.refresh());
        return res.data;
      }
      toast(false, res.error);
      return undefined;
    },
    [toast, router],
  );
  return { call, pending };
}

/* ─── Primitives ─────────────────────────────────────────────────────────── */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[1.75rem] bg-white p-4 shadow-soft sm:p-5 ${className}`}>{children}</div>;
}

export function Button({ children, onClick, variant = "primary", disabled, type = "button", className = "", label }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "danger" | "soft"; disabled?: boolean; type?: "button" | "submit"; className?: string; label?: string }) {
  const styles = {
    primary: "bg-chocolate text-cream",
    soft: "bg-pink-soft text-chocolate",
    ghost: "bg-transparent text-chocolate hover:bg-chocolate/5",
    danger: "bg-cherry/10 text-cherry",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} aria-label={label} title={label} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 font-display font-semibold transition-transform active:scale-95 disabled:opacity-40 ${styles} ${className}`}>
      {children}
    </button>
  );
}

/** Big, thumb-friendly switch. */
export function Toggle({ checked, onChange, label, tone = "mint" }: { checked: boolean; onChange: (v: boolean) => void; label?: string; tone?: "mint" | "cherry" }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        navigator.vibrate?.(8);
        onChange(!checked);
      }}
      className={`relative h-9 w-16 shrink-0 rounded-full transition-colors duration-300 ${checked ? (tone === "mint" ? "bg-[#2ecc71]" : "bg-cherry") : "bg-chocolate/20"}`}
    >
      <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 30 }} className={`absolute top-1 size-7 rounded-full bg-white shadow ${checked ? "right-1" : "left-1"}`} />
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-chocolate/70">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-chocolate/50">{hint}</span>}
    </label>
  );
}

export const inputCls = "w-full min-h-12 rounded-2xl border-2 border-chocolate/10 bg-cream/60 px-3.5 py-2.5 font-semibold outline-none transition-colors focus:border-chocolate/40 focus:bg-white";

export function ColorField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="size-12 shrink-0 cursor-pointer rounded-2xl border-0 bg-transparent p-0" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} maxLength={7} />
      </div>
    </Field>
  );
}

/** Edit one text in all six languages, with "translate from Italian". */
export function I18nEditor({ value, onChange, label, multiline = false }: { value: Partial<I18nText>; onChange: (v: I18nText) => void; label: string; multiline?: boolean }) {
  const [tab, setTab] = useState<Locale>("it");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (l: Locale, s: string) => onChange({ ...(value as I18nText), [l]: s });
  const auto = async () => {
    if (!value.it?.trim()) return toast(false, "Scrivi prima il testo in italiano");
    setBusy(true);
    const res = await translateAction(value.it);
    setBusy(false);
    if (res.ok && res.data) {
      onChange({ ...(res.data as I18nText), it: value.it });
      toast(true, "Tradotto in 5 lingue");
    } else if (!res.ok) toast(false, res.error);
  };
  const Input = multiline ? "textarea" : "input";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-chocolate/70">{label}</span>
        <button type="button" onClick={auto} disabled={busy} className="flex items-center gap-1 rounded-full bg-blueberry-soft px-3 py-1 text-xs font-bold disabled:opacity-50">
          <Translate weight="bold" className={`size-4 ${busy ? "animate-spin" : ""}`} /> Traduci dall&apos;italiano
        </button>
      </div>
      <div className="no-scrollbar mb-2 flex gap-1 overflow-x-auto">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setTab(l)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-xs font-bold transition-colors ${tab === l ? "bg-chocolate text-cream" : "bg-cream"} ${!value[l] && l !== "it" ? "opacity-50" : ""}`}
            title={LOCALE_NAMES[l]}
          >
            <Flag locale={l} className="size-5" /> {l.toUpperCase()}
          </button>
        ))}
      </div>
      <Input value={value[tab] ?? ""} onChange={(e) => set(tab, e.target.value)} rows={multiline ? 3 : undefined} className={inputCls} placeholder={tab === "it" ? "" : value.it} />
    </div>
  );
}

/** Bottom sheet on phones, centered dialog on desktop. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[150] flex items-end justify-center md:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-chocolate/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="relative max-h-[92svh] w-full overflow-y-auto rounded-t-[2rem] bg-cream p-5 pb-8 md:max-w-xl md:rounded-[2rem]"
          >
            <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-center justify-between bg-cream/95 px-5 pt-5 pb-3 backdrop-blur">
              <h2 className="font-display text-2xl font-bold">{title}</h2>
              <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full bg-white" aria-label="Chiudi">
                <X weight="bold" className="size-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 font-semibold text-chocolate/60">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
