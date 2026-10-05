import { Easing, interpolate, random, spring } from "remotion";

export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  outBack: Easing.bezier(0.34, 1.56, 0.64, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  outQuad: Easing.bezier(0.5, 1, 0.89, 1),
  linear: (t: number) => t,
};

/** 0→1 progress of `frame` over [start, start+dur]. */
export const prog = (frame: number, start: number, dur: number, easing: (t: number) => number = EASE.out) =>
  dur <= 0
    ? frame >= start ? 1 : 0
    : interpolate(frame, [start, start + dur], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing,
      });

/** Fade in at `a` over `ain`, fade out at `b` over `bout`. */
export const inOut = (frame: number, a: number, ain: number, b: number, bout: number) =>
  prog(frame, a, ain) * (1 - prog(frame, b, bout, EASE.in));

export const spr = (
  frame: number,
  fps: number,
  start: number,
  cfg: Partial<{ damping: number; stiffness: number; mass: number }> = {},
) =>
  spring({
    frame: frame - start,
    fps,
    config: { damping: 16, stiffness: 120, mass: 0.9, ...cfg },
  });

/** Deterministic random in [a, b). */
export const rnd = (seed: string | number, a = 0, b = 1) => a + random(seed) * (b - a);

/** Smooth wobble (sum of sines) for organic drift. */
export const wob = (t: number, seed = 0) =>
  Math.sin(t * 0.9 + seed * 1.7) * 0.6 + Math.sin(t * 0.37 + seed * 3.1) * 0.4;

/** Keyframe interpolation: keys = [[frame, value], ...] with easing between keys. */
export const keyframes = (frame: number, keys: [number, number][], easing = EASE.inOut) => {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, v0] = keys[i];
    const [f1, v1] = keys[i + 1];
    if (frame <= f1) return mix(v0, v1, easing(clamp((frame - f0) / Math.max(1, f1 - f0))));
  }
  return keys[keys.length - 1][1];
};

export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
