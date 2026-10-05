import React, { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT, hexA } from "../theme";
import { EASE, clamp, mix, prog, rnd } from "../lib/anim";

/** Pre-rendered radial sprite for fast additive glows on canvas. */
const spriteCache = new Map<string, HTMLCanvasElement>();
export const glowSprite = (color: string, size = 64) => {
  const key = `${color}-${size}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.18, color);
  grd.addColorStop(0.45, hexA(color, 0.25));
  grd.addColorStop(1, hexA(color, 0));
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  spriteCache.set(key, c);
  return c;
};

export const useCanvas = (draw: (ctx: CanvasRenderingContext2D, f: number) => void, deps: unknown[] = []) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const f = useCurrentFrame();
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    draw(ctx, f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, ...deps]);
  return ref;
};

/** A city-at-night field of flickering transistors, seen from above. */
export const TransistorField: React.FC<{ start: number; zoom?: [number, number]; dur?: number; color?: string }> = ({
  start,
  zoom = [1, 2.2],
  dur = 120,
  color = C.cyan,
}) => {
  const cols = 150;
  const rows = 84;
  const ref = useCanvas((ctx, f) => {
    const p = prog(f, start, dur, EASE.inOut);
    const z = mix(zoom[0], zoom[1], p);
    ctx.translate(960, 540);
    ctx.scale(z, z);
    ctx.rotate(-0.08 + p * 0.06);
    ctx.translate(-960, -540);
    const cw = 1920 / cols;
    const ch = 1080 / rows;
    ctx.globalCompositeOperation = "lighter";
    const spr = glowSprite(color, 32);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const seed = y * cols + x;
        const r = rnd(seed);
        // blocks of logic vs SRAM arrays give the die some structure
        const block = Math.floor(x / 15) + Math.floor(y / 12) * 13;
        const dens = 0.35 + 0.6 * rnd(`b${block}`);
        if (r > dens) continue;
        const on = Math.sin(f * (0.25 + rnd(`s${seed}`) * 0.9) + seed) > 0.55 - p * 0.3;
        const a = on ? 0.95 : 0.13;
        ctx.globalAlpha = a;
        ctx.fillStyle = on ? "#c8f6ff" : hexA(color, 0.6);
        ctx.fillRect(x * cw + 1.2, y * ch + 1.2, cw - 2.4, ch - 2.4);
        if (on && r < dens * 0.18) {
          ctx.globalAlpha = 0.5;
          ctx.drawImage(spr, x * cw - 10, y * ch - 10, cw + 20, ch + 20);
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  });
  return <canvas ref={ref} width={1920} height={1080} style={{ position: "absolute", inset: 0 }} />;
};

/** Amber electrons streaming through a glowing channel. */
export const ElectronStream: React.FC<{ start: number; count?: number; y?: number; height?: number; speed?: number; color?: string; opacity?: number }> = ({
  start,
  count = 520,
  y = 540,
  height = 220,
  speed = 14,
  color = C.amber,
  opacity = 1,
}) => {
  const ref = useCanvas((ctx, f) => {
    const t = f - start;
    const spr = glowSprite(color, 48);
    // channel
    const grd = ctx.createLinearGradient(0, y - height / 2, 0, y + height / 2);
    grd.addColorStop(0, hexA(color, 0));
    grd.addColorStop(0.5, hexA(color, 0.10 * opacity));
    grd.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = grd;
    ctx.fillRect(0, y - height / 2, 1920, height);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < count; i++) {
      const v = speed * rnd(`ev${i}`, 0.6, 1.4);
      const x0 = rnd(`ex${i}`, -200, 2120);
      const x = ((x0 + t * v) % 2320) - 200;
      const yy = y + (rnd(`ey${i}`) - 0.5) * height * 0.8 * Math.sqrt(rnd(`eyy${i}`)) + Math.sin(t * 0.1 + i) * 4;
      const s = rnd(`es${i}`, 10, 28);
      ctx.globalAlpha = opacity * rnd(`ea${i}`, 0.4, 1);
      ctx.drawImage(spr, x - s / 2, yy - s / 2, s, s);
      // motion streak
      ctx.globalAlpha = opacity * 0.18;
      ctx.drawImage(spr, x - s / 2 - v * 1.4, yy - s / 4, s + v * 1.4, s / 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  });
  return <canvas ref={ref} width={1920} height={1080} style={{ position: "absolute", inset: 0 }} />;
};

/** Glass planes flying past the camera — the software stack, at speed. */
export const LayerFlythrough: React.FC<{ start: number; layers: { label: string; sub: string; color: string }[]; spacing?: number; speed?: number }> = ({
  start,
  layers,
  spacing = 26,
  speed = 1,
}) => {
  const f = useCurrentFrame();
  const t = (f - start) * speed;
  return (
    <AbsoluteFill style={{ perspective: 1100, perspectiveOrigin: "50% 45%" }}>
      {layers.map((L, i) => {
        const z = -3000 + (t - i * spacing) * 95;
        const vis = clamp((z + 3000) / 700) * (1 - clamp((z - 350) / 450));
        if (vis <= 0) return null;
        const textA = clamp((z + 1500) / 700);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 960 - 620,
              top: 540 - 360,
              width: 1240,
              height: 720,
              borderRadius: 40,
              transform: `translateZ(${z}px) rotateX(${8 + i * 2}deg) rotateZ(${(i % 2 ? -1 : 1) * 3}deg)`,
              background: `linear-gradient(150deg, ${hexA(L.color, 0.22)}, ${hexA(L.color, 0.04)} 60%, ${hexA("#ffffff", 0.05)})`,
              border: `2px solid ${hexA(L.color, 0.75)}`,
              boxShadow: `0 0 80px ${hexA(L.color, 0.35)}, inset 0 0 60px ${hexA(L.color, 0.15)}`,
              opacity: vis,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 120, letterSpacing: "-0.03em", color: C.ink, textShadow: `0 0 40px ${L.color}`, opacity: textA }}>{L.label}</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 30, color: hexA(L.color, 0.95), marginTop: 12, letterSpacing: "0.08em", opacity: textA }}>{L.sub}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Big HUD-style numeric readout. */
export const Readout: React.FC<{ value: string; label: string; color?: string; style?: React.CSSProperties }> = ({ value, label, color = C.cyan, style }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
    <div style={{ fontFamily: FONT.ui, fontSize: 18, letterSpacing: "0.35em", fontWeight: 600, color: hexA(color, 0.85) }}>{label}</div>
    <div style={{ fontFamily: FONT.mono, fontSize: 64, fontWeight: 600, color: C.ink, textShadow: `0 0 30px ${hexA(color, 0.6)}`, fontVariantNumeric: "tabular-nums" }}>{value}</div>
  </div>
);

export const useStableRandom = (n: number, seed: string) => useMemo(() => new Array(n).fill(0).map((_, i) => rnd(`${seed}${i}`)), [n, seed]);
