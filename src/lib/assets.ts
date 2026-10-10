/** Pictures made for Onda that live in /public (shared by the sections and the preloader, which loads them ahead). */
export const TUB_SLUGS = new Set(["yellow-submarine", "cioccolato", "stracciatella", "banana-bread", "pistacchio", "fragola", "limone", "mango", "nocciola", "fior-di-latte", "caffe", "cocco", "mirtillo", "menta", "anguria", "pesca", "tiramisu", "caramello-salato", "lampone", "vaniglia", "wschod-s-onca"]);
export const tubPhoto = (slug: string) => (TUB_SLUGS.has(slug) ? `/img/tubs/${slug}.webp` : null);
/** Gelato cakes in Onda's style (generated for the shop) until its own photos are uploaded. */
export const CAKE_PHOTOS = [1, 2, 3, 4].map((n) => `/img/cake/torta-${n}.webp`);
export const CAKE_SPRITES = ["strawberries", "berries", "chocolate", "wafers", "macarons", "rosette", "stand"].map((n) => `/img/cake/${n}.webp`);
