/** Fuzzy name matching across languages: "pistacchio" ≈ "pistachio" ≈ "pistacja". */

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** 0–1 similarity between a query and one candidate name. */
export function similarity(query: string, candidate: string): number {
  const q = normalize(query);
  const c = normalize(candidate);
  if (!q || !c) return 0;
  if (q === c) return 1;
  if (c.includes(q) || q.includes(c)) return 0.9 * (Math.min(q.length, c.length) / Math.max(q.length, c.length)) + 0.08;
  // shared stem: "pistac…" matches pistacchio / pistachio / pistacja
  const stem = Math.min(5, q.length, c.length);
  const stemBonus = q.slice(0, stem) === c.slice(0, stem) ? 0.25 : 0;
  return Math.min(0.97, 1 - levenshtein(q, c) / Math.max(q.length, c.length) + stemBonus);
}

/** Rank items by their best-matching name. */
export function rank<T>(query: string, items: T[], names: (item: T) => string[]): { item: T; score: number }[] {
  return items
    .map((item) => ({ item, score: Math.max(0, ...names(item).filter(Boolean).map((n) => similarity(query, n))) }))
    .sort((a, b) => b.score - a.score);
}
