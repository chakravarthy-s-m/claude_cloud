// Shared building blocks for Episode 02 — "Painting with Light".
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { clamp, mix, prog, rnd, spr } from "../../lib/anim";
import { useCanvas } from "../../components/fx";

// ------------------------------------------------------------------ the picture
// A procedural "wallpaper" (sunset over mountains and a lake). It is the frame
// we follow through the whole episode: painted, rasterized, scanned out, lit.
export const WALL_W = 1920;
export const WALL_H = 1080;
export const SUN = { x: 1190, y: 585, r: 215 };
export const HORIZON = 655;

const ridge = (x: number, seed: number, base: number, amp: number) => {
  let y = base;
  y -= Math.sin(x * 0.0021 + seed) * amp * 0.55;
  y -= Math.sin(x * 0.0057 + seed * 2.3) * amp * 0.28;
  y -= Math.abs(Math.sin(x * 0.013 + seed * 4.1)) * amp * 0.22;
  y -= Math.sin(x * 0.041 + seed * 7.7) * amp * 0.05;
  return y;
};

const paintWallpaper = (g: CanvasRenderingContext2D, W = WALL_W, H = WALL_H) => {
  g.save();
  g.scale(W / WALL_W, H / WALL_H);
  // sky
  const sky = g.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, "#060a26");
  sky.addColorStop(0.3, "#16195a");
  sky.addColorStop(0.55, "#4b1f7e");
  sky.addColorStop(0.78, "#b23a8a");
  sky.addColorStop(0.93, "#f0706a");
  sky.addColorStop(1, "#ffab5e");
  g.fillStyle = sky;
  g.fillRect(0, 0, WALL_W, HORIZON + 2);
  // stars
  for (let i = 0; i < 260; i++) {
    const x = rnd(`wsx${i}`, 0, WALL_W);
    const y = Math.pow(rnd(`wsy${i}`), 1.7) * 420;
    const r = rnd(`wsr${i}`, 0.7, 2.1);
    g.fillStyle = `rgba(255,255,255,${rnd(`wsa${i}`, 0.25, 0.9) * (1 - y / 520)})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  // sun halo
  const halo = g.createRadialGradient(SUN.x, SUN.y, SUN.r * 0.6, SUN.x, SUN.y, SUN.r * 3.4);
  halo.addColorStop(0, "rgba(255,190,120,0.55)");
  halo.addColorStop(0.35, "rgba(255,110,140,0.22)");
  halo.addColorStop(1, "rgba(255,90,160,0)");
  g.fillStyle = halo;
  g.fillRect(0, 0, WALL_W, HORIZON);
  // sun disc
  const sun = g.createLinearGradient(0, SUN.y - SUN.r, 0, SUN.y + SUN.r);
  sun.addColorStop(0, "#fff4c2");
  sun.addColorStop(0.45, "#ffd36e");
  sun.addColorStop(0.8, "#ff8a5c");
  sun.addColorStop(1, "#ff5f7e");
  g.fillStyle = sun;
  g.beginPath();
  g.arc(SUN.x, SUN.y, SUN.r, 0, Math.PI * 2);
  g.fill();
  // mountains: far → near
  const ranges = [
    { seed: 1.3, base: 560, amp: 210, top: "#7a3a93", bot: "#3a2370", rim: 0.55 },
    { seed: 4.2, base: 615, amp: 150, top: "#3d2370", bot: "#231a52", rim: 0.3 },
    { seed: 8.9, base: 668, amp: 95, top: "#1c1342", bot: "#120d2e", rim: 0.12 },
  ];
  for (const r of ranges) {
    const grad = g.createLinearGradient(0, r.base - r.amp, 0, HORIZON + 20);
    grad.addColorStop(0, r.top);
    grad.addColorStop(1, r.bot);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, HORIZON + 30);
    for (let x = 0; x <= WALL_W; x += 6) g.lineTo(x, Math.min(HORIZON + 4, ridge(x, r.seed, r.base, r.amp)));
    g.lineTo(WALL_W, HORIZON + 30);
    g.closePath();
    g.fill();
    // rim light from the sun
    g.strokeStyle = `rgba(255,170,150,${r.rim})`;
    g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x <= WALL_W; x += 6) {
      const y = Math.min(HORIZON + 4, ridge(x, r.seed, r.base, r.amp));
      const near = Math.exp(-Math.abs(x - SUN.x) / 520);
      g.globalAlpha = near;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    g.globalAlpha = 1;
  }
  // lake
  const lake = g.createLinearGradient(0, HORIZON, 0, WALL_H);
  lake.addColorStop(0, "#3a1d5c");
  lake.addColorStop(0.25, "#1d1446");
  lake.addColorStop(1, "#060816");
  g.fillStyle = lake;
  g.fillRect(0, HORIZON, WALL_W, WALL_H - HORIZON);
  // sun reflection: shimmering streaks
  for (let k = 0; k < 46; k++) {
    const y = HORIZON + 8 + Math.pow(k / 46, 1.4) * 380;
    const w = (SUN.r * 1.5) * (1 - k / 60) * rnd(`rw${k}`, 0.55, 1.1);
    const x = SUN.x + rnd(`rx${k}`, -30, 30);
    const a = 0.85 * (1 - k / 50);
    const col = k < 10 ? `rgba(255,214,140,${a})` : k < 24 ? `rgba(255,140,120,${a * 0.9})` : `rgba(230,90,150,${a * 0.7})`;
    g.fillStyle = col;
    g.fillRect(x - w / 2, y, w, 2 + k * 0.12);
  }
  // near shore silhouette
  g.fillStyle = "#05050f";
  g.beginPath();
  g.moveTo(0, WALL_H);
  for (let x = 0; x <= 760; x += 8) g.lineTo(x, 880 + Math.pow(x / 760, 2.2) * 220 - Math.sin(x * 0.03) * 8 - Math.abs(Math.sin(x * 0.11)) * 10);
  g.lineTo(760, WALL_H);
  g.fill();
  // little pines on the shore
  for (let i = 0; i < 26; i++) {
    const x = rnd(`tx${i}`, 10, 560);
    const baseY = 880 + Math.pow(x / 760, 2.2) * 220 - 6;
    const h = rnd(`th${i}`, 40, 120) * (1 - x / 900);
    g.beginPath();
    g.moveTo(x, baseY - h);
    g.lineTo(x - h * 0.22, baseY);
    g.lineTo(x + h * 0.22, baseY);
    g.fill();
  }
  g.restore();
};

const cache = new Map<string, HTMLCanvasElement>();
/** The wallpaper at a given resolution (cached). */
export const wallpaper = (w = WALL_W, h = WALL_H) => {
  const key = `${w}x${h}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  if (w === WALL_W && h === WALL_H) {
    paintWallpaper(g);
  } else {
    // downsample the full-resolution master (area-averaged, like a real resize)
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(wallpaper(), 0, 0, w, h);
  }
  cache.set(key, c);
  return c;
};

const dataCache = new Map<string, Uint8ClampedArray>();
export const wallpaperData = (w = WALL_W, h = WALL_H) => {
  const key = `${w}x${h}`;
  const hit = dataCache.get(key);
  if (hit) return hit;
  const d = wallpaper(w, h).getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
  dataCache.set(key, d);
  return d;
};

/** RGB of one wallpaper pixel. */
export const pixelAt = (x: number, y: number, w = WALL_W, h = WALL_H): [number, number, number] => {
  const d = wallpaperData(w, h);
  const i = (Math.floor(clamp(y, 0, h - 1)) * w + Math.floor(clamp(x, 0, w - 1))) * 4;
  return [d[i], d[i + 1], d[i + 2]];
};

// ------------------------------------------------------------------ subpixel microscope
let subCanvas: HTMLCanvasElement | null = null;
let subImage: ImageData | null = null;
let bloomA: HTMLCanvasElement | null = null;
let bloomB: HTMLCanvasElement | null = null;

const intervalOverlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

/**
 * Renders the wallpaper as seen through a microscope: at low zoom it is just a
 * picture; zoom in and it resolves into pixels, then into glowing red, green
 * and blue subpixels separated by the black matrix.
 * Zoom = screen pixels per image pixel. (cx, cy) = image point at screen center.
 */
export const SubpixelView: React.FC<{
  cx: number;
  cy: number;
  zoom: number;
  bloom?: number;
  gain?: number;
  /** optional per-pixel override (e.g. dim everything but one pixel) */
  tint?: (i: number, j: number) => [number, number, number] | null;
  /** frame-dependent invalidation key */
  k?: string | number;
  /** image used for the pixels (defaults to the wallpaper) */
  source?: () => HTMLCanvasElement;
  sourceData?: () => Uint8ClampedArray;
  /** 0 = plain pixel blocks, 1 = subpixels; default follows the zoom */
  sub?: number;
  style?: React.CSSProperties;
}> = ({ cx, cy, zoom, bloom = 0.5, gain = 1.45, tint, k, source = () => wallpaper(), sourceData = () => wallpaperData(), sub, style }) => {
  const ref = useCanvas(
    (ctx) => {
      const Z = zoom;
      const img = source();
      const W = 1920;
      const H = 1080;
      const mixT = sub ?? clamp((Z - 7) / 6); // 0 = picture, 1 = subpixels
      if (mixT < 1) {
        ctx.imageSmoothingEnabled = Z < 2.2;
        ctx.imageSmoothingQuality = "high";
        const sw = W / Z;
        const sh = H / Z;
        ctx.drawImage(img, cx - sw / 2, cy - sh / 2, sw, sh, 0, 0, W, H);
        // pixel grid lines appear as pixels grow
        const gridA = clamp((Z - 3) / 4);
        if (gridA > 0.01) {
          ctx.strokeStyle = `rgba(0,0,0,${0.6 * gridA})`;
          ctx.lineWidth = Math.max(1, Math.min(6, Z * 0.07));
          ctx.beginPath();
          const x0 = Math.ceil(cx - sw / 2);
          for (let i = x0; i < cx + sw / 2; i++) {
            const x = (i - cx) * Z + W / 2;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
          }
          const y0 = Math.ceil(cy - sh / 2);
          for (let j = y0; j < cy + sh / 2; j++) {
            const y = (j - cy) * Z + H / 2;
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
          }
          ctx.stroke();
        }
      }
      if (mixT > 0) {
        if (!subCanvas) {
          subCanvas = document.createElement("canvas");
          subCanvas.width = W;
          subCanvas.height = H;
          subImage = subCanvas.getContext("2d")!.createImageData(W, H);
        }
        const data = sourceData();
        const IW = img.width;
        const IH = img.height;
        const out = subImage!.data;
        // per-column subpixel coverage (two image pixels max per screen pixel)
        const GX = 0.07;
        const bars = [
          [GX / 2, 1 / 3 - GX / 2],
          [1 / 3 + GX / 2, 2 / 3 - GX / 2],
          [2 / 3 + GX / 2, 1 - GX / 2],
        ];
        const colI = new Int32Array(W * 2);
        const colW = new Float32Array(W * 6);
        for (let x = 0; x < W; x++) {
          const u0 = cx + (x - W / 2) / Z;
          const u1 = u0 + 1 / Z;
          const i0 = Math.floor(u0);
          for (let n = 0; n < 2; n++) {
            const i = i0 + n;
            colI[x * 2 + n] = i;
            for (let c = 0; c < 3; c++) colW[x * 6 + n * 3 + c] = (intervalOverlap(u0, u1, i + bars[c][0], i + bars[c][1]) * Z);
          }
        }
        const GY = 0.08;
        const rowJ = new Int32Array(H * 2);
        const rowW = new Float32Array(H * 2);
        for (let y = 0; y < H; y++) {
          const v0 = cy + (y - H / 2) / Z;
          const v1 = v0 + 1 / Z;
          const j0 = Math.floor(v0);
          for (let n = 0; n < 2; n++) {
            const j = j0 + n;
            rowJ[y * 2 + n] = j;
            rowW[y * 2 + n] = intervalOverlap(v0, v1, j + GY / 2, j + 1 - GY / 2) * Z;
          }
        }
        // subpixels emit *linear* light: decode sRGB, then lift a little so the view still glows
        const lut = new Uint8ClampedArray(256);
        for (let v = 0; v < 256; v++) {
          const c = v / 255;
          const lin = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
          lut[v] = Math.min(255, Math.pow(lin, 0.8) * 255 * gain);
        }
        const tintCache = new Map<number, [number, number, number] | null>();
        for (let y = 0; y < H; y++) {
          let o = y * W * 4;
          for (let x = 0; x < W; x++, o += 4) {
            let r = 0;
            let gg = 0;
            let b = 0;
            for (let ny = 0; ny < 2; ny++) {
              const wy = rowW[y * 2 + ny];
              if (wy <= 0) continue;
              const j = rowJ[y * 2 + ny];
              if (j < 0 || j >= IH) continue;
              for (let nx = 0; nx < 2; nx++) {
                const i = colI[x * 2 + nx];
                if (i < 0 || i >= IW) continue;
                const base = x * 6 + nx * 3;
                const wr = colW[base];
                const wg = colW[base + 1];
                const wb = colW[base + 2];
                if (wr + wg + wb <= 0) continue;
                let pr: number;
                let pg: number;
                let pb: number;
                if (tint) {
                  const key = j * IW + i;
                  let t = tintCache.get(key);
                  if (t === undefined) {
                    t = tint(i, j);
                    tintCache.set(key, t);
                  }
                  if (t) {
                    pr = t[0];
                    pg = t[1];
                    pb = t[2];
                  } else {
                    const q = (j * IW + i) * 4;
                    pr = data[q];
                    pg = data[q + 1];
                    pb = data[q + 2];
                  }
                } else {
                  const q = (j * IW + i) * 4;
                  pr = data[q];
                  pg = data[q + 1];
                  pb = data[q + 2];
                }
                r += wy * wr * lut[pr | 0];
                gg += wy * wg * lut[pg | 0];
                b += wy * wb * lut[pb | 0];
              }
            }
            out[o] = r;
            out[o + 1] = gg;
            out[o + 2] = b;
            out[o + 3] = 255;
          }
        }
        subCanvas.getContext("2d")!.putImageData(subImage!, 0, 0);
        ctx.globalAlpha = mixT;
        ctx.drawImage(subCanvas, 0, 0);
        ctx.globalAlpha = 1;
        // bloom: area-downsample twice, add back blurred
        if (bloom > 0) {
          if (!bloomA) {
            bloomA = document.createElement("canvas");
            bloomA.width = 480;
            bloomA.height = 270;
            bloomB = document.createElement("canvas");
            bloomB.width = 120;
            bloomB.height = 68;
          }
          const a = bloomA.getContext("2d")!;
          const bb = bloomB!.getContext("2d")!;
          a.imageSmoothingQuality = "high";
          bb.imageSmoothingQuality = "high";
          a.clearRect(0, 0, 480, 270);
          a.drawImage(subCanvas, 0, 0, 480, 270);
          bb.clearRect(0, 0, 120, 68);
          bb.drawImage(bloomA, 0, 0, 120, 68);
          ctx.globalCompositeOperation = "lighter";
          ctx.imageSmoothingEnabled = true;
          ctx.globalAlpha = bloom * mixT;
          ctx.drawImage(bloomB!, 0, 0, W, H);
          ctx.globalAlpha = bloom * 0.6 * mixT;
          ctx.drawImage(bloomA, 0, 0, W, H);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        }
      }
    },
    [cx, cy, zoom, bloom, gain, k, sub],
  );
  return <canvas ref={ref} width={1920} height={1080} style={{ position: "absolute", inset: 0, ...style }} />;
};

// ------------------------------------------------------------------ text helpers
export const Big: React.FC<{ children: React.ReactNode; size?: number; color?: string; glow?: string; style?: React.CSSProperties }> = ({
  children,
  size = 84,
  color = C.ink,
  glow,
  style,
}) => (
  <div
    style={{
      fontFamily: FONT.display,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: "-0.035em",
      lineHeight: 1.02,
      color,
      textShadow: glow ? `0 0 40px ${hexA(glow, 0.6)}` : undefined,
      ...style,
    }}
  >
    {children}
  </div>
);

/** A number with a label, springing in. */
export const Stat: React.FC<{ at: number; value: React.ReactNode; label: string; color?: string; size?: number; style?: React.CSSProperties; align?: "left" | "center" | "right" }> = ({
  at,
  value,
  label,
  color = C.cyan,
  size = 110,
  style,
  align = "center",
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spr(f, fps, at, { damping: 20, stiffness: 120 });
  if (p <= 0.001) return null;
  return (
    <div style={{ textAlign: align, opacity: clamp(p * 1.4), transform: `translateY(${(1 - p) * 30}px) scale(${mix(0.94, 1, p)})`, ...style }}>
      <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: size, color: C.ink, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", textShadow: `0 0 50px ${hexA(color, 0.55)}` }}>
        {value}
      </div>
      <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 24, letterSpacing: "0.42em", color, marginTop: 4 }}>{label}</div>
    </div>
  );
};

// ------------------------------------------------------------------ code
export type Tok = [string, string?];
const TOKEN_COLORS: Record<string, string> = {
  k: C.pink, // keyword
  t: C.cyan, // type
  f: C.blue, // function
  n: C.amber, // number
  s: C.green, // string
  c: "#5d6b8f", // comment
  p: C.ink2, // punctuation / plain
  a: C.violet, // attribute
};

/** Monospace code block, typed in character by character from `at`. */
export const Code: React.FC<{ lines: Tok[][]; at: number; cps?: number; size?: number; lineHeight?: number; highlight?: { line: number; a: number; color?: string } }> = ({
  lines,
  at,
  cps = 2.2,
  size = 26,
  lineHeight = 1.6,
  highlight,
}) => {
  const f = useCurrentFrame();
  let budget = Math.max(0, (f - at) * cps);
  return (
    <div style={{ fontFamily: FONT.mono, fontSize: size, lineHeight, whiteSpace: "pre", position: "relative" }}>
      {lines.map((ln, li) => {
        const out: React.ReactNode[] = [];
        for (const [i, [txt, kind]] of ln.entries()) {
          const vis = Math.max(0, Math.min(txt.length, Math.floor(budget)));
          budget -= txt.length;
          if (vis > 0) out.push(<span key={i} style={{ color: TOKEN_COLORS[kind ?? "p"] }}>{txt.slice(0, vis)}</span>);
        }
        budget -= 6; // small pause at each line end
        const hl = highlight && highlight.line === li ? highlight.a : 0;
        return (
          <div key={li} style={{ position: "relative", minHeight: size * lineHeight }}>
            {hl > 0.01 && (
              <div style={{ position: "absolute", left: -14, right: -14, top: 0, bottom: 0, borderRadius: 8, background: hexA(highlight!.color ?? C.cyan, 0.14 * hl), border: `1px solid ${hexA(highlight!.color ?? C.cyan, 0.5 * hl)}` }} />
            )}
            <span style={{ position: "relative" }}>{out}</span>
          </div>
        );
      })}
    </div>
  );
};

/** Window chrome for a code card. */
export const CodeWindow: React.FC<{ title: string; color?: string; width: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ title, color = C.cyan, width, children, style }) => (
  <div
    style={{
      width,
      borderRadius: 20,
      overflow: "hidden",
      background: "linear-gradient(160deg, rgba(20,25,46,0.94), rgba(8,11,24,0.96))",
      border: `1px solid ${hexA(color, 0.35)}`,
      boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 50px ${hexA(color, 0.18)}`,
      ...style,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: `1px solid ${hexA(color, 0.18)}`, background: "rgba(255,255,255,0.03)" }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <span key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c, opacity: 0.85 }} />
      ))}
      <span style={{ marginLeft: 12, fontFamily: FONT.mono, fontSize: 18, color: hexA(color, 0.9), letterSpacing: "0.04em" }}>{title}</span>
    </div>
    <div style={{ padding: "22px 30px 26px" }}>{children}</div>
  </div>
);

// ------------------------------------------------------------------ misc
/** Fades in a block of content with a little rise. */
export const FadeUp: React.FC<{ at: number; out?: number; children: React.ReactNode; style?: React.CSSProperties; dist?: number }> = ({ at, out, children, style, dist = 26 }) => {
  const f = useCurrentFrame();
  const a = prog(f, at, 18) * (out !== undefined ? 1 - prog(f, out, 14) : 1);
  if (a <= 0.001) return null;
  return <div style={{ opacity: a, transform: `translateY(${(1 - prog(f, at, 22)) * dist}px)`, ...style }}>{children}</div>;
};

/** Pure RGB colors for subpixels. */
export const RGB = { r: "#ff3b4e", g: "#3dff7a", b: "#3d7bff" } as const;
