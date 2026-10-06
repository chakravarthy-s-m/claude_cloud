import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, rnd } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { cam } from "../../lib/proj3d";
import { Chip3D, ChipLabel, kindAnchor, memAnchor } from "../../components/chip";
import { Glow, Kicker } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { DramCell, TIER } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    down: c.d1.from,
    pkg: c.d2.from,
    mm: wordAt(c.d2, "just millimeters"),
    inside: c.d3.from,
    billions: wordAt(c.d3, "billions of cells"),
    banks: wordAt(c.d3, "called banks"),
    cell: c.d4.from,
    bucket: wordAt(c.d4, "a bucket"),
    one: wordAt(c.d4, "a one"),
    zero: wordAt(c.d4, "a zero"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

// ---------------------------------------------------------------- stage A: the package
const Package: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const t = prog(f, 0, b.inside - 10, EASE.inOut);
  const c = cam({ yaw: mix(-20, -8, t), pitch: mix(52, 44, t), dist: 2800, scale: mix(0.52, 0.66, t), target: [mix(300, 560, t), 0, 0], cy: 560 });
  const memLit = prog(f, b.pkg + 10, 20);
  const st = { power: 0.8, lit: { pcore: 0.4, ecore: 0.4, gpu: 0.3 }, memLit, memRise: 0.4 * memLit, frame: f, sparkle: 0.2 };
  const ma = memAnchor(c, st, 30);
  const da = kindAnchor(c, "slc", st, 10);
  const mmA = prog(f, b.mm - 6, 14);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Glow x={ma.x} y={ma.y} size={700} color={TIER.dram} a={0.25 * memLit} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Chip3D cam={c} st={st} />
        {mmA > 0.01 && (
          <g opacity={mmA}>
            <line x1={da.x + 120} y1={da.y - 20} x2={ma.x - 60} y2={ma.y - 20} stroke={C.ink} strokeWidth={2} strokeDasharray="6 6" />
            <circle cx={da.x + 120} cy={da.y - 20} r={6} fill={C.ink} />
            <circle cx={ma.x - 60} cy={ma.y - 20} r={6} fill={C.ink} />
            <text x={(da.x + ma.x) / 2 + 30} y={Math.min(da.y, ma.y) - 50} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={26} fill={C.ink}>
              millimeters
            </text>
          </g>
        )}
      </svg>
      <ChipLabel x={ma.x} y={ma.y} text="Memory chips" sub="on the processor’s own package" color={TIER.dram} a={prog(f, b.pkg + 10, 16)} dx={160} dy={-170} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- stage B: die → bank → cells (one continuous zoom)
const DIE = { x: 460, y: 140, w: 1000, h: 800 };
const BW = 220;
const BH = 170;
const bankX = (c: number) => DIE.x + 30 + c * (BW + 20);
const bankY = (r: number) => DIE.y + 40 + r * (BH + 20);
const TB = { r: 1, c: 2 }; // target bank
const MC = 8;
const MR = 6;
const MW = BW / MC;
const MH = BH / MR;
const TM = { r: 2, c: 3 }; // target mat
const matX = bankX(TB.c) + TM.c * MW;
const matY = bankY(TB.r) + TM.r * MH;
const CELLS = 12;

const DieZoom: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  // camera in log-scale
  const ls = keyframes(
    f,
    [
      [b.inside - 6, Math.log(1)],
      [b.billions - 10, Math.log(1)],
      [b.banks + 6, Math.log(4.3)],
      [b.cell - 4, Math.log(36)],
    ],
    EASE.inOut,
  );
  const k = Math.exp(ls);
  const zt = clamp(Math.log(k) / Math.log(36));
  const cx = mix(960, matX + MW / 2, zt);
  const cy = mix(540, matY + MH / 2, zt);
  const tx = 960 - cx * k;
  const ty = 540 - cy * k;
  const bankA = prog(f, b.inside + 4, 16);
  const cellsA = clamp((k - 6) / 10);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id="cells-fine" width={2.2} height={2.2} patternUnits="userSpaceOnUse">
            <rect width={1.5} height={1.5} fill={hexA(TIER.dram, 0.45)} />
          </pattern>
        </defs>
        <g transform={`translate(${tx} ${ty}) scale(${k})`}>
          {/* the die */}
          <rect x={DIE.x} y={DIE.y} width={DIE.w} height={DIE.h} rx={12} fill="#0d1a1c" stroke={hexA(TIER.dram, 0.7)} strokeWidth={2 / Math.sqrt(k)} />
          {/* periphery strips */}
          <rect x={DIE.x + 10} y={DIE.y + DIE.h - 26} width={DIE.w - 20} height={16} rx={4} fill={hexA(C.amber, 0.2)} />
          {new Array(16).fill(0).map((_, i) => {
            const r = Math.floor(i / 4);
            const c = i % 4;
            const x = bankX(c);
            const y = bankY(r);
            const isT = r === TB.r && c === TB.c;
            return (
              <g key={i} opacity={bankA}>
                <rect x={x} y={y} width={BW} height={BH} rx={4} fill={hexA(TIER.dram, isT ? 0.16 : 0.08)} stroke={hexA(TIER.dram, isT ? 0.9 : 0.4)} strokeWidth={1.5 / Math.sqrt(k)} />
                {/* mats */}
                {new Array(MR * MC).fill(0).map((__, m) => {
                  const mr = Math.floor(m / MC);
                  const mc = m % MC;
                  return <rect key={m} x={x + mc * MW + 1} y={y + mr * MH + 1} width={MW - 2} height={MH - 2} fill={k > 3 && isT ? "url(#cells-fine)" : hexA(TIER.dram, 0.18)} />;
                })}
                {k < 2.5 && (
                  <text x={x + 10} y={y + 24} fontFamily={FONT.mono} fontSize={16} fill={hexA(C.ink, 0.7)}>
                    bank {i}
                  </text>
                )}
              </g>
            );
          })}
          {/* individual cells in the target mat: wordlines, bitlines, capacitors */}
          {cellsA > 0.01 && (
            <g opacity={cellsA}>
              <rect x={matX} y={matY} width={MW} height={MH} fill="#081416" />
              {new Array(CELLS).fill(0).map((_, r) => (
                <line key={`w${r}`} x1={matX} y1={matY + (r + 0.5) * (MH / CELLS)} x2={matX + MW} y2={matY + (r + 0.5) * (MH / CELLS)} stroke={hexA(C.amber, 0.45)} strokeWidth={0.06} />
              ))}
              {new Array(CELLS).fill(0).map((_, c) => (
                <line key={`b${c}`} x1={matX + (c + 0.5) * (MW / CELLS)} y1={matY} x2={matX + (c + 0.5) * (MW / CELLS)} y2={matY + MH} stroke={hexA(C.cyan, 0.4)} strokeWidth={0.06} />
              ))}
              {new Array(CELLS * CELLS).fill(0).map((_, i) => {
                const r = Math.floor(i / CELLS);
                const c = i % CELLS;
                const on = rnd(`bit${i}`) > 0.45;
                const x = matX + (c + 0.5) * (MW / CELLS);
                const y = matY + (r + 0.5) * (MH / CELLS);
                return <circle key={i} cx={x + 0.35} cy={y + 0.35} r={0.42} fill={on ? hexA(TIER.dram, 0.9) : "#0f2224"} stroke={hexA(TIER.dram, 0.8)} strokeWidth={0.05} />;
              })}
            </g>
          )}
        </g>
      </svg>
      {/* labels in screen space */}
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={TIER.dram}>{k < 2 ? "one memory die" : k < 20 ? "one bank" : "rows and columns of cells"}</Kicker>
      </div>
      <div style={{ position: "absolute", right: 130, top: 170, textAlign: "right", opacity: prog(f, b.billions - 4, 14) * (1 - prog(f, b.cell - 10, 10)) }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 56, color: C.ink }}>billions of cells</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 19, color: TIER.dram, marginTop: 6 }}>in banks that can work in parallel</div>
      </div>
      {cellsA > 0.3 && (
        <div style={{ position: "absolute", left: 130, bottom: 120, opacity: cellsA, fontFamily: FONT.mono, fontSize: 20, color: C.ink2, lineHeight: 1.6 }}>
          <span style={{ color: C.amber }}>━</span> wordlines (rows) &nbsp; <span style={{ color: C.cyan }}>┃</span> bitlines (columns)
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- stage C: one cell
const OneCell: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const isZero = f > b.zero - 4;
  const charge = isZero ? 1 - prog(f, b.zero - 4, 16) : prog(f, b.bucket - 6, 30, EASE.inOut);
  const cx = 1240;
  const cy = 520;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={TIER.dram}>one cell = one bit</Kicker>
      </div>
      <Glow x={cx} y={cy} size={900} color={TIER.dram} a={0.12 + 0.18 * charge} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <DramCell x={560} y={540} s={2.6} charge={charge} label />
        {/* the capacitor as a deep, narrow bucket */}
        <g>
          <ellipse cx={cx} cy={cy + 240} rx={110} ry={30} fill="#0a1416" stroke={hexA(TIER.dram, 0.6)} strokeWidth={2} />
          <rect x={cx - 110} y={cy - 220} width={220} height={460} fill="rgba(10,24,26,0.6)" />
          <rect x={cx - 110} y={cy + 240 - 460 * charge} width={220} height={460 * charge} fill={hexA(TIER.dram, 0.4)} />
          {charge > 0.02 && <ellipse cx={cx} cy={cy + 240 - 460 * charge} rx={110} ry={30} fill={hexA(TIER.dram, 0.65)} />}
          <line x1={cx - 110} y1={cy - 220} x2={cx - 110} y2={cy + 240} stroke={TIER.dram} strokeWidth={3} />
          <line x1={cx + 110} y1={cy - 220} x2={cx + 110} y2={cy + 240} stroke={TIER.dram} strokeWidth={3} />
          <ellipse cx={cx} cy={cy - 220} rx={110} ry={30} fill="none" stroke={TIER.dram} strokeWidth={3} />
          {/* electrons */}
          {new Array(70).fill(0).map((_, i) => {
            const ey = cy + 230 - rnd(`ey${i}`) * 440;
            const lvl = cy + 240 - 460 * charge;
            if (ey < lvl + 8) return null;
            const ex = cx + (rnd(`ex${i}`) - 0.5) * 190 + Math.sin(f * 0.1 + i) * 4;
            return <circle key={i} cx={ex} cy={ey} r={5} fill="#c9fff7" opacity={0.8} />;
          })}
        </g>
        <text x={cx + 170} y={cy - 40} fontFamily={FONT.display} fontWeight={700} fontSize={120} fill={isZero ? hexA(C.ink, 0.35) : C.ink} opacity={prog(f, b.bucket - 6, 12)} style={{ filter: isZero ? undefined : `drop-shadow(0 0 20px ${TIER.dram})` }}>
          {charge > 0.5 ? "1" : "0"}
        </text>
        <text x={cx + 170} y={cy + 20} fontFamily={FONT.mono} fontSize={20} fill={TIER.dram} opacity={prog(f, b.bucket - 6, 12)}>
          {charge > 0.5 ? "charged" : "empty"}
        </text>
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 80, textAlign: "center", fontFamily: FONT.mono, fontSize: 18, color: C.ink3 }}>illustrative · real capacitors are tall, thin pillars just nanometers across</div>
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const a1 = 1 - prog(f, b.inside - 12, 12, EASE.in);
  const a2 = inOut(f, b.inside - 6, 12, b.cell - 2, 12);
  const a3 = prog(f, b.cell + 2, 14);
  return (
    <SceneShell dur={s.durationInFrames} enter={22} exit={14} delay={66}>
      {a1 > 0.01 && <Package b={b} a={a1} />}
      {a2 > 0.01 && <DieZoom b={b} a={a2} />}
      {a3 > 0.01 && <OneCell b={b} a={a3} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.down, name: "sweep_down", vol: 0.3 },
    { at: b.pkg + 10, name: "shimmer", vol: 0.25 },
    { at: b.mm - 6, name: "tick_hi", vol: 0.3 },
    { at: b.inside - 10, name: "whoosh", vol: 0.35 },
    { at: b.billions - 10, name: "riser", vol: 0.3 },
    { at: b.banks + 6, name: "portal", vol: 0.25 },
    { at: b.cell - 4, name: "whoosh_soft", vol: 0.3 },
    { at: b.bucket - 6, name: "swell", vol: 0.25 },
    { at: b.zero - 4, name: "sweep_down", vol: 0.25 },
  ];
};

export const DramZoom: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.teal, hueB: C.cyan, hueC: C.blue, intensity: 0.5 },
};
