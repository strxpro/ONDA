import type { ReactNode } from "react";
import type { Locale } from "@/lib/shared";

/** Hand-drawn round flags (only the six we need — no 270-flag library in the bundle). viewBox 0 0 24 24. */
const FLAGS: Record<Locale, ReactNode> = {
  it: (
    <>
      <rect width="8" height="24" fill="#009246" />
      <rect x="8" width="8" height="24" fill="#fff" />
      <rect x="16" width="8" height="24" fill="#CE2B37" />
    </>
  ),
  pl: (
    <>
      <rect width="24" height="12" fill="#fff" />
      <rect y="12" width="24" height="12" fill="#DC143C" />
    </>
  ),
  en: (
    <>
      <rect width="24" height="24" fill="#012169" />
      <path d="M0 0 24 24M24 0 0 24" stroke="#fff" strokeWidth="5" />
      <path d="M0 0 24 24M24 0 0 24" stroke="#C8102E" strokeWidth="2" />
      <path d="M12 0v24M0 12h24" stroke="#fff" strokeWidth="7" />
      <path d="M12 0v24M0 12h24" stroke="#C8102E" strokeWidth="4" />
    </>
  ),
  es: (
    <>
      <rect width="24" height="24" fill="#AA151B" />
      <rect y="6" width="24" height="12" fill="#F1BF00" />
    </>
  ),
  de: (
    <>
      <rect width="24" height="8" fill="#000" />
      <rect y="8" width="24" height="8" fill="#DD0000" />
      <rect y="16" width="24" height="8" fill="#FFCE00" />
    </>
  ),
  fr: (
    <>
      <rect width="8" height="24" fill="#0055A4" />
      <rect x="8" width="8" height="24" fill="#fff" />
      <rect x="16" width="8" height="24" fill="#EF4135" />
    </>
  ),
};

export function Flag({ locale, className = "size-6" }: { locale: Locale; className?: string }) {
  return (
    <span className={`inline-block shrink-0 overflow-hidden rounded-full shadow-[0_0_0_2px_rgba(255,255,255,0.85)] ${className}`} aria-hidden>
      <svg viewBox="0 0 24 24" className="block h-full w-full">
        {FLAGS[locale]}
      </svg>
    </span>
  );
}
