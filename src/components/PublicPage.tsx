"use client";

import { useTranslations } from "next-intl";
import { Fragment, type ReactNode } from "react";
import { t, type SectionKey } from "@/lib/shared";
import { Marquee } from "./decor/Marquee";
import { SceneFlow } from "./decor/SceneFlow";
import { Nav } from "./Nav";
import { useSite } from "./providers/SiteData";
import { Banner } from "./sections/Banner";
import { Configurator } from "./sections/Configurator";
import { Flavors } from "./sections/Flavors";
import { Footer } from "./sections/Footer";
import { Lab } from "./sections/Lab";
import { Hero } from "./sections/Hero";
import { Treats } from "./sections/Treats";
import { Reviews } from "./sections/Reviews";
import { Signature } from "./sections/Signature";
import { Visit } from "./sections/Visit";

const SECTIONS: Record<SectionKey, () => ReactNode> = {
  announcement: () => <Banner />,
  hero: () => <Hero />,
  flavors: () => <Flavors />,
  lab: () => <Lab />,
  configurator: () => null, // a pop-out now, rendered once below
  signature: () => <Signature />,
  prices: () => <Treats />,
  reviews: () => <Reviews />,
  visit: () => <Visit />,
  footer: () => <Footer />,
};

/** Sections in the live order/visibility from the admin, with a type marquee after the hero. */
export function PublicPage() {
  const { data, locale } = useSite();
  const visible = data.sections.filter((s) => s.is_visible);
  const marquee = t(data.settings.texts.marquee, locale);
  const ui = useTranslations("ui");
  const content = visible.filter((s) => s.key !== "footer" && s.key !== "announcement" && s.key !== "configurator");
  return (
    <>
      <a href="#main" className="fixed top-2 left-2 z-[200] -translate-y-24 rounded-full bg-chocolate px-4 py-2 font-bold text-cream transition-transform focus:translate-y-0">
        {ui("skipToContent")}
      </a>
      <Nav />
      <main id="main">
        {visible.some((s) => s.key === "announcement") && <Banner />}
        <SceneFlow keys={content.map((s) => s.key)}>
          {content.map((s, i) => (
            <Fragment key={s.key}>
              {SECTIONS[s.key]?.()}
              {/* the ribbon closes the 2nd content block, for rhythm */}
              {marquee && i === 1 && <Marquee text={marquee} />}
            </Fragment>
          ))}
        </SceneFlow>
        {visible.some((s) => s.key === "configurator") && <Configurator />}
      </main>
      {visible.some((s) => s.key === "footer") && <Footer />}
    </>
  );
}
