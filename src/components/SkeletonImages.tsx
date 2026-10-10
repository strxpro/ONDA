"use client";

import { useEffect } from "react";

/**
 * Every picture that is still loading gets a pastel shimmer (CSS `img[data-sk]`) until it arrives — on the page,
 * in pop-ups, in comments fetched later. One observer for the whole site, no wrappers needed.
 */
export function SkeletonImages() {
  useEffect(() => {
    const mark = (img: HTMLImageElement) => {
      if (img.complete || img.dataset.sk !== undefined || img.closest("[data-no-sk]")) return;
      img.dataset.sk = "";
      const done = () => delete img.dataset.sk;
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    };
    document.querySelectorAll("img").forEach(mark);
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === "attributes" && m.target instanceof HTMLImageElement) mark(m.target);
        m.addedNodes.forEach((n) => {
          if (n instanceof HTMLImageElement) mark(n);
          else if (n instanceof HTMLElement) n.querySelectorAll("img").forEach(mark);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    return () => mo.disconnect();
  }, []);
  return null;
}
