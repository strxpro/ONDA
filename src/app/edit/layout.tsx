import type { Metadata } from "next";
import type { ReactNode } from "react";
import { body, display } from "@/app/fonts";
import "../globals.css";

export const metadata: Metadata = { title: "Onda · edit", robots: { index: false, follow: false } };

/** Stand-alone layout for the motion reel (recorded locally, never linked). */
export default function EditLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it" className={`${display.variable} ${body.variable}`}>
      <body className="overflow-hidden bg-cream antialiased">
        {/* hide Next's dev badge so it never ends up in the frames */}
        <style>{"nextjs-portal{display:none!important}"}</style>
        {children}
      </body>
    </html>
  );
}
