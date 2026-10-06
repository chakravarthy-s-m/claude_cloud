import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Kicker } from "../../components/core";
import { useCanvas } from "../../components/fx";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { Code, CodeWindow, type Tok } from "./shared";
import { teapotCanvas } from "./raster";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    step2: c.r1.from,
    raster: wordAt(c.r1, "rasterization"),
    covers: wordAt(c.r1, "which pixels"),
    step3: c.r2.from,
    every: wordAt(c.r2, "every one of those pixels"),
    frag: wordAt(c.r2, "fragment shader"),
    light: wordAt(c.r2, "the light"),
    material: wordAt(c.r2, "the material"),
    texture: wordAt(c.r2, "the texture"),
    millions: c.r3.from,
    parallel: wordAt(c.r3, "all in parallel"),
    painters: wordAt(c.r3, "thousands of painters"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

// ------------------------------------------------------------------ one triangle on a pixel grid
const GW = 28;
const GH = 16;
const TRI: [number, number][] = [
  [3.4, 14.2],
  [25.2, 11.6],
  [12.7, 1.8],
];
const NORMALS: [number, number, number][] = [
  [-0.62, -0.25, 0.75],
  [0.7, -0.15, 0.7],
  [-0.05, 0.8, 0.6],
];
const UV: [number, number][] = [
  [0, 0],
  [1, 0],
  [0.5, 1],
];
const bary = (x: number, y: number) => {
  const [a, b, c] = TRI;
  const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const w0 = ((c[0] - b[0]) * (y - b[1]) - (c[1] - b[1]) * (x - b[0])) / area;
  const w1 = ((a[0] - c[0]) * (y - c[1]) - (a[1] - c[1]) * (x - c[0])) / area;
  return [w0, w1, 1 - w0 - w1];
};
// row-major scan order of the triangle's bounding box
const Y0 = Math.floor(Math.min(...TRI.map((p) => p[1])));
const Y1 = Math.ceil(Math.max(...TRI.map((p) => p[1])));

const shadeCell = (i: number, j: number, light: number, material: number, texture: number): [number, number, number] => {
  const [w0, w1, w2] = bary(i + 0.5, j + 0.5);
  let nx = w0 * NORMALS[0][0] + w1 * NORMALS[1][0] + w2 * NORMALS[2][0];
  let ny = w0 * NORMALS[0][1] + w1 * NORMALS[1][1] + w2 * NORMALS[2][1];
  let nz = w0 * NORMALS[0][2] + w1 * NORMALS[1][2] + w2 * NORMALS[2][2];
  const l = Math.hypot(nx, ny, nz) || 1;
  nx /= l;
  ny /= l;
  nz /= l;
  const L = [-0.45, 0.55, 0.7];
  const Ll = Math.hypot(L[0], L[1], L[2]);
  const d = Math.max(0, (nx * L[0] + ny * L[1] + nz * L[2]) / Ll);
  // half vector with view (0,0,1)
  const hx = L[0] / Ll;
  const hy = L[1] / Ll;
  const hz = L[2] / Ll + 1;
  const hl = Math.hypot(hx, hy, hz);
  const spec = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hl), 30);
  // base: flat cyan → lit grey → tinted material → textured
  const u = w0 * UV[0][0] + w1 * UV[1][0] + w2 * UV[2][0];
  const v = w0 * UV[0][1] + w1 * UV[1][1] + w2 * UV[2][1];
  const checker = (Math.floor(u * 7) + Math.floor(v * 7)) % 2 === 0 ? 1 : 0.55;
  const flat: [number, number, number] = [34, 211, 238];
  const lit = 40 + 215 * d;
  const tint: [number, number, number] = [mix(lit, 120 + 135 * d, material), mix(lit, 70 + 120 * d, material), mix(lit, 200 + 55 * d, material)];
  const sp = 255 * spec * material;
  const tex = mix(1, checker, texture);
  const shaded: [number, number, number] = [Math.min(255, tint[0] * tex + sp), Math.min(255, tint[1] * tex + sp), Math.min(255, tint[2] * tex + sp)];
  return [mix(flat[0], shaded[0], light), mix(flat[1], shaded[1], light), mix(flat[2], shaded[2], light)];
};

const GridTriangle: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const move = prog(f, b.step3 - 10, 30, EASE.inOut);
  const cell = mix(46, 38, move);
  const x0 = mix(960 - (GW * 46) / 2, 100, move);
  const y0 = mix(205, 250, move);
  const scanRow = mix(Y0 - 1, Y1 + 1, prog(f, b.covers - 8, 70, EASE.linear));
  const lightP = prog(f, b.light - 6, 18);
  const matP = prog(f, b.material - 6, 18);
  const texP = prog(f, b.texture - 6, 18);
  const ref = useCanvas(
    (ctx) => {
      const W = GW * cell;
      const H = GH * cell;
      ctx.clearRect(0, 0, W + 2, H + 2);
      for (let j = 0; j < GH; j++) {
        for (let i = 0; i < GW; i++) {
          const [w0, w1, w2] = bary(i + 0.5, j + 0.5);
          const inside = w0 >= 0 && w1 >= 0 && w2 >= 0;
          const tested = j + 0.5 < scanRow;
          const x = i * cell;
          const y = j * cell;
          if (inside && tested) {
            const [r, g, bl] = shadeCell(i, j, lightP, matP, texP);
            ctx.fillStyle = `rgba(${r | 0},${g | 0},${bl | 0},${lightP > 0 ? 1 : 0.42})`;
          } else {
            ctx.fillStyle = "rgba(160,175,255,0.06)";
          }
          ctx.beginPath();
          ctx.roundRect(x + 1.5, y + 1.5, cell - 3, cell - 3, 5);
          ctx.fill();
          // sample point at the pixel center
          const scanning = scanRow > Y0 - 0.5 && scanRow < Y1 + 0.5;
          const justTested = scanning && Math.abs(j + 0.5 - scanRow) < 0.9;
          const dotA = lightP > 0.5 ? 0.15 : 1;
          ctx.fillStyle = inside && tested ? `rgba(255,255,255,${0.9 * dotA})` : justTested ? "rgba(251,113,133,0.9)" : "rgba(160,175,255,0.35)";
          ctx.beginPath();
          ctx.arc(x + cell / 2, y + cell / 2, justTested ? 4 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // the scan line
      if (scanRow > Y0 - 1 && scanRow < Y1 + 1) {
        ctx.fillStyle = "rgba(143,243,255,0.25)";
        ctx.fillRect(0, scanRow * cell - 2, GW * cell, 4);
      }
      // the triangle's edges
      ctx.strokeStyle = "rgba(201,247,255,0.95)";
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.beginPath();
      TRI.forEach(([x, y], k) => (k ? ctx.lineTo(x * cell, y * cell) : ctx.moveTo(x * cell, y * cell)));
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = C.amber;
      TRI.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x * cell, y * cell, 8, 0, Math.PI * 2);
        ctx.fill();
      });
    },
    [cell, scanRow, lightP, matP, texP],
  );
  const covered = (() => {
    let n = 0;
    for (let j = 0; j < GH; j++)
      for (let i = 0; i < GW; i++) {
        const [w0, w1, w2] = bary(i + 0.5, j + 0.5);
        if (w0 >= 0 && w1 >= 0 && w2 >= 0 && j + 0.5 < scanRow) n++;
      }
    return n;
  })();
  const chips = [
    { t: "light", at: b.light, col: C.amber },
    { t: "material", at: b.material, col: C.pink },
    { t: "texture", at: b.texture, col: C.cyan },
  ];
  const inP = spr(f, fps, b.step2 - 4, { damping: 22, stiffness: 100 });
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.4) }}>
      <div style={{ position: "absolute", left: 110, top: 120, opacity: 1 - prog(f, b.step3 - 10, 12) }}>
        <Kicker color={C.cyan}>Step 2 · rasterization</Kicker>
      </div>
      <div style={{ position: "absolute", left: 110, top: 120, opacity: prog(f, b.step3 - 4, 12) }}>
        <Kicker color={C.pink}>Step 3 · fragment shader</Kicker>
      </div>
      <canvas ref={ref} width={Math.ceil(GW * cell) + 2} height={Math.ceil(GH * cell) + 2} style={{ position: "absolute", left: x0, top: y0 }} />
      <div style={{ position: "absolute", left: x0, top: y0 + GH * cell + 22, fontFamily: FONT.mono, fontSize: 26, color: C.ink2, opacity: prog(f, b.covers - 6, 12) * (1 - move) }}>
        pixel centers inside the triangle: <span style={{ color: C.ink, fontWeight: 700 }}>{covered}</span>
      </div>
      {/* fragment shader */}
      <div style={{ position: "absolute", left: 1160, top: 250, opacity: prog(f, b.frag - 6, 14), transform: `translateX(${(1 - prog(f, b.frag - 6, 18)) * 30}px)` }}>
        <CodeWindow title="Shaders.metal · runs once per pixel" color={C.pink} width={700}>
          <Code lines={FSHADER} at={b.frag - 2} cps={4} size={17.5} highlight={{ line: lightP > 0.5 && texP < 0.5 ? (matP > 0.5 ? 5 : 3) : texP > 0.5 ? 4 : -1, a: 1, color: C.amber }} />
        </CodeWindow>
        <div style={{ display: "flex", gap: 14, marginTop: 26 }}>
          {chips.map((ch) => {
            const on = prog(f, ch.at - 6, 12);
            return (
              <span key={ch.t} style={{ padding: "10px 22px", borderRadius: 999, fontFamily: FONT.ui, fontWeight: 700, fontSize: 26, color: on > 0.5 ? "#05060d" : C.ink3, background: on > 0.5 ? ch.col : "rgba(255,255,255,0.05)", border: `1px solid ${hexA(ch.col, 0.3 + 0.7 * on)}`, boxShadow: on > 0.5 ? `0 0 26px ${hexA(ch.col, 0.5)}` : undefined }}>
                {ch.t}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FSHADER: Tok[][] = [
  [["fragment", "k"], [" "], ["float4", "t"], [" "], ["fragmentShader", "f"], ["(VertexOut in [[", "p"], ["stage_in", "a"], ["]],"]],
  [["              "], ["texture2d", "t"], ["<"], ["float", "t"], ["> tex [[", "p"], ["texture", "a"], ["("], ["0", "n"], [")]]) {"]],
  [["  "], ["constexpr", "k"], [" "], ["sampler", "t"], [" smp("], ["filter", "t"], ["::linear);"]],
  [["  "], ["float", "t"], [" light = "], ["max", "f"], ["("], ["dot", "f"], ["(in.normal, kSun), "], ["0.0", "n"], [");"]],
  [["  "], ["float4", "t"], [" base  = tex."], ["sample", "f"], ["(smp, in.uv);"]],
  [["  "], ["return", "k"], [" base * kMaterial * light;"]],
  [["}"]],
];

// ------------------------------------------------------------------ the whole teapot, resolving
const LEVELS: [number, number][] = [
  [32, 18],
  [64, 36],
  [128, 72],
  [256, 144],
  [512, 288],
  [1024, 576],
];
const Resolve: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const step = 17;
  const t0 = b.millions - 4;
  const lv = Math.max(0, Math.min(LEVELS.length - 1, Math.floor((f - t0) / step)));
  const [w, h] = LEVELS[lv];
  const BW = 1440;
  const BH = 810;
  const ref = useCanvas(
    (ctx) => {
      ctx.clearRect(0, 0, BW, BH);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(teapotCanvas(w, h, { bg: [9, 12, 26, 255], dist: 6.3 }), 0, 0, BW, BH);
      if (lv < 3) {
        const cw = BW / w;
        ctx.strokeStyle = `rgba(0,0,0,${0.5 - lv * 0.15})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= w; i++) {
          ctx.moveTo(i * cw, 0);
          ctx.lineTo(i * cw, BH);
        }
        for (let j = 0; j <= h; j++) {
          ctx.moveTo(0, j * cw);
          ctx.lineTo(BW, j * cw);
        }
        ctx.stroke();
      }
    },
    [w, h, lv],
  );
  const pop = spr(f, fps, t0 + lv * step, { damping: 14, stiffness: 200 });
  const inP = spr(f, fps, b.millions - 10, { damping: 22, stiffness: 90 });
  const par = spr(f, fps, b.parallel - 4, { damping: 20, stiffness: 120 });
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 960 - BW / 2, top: 120, width: BW, height: BH, borderRadius: 18, overflow: "hidden", transform: `scale(${mix(0.9, 1, inP) * mix(0.985, 1, pop)})`, boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 80px ${hexA(C.cyan, 0.15)}`, border: "1px solid rgba(255,255,255,0.12)" }}>
        <canvas ref={ref} width={BW} height={BH} style={{ position: "absolute", inset: 0 }} />
      </div>
      <div style={{ position: "absolute", left: 960 - BW / 2 + 30, top: 150, fontFamily: FONT.mono, fontSize: 30, color: C.ink, padding: "8px 16px", borderRadius: 10, background: "rgba(5,7,16,0.8)", fontVariantNumeric: "tabular-nums" }}>
        {w} × {h} = <b>{(w * h).toLocaleString("en-US")}</b> pixels
      </div>
      {par > 0.01 && (
        <div style={{ position: "absolute", bottom: 70, width: "100%", textAlign: "center", opacity: clamp(par * 1.4), transform: `translateY(${(1 - par) * 20}px)` }}>
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 56, color: C.ink, letterSpacing: "-0.03em", textShadow: "0 4px 30px rgba(0,0,0,0.9)" }}>
            Every pixel shaded <span style={{ color: C.cyan }}>in parallel</span>
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const gA = 1 - prog(f, b.millions - 14, 14);
  const rA = prog(f, b.millions - 12, 14);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      {gA > 0.01 && <GridTriangle b={b} a={gA} />}
      {rA > 0.01 && <Resolve b={b} a={rA} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const rows: SfxEvent[] = [];
  for (let k = 0; k < Y1 - Y0 + 1; k++) rows.push({ at: b.covers - 8 + (k * 70) / (Y1 - Y0 + 2), name: "tick", vol: 0.22 });
  const levels: SfxEvent[] = LEVELS.map((_, i) => ({ at: b.millions - 4 + i * 17, name: i === LEVELS.length - 1 ? "shimmer" : "pop", vol: 0.25, rate: 1 + i * 0.08 }));
  return [
    { at: b.raster - 4, name: "scan", vol: 0.35 },
    ...rows,
    { at: b.step3 - 10, name: "whoosh_soft", vol: 0.3 },
    { at: b.frag - 6, name: "typing", vol: 0.25 },
    { at: b.light - 6, name: "chime_lo", vol: 0.25 },
    { at: b.material - 6, name: "pop_hi", vol: 0.3 },
    { at: b.texture - 6, name: "blip_hi", vol: 0.3 },
    { at: b.millions - 14, name: "whoosh", vol: 0.35 },
    ...levels,
    { at: b.parallel - 4, name: "swell", vol: 0.3 },
  ];
};

export const Raster: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.cyan, hueB: C.pink, hueC: C.violet, intensity: 0.6 },
};
