"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type FrameSequenceHandle = {
  /** Show the frame at progress 0–1 (wraps when `loop`). */
  seek: (progress: number) => void;
  frames: number;
};

/**
 * Draws a pre-rendered frame sequence (WebP stills extracted from a video) on a canvas.
 * Frames load progressively: first every 4th (so scrubbing works almost immediately), then the rest.
 * The parent drives it with `seek(progress)` from scroll, pointer or time.
 */
export const FrameSequence = forwardRef<FrameSequenceHandle, { base: string; count: number; className?: string; loop?: boolean; fit?: "contain" | "cover"; onReady?: () => void; alt?: string }>(
  function FrameSequence({ base, count, className = "", loop = false, fit = "contain", onReady, alt }, ref) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const images = useRef<(HTMLImageElement | null)[]>([]);
    const current = useRef(0);
    const [ready, setReady] = useState(false);

    const src = (i: number) => `${base}/${String(i + 1).padStart(3, "0")}.webp`;

    const draw = (i: number) => {
      const c = canvas.current;
      if (!c) return;
      // nearest loaded frame (so scrubbing never shows a blank while loading)
      let img: HTMLImageElement | null = null;
      for (let d = 0; d < count && !img; d++) {
        const a = images.current[(i - d + count) % count];
        const b = images.current[(i + d) % count];
        img = a?.complete && a.naturalWidth ? a : b?.complete && b.naturalWidth ? b : null;
      }
      if (!img) return;
      if (c.width !== img.naturalWidth) {
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
      }
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
    };

    useImperativeHandle(ref, () => ({
      frames: count,
      seek: (p: number) => {
        const v = loop ? ((p % 1) + 1) % 1 : Math.min(1, Math.max(0, p));
        const i = Math.min(count - 1, Math.round(v * (count - 1)));
        if (i === current.current && ready) return;
        current.current = i;
        draw(i);
      },
    }));

    useEffect(() => {
      let cancelled = false;
      images.current = new Array(count).fill(null);
      const order = [...Array.from({ length: count }, (_, i) => i).filter((i) => i % 4 === 0), ...Array.from({ length: count }, (_, i) => i).filter((i) => i % 4 !== 0)];
      let loaded = 0;
      const load = (k: number) => {
        if (cancelled || k >= order.length) return;
        const i = order[k];
        const img = new Image();
        img.decoding = "async";
        img.src = src(i);
        img.onload = img.onerror = () => {
          if (cancelled) return;
          images.current[i] = img;
          loaded++;
          if (i === current.current || loaded === 1) draw(current.current);
          if (loaded === Math.ceil(count / 4) && !ready) {
            setReady(true);
            onReady?.();
          }
          load(k + 4); // 4 parallel lanes
        };
      };
      for (let lane = 0; lane < 4; lane++) load(lane);
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [base, count]);

    return <canvas ref={canvas} className={`block h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"} transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"} ${className}`} role="img" aria-label={alt} />;
  },
);
