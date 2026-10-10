"use client";

import { FacebookLogo, InstagramLogo, MapPin, Phone } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { t } from "@/lib/shared";
import { useSite } from "../providers/SiteData";
import { LangSwitch } from "../ui/LangSwitch";
import { PrivacyLink } from "./Privacy";
import { Logo } from "../ui/Logo";

const SOCIAL_ICON = { facebook: FacebookLogo, instagram: InstagramLogo } as const;

export function Footer() {
  const { data, locale } = useSite();
  const s = data.settings;
  const ui = useTranslations("ui");
  return (
    <footer className="relative overflow-hidden bg-chocolate pt-[clamp(140px,16vw,220px)] pb-10 text-cream">
      <div className="mx-auto max-w-6xl px-(--gutter)">
        <p className="font-display text-[clamp(5rem,24vw,16rem)] leading-[0.8] font-bold" style={{ color: "transparent", WebkitTextStroke: "3px var(--pink)" }} aria-hidden>
          {s.name.replace(/^Gelateria\s+/i, "")}
        </p>
        <div className="mt-8 grid gap-10 md:grid-cols-[1.3fr_1fr_1.4fr]">
          <div>
            <Logo light tagline={t(s.tagline, locale)} />
            <p className="mt-3 font-semibold">{t(s.texts.footer_text, locale)}</p>
          </div>
          <div className="space-y-3 font-bold">
            {Object.entries(s.socials).map(([k, url]) => {
              const Icon = SOCIAL_ICON[k as keyof typeof SOCIAL_ICON];
              return (
                <a key={k} href={url} target="_blank" rel="noopener" className="flex items-center gap-2 capitalize underline-offset-4 hover:underline">
                  {Icon && <Icon weight="duotone" className="size-6" />} {k}
                </a>
              );
            })}
            {s.address && (
              <a href={s.maps_url ?? undefined} target="_blank" rel="noopener" className="flex items-start gap-2 underline-offset-4 hover:underline">
                <MapPin weight="duotone" className="size-6 shrink-0" /> {s.address}
              </a>
            )}
            {s.phone && (
              <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 underline-offset-4 hover:underline">
                <Phone weight="duotone" className="size-6" /> {s.phone}
              </a>
            )}
          </div>
          <div>
            <p className="mb-3 text-sm font-bold opacity-70">{ui("language")}</p>
            <LangSwitch inline dark />
          </div>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-cream/15 pt-6 text-sm opacity-80">
          <p className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>
              © {new Date().getFullYear()} {s.name}
            </span>
            <PrivacyLink />
          </p>
          <p>
            {ui("credit")}: <strong>Shardana Nuragici</strong>
          </p>
        </div>
      </div>
    </footer>
  );
}
