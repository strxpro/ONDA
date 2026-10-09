/**
 * Sound design for the presentation film: few, soft, rounded sounds that sit UNDER the music
 * ("Beyond Possible", mixed in by scripts/record-promo.mjs). Air swells on the morphs, small "bloops" for things
 * landing, near-silent ticks for typing, two-note chimes in a warm register. Peaks are kept low on purpose.
 *   node scripts/promo-audio.mjs [out.wav] [seconds]
 */
import { writeFileSync } from "node:fs";

const SR = 48000;
const LEN = Number(process.argv[3] ?? 29.2);
const N = Math.ceil(SR * LEN);
const L = new Float32Array(N);
const R = new Float32Array(N);
const sendL = new Float32Array(N);
const sendR = new Float32Array(N);

let seed = 3;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (p) => p * p * (3 - 2 * p);

function add(t0, dur, fn, { gain = 1, pan = 0, rev = 0 } = {}) {
  const i0 = Math.max(0, Math.floor(t0 * SR));
  const i1 = Math.min(N, Math.floor((t0 + dur) * SR));
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = i0; i < i1; i++) {
    const v = fn(i / SR - t0);
    L[i] += v * gl;
    R[i] += v * gr;
    if (rev) {
      sendL[i] += v * gl * rev;
      sendR[i] += v * gr * rev;
    }
  }
}

/** a soft air swell: heavily low-passed noise with a slow rise and fall, centered on `peak` */
function air(peak, dur = 0.9, gain = 0.08, pan = 0) {
  let a = 0, b = 0;
  add(peak - dur * 0.6, dur, (x) => {
    const p = x / dur;
    const shape = p < 0.6 ? smooth(p / 0.6) : smooth(1 - (p - 0.6) / 0.4);
    const fc = 0.01 + 0.06 * shape;
    const n = rand();
    a += fc * (n - a);
    b += fc * (a - b);
    return b * shape * 6;
  }, { gain, pan, rev: 0.35 });
}
/** round "bloop": a sine gliding down with a soft attack (things landing / popping in) */
const bloop = (t0, f = 420, g = 0.06, pan = 0) =>
  add(t0, 0.26, (x) => Math.sin(2 * Math.PI * (f * 0.62 + f * 0.38 * Math.exp(-x * 18)) * x) * Math.min(1, x / 0.006) * Math.exp(-x * 14), { gain: g, pan, rev: 0.2 });
/** soft click (a tap on glass) */
const click = (t0, g = 0.05) => add(t0, 0.06, (x) => Math.sin(2 * Math.PI * 1900 * x) * Math.min(1, x / 0.0015) * Math.exp(-x * 75), { gain: g });
/** near-silent typing tick */
const tick = (t0, g = 0.022) => add(t0, 0.03, (x) => Math.sin(2 * Math.PI * (2600 + rand() * 300) * x) * Math.exp(-x * 160), { gain: g, pan: rand() * 0.4 });
/** warm two/three-note chime */
const chime = (t0, notes = [784, 1046.5], g = 0.05) =>
  notes.forEach((f, i) =>
    add(t0 + i * 0.07, 1.6, (x) => (Math.sin(2 * Math.PI * f * x) + 0.18 * Math.sin(2 * Math.PI * f * 2 * x)) * Math.min(1, x / 0.004) * Math.exp(-x * 2.6), { gain: g, pan: -0.25 + i * 0.25, rev: 0.6 }),
  );
/** low swell under the portal (the pink scoop opening / closing) */
const deep = (t0, dur = 1.0, g = 0.12) =>
  add(t0, dur, (x) => {
    const p = x / dur;
    return Math.sin(2 * Math.PI * 58 * x) * Math.sin(Math.PI * p) ** 2;
  }, { gain: g, rev: 0.2 });

/** a tiny glassy "plink" (stars, counters) */
const plink = (t0, f, g = 0.03, pan = 0) =>
  add(t0, 0.5, (x) => (Math.sin(2 * Math.PI * f * x) + 0.3 * Math.sin(2 * Math.PI * f * 3 * x) * Math.exp(-x * 30)) * Math.min(1, x / 0.002) * Math.exp(-x * 9), { gain: g, pan, rev: 0.45 });
const swish = (t, g = 0.03, pan = 0) => air(t, 0.45, g, pan);

/* ── cue sheet (seconds = song time) ── */
// the real cone builds itself
bloop(0.14, 300, 0.05);
bloop(1.16, 330, 0.07, -0.1);
bloop(1.9, 390, 0.065, 0.1);
bloop(2.64, 450, 0.06);
chime(2.95, [1568], 0.018);
air(4.2, 0.9, 0.06); // the dive into the scoop
deep(4.35, 1.0, 0.1);
air(5.2, 0.9, 0.05); // the screen springs into its phone
// for the customers
air(6.55, 0.9, 0.05);
[5.95, 7.02, 7.39, 7.76, 8.13].forEach((t, i) => swish(t + 0.35, 0.022, i % 2 ? 0.3 : -0.3));
air(10.1, 1.0, 0.05);
// NFC tap → the review card
air(10.75, 0.6, 0.04);
click(11.15, 0.06);
chime(11.17, [1318.5, 1760], 0.03);
bloop(11.28, 720, 0.03, 0.2);
air(11.85, 0.8, 0.045);
[880, 987.8, 1174.7, 1318.5, 1568].forEach((f, i) => plink([12.21, 12.33, 12.46, 12.59, 12.71][i], f, 0.03, -0.4 + i * 0.2));
swish(13.15, 0.03);
click(13.6, 0.05);
chime(13.66, [1046.5, 1318.5], 0.025);
swish(14.1, 0.03);
plink(14.14, 1174.7, 0.02, 0.3);
plink(14.2, 987.8, 0.02, 0.15);
deep(14.25, 0.8, 0.07);
bloop(14.62, 420, 0.035);
for (let t = 14.7; t < 15.5; t += 0.06) tick(t, 0.016);
click(15.45, 0.05);
chime(15.58, [784, 1046.5], 0.03);
// the owner's panel
air(16.0, 1.0, 0.05);
click(16.8, 0.06);
chime(16.86, [880, 1174.7], 0.03);
air(17.2, 0.8, 0.04);
// by voice
air(18.3, 1.0, 0.05);
bloop(18.3, 520, 0.035);
const words = (t0, n, per) => Array.from({ length: n }, (_, k) => tick(t0 + k * per, 0.02));
words(18.47, 9, 0.11);
bloop(19.34, 600, 0.035, -0.3);
[19.5, 19.65, 19.8, 19.95].forEach((t, i) => plink(t, 1568 + i * 100, 0.012, -0.3));
swish(19.95, 0.03);
words(20.02, 8, 0.1);
air(20.6, 0.8, 0.035);
bloop(20.8, 600, 0.035, -0.3);
click(21.11, 0.055);
plink(21.22, 1318.5, 0.03, 0.3);
chime(21.3, [1046.5, 1318.5], 0.025);
swish(21.58, 0.03);
words(21.62, 6, 0.1);
bloop(21.97, 600, 0.035, -0.3);
click(22.24, 0.06);
chime(22.3, [1046.5, 1318.5, 1568], 0.035);
bloop(22.62, 330, 0.07, 0.3); // Mirto lands
air(23.3, 1.0, 0.05);
// outro: the world closes back into the cone, the cherry on top
deep(24.0, 1.1, 0.1);
air(24.45, 0.9, 0.06);
bloop(26.46, 760, 0.05);
chime(26.5, [1568, 2093], 0.025);

/* reverb on the send */
function reverb(src, out, offset) {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ buf: new Float32Array(d + offset), i: 0, lp: 0 }));
  const aps = [605, 480].map((d) => ({ buf: new Float32Array(d + offset), i: 0 }));
  for (let n = 0; n < N; n++) {
    let acc = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * 0.55 + c.lp * 0.45;
      c.buf[c.i] = src[n] + c.lp * 0.82;
      c.i = (c.i + 1) % c.buf.length;
      acc += y;
    }
    for (const a of aps) {
      const y = a.buf[a.i];
      const v = -acc + y;
      a.buf[a.i] = acc + y * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      acc = v;
    }
    out[n] += acc * 0.07;
  }
}
reverb(sendL, L, 0);
reverb(sendR, R, 23);

// no normalization up: keep it quiet; just guard against clipping
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = peak > 0.5 ? 0.5 / peak : 1;
const out = process.argv[2] ?? ".cache-raw/sfx.wav";
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + N * 4, 4);
buf.write("WAVEfmt ", 8);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round(clamp(L[i] * norm, -1, 1) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(clamp(R[i] * norm, -1, 1) * 32767), 46 + i * 4);
}
writeFileSync(out, buf);
console.log("sfx →", out, `(peak ${(20 * Math.log10(peak * norm + 1e-9)).toFixed(1)} dBFS)`);
