import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow } from "../../components/core";
import { glowSprite, useCanvas } from "../../components/fx";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { wallpaper, wallpaperData } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    meet: c.g1.from,
    graphics: wordAt(c.g1, "graphics"),
    processing: wordAt(c.g1, "processing"),
    unit: wordAt(c.g1, "unit"),
    cpu: c.g2.from,
    artists: wordAt(c.g2, "brilliant artists"),
    stroke: wordAt(c.g2, "stroke by stroke"),
    gpu: c.g3.from,
    army: wordAt(c.g3, "an army"),
    same: wordAt(c.g3, "same instructions"),
    different: wordAt(c.g3, "a different pixel"),
    pictures: c.g4.from,
    wins: wordAt(c.g4, "the army wins"),
    every: wordAt(c.g4, "Every time"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

const GW = 96;
const GH = 54;
const PW = 800;
const PH = 450;
const CELL = PW / GW;

// ------------------------------------------------------------------ "GPU" wordmark
const Intro: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chip = spr(f, fps, 66, { damping: 26, stiffness: 60 });
  const words = [
    { L: "G", rest: "raphics", at: b.graphics },
    { L: "P", rest: "rocessing", at: b.processing },
    { L: "U", rest: "nit", at: b.unit },
  ];
  const N = 12;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Glow x={960} y={420} size={1100} color={C.violet} a={0.25 * chip} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: clamp(chip * 1.3) }}>
        <g transform={`translate(960 400) scale(${mix(0.85, 1, chip)}) rotate(${mix(-8, 0, chip)})`}>
          {new Array(9).fill(0).map((_, i) => (
            <React.Fragment key={i}>
              <rect x={-150 + i * 34 - 4} y={-196} width={8} height={26} rx={2} fill={hexA(C.gold, 0.6)} />
              <rect x={-150 + i * 34 - 4} y={170} width={8} height={26} rx={2} fill={hexA(C.gold, 0.6)} />
              <rect x={-196} y={-150 + i * 34 - 4} width={26} height={8} rx={2} fill={hexA(C.gold, 0.6)} />
              <rect x={170} y={-150 + i * 34 - 4} width={26} height={8} rx={2} fill={hexA(C.gold, 0.6)} />
            </React.Fragment>
          ))}
          <rect x={-172} y={-172} width={344} height={344} rx={28} fill="#11162a" stroke={hexA(C.violet, 0.6)} strokeWidth={2} />
          {new Array(N * N).fill(0).map((_, k) => {
            const i = k % N;
            const j = Math.floor(k / N);
            const ph = Math.sin(f * 0.25 + i * 0.9 + j * 1.7 + rnd(`gc${k}`) * 6);
            const on = ph > 0.55;
            return <rect key={k} x={-138 + i * 23} y={-138 + j * 23} width={18} height={18} rx={3} fill={on ? "#d9ccff" : hexA(C.violet, 0.35 + 0.2 * ph)} />;
          })}
        </g>
      </svg>
      <div style={{ position: "absolute", top: 650, width: "100%", display: "flex", justifyContent: "center", gap: 46 }}>
        {words.map((w) => {
          const p = spr(f, fps, w.at - 4, { damping: 20, stiffness: 120 });
          const big = spr(f, fps, b.meet, { damping: 18, stiffness: 120 });
          return (
            <div key={w.L} style={{ display: "flex", alignItems: "baseline", fontFamily: FONT.display, fontWeight: 700, letterSpacing: "-0.03em" }}>
              <span style={{ fontSize: 110, color: C.ink, opacity: clamp(big * 1.4), textShadow: `0 0 40px ${hexA(C.violet, 0.7)}` }}>{w.L}</span>
              <span style={{ fontSize: 56, color: C.violet, opacity: clamp(p * 1.4), display: "inline-block", maxWidth: 400 * clamp(p), overflow: "hidden", whiteSpace: "nowrap" }}>{w.rest}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ the race
const CpuPanel: React.FC<{ b: B; x: number; a: number }> = ({ b, x, a }) => {
  const f = useCurrentFrame();
  const rate = 0.55; // pixels per frame, per artist
  const t0 = b.artists - 6;
  const ref = useCanvas(
    (ctx) => {
      const src = wallpaper(GW, GH);
      ctx.fillStyle = "#070912";
      ctx.fillRect(0, 0, PW, PH);
      ctx.imageSmoothingEnabled = false;
      const QW = GW / 2;
      const QH = GH / 2;
      const spr = glowSprite(C.pink, 64);
      for (let q = 0; q < 4; q++) {
        const qx = (q % 2) * QW;
        const qy = Math.floor(q / 2) * QH;
        const n = Math.max(0, Math.floor((f - t0) * rate));
        const done = Math.min(QW * QH, n);
        const rows = Math.floor(done / QW);
        if (rows > 0) ctx.drawImage(src, qx, qy, QW, rows, qx * CELL, qy * CELL, QW * CELL, rows * CELL);
        const rem = done - rows * QW;
        // boustrophedon (zig-zag) brush order inside the row
        if (rem > 0 && rows < QH) {
          const leftToRight = rows % 2 === 0;
          const sx = leftToRight ? qx : qx + QW - rem;
          ctx.drawImage(src, sx, qy + rows, rem, 1, sx * CELL, (qy + rows) * CELL, rem * CELL, CELL);
          // the artist's brush
          const bx = (leftToRight ? qx + rem : qx + QW - rem) * CELL;
          const by = (qy + rows + 0.5) * CELL;
          ctx.globalCompositeOperation = "lighter";
          ctx.drawImage(spr, bx - 34, by - 34, 68, 68);
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(bx, by, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // pixel grid
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.beginPath();
      for (let i = 0; i <= GW; i++) {
        ctx.moveTo(i * CELL, 0);
        ctx.lineTo(i * CELL, PH);
      }
      for (let j = 0; j <= GH; j++) {
        ctx.moveTo(0, j * CELL);
        ctx.lineTo(PW, j * CELL);
      }
      ctx.stroke();
    },
    [t0],
  );
  const done = clamp((Math.max(0, f - t0) * rate * 4) / (GW * GH));
  return (
    <div style={{ position: "absolute", left: x, top: 300, opacity: a }}>
      <PanelHead title="CPU" sub="a few brilliant artists" col={C.pink} cores={4} />
      <div style={{ position: "relative", width: PW, height: PH, borderRadius: 14, overflow: "hidden", border: `1px solid ${hexA(C.pink, 0.35)}`, boxShadow: `0 30px 80px rgba(0,0,0,0.5)` }}>
        <canvas ref={ref} width={PW} height={PH} style={{ position: "absolute", inset: 0 }} />
      </div>
      <Progress p={done} col={C.pink} label={`${(done * 100).toFixed(1)}% of one frame`} />
    </div>
  );
};

const GpuPanel: React.FC<{ b: B; x: number; a: number }> = ({ b, x, a }) => {
  const f = useCurrentFrame();
  const go = b.different - 10; // the whole frame paints at once
  const period = 9; // a new frame every 9 video frames once running (stylized)
  const ref = useCanvas(
    (ctx) => {
      const d = wallpaperData(GW, GH);
      ctx.fillStyle = "#070912";
      ctx.fillRect(0, 0, PW, PH);
      const t = f - go;
      const frameIdx = t > 0 ? Math.floor(t / period) : -1;
      const local = t > 0 ? t - frameIdx * period : t;
      // brightness wobble per new frame so you can *see* each repaint
      for (let j = 0; j < GH; j++) {
        for (let i = 0; i < GW; i++) {
          const k = (j * GW + i) * 4;
          const delay = rnd(`gd${i}-${j}`) * 7;
          let v: number;
          if (frameIdx < 0) v = 0;
          else if (frameIdx === 0) v = clamp((local - delay) / 3);
          else v = 1;
          const px = i * CELL;
          const py = j * CELL;
          if (v > 0) {
            const sweep = frameIdx > 0 ? Math.max(0, 1 - Math.abs(i / GW - local / period) * 6) * 0.35 : 0;
            ctx.fillStyle = `rgba(${Math.min(255, d[k] + 120 * sweep) | 0},${Math.min(255, d[k + 1] + 120 * sweep) | 0},${Math.min(255, d[k + 2] + 150 * sweep) | 0},${v})`;
            ctx.fillRect(px, py, CELL + 0.5, CELL + 0.5);
          }
          // the painters: one tiny dot per pixel
          const dotA = frameIdx < 0 ? prog(f, b.army - 4 + (i + j) * 0.25, 10) * 0.85 : 0.18;
          if (dotA > 0.01) {
            const flash = b.same <= f && f < b.same + 30 ? Math.max(0, 1 - Math.abs((f - b.same) - Math.hypot(i - GW / 2, j - GH / 2) * 0.45) / 4) : 0;
            ctx.fillStyle = flash > 0 ? `rgba(255,255,255,${Math.min(1, dotA + flash)})` : `rgba(196,181,253,${dotA})`;
            ctx.fillRect(px + CELL * 0.32, py + CELL * 0.32, CELL * 0.36 + flash * 2, CELL * 0.36 + flash * 2);
          }
        }
      }
    },
    [go],
  );
  const t = f - go;
  const frames = t > 0 ? Math.floor(t / period) + (t % period > 6 ? 1 : 0) : 0;
  const done = t > 0 ? clamp(t / 10) : 0;
  return (
    <div style={{ position: "absolute", left: x, top: 300, opacity: a }}>
      <PanelHead title="GPU" sub="thousands of simple painters" col={C.violet} cores={0} />
      <div style={{ position: "relative", width: PW, height: PH, borderRadius: 14, overflow: "hidden", border: `1px solid ${hexA(C.violet, 0.45)}`, boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 60px ${hexA(C.violet, 0.2 * done)}` }}>
        <canvas ref={ref} width={PW} height={PH} style={{ position: "absolute", inset: 0 }} />
        {/* the single instruction everyone follows */}
        {f >= b.same - 6 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: 18, textAlign: "center", opacity: inOut(f, b.same - 6, 10, go + 30, 14) }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 24, padding: "8px 18px", borderRadius: 10, background: "rgba(5,6,12,0.88)", border: `1px solid ${hexA(C.violet, 0.6)}`, color: C.ink }}>
              <span style={{ color: C.violet }}>for each pixel:</span> color = sky(y) + sun(x, y)
            </span>
          </div>
        )}
      </div>
      <Progress p={done} col={C.violet} label={frames > 0 ? `${frames} frame${frames > 1 ? "s" : ""} painted` : "ready…"} />
    </div>
  );
};

const PanelHead: React.FC<{ title: string; sub: string; col: string; cores: number }> = ({ title, sub, col, cores }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginBottom: 18 }}>
    <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 58, color: C.ink, textShadow: `0 0 30px ${hexA(col, 0.6)}` }}>{title}</span>
    <span style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 24, color: col, letterSpacing: "0.04em" }}>{sub}</span>
    {cores > 0 && (
      <span style={{ display: "flex", gap: 6, marginLeft: 8 }}>
        {new Array(cores).fill(0).map((_, i) => (
          <span key={i} style={{ width: 16, height: 16, borderRadius: 4, background: col, boxShadow: `0 0 10px ${col}` }} />
        ))}
      </span>
    )}
  </div>
);

const Progress: React.FC<{ p: number; col: string; label: string }> = ({ p, col, label }) => (
  <div style={{ marginTop: 18 }}>
    <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
      <div style={{ width: `${p * 100}%`, height: "100%", background: col, boxShadow: `0 0 12px ${col}` }} />
    </div>
    <div style={{ fontFamily: FONT.mono, fontSize: 24, color: C.ink2, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>{label}</div>
  </div>
);

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const introA = 1 - prog(f, b.cpu - 10, 16);
  const cpuA = prog(f, b.cpu - 8, 16);
  const gpuIn = prog(f, b.gpu - 10, 24, EASE.inOut);
  const cpuX = mix(560, 120, gpuIn);
  const winA = prog(f, b.wins - 6, 16);
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={14}>
      {introA > 0.01 && <Intro b={b} a={introA} />}
      {cpuA > 0.01 && <CpuPanel b={b} x={cpuX} a={cpuA} />}
      {gpuIn > 0.01 && <GpuPanel b={b} x={mix(1300, 1000, gpuIn)} a={gpuIn} />}
      {winA > 0.01 && (
        <div style={{ position: "absolute", bottom: 64, width: "100%", textAlign: "center", opacity: winA, transform: `translateY(${(1 - winA) * 20}px)` }}>
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 60, color: C.ink, letterSpacing: "-0.03em" }}>
            Same math, every pixel → <span style={{ color: C.violet, textShadow: `0 0 30px ${hexA(C.violet, 0.8)}` }}>the army wins.</span>
          </span>
        </div>
      )}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const strokes: SfxEvent[] = [];
  for (let t = b.artists; t < b.gpu - 10; t += 14) strokes.push({ at: t, name: "tick", vol: 0.12 });
  return [
    { at: 66, name: "power_up", vol: 0.3 },
    { at: b.graphics - 4, name: "pop", vol: 0.3 },
    { at: b.processing - 4, name: "pop", vol: 0.3 },
    { at: b.unit - 4, name: "pop_hi", vol: 0.3 },
    { at: b.cpu - 10, name: "whoosh_soft", vol: 0.35 },
    ...strokes,
    { at: b.gpu - 10, name: "whoosh", vol: 0.4 },
    { at: b.army - 4, name: "scan", vol: 0.3 },
    { at: b.same - 2, name: "pulse", vol: 0.45 },
    { at: b.different - 10, name: "data", vol: 0.45 },
    { at: b.different - 6, name: "shimmer", vol: 0.3 },
    { at: b.wins - 6, name: "impact", vol: 0.35 },
    { at: b.every - 4, name: "chime", vol: 0.22 },
  ];
};

export const GpuIntro: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.violet, hueB: C.pink, hueC: C.blue, intensity: 0.75 },
};
