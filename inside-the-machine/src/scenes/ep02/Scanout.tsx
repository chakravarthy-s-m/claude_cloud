import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { cam } from "../../lib/proj3d";
import { Chip3D, ChipLabel, kindAnchor, memAnchor, type ChipState } from "../../components/chip";
import { Glow, Kicker } from "../../components/core";
import { glowSprite, useCanvas } from "../../components/fx";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { wallpaper, wallpaperData } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    leaves: c.s1.from,
    engine: wordAt(c.s2, "A display engine"),
    reads: wordAt(c.s2, "reads it from memory"),
    rows: wordAt(c.s2, "row by row"),
    link: wordAt(c.s2, "high-speed link"),
    tcon: wordAt(c.s2, "timing controller"),
    ctrl: c.s3.from,
    oneRow: wordAt(c.s3, "one row of pixels"),
    columns: wordAt(c.s3, "column wires"),
    voltage: wordAt(c.s3, "precise voltage"),
    familiar: c.s4.from,
    keyboard: wordAt(c.s4, "your keyboard"),
    top: wordAt(c.s4, "Top to bottom"),
    again: wordAt(c.s4, "starts all over again"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

// ------------------------------------------------------------------ the frame leaves the chip
const ChipPart: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const cc = cam({ yaw: keyframes(f, [[0, -28], [b.engine, -18]]), pitch: keyframes(f, [[0, 52], [b.engine, 58]]), dist: 5200, scale: keyframes(f, [[0, 0.52], [b.engine, 0.62]]), target: [140, -60, 0], cy: 560 });
  const st: ChipState = {
    rise: { display: prog(f, b.leaves - 4, 20) * 0.9 },
    lit: { display: prog(f, b.leaves - 6, 14), slc: 0.3, fabric: 0.25 },
    memRise: 0.6,
    memLit: prog(f, b.leaves - 10, 14),
    power: 1,
    sparkle: 0.3,
    frame: f,
  };
  const M = memAnchor(cc, st, 40);
  const D = kindAnchor(cc, "display", st, 40);
  const fly = prog(f, b.leaves + 6, 40, EASE.inOut);
  const x = mix(M.x, D.x, fly);
  const y = mix(M.y, D.y, fly) - Math.sin(fly * Math.PI) * 120;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Glow x={960} y={560} size={1800} color={C.amber} a={0.1} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Chip3D cam={cc} st={st} />
      </svg>
      <ChipLabel {...D} text="Display engine" sub="streams frames to the screen" color={C.cyan} a={inOut(f, b.leaves + 30, 14, b.engine + 40, 12)} dx={-120} dy={-190} />
      {/* the finished frame */}
      <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${mix(1, 0.7, fly)})`, opacity: prog(f, b.leaves - 8, 10) }}>
        <div style={{ width: 200, height: 113, borderRadius: 8, overflow: "hidden", border: "2px solid #fff", boxShadow: `0 0 40px ${hexA(C.amber, 0.7)}` }}>
          <ImgCanvas w={200} h={113} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ImgCanvas: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  const ref = useCanvas((ctx) => ctx.drawImage(wallpaper(480, 270), 0, 0, w, h), []);
  return <canvas ref={ref} width={w} height={h} style={{ display: "block" }} />;
};

// ------------------------------------------------------------------ memory → display engine → link → TCON
const Stream: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.engine - 10, { damping: 22, stiffness: 90 });
  const rowsP = prog(f, b.rows - 6, b.ctrl - b.rows + 10, EASE.linear);
  const TH = 27;
  const curRow = Math.floor(rowsP * TH * 3) % TH; // loops the frame a few times
  const linkA = prog(f, b.link - 6, 14);
  const tconA = spr(f, fps, b.tcon - 6, { damping: 18, stiffness: 120 });
  const d = wallpaperData(48, 27);
  // packets on the link: each a thin strip with the colors of one row
  const packets = new Array(7).fill(0).map((_, k) => {
    const t = (((f - b.rows) * 0.022 + k / 7) % 1 + 1) % 1;
    const row = (curRow - k * 3 + TH * 4) % TH;
    return { t, row };
  });
  const x0 = 720;
  const x1 = 1390;
  const yL = 540;
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.4) }}>
      <div style={{ position: "absolute", left: 110, top: 112 }}>
        <Kicker color={C.amber} at={b.engine - 6}>
          Scan-out
        </Kicker>
      </div>
      {/* memory with the frame */}
      <div style={{ position: "absolute", left: 110, top: 330, width: 400, height: 420, borderRadius: 22, border: `2px solid ${hexA(C.teal, 0.6)}`, background: "rgba(8,24,26,0.7)" }}>
        <div style={{ padding: "16px 20px", fontFamily: FONT.display, fontWeight: 700, fontSize: 28, color: C.ink }}>Unified memory</div>
        <div style={{ position: "absolute", left: 40, top: 90, width: 320, height: 180, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.3)" }}>
          <ImgCanvas w={320} h={180} />
          {rowsP > 0 && <div style={{ position: "absolute", left: 0, right: 0, top: (curRow / TH) * 180, height: 180 / TH + 1, background: "rgba(255,255,255,0.55)", boxShadow: "0 0 14px #fff" }} />}
        </div>
        <div style={{ position: "absolute", left: 40, top: 290, fontFamily: FONT.mono, fontSize: 20, color: C.ink2 }}>frame buffer</div>
      </div>
      {/* display engine */}
      <div style={{ position: "absolute", left: 540, top: 470, width: 170, height: 140, borderRadius: 18, border: `2px solid ${C.cyan}`, background: hexA(C.cyan, 0.12), boxShadow: `0 0 30px ${hexA(C.cyan, 0.35)}`, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: FONT.ui, fontWeight: 700, fontSize: 22, color: C.ink, lineHeight: 1.2 }}>
        display
        <br />
        engine
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d={`M510,540 L540,540`} stroke={C.cyan} strokeWidth={3} />
        {/* the link */}
        <path d={`M${x0},${yL} L${x1},${yL}`} stroke={hexA(C.amber, 0.25 + 0.4 * linkA)} strokeWidth={14} strokeLinecap="round" />
        <path d={`M${x0},${yL} L${x1},${yL}`} stroke={hexA("#fff", 0.2 * linkA)} strokeWidth={2} />
        {rowsP > 0 &&
          packets.map((pk, k) => {
            const x = mix(x0, x1 - 40, pk.t);
            return (
              <g key={k}>
                {new Array(12).fill(0).map((_, i) => {
                  const q = (pk.row * 48 + i * 4) * 4;
                  return <rect key={i} x={x + i * 3.4} y={yL - 6} width={3.2} height={12} fill={`rgb(${d[q]},${d[q + 1]},${d[q + 2]})`} />;
                })}
                <rect x={x - 2} y={yL - 8} width={44} height={16} rx={3} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={1} />
              </g>
            );
          })}
      </svg>
      <div style={{ position: "absolute", left: x0 + 60, top: yL + 30, fontFamily: FONT.mono, fontSize: 22, color: C.amber, opacity: linkA }}>high-speed link · one row after another</div>
      {/* TCON */}
      <div style={{ position: "absolute", left: x1, top: yL - 80, width: 200, height: 160, borderRadius: 18, border: `2px solid ${C.amber}`, background: hexA(C.amber, 0.12), boxShadow: `0 0 34px ${hexA(C.amber, 0.4 * tconA)}`, opacity: clamp(tconA * 1.4), transform: `scale(${mix(0.85, 1, tconA)})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 800, fontSize: 26, color: C.ink }}>timing</div>
        <div style={{ fontFamily: FONT.ui, fontWeight: 800, fontSize: 26, color: C.ink }}>controller</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 18, color: C.amber, marginTop: 6 }}>in the display</div>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ the matrix: rows selected, columns driven
const GX = 48;
const GY = 27;
const CELL = 22;
// the matrix shows a 48×27 window of a 96×54 copy of the picture; each new frame pans it a little
const SW = 96;
const SH = 54;
const srcIdx = (i: number, j: number, n: number) => {
  const x = Math.max(0, Math.min(SW - 1, 22 + i + ((n * 2) % 24)));
  const y = 16 + j;
  return (y * SW + x) * 4;
};
const Matrix: React.FC<{ b: B; a: number; x: number; y: number; scale: number }> = ({ b, a, x, y, scale }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.ctrl - 10, { damping: 22, stiffness: 90 });
  // scan speed: slow at first, then faster and faster ("starts all over again")
  let phase = 0;
  for (let t = b.oneRow - 6; t < f; t++) phase += keyframes(t, [[b.oneRow, 0.09], [b.familiar, 0.12], [b.top, 0.3], [b.again, 1.2], [b.end, 2.4]], EASE.inOut);
  const pass = Math.floor(phase / GY);
  const row = Math.floor(phase) % GY;
  const active = f >= b.oneRow - 6;
  const colA = prog(f, b.columns - 6, 14);
  const W = GX * CELL;
  const H = GY * CELL;
  const ref = useCanvas(
    (ctx) => {
      const d = wallpaperData(SW, SH);
      const spr2 = glowSprite(C.amber, 32);
      ctx.clearRect(0, 0, W + 120, H + 120);
      const ox = 70;
      const oy = 60;
      // column driver (top) and row driver (left)
      ctx.fillStyle = "#151b2e";
      ctx.fillRect(ox, 8, W, 36);
      ctx.fillRect(10, oy, 44, H);
      // rows above the scan line already show the new frame (the picture has panned a little);
      // rows below still show the previous one. Freshly written rows glow briefly.
      const src = wallpaperData(SW, SH);
      for (let j = 0; j < GY; j++) {
        const n = active ? (j < row ? pass + 1 : pass) : 0;
        const age = active ? (row - j + GY) % GY : GY;
        const glow = active && j < row ? Math.max(0, 1 - age / 5) * 0.5 : 0;
        for (let i = 0; i < GX; i++) {
          const q = srcIdx(i, j, n);
          const r = Math.min(255, src[q] * (1 + glow) + 40 * glow);
          const g = Math.min(255, src[q + 1] * (1 + glow) + 40 * glow);
          const bl = Math.min(255, src[q + 2] * (1 + glow) + 40 * glow);
          ctx.fillStyle = `rgb(${r | 0},${g | 0},${bl | 0})`;
          ctx.fillRect(ox + i * CELL + 1, oy + j * CELL + 1, CELL - 2, CELL - 2);
        }
      }
      if (active) {
        // the selected row line
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(255,200,120,0.55)";
        ctx.fillRect(ox - 20, oy + row * CELL + CELL / 2 - 2, W + 24, 4);
        ctx.drawImage(spr2, 12, oy + row * CELL - 10, 40, CELL + 20);
        // column lines carry this row's values
        if (colA > 0) {
          for (let i = 0; i < GX; i++) {
            const q = srcIdx(i, row, pass + 1);
            const v = (d[q] + d[q + 1] + d[q + 2]) / (3 * 255);
            ctx.fillStyle = `rgba(120,220,255,${0.08 + 0.35 * v * colA})`;
            ctx.fillRect(ox + i * CELL + CELL / 2 - 1, 44, 2, oy - 44 + row * CELL + CELL / 2);
            // voltage bar in the driver
            ctx.fillStyle = `rgba(143,243,255,${0.9 * colA})`;
            const hgt = 4 + v * 26;
            ctx.fillRect(ox + i * CELL + 4, 44 - hgt - 2, CELL - 8, hgt);
          }
        }
        ctx.globalCompositeOperation = "source-over";
      }
    },
    [row, pass, active, colA],
  );
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `scale(${scale * mix(0.94, 1, inP)})`, transformOrigin: "0 0", opacity: a * clamp(inP * 1.4) }}>
      <canvas ref={ref} width={W + 120} height={H + 120} style={{ display: "block" }} />
      <div style={{ position: "absolute", left: 70, top: -34, fontFamily: FONT.mono, fontSize: 20, color: C.cyan, opacity: colA }}>column drivers · a voltage for every pixel in the row</div>
      <div style={{ position: "absolute", left: -10, top: 60 + H + 16, fontFamily: FONT.mono, fontSize: 20, color: C.amber, opacity: prog(f, b.oneRow - 6, 14) }}>row driver · one row at a time</div>
    </div>
  );
};

/** Episode 1 callback: the keyboard's scan matrix. */
const KeyMatrixMini: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const cols = 8;
  const rows = 5;
  const s = 52;
  const scanRow = Math.floor((f - b.familiar) / 6) % rows;
  return (
    <div style={{ position: "absolute", left: 1270, top: 330, opacity: a }}>
      <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 20, letterSpacing: "0.3em", color: C.cyan, marginBottom: 16 }}>EPISODE 1 · KEYBOARD MATRIX</div>
      <svg width={cols * s + 40} height={rows * s + 40}>
        {new Array(rows).fill(0).map((_, j) => (
          <line key={`r${j}`} x1={10} y1={20 + j * s + s / 2} x2={cols * s + 30} y2={20 + j * s + s / 2} stroke={j === scanRow ? C.amber : hexA(C.amber, 0.25)} strokeWidth={j === scanRow ? 3 : 1.5} />
        ))}
        {new Array(cols).fill(0).map((_, i) => (
          <line key={`c${i}`} x1={20 + i * s + s / 2} y1={10} x2={20 + i * s + s / 2} y2={rows * s + 30} stroke={hexA(C.cyan, 0.4)} strokeWidth={1.5} />
        ))}
        {new Array(rows * cols).fill(0).map((_, k) => {
          const i = k % cols;
          const j = Math.floor(k / cols);
          return <rect key={k} x={20 + i * s + 8} y={20 + j * s + 8} width={s - 16} height={s - 16} rx={7} fill={j === scanRow ? hexA(C.amber, 0.25) : "rgba(255,255,255,0.05)"} stroke="rgba(255,255,255,0.18)" />;
        })}
      </svg>
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 34, color: C.ink, marginTop: 14 }}>
        same trick: <span style={{ color: C.amber }}>rows</span> × <span style={{ color: C.cyan }}>columns</span>
      </div>
    </div>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const chipA = 1 - prog(f, b.engine - 10, 14);
  const streamA = inOut(f, b.engine - 8, 14, b.ctrl - 10, 14);
  const matA = prog(f, b.ctrl - 12, 14);
  const side = prog(f, b.familiar - 6, 24, EASE.inOut) * (1 - prog(f, b.again - 14, 26, EASE.inOut));
  const kmA = inOut(f, b.familiar + 4, 16, b.again - 12, 16);
  const mScale = mix(1, 0.72, side);
  const mx = mix(960 - (GX * CELL + 120) / 2, 90, side);
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={14}>
      {chipA > 0.01 && <ChipPart b={b} a={chipA} />}
      {streamA > 0.01 && <Stream b={b} a={streamA} />}
      {matA > 0.01 && (
        <>
          <div style={{ position: "absolute", left: 110, top: 112, opacity: matA }}>
            <Kicker color={C.amber} at={b.ctrl - 8}>
              Inside the display: an active matrix
            </Kicker>
          </div>
          <Matrix b={b} a={matA} x={mx} y={mix(230, 300, side)} scale={mScale} />
        </>
      )}
      {kmA > 0.01 && <KeyMatrixMini b={b} a={kmA} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.leaves - 8, name: "power_up", vol: 0.3 },
    { at: b.leaves + 6, name: "whoosh_soft", vol: 0.35 },
    { at: b.engine - 10, name: "whoosh", vol: 0.35 },
    { at: b.reads - 4, name: "scan", vol: 0.3 },
    { at: b.rows - 6, name: "data_long", vol: 0.35 },
    { at: b.tcon - 6, name: "pop", vol: 0.3 },
    { at: b.ctrl - 12, name: "whoosh_soft", vol: 0.3 },
    { at: b.oneRow - 6, name: "scan", vol: 0.35 },
    { at: b.columns - 6, name: "zap", vol: 0.25 },
    { at: b.voltage - 4, name: "hum", vol: 0.25 },
    { at: b.familiar + 4, name: "whoosh_soft", vol: 0.3 },
    { at: b.keyboard - 6, name: "key_click", vol: 0.4 },
    { at: b.keyboard, name: "key_click", vol: 0.35 },
    { at: b.top - 4, name: "sweep_down", vol: 0.25 },
    { at: b.again - 6, name: "riser", vol: 0.3 },
  ];
};

export const Scanout: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.amber, hueB: C.cyan, hueC: C.violet, intensity: 0.6 },
};
