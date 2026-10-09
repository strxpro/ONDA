"use client";

/**
 * Sounds for the site, synthesized live with Web Audio — no files to download, nothing to license.
 * Everything is OFF until the visitor switches it on (the speaker button in the nav); the choice is remembered.
 *   sfx.pop()    flavor tapped / scoop added
 *   sfx.plop()   scoop lands
 *   sfx.click()  any button
 *   sfx.whoosh() card / wave
 *   sfx.sparkle() something nice happened
 * music.start() / music.stop(): a soft music-box loop.
 */
type Listener = (on: boolean) => void;

const KEY = "onda:sound";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;
const listeners = new Set<Listener>();

try {
  if (typeof window !== "undefined") enabled = localStorage.getItem(KEY) === "1";
} catch {}

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export const soundOn = () => enabled;
export function onSound(fn: Listener) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
export function setSound(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {}
  if (on) {
    audio();
    music.start();
    sfx.sparkle();
  } else music.stop();
  listeners.forEach((l) => l(on));
}

/** A short tone with a pitch glide and a quick envelope. */
function tone(freq: number, to: number, dur: number, type: OscillatorType = "sine", vol = 0.35, delay = 0) {
  const a = audio();
  if (!a || !master || !enabled) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, from: number, to: number, vol = 0.2) {
  const a = audio();
  if (!a || !master || !enabled) return;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(from, a.currentTime);
  f.frequency.exponentialRampToValueAtTime(to, a.currentTime + dur);
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start();
}

export const sfx = {
  pop: () => tone(420 + Math.random() * 120, 1100, 0.12, "sine", 0.4),
  plop: () => (tone(320, 90, 0.22, "sine", 0.45), noise(0.08, 900, 300, 0.12)),
  click: () => tone(900, 600, 0.05, "triangle", 0.18),
  whoosh: () => noise(0.45, 300, 2400, 0.16),
  sparkle: () => [1319, 1568, 2093].forEach((f, i) => tone(f, f * 1.01, 0.25, "triangle", 0.12, i * 0.07)),
};

/* ─── music box ─────────────────────────────────────────────────────────── */
// A gentle, looping tune in C major pentatonic (frequencies in Hz; 0 = rest). 8th notes at ~100 bpm.
const MELODY = [523, 659, 784, 659, 880, 784, 659, 0, 587, 698, 880, 698, 784, 659, 523, 0, 523, 659, 784, 1047, 880, 784, 659, 587, 523, 587, 659, 523, 392, 0, 523, 0];
const BASS = [131, 0, 196, 0, 147, 0, 196, 0, 175, 0, 220, 0, 131, 0, 196, 0];
let timer: number | null = null;
let step = 0;

function bell(freq: number, t: number, vol: number) {
  const a = ctx!;
  const o = a.createOscillator();
  const o2 = a.createOscillator();
  const g = a.createGain();
  o.type = "sine";
  o2.type = "sine";
  o.frequency.value = freq;
  o2.frequency.value = freq * 2.01; // the bright "tine" partial of a music box
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  o.connect(g);
  o2.connect(g);
  g.connect(master!);
  o.start(t);
  o2.start(t);
  o.stop(t + 1.2);
  o2.stop(t + 1.2);
}

export const music = {
  start() {
    const a = audio();
    if (!a || timer !== null || !enabled) return;
    const beat = 0.3;
    let next = a.currentTime + 0.1;
    // schedule a little ahead of time so the tune never stutters
    timer = window.setInterval(() => {
      while (next < a.currentTime + 0.4) {
        const m = MELODY[step % MELODY.length];
        if (m) bell(m, next, 0.07);
        if (step % 2 === 0) {
          const b = BASS[(step / 2) % BASS.length];
          if (b) bell(b, next, 0.05);
        }
        step++;
        next += beat;
      }
    }, 100);
  },
  stop() {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  },
};
