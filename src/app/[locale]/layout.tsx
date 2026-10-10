import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { body, display } from "@/app/fonts";
import { CursorBlob } from "@/components/CursorBlob";
import { ParallaxEngine } from "@/components/decor/ParallaxEngine";
import { Preloader } from "@/components/Preloader";
import { SiteDataProvider } from "@/components/providers/SiteData";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { LangWave } from "@/components/LangWave";
import { SkeletonImages } from "@/components/SkeletonImages";
import { TabTitle } from "@/components/TabTitle";
import { Tracker } from "@/components/Tracker";
import { routing } from "@/i18n/routing";
import { getSiteData } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { jsonLd, languageAlternates, shopJsonLd } from "@/lib/seo";
import { t, type Locale } from "@/lib/types";
import "../globals.css";

export const viewport: Viewport = {
  themeColor: "#FFF7EE",
  width: "device-width",
  initialScale: 1,
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = locale as Locale;
  const { settings: s } = await getSiteData();
  const title = `${s.name} — ${t(s.tagline, l)} · Santa Teresa Gallura`;
  const description = `${t(s.texts.hero_subtitle, l)}. ${t(s.texts.lab_body, l)}`.slice(0, 300);
  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: { canonical: `/${l}`, languages: languageAlternates() },
    openGraph: { type: "website", siteName: s.name, title, description, url: `/${l}`, locale: l },
    twitter: { card: "summary_large_image", title, description },
    icons: { icon: "/icon.svg" },
    formatDetection: { telephone: true, address: true },
  };
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const { source: _source, ...data } = await getSiteData();
  const motion = data.settings.motion;
  // Brand colors editable from the admin override the CSS tokens.
  const themeVars = Object.fromEntries(Object.entries(data.settings.theme).map(([k, v]) => [`--${k}`, v])) as CSSProperties;

  return (
    <html lang={locale} className={`${display.variable} ${body.variable}`} style={themeVars}>
      <body className="antialiased">
        <NextIntlClientProvider>
          <SiteDataProvider initial={data} locale={locale as Locale}>
            {motion.preloader !== "off" && <Preloader mode={motion.preloader} />}
            <SmoothScroll enabled={motion.smoothScroll}>{children}</SmoothScroll>
            <ParallaxEngine />
            {motion.cursor && <CursorBlob />}
            <Tracker />
            <TabTitle />
            <LangWave />
            <SkeletonImages />
          </SiteDataProvider>
        </NextIntlClientProvider>
        <div className="grain" aria-hidden />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(shopJsonLd(data, locale as Locale)) }} />
      </body>
    </html>
  );
}
