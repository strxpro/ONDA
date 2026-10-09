import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { body, display } from "@/app/fonts";
import { Toaster } from "@/components/admin/ui";
import "../globals.css";

export const metadata: Metadata = { title: "Onda · Admin", robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: "#FFF7EE", width: "device-width", initialScale: 1 };

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-svh bg-cream antialiased">
        <Toaster>{children}</Toaster>
      </body>
    </html>
  );
}
