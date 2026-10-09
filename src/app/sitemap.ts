import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { languageAlternates } from "@/lib/seo";
import { LOCALES } from "@/lib/types";

export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.map((l) => ({
    url: `${siteUrl}/${l}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: l === "it" ? 1 : 0.8,
    alternates: { languages: languageAlternates() },
  }));
}
