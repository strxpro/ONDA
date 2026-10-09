/**
 * Real photos for the ingredients written in a flavor's "ingredients" text (any of the 6 languages).
 * PLACEHOLDER photos (Unsplash, free licence) — swap for the lab's own shots when available.
 */
const U = (id: string, w = 240) => `https://images.unsplash.com/photo-${id}?w=${w}&h=${w}&q=70&auto=format&fit=crop`;

const PHOTOS: [RegExp, string][] = [
  [/pistac|pistaz|pistach/i, "1704079662049-d00890d21a69"],
  [/zaffer|szafran|saffron|azafr|safran/i, "1643471672168-f4a4b6cfa440"],
  [/ricott/i, "1632200729570-1043effd1b77"],
  [/cacao|kakao|cocoa/i, "1770123366817-743776f66d6a"],
  [/cioccol|czekol|chocol|schokol/i, "1772986258634-a729cd51aea4"],
  [/panna|śmiet|smiet|cream|nata|sahne|crème|creme/i, "1786695144564-d1cd05367032"],
  [/latte|mlek|mleko|milk|leche|milch|lait/i, "1550583724-b2692b85b150"],
  [/banan|plátano|platano/i, "1528825871115-3581a5387919"],
  [/fragol|truskaw|strawberr|fresa|erdbeer|fraise/i, "1587393855524-087f83d95bc9"],
  [/limon|limón|cytryn|lemon|zitron|citron/i, "1590502593747-42a996133562"],
  [/mango|mangue/i, "1635716279493-d1e30afc25a0"],
  [/nocciol|laskow|hazelnut|avellan|haselnuss|noisette/i, "1635843130314-c0b5cc832b79"],
  [/caff|kawa|coffee|café|cafe|kaffee/i, "1447933601403-0c6688de566e"],
  [/cocco|kokos|coconut|coco/i, "1560769680-ba2f3767c785"],
  [/mirtill|borówk|borowk|blueberr|arándan|arandan|heidelbeer|myrtill/i, "1594002348772-bc0cb57ade8b"],
  [/menta|mięt|miet|mint|minze|menthe/i, "1603653856395-084002e5d39d"],
  [/anguria|arbuz|watermelon|sandía|sandia|wassermelone|pastèque|pasteque/i, "1563114773-84221bd62daa"],
  [/pesca|brzoskwin|peach|melocot|pfirsich|pêche|peche/i, "1639588473831-dd9d014646ae"],
  [/mascarpone/i, "1763585055859-a1fffe9cb8f0"],
  [/caramel|karmel/i, "1729673520849-263dbc8e0fc3"],
  [/lampon|malin|raspberr|frambues|himbeer|framboise/i, "1577069861033-55d04cec4ef5"],
  [/vanigl|wanili|vanill|vainill/i, "1682482198446-4cbf92f85a4b"],
  [/dolce|ciast|cake|bizcoch|kuchen|gâteau|gateau/i, "1767065887793-f68f736ea9d6"],
];

export function ingredientPhoto(name: string, size = 240): string | null {
  const hit = PHOTOS.find(([re]) => re.test(name));
  return hit ? U(hit[1], size) : null;
}

export const unsplash = U;
