import "server-only";

import { siteUrl } from "./env";
import { hhmm } from "./hours";
import { LOCALES, t, type Locale, type SiteData } from "./types";

const DAY = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** hreflang map for one path. */
export function languageAlternates(path = "") {
  return {
    ...Object.fromEntries(LOCALES.map((l) => [l, `${siteUrl}/${l}${path}`])),
    "x-default": `${siteUrl}/it${path}`,
  };
}

/**
 * schema.org/IceCreamShop built from live data. The rating is included only when the review
 * count is known (Google requires it) — nothing is invented.
 */
export function shopJsonLd(data: SiteData, locale: Locale) {
  const s = data.settings;
  const rating =
    s.rating_google != null && s.rating_google_count
      ? { "@type": "AggregateRating", ratingValue: s.rating_google, reviewCount: s.rating_google_count, bestRating: 5, worstRating: 1 }
      : undefined;
  const reviews = data.reviews
    .filter((r) => r.is_visible)
    .slice(0, 5)
    .map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author },
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
      reviewBody: r.text,
      ...(r.review_date ? { datePublished: r.review_date } : {}),
    }));

  return {
    "@context": "https://schema.org",
    "@type": "IceCreamShop",
    "@id": `${siteUrl}/#shop`,
    name: s.name,
    description: t(s.tagline, locale),
    url: `${siteUrl}/${locale}`,
    image: `${siteUrl}/${locale}/opengraph-image`,
    telephone: s.phone ?? undefined,
    priceRange: "€",
    servesCuisine: "Gelato",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Via Amsicora 2",
      postalCode: "07028",
      addressLocality: "Santa Teresa Gallura",
      addressRegion: "SS",
      addressCountry: "IT",
    },
    ...(s.lat != null && s.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng } } : {}),
    ...(s.maps_url ? { hasMap: s.maps_url } : {}),
    sameAs: Object.values(s.socials),
    openingHoursSpecification: data.hours
      .filter((h) => !h.is_closed)
      .map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: `https://schema.org/${DAY[h.weekday - 1]}`, opens: hhmm(h.open_time), closes: hhmm(h.close_time) })),
    specialOpeningHoursSpecification: data.specialDays.map((d) => ({
      "@type": "OpeningHoursSpecification",
      validFrom: d.date,
      validThrough: d.date,
      ...(d.is_closed ? { opens: "00:00", closes: "00:00" } : { opens: hhmm(d.open_time), closes: hhmm(d.close_time) }),
    })),
    ...(rating ? { aggregateRating: rating } : {}),
    ...(reviews.length ? { review: reviews } : {}),
    hasMenu: {
      "@type": "Menu",
      hasMenuSection: [
        {
          "@type": "MenuSection",
          name: t(s.texts.flavors_title, locale),
          hasMenuItem: data.flavors.filter((f) => f.is_available_today).map((f) => ({ "@type": "MenuItem", name: t(f.name, locale), description: t(f.description, locale) || undefined })),
        },
        {
          "@type": "MenuSection",
          name: t(s.texts.prices_title, locale),
          hasMenuItem: data.prices
            .filter((p) => p.is_active)
            .map((p) => ({
              "@type": "MenuItem",
              name: t(p.label, locale),
              ...(p.description ? { description: t(p.description, locale) } : {}),
              ...(p.price_eur > 0 ? { offers: { "@type": "Offer", price: p.price_eur.toFixed(2), priceCurrency: "EUR" } } : {}),
            })),
        },
      ],
    },
  };
}

/** JSON for a <script type="application/ld+json">, with "<" escaped so content can't close the tag. */
export const jsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, String.fromCharCode(92) + "u003c");
