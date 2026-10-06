import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { cam, prepareFaces, type Face, type V3 } from "../../lib/proj3d";
import { Kicker } from "../../components/core";
import { useCanvas } from "../../components/fx";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { RGB, wallpaper, wallpaperData } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    numbers: wordAt(c.f1, "three numbers"),
    red: wordAt(c.f1, "the red"),
    green: wordAt(c.f1, "the green"),
    blue: wordAt(c.f1, "the blue"),
    bits: wordAt(c.f2, "eight bits"),
    levels: wordAt(c.f2, "two hundred and fifty-six levels"),
    multiply: wordAt(c.f2, "Multiply"),
    sixteen: wordAt(c.f2, "sixteen million"),
    best: c.f3.from,
    ten: wordAt(c.f3, "ten bits"),
    billion: wordAt(c.f3, "over a billion"),
    fb: c.f4.from,
    fbWord: wordAt(c.f4, "frame buffer"),
    four: wordAt(c.f4, "four bytes"),
    mb: wordAt(c.f4, "twenty-four megabytes"),
    rate: c.f5.from,
    gb: wordAt(c.f5, "three gigabytes"),
    who: c.f6.from,
    fast: wordAt(c.f6, "that fast"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

const PIX: [number, number, number] = [255, 154, 94];
const CH = [
  { k: "R", col: RGB.r, v: PIX[0] },
  { k: "G", col: RGB.g, v: PIX[1] },
  { k: "B", col: RGB.b, v: PIX[2] },
];
const bin = (v: number, n: number) => v.toString(2).padStart(n, "0");

// ------------------------------------------------------------------ numbers, bits, levels
const Numbers: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tenP = prog(f, b.ten - 6, 24, EASE.inOut);
  const nBits = tenP > 0.5 ? 10 : 8;
  const slide = prog(f, b.multiply - 8, 30, EASE.inOut); // rows slide left to make room for the cube
  const pixIn = spr(f, fps, 6, { damping: 22, stiffness: 100 });
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 120 }}>
        <Kicker color={C.pink} at={4}>
          To the computer
        </Kicker>
      </div>
      {/* the pixel */}
      <div style={{ position: "absolute", left: mix(250, 120, slide), top: 330, display: "flex", gap: 8, padding: 14, borderRadius: 16, background: "#05060b", border: "1px solid rgba(255,255,255,0.1)", opacity: clamp(pixIn * 1.4) * (1 - slide), transform: `scale(${mix(0.8, 1, pixIn)})` }}>
        {CH.map((c) => (
          <div key={c.k} style={{ width: 46, height: 150, borderRadius: 6, background: hexA(c.col, 0.15 + 0.85 * (c.v / 255)), boxShadow: `0 0 30px ${hexA(c.col, 0.5 * (c.v / 255))}` }} />
        ))}
      </div>
      {CH.map((c, i) => {
        const at = [b.red, b.green, b.blue][i];
        const p = spr(f, fps, at - 6, { damping: 20, stiffness: 120 });
        const bitsP = prog(f, b.bits - 6 + i * 4, 16);
        const y = 300 + i * 150;
        const x0 = mix(520, 140, slide);
        const levelsA = prog(f, b.levels - 4 + i * 5, 16);
        return (
          <div key={c.k} style={{ position: "absolute", left: x0, top: y, opacity: clamp(p * 1.4), transform: `translateX(${(1 - p) * -40}px)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
              <div style={{ width: 60, fontFamily: FONT.display, fontWeight: 700, fontSize: 52, color: c.col }}>{c.k}</div>
              <div style={{ width: 170, fontFamily: FONT.mono, fontWeight: 700, fontSize: 64, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{tenP > 0.5 ? Math.round((c.v * 1023) / 255) : c.v}</div>
              {/* bits */}
              <div style={{ display: "flex", gap: 6, opacity: bitsP }}>
                {bin(tenP > 0.5 ? Math.round((c.v * 1023) / 255) : c.v, nBits)
                  .split("")
                  .map((d, k) => {
                    const isNew = nBits === 10 && k < 2;
                    const pop = isNew ? spr(f, fps, b.ten - 6 + k * 3, { damping: 14, stiffness: 160 }) : 1;
                    return (
                      <div
                        key={k}
                        style={{
                          width: 40,
                          height: 54,
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: FONT.mono,
                          fontWeight: 700,
                          fontSize: 30,
                          color: d === "1" ? "#05060b" : hexA(c.col, 0.9),
                          background: d === "1" ? c.col : hexA(c.col, 0.08),
                          border: `1px solid ${hexA(c.col, 0.5)}`,
                          boxShadow: d === "1" ? `0 0 18px ${hexA(c.col, 0.6)}` : undefined,
                          transform: `scale(${pop})`,
                        }}
                      >
                        {d}
                      </div>
                    );
                  })}
              </div>
            </div>
            {/* the ramp of levels */}
            <div style={{ marginTop: 14, marginLeft: 88, opacity: levelsA * (1 - slide * 0.0) }}>
              <Ramp col={c.col} steps={tenP > 0.5 ? 1024 : 256} w={mix(600, 470, slide)} />
            </div>
          </div>
        );
      })}
      {/* level count captions */}
      {prog(f, b.levels - 4, 16) > 0.01 && (
        <div style={{ position: "absolute", left: mix(608, 228, slide), top: 760, fontFamily: FONT.mono, fontSize: 26, color: C.ink2, opacity: prog(f, b.levels + 6, 16) }}>
          {tenP > 0.5 ? "1,024 levels each (10 bits)" : "256 levels each (8 bits)"}
        </div>
      )}
    </AbsoluteFill>
  );
};

const Ramp: React.FC<{ col: string; steps: number; w: number }> = ({ col, steps, w }) => {
  const H = 26;
  const ref = useCanvas(
    (ctx) => {
      const n = parseInt(col.replace("#", ""), 16);
      const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      // show the banding honestly: a coarse ramp at 8 bits is visibly stepped when magnified
      const vis = Math.min(steps, 64 * (steps / 256)); // 64 bands for 8-bit, 256 for 10-bit
      for (let k = 0; k < vis; k++) {
        const t = k / (vis - 1);
        ctx.fillStyle = `rgb(${(rgb[0] * t) | 0},${(rgb[1] * t) | 0},${(rgb[2] * t) | 0})`;
        ctx.fillRect(Math.floor((k / vis) * w), 0, Math.ceil(w / vis) + 1, H);
      }
    },
    [col, steps, w],
  );
  return <canvas ref={ref} width={Math.round(w)} height={H} style={{ display: "block", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)" }} />;
};

// ------------------------------------------------------------------ the RGB color cube
const CUBE = (n: number, size: number): Face[] => {
  const faces: Face[] = [];
  const hex = (r: number, g: number, b: number) =>
    "#" + [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");
  const s = size;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const u0 = i / n;
      const u1 = (i + 1) / n;
      const v0 = j / n;
      const v1 = (j + 1) / n;
      const uc = (i + 0.5) / n;
      const vc = (j + 0.5) / n;
      const P = (x: number, y: number, z: number): V3 => [(x - 0.5) * s, (y - 0.5) * s, z * s];
      // R → x, G → y, B → z
      faces.push({ pts: [P(1, u0, v0), P(1, u1, v0), P(1, u1, v1), P(1, u0, v1)], normal: [1, 0, 0], color: hex(1, uc, vc), stroke: "rgba(0,0,0,0.35)", strokeWidth: 0.6 });
      faces.push({ pts: [P(0, u1, v0), P(0, u0, v0), P(0, u0, v1), P(0, u1, v1)], normal: [-1, 0, 0], color: hex(0, uc, vc), stroke: "rgba(0,0,0,0.35)", strokeWidth: 0.6 });
      faces.push({ pts: [P(u0, 1, v0), P(u0, 1, v1), P(u1, 1, v1), P(u1, 1, v0)], normal: [0, 1, 0], color: hex(uc, 1, vc), stroke: "rgba(0,0,0,0.35)", strokeWidth: 0.6 });
      faces.push({ pts: [P(u0, 0, v1), P(u0, 0, v0), P(u1, 0, v0), P(u1, 0, v1)], normal: [0, -1, 0], color: hex(uc, 0, vc), stroke: "rgba(0,0,0,0.35)", strokeWidth: 0.6 });
      faces.push({ pts: [P(u0, v0, 1), P(u1, v0, 1), P(u1, v1, 1), P(u0, v1, 1)], normal: [0, 0, 1], color: hex(uc, vc, 1), stroke: "rgba(0,0,0,0.35)", strokeWidth: 0.6 });
      faces.push({ pts: [P(u1, v0, 0), P(u0, v0, 0), P(u0, v1, 0), P(u1, v1, 0)], normal: [0, 0, -1], color: hex(uc, vc, 0), stroke: "rgba(0,0,0,0.35)", strokeWidth: 0.6 });
    }
  }
  return faces;
};

const Cube: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.multiply - 4, { damping: 20, stiffness: 70 });
  const fine = prog(f, b.ten - 4, 24);
  const n = fine > 0.5 ? 24 : 10;
  const c = cam({ yaw: -40 + f * 0.45, pitch: 26 + 6 * Math.sin(f / 60), dist: 2600, scale: mix(0.6, 1.0, inP), cx: 1400, cy: 520, target: [0, 0, 210] });
  const faces = prepareFaces(c, CUBE(n, 420), { dir: [-0.3, -0.5, 0.9], ambient: 0.84, diffuse: 0.22 });
  const sixteen = spr(f, fps, b.sixteen - 6, { damping: 20, stiffness: 120 });
  const billion = spr(f, fps, b.billion - 6, { damping: 20, stiffness: 120 });
  const count = fine > 0.5 ? Math.round(mix(16777216, 1073741824, prog(f, b.billion - 6, 30, EASE.out))) : Math.round(mix(0, 16777216, prog(f, b.sixteen - 6, 34, EASE.out)));
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.5) }}>
      <div style={{ position: "absolute", left: 1400 - 420, top: 520 - 420, width: 840, height: 840, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,255,255,0.10), transparent 65%)` }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {faces.map((fc, i) => (
          <path key={i} d={fc.d} fill={fc.fill} stroke={fc.stroke} strokeWidth={fc.strokeWidth} />
        ))}
      </svg>
      <div style={{ position: "absolute", left: 1400 - 400, width: 800, top: 860, textAlign: "center", opacity: clamp(sixteen * 1.3) }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 30, color: C.ink2 }}>{fine > 0.5 ? "1,024 × 1,024 × 1,024" : "256 × 256 × 256"}</div>
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 76, color: C.ink, fontVariantNumeric: "tabular-nums", textShadow: `0 0 40px ${hexA(fine > 0.5 ? C.amber : C.pink, 0.6)}`, transform: `scale(${fine > 0.5 ? mix(1, 1.06, billion) : 1})` }}>
          {count.toLocaleString("en-US")}
        </div>
        <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 22, letterSpacing: "0.4em", color: fine > 0.5 ? C.amber : C.pink }}>COLORS</div>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ the frame buffer
const MC = 96; // memory columns (bytes per memory row)
const MR = 54;
const IMG_W = 48;
const IMG_H = 27;
const FrameBuffer: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fill = prog(f, b.fbWord - 10, b.mb - b.fbWord + 10, EASE.inOut);
  const bytes = Math.floor(fill * MC * MR);
  const cell = 9;
  const gap = 2;
  const W = MC * (cell + gap);
  const H = MR * (cell + gap);
  const ref = useCanvas(
    (ctx) => {
      const d = wallpaperData(IMG_W, IMG_H);
      for (let k = 0; k < MC * MR; k++) {
        const x = (k % MC) * (cell + gap);
        const y = Math.floor(k / MC) * (cell + gap);
        if (k >= bytes) {
          ctx.fillStyle = "rgba(160,175,255,0.07)";
          ctx.fillRect(x, y, cell, cell);
          continue;
        }
        const px = Math.floor(k / 4);
        const ch = k % 4;
        const v = ch < 3 ? d[px * 4 + ch] : 255;
        const fresh = bytes - k < 90 ? 1 - (bytes - k) / 90 : 0;
        ctx.fillStyle = ch === 0 ? `rgb(${v},${(fresh * 200) | 0},${(fresh * 200) | 0})` : ch === 1 ? `rgb(${(fresh * 200) | 0},${v},${(fresh * 200) | 0})` : ch === 2 ? `rgb(${(fresh * 200) | 0},${(fresh * 200) | 0},${v})` : "rgb(90,96,120)";
        ctx.fillRect(x, y, cell, cell);
      }
    },
    [bytes],
  );
  // the image being rebuilt from the bytes so far
  const imgRef = useCanvas(
    (ctx) => {
      const src = wallpaper(IMG_W, IMG_H);
      const pixels = Math.floor(bytes / 4);
      ctx.imageSmoothingEnabled = false;
      const rows = Math.floor(pixels / IMG_W);
      const S = 10;
      if (rows > 0) ctx.drawImage(src, 0, 0, IMG_W, rows, 0, 0, IMG_W * S, rows * S);
      const rem = pixels - rows * IMG_W;
      if (rem > 0 && rows < IMG_H) ctx.drawImage(src, 0, rows, rem, 1, 0, rows * S, rem * S, S);
    },
    [bytes],
  );
  const inP = spr(f, fps, b.fb - 8, { damping: 22, stiffness: 90 });
  const quad = spr(f, fps, b.four - 4, { damping: 18, stiffness: 120 });
  const mbA = spr(f, fps, b.mb - 4, { damping: 20, stiffness: 120 });
  const mx = 860;
  const my = 210;
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.4) }}>
      <div style={{ position: "absolute", left: 120, top: 120 }}>
        <Kicker color={C.pink} at={b.fb - 4}>
          Frame buffer
        </Kicker>
      </div>
      {/* image */}
      <div style={{ position: "absolute", left: 120, top: 330, width: IMG_W * 10, height: IMG_H * 10, borderRadius: 10, overflow: "hidden", background: "rgba(160,175,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}>
        <canvas ref={imgRef} width={IMG_W * 10} height={IMG_H * 10} style={{ position: "absolute", inset: 0 }} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 620, fontFamily: FONT.mono, fontSize: 22, color: C.ink3 }}>pixels, row by row…</div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d={`M${120 + IMG_W * 10 + 30},465 L${mx - 30},465`} stroke={hexA(C.pink, 0.6)} strokeWidth={2} strokeDasharray="5 8" strokeDashoffset={-f * 2} />
        <path d={`M${mx - 44},453 L${mx - 30},465 L${mx - 44},477`} fill="none" stroke={hexA(C.pink, 0.8)} strokeWidth={2} />
      </svg>
      {/* memory */}
      <div style={{ position: "absolute", left: mx - 20, top: my - 56, fontFamily: FONT.ui, fontWeight: 600, fontSize: 20, letterSpacing: "0.3em", color: C.ink3 }}>MEMORY · ONE BYTE PER SQUARE</div>
      <div style={{ position: "absolute", left: mx - 20, top: my - 20, width: W + 40, height: H + 40, borderRadius: 16, background: "rgba(6,8,18,0.8)", border: `1px solid ${hexA(C.pink, 0.3)}` }} />
      <canvas ref={ref} width={W} height={H} style={{ position: "absolute", left: mx, top: my }} />
      {/* 4 bytes per pixel */}
      {quad > 0.01 && (
        <div style={{ position: "absolute", left: 120, top: 700, opacity: clamp(quad * 1.4), transform: `translateY(${(1 - quad) * 24}px)` }}>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              ["R", RGB.r],
              ["G", RGB.g],
              ["B", RGB.b],
              ["A", "#5a6078"],
            ].map(([t, col]) => (
              <div key={t} style={{ width: 74, height: 74, borderRadius: 12, background: hexA(col, 0.22), border: `2px solid ${col}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.mono, fontWeight: 700, fontSize: 34, color: C.ink }}>
                {t}
              </div>
            ))}
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.ink2, marginTop: 12 }}>4 bytes per pixel · A = alpha / padding</div>
        </div>
      )}
      {mbA > 0.01 && (
        <div style={{ position: "absolute", left: 120, top: 860, opacity: clamp(mbA * 1.4), transform: `translateY(${(1 - mbA) * 24}px)` }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 30, color: C.ink2 }}>5,939,136 px × 4 B = </span>
          <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 64, color: C.ink, textShadow: `0 0 30px ${hexA(C.pink, 0.6)}` }}>≈ 24 MB</span>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ 120 frames a second
const Stream: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const speed = mix(0.02, 0.09, prog(f, b.rate, 40, EASE.inOut)) * mix(1, 0.15, prog(f, b.who - 10, 50, EASE.inOut));
  // integrate travel so speed changes are smooth
  let travel = 0;
  for (let t = b.rate - 20; t < f; t++) travel += mix(0.02, 0.09, prog(t, b.rate, 40, EASE.inOut)) * mix(1, 0.15, prog(t, b.who - 10, 50, EASE.inOut));
  const ref = useCanvas(
    (ctx) => {
      const img = wallpaper(480, 270);
      const N = 42;
      const items: { z: number; k: number }[] = [];
      for (let k = 0; k < N; k++) {
        const z = ((k / N - travel) % 1 + 1) % 1; // 0 = at the camera … 1 = far away
        items.push({ z, k });
      }
      items.sort((p, q) => q.z - p.z);
      for (const it of items) {
        const depth = 0.08 + it.z * 7;
        const s = 1 / depth;
        const w = 380 * s;
        const h = 214 * s;
        const th = it.k * 2.39996; // golden-angle spiral around the view axis
        const R = 560;
        const x = 960 + Math.cos(th) * R * s - w / 2;
        const y = 520 + Math.sin(th) * R * 0.62 * s - h / 2;
        const alpha = clamp((1 - it.z) * 1.4) * clamp(it.z * 14);
        if (alpha <= 0.01 || w > 4000) continue;
        ctx.globalAlpha = alpha;
        ctx.drawImage(img, x, y, w, h);
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = Math.max(1, 2 * s);
        ctx.strokeRect(x, y, w, h);
        if (s > 0.35) {
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.font = `600 ${Math.round(14 * s)}px "JetBrains Mono Variable", monospace`;
          ctx.fillText(`#${String(it.k + 1).padStart(3, "0")}`, x + 10 * s, y + 22 * s);
        }
      }
      ctx.globalAlpha = 1;
    },
    [travel],
  );
  const gb = spr(f, fps, b.gb - 6, { damping: 20, stiffness: 120 });
  const rateIn = spr(f, fps, b.rate - 4, { damping: 20, stiffness: 120 });
  const q = spr(f, fps, b.who, { damping: 18, stiffness: 90 });
  const frames = Math.floor(Math.max(0, f - b.rate + 20) * 4);
  void speed;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <canvas ref={ref} width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 1 - q * 0.75 }} />
      <AbsoluteFill style={{ background: "radial-gradient(60% 60% at 50% 55%, transparent 30%, rgba(2,3,9,0.85) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(2,3,9,0.85) 0%, rgba(2,3,9,0) 30%)" }} />
      <div style={{ position: "absolute", left: 120, top: 130, opacity: clamp(rateIn * 1.4) * (1 - q) }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 22, letterSpacing: "0.38em", color: C.cyan }}>120 FRAMES / SECOND</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 30, color: C.ink2, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>frame #{String(frames).padStart(5, "0")}</div>
      </div>
      {gb > 0.01 && (
        <div style={{ position: "absolute", right: 120, top: 120, textAlign: "right", opacity: clamp(gb * 1.4) * (1 - q), transform: `translateY(${(1 - gb) * 24}px)` }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 28, color: C.ink2 }}>24 MB × 120 =</div>
          <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 92, color: C.ink, textShadow: `0 0 40px ${hexA(C.cyan, 0.6)}` }}>≈ 2.85 GB/s</div>
        </div>
      )}
      {q > 0.01 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 104, letterSpacing: "-0.035em", color: C.ink, textAlign: "center", lineHeight: 1.05, opacity: clamp(q * 1.4), transform: `translateY(${(1 - q) * 40}px)`, filter: `blur(${(1 - clamp(q * 1.2)) * 12}px)` }}>
            Who fills in all
            <br />
            those numbers<span style={{ color: C.violet, textShadow: `0 0 40px ${hexA(C.violet, 0.9)}` }}>…</span>
          </div>
          <div style={{ marginTop: 26, fontFamily: FONT.display, fontWeight: 700, fontSize: 72, color: C.violet, textShadow: `0 0 50px ${hexA(C.violet, 0.8)}`, opacity: prog(f, b.fast - 4, 14), transform: `scale(${mix(1.2, 1, prog(f, b.fast - 4, 18))})` }}>that fast?</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const nA = 1 - prog(f, b.fb - 20, 16);
  const cA = inOut(f, b.multiply - 6, 16, b.fb - 20, 16);
  const fbA = inOut(f, b.fb - 12, 16, b.rate - 10, 14);
  const stA = prog(f, b.rate - 12, 16);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      {nA > 0.01 && <Numbers b={b} a={nA} />}
      {cA > 0.01 && <Cube b={b} a={cA} />}
      {fbA > 0.01 && <FrameBuffer b={b} a={fbA} />}
      {stA > 0.01 && <Stream b={b} a={stA} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const bitClicks: SfxEvent[] = [];
  for (let i = 0; i < 3; i++) bitClicks.push({ at: b.bits - 6 + i * 4, name: "tick_hi", vol: 0.3 });
  return [
    { at: 6, name: "pop", vol: 0.3 },
    { at: b.red - 6, name: "blip", vol: 0.3 },
    { at: b.green - 6, name: "blip", vol: 0.3, rate: 1.12 },
    { at: b.blue - 6, name: "blip", vol: 0.3, rate: 1.26 },
    ...bitClicks,
    { at: b.levels - 4, name: "sweep_up", vol: 0.25 },
    { at: b.multiply - 6, name: "whoosh", vol: 0.4 },
    { at: b.sixteen - 6, name: "data", vol: 0.3 },
    { at: b.sixteen + 30, name: "chime", vol: 0.22 },
    { at: b.ten - 6, name: "pop_hi", vol: 0.3 },
    { at: b.billion - 6, name: "shimmer", vol: 0.35 },
    { at: b.fb - 14, name: "whoosh_soft", vol: 0.35 },
    { at: b.fbWord - 10, name: "data_long", vol: 0.3 },
    { at: b.four - 4, name: "pop", vol: 0.3 },
    { at: b.mb - 4, name: "impact", vol: 0.25 },
    { at: b.rate - 12, name: "whoosh_big", vol: 0.45 },
    { at: b.rate + 10, name: "riser", vol: 0.25 },
    { at: b.gb - 6, name: "boom_soft", vol: 0.35 },
    { at: b.who - 6, name: "sweep_down", vol: 0.25 },
    { at: b.fast - 4, name: "swell", vol: 0.3 },
  ];
};

export const Framebuffer: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.pink, hueB: C.blue, hueC: C.violet, intensity: 0.65 },
};
