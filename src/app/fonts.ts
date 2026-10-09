import { DM_Sans, Fraunces } from "next/font/google";

/** Display: Fraunces — a soft, slightly wonky serif (SOFT axis turned up): artisan and warm, not a template font. */
export const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  axes: ["SOFT", "WONK", "opsz"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

/** Body: DM Sans — clean and very readable at small sizes on phones. */
export const body = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-dmsans",
  display: "swap",
});
