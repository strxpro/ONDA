import type { Metadata } from "next";
import type { ReactNode } from "react";
import { body, display } from "@/app/fonts";
import "../globals.css";

export const metadata: Metadata = { title: "Onda · presentazione", robots: { index: false, follow: false } };

/** Stand-alone layout for the presentation film (recorded locally, never linked). */
export default function PromoLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it" className={`${display.variable} ${body.variable}`}>
      <body className="overflow-hidden bg-cream antialiased">{children}</body>
    </html>
  );
}
