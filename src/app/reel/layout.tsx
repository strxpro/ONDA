import type { Metadata } from "next";
import type { ReactNode } from "react";
import { body, display } from "@/app/fonts";
import "../globals.css";

export const metadata: Metadata = { title: "Onda · reel", robots: { index: false, follow: false } };

/** Stand-alone layout for the motion reel (recorded locally, never linked). */
export default function ReelLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it" className={`${display.variable} ${body.variable}`}>
      <body className="overflow-hidden bg-cream antialiased">{children}</body>
    </html>
  );
}
