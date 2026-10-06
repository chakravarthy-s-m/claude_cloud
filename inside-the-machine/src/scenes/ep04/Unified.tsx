import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { BAD, Cross, OK, TIER } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    pc: c.u1.from,
    copied: wordAt(c.u1, "copied across"),
    apple: c.u2.from,
    share: wordAt(c.u2, "all share one pool"),
    noCopy: c.u3.from,
    same: wordAt(c.u3, "the very same bytes"),
    wrote: wordAt(c.u3, "just wrote"),
    wide: c.u4.from,
    m4: wordAt(c.u4, "an M4 moves"),
    max: wordAt(c.u4, "An M4 Max"),
    half: wordAt(c.u4, "half a terabyte"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

const TEX = [C.pink, C.amber, C.violet, C.cyan, C.green, C.rose, C.blue, C.orange, C.teal];
const Texture: React.FC<{ x: number; y: number; s?: number; a?: number }> = ({ x, y, s = 1, a = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={a}>
    {new Array(9).fill(0).map((_, i) => (
      <rect key={i} x={(i % 3) * 22} y={Math.floor(i / 3) * 22} width={20} height={20} rx={3} fill={TEX[i]} />
    ))}
  </g>
);

// ---------------------------------------------------------------- act 1: a PC copies
const PcCopy: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const copy = prog(f, b.copied - 10, 70, EASE.linear);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.ink2}>a typical PC</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* motherboard */}
        <rect x={160} y={230} width={760} height={600} rx={24} fill={hexA("#0f2a20", 0.5)} stroke={hexA(C.green, 0.3)} strokeWidth={2} />
        <rect x={240} y={300} width={260} height={220} rx={16} fill="rgba(30,10,26,0.9)" stroke={TIER.reg} strokeWidth={3} />
        <text x={370} y={420} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={40} fill={C.ink}>
          CPU
        </text>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x={580 + i * 70} y={280} width={44} height={300} rx={6} fill="#13202a" stroke={hexA(TIER.dram, 0.7)} strokeWidth={2} />
            {new Array(6).fill(0).map((__, k) => (
              <rect key={k} x={588 + i * 70} y={296 + k * 46} width={28} height={30} rx={3} fill={hexA(TIER.dram, 0.35)} />
            ))}
          </g>
        ))}
        <text x={720} y={620} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} fill={TIER.dram}>
          system memory
        </text>
        <Texture x={596} y={640} s={1.4} />
        {/* bus */}
        <rect x={920} y={690} width={240} height={36} rx={18} fill={hexA(C.ink, 0.08)} stroke={hexA(C.ink, 0.3)} strokeWidth={2} />
        <text x={1040} y={760} textAnchor="middle" fontFamily={FONT.mono} fontSize={18} fill={C.ink3}>
          expansion bus
        </text>
        {/* graphics card */}
        <rect x={1160} y={300} width={600} height={460} rx={24} fill="rgba(18,14,34,0.92)" stroke={hexA(C.violet, 0.8)} strokeWidth={3} />
        {[0, 1].map((i) => (
          <g key={i}>
            <circle cx={1300 + i * 220} cy={470} r={90} fill="#0d0b1a" stroke={hexA(C.ink, 0.25)} strokeWidth={3} />
            {new Array(7).fill(0).map((__, k) => {
              const ang = (k / 7) * Math.PI * 2 + f * 0.25;
              return <line key={k} x1={1300 + i * 220} y1={470} x2={1300 + i * 220 + Math.cos(ang) * 80} y2={470 + Math.sin(ang) * 80} stroke={hexA(C.ink, 0.25)} strokeWidth={6} strokeLinecap="round" />;
            })}
          </g>
        ))}
        <text x={1460} y={350} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={34} fill={C.ink}>
          graphics card
        </text>
        {new Array(6).fill(0).map((_, i) => (
          <rect key={i} x={1200 + i * 90} y={600} width={60} height={60} rx={6} fill="#1d1830" stroke={hexA(C.violet, 0.7)} strokeWidth={2} />
        ))}
        <text x={1460} y={700} textAnchor="middle" fontFamily={FONT.mono} fontSize={18} fill={C.violet}>
          its own separate memory
        </text>
        {/* the copy */}
        {copy > 0 && copy < 1 && (
          <g>
            <Texture x={mix(596, 1300, copy)} y={mix(640, 610, copy) - Math.sin(copy * Math.PI) * 60} s={1.2} />
            <Spark x={mix(640, 1340, copy)} y={mix(660, 630, copy) - Math.sin(copy * Math.PI) * 60} color={C.amber} r={7} />
          </g>
        )}
        {copy >= 1 && <Texture x={1300} y={610} s={1.2} />}
      </svg>
      <div style={{ position: "absolute", left: 960 - 260, top: 860, width: 520, opacity: prog(f, b.copied - 10, 12) }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 20, color: C.amber }}>copying across… {Math.round(copy * 100)}%</div>
        <div style={{ height: 8, marginTop: 8, borderRadius: 4, background: hexA(C.ink, 0.1) }}>
          <div style={{ width: `${copy * 100}%`, height: "100%", borderRadius: 4, background: C.amber }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 2: one pool
const PKG = { x: 300, y: 200, w: 1320, h: 560 };
const BLOCKS = [
  { name: "CPU", col: TIER.reg, x: 380, y: 270 },
  { name: "GPU", col: C.violet, x: 380, y: 420 },
  { name: "Neural Engine", col: C.amber, x: 380, y: 570 },
];
const POOL = { x: 1020, y: 260, w: 540, h: 440 };
const DATA_CELL = { c: 4, r: 3 };

const OnePool: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const pkgA = prog(f, b.apple - 4, 18);
  const beams = (i: number) => prog(f, b.share - 10 + i * 8, 16);
  const write = prog(f, b.wrote - 18, 14);
  const gpuRead = prog(f, b.same - 6, 18);
  const noCopyA = prog(f, b.noCopy - 4, 12, EASE.outBack);
  const cellX = POOL.x + 30 + DATA_CELL.c * 60;
  const cellY = POOL.y + 60 + DATA_CELL.r * 60;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.blue}>unified memory</Kicker>
      </div>
      <Glow x={POOL.x + POOL.w / 2} y={POOL.y + POOL.h / 2} size={900} color={TIER.dram} a={0.12 * pkgA} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g opacity={pkgA}>
          <rect x={PKG.x} y={PKG.y} width={PKG.w} height={PKG.h} rx={30} fill="rgba(14,18,30,0.85)" stroke={hexA(C.gold, 0.5)} strokeWidth={2} />
          <text x={PKG.x + 24} y={PKG.y + 40} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={hexA(C.gold, 0.85)}>
            ONE PACKAGE
          </text>
          {BLOCKS.map((bl) => (
            <g key={bl.name}>
              <rect x={bl.x} y={bl.y} width={360} height={110} rx={16} fill={hexA(bl.col, 0.15)} stroke={bl.col} strokeWidth={2.5} />
              <text x={bl.x + 24} y={bl.y + 66} fontFamily={FONT.display} fontWeight={700} fontSize={34} fill={C.ink}>
                {bl.name}
              </text>
            </g>
          ))}
          {/* the pool */}
          <rect x={POOL.x} y={POOL.y} width={POOL.w} height={POOL.h} rx={22} fill={hexA(TIER.dram, 0.08)} stroke={TIER.dram} strokeWidth={2.5} />
          <text x={POOL.x + 24} y={POOL.y + 40} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={TIER.dram}>
            ONE POOL OF MEMORY
          </text>
          {new Array(8 * 6).fill(0).map((_, i) => {
            const c = i % 8;
            const r = Math.floor(i / 8);
            const isD = c === DATA_CELL.c && r === DATA_CELL.r;
            return <rect key={i} x={POOL.x + 30 + c * 60} y={POOL.y + 60 + r * 60} width={50} height={50} rx={6} fill={isD ? hexA(C.amber, 0.25 + 0.5 * write) : hexA(TIER.dram, 0.12 + 0.12 * rnd(`pp${i}`))} stroke={isD ? C.amber : hexA(TIER.dram, 0.3)} strokeWidth={isD ? 2.5 : 1} />;
          })}
        </g>
        {/* beams: every block reaches the same memory */}
        {BLOCKS.map((bl, i) => {
          const p = beams(i);
          if (p <= 0) return null;
          const x0 = bl.x + 360;
          const y0 = bl.y + 55;
          const x1 = cellX + 25;
          const y1 = cellY + 25;
          const isGpu = bl.name === "GPU";
          const glow = isGpu ? gpuRead : i === 0 ? write : 0.3;
          return (
            <path
              key={bl.name}
              d={`M${x0},${y0} C${x0 + 200},${y0} ${x1 - 200},${y1} ${x1},${y1}`}
              fill="none"
              stroke={bl.col}
              strokeWidth={2 + 4 * glow}
              strokeDasharray={`${p * 900} 900`}
              opacity={0.5 + 0.5 * glow}
              style={{ filter: glow > 0.3 ? `drop-shadow(0 0 ${10 * glow}px ${bl.col})` : undefined }}
            />
          );
        })}
      </svg>
      {noCopyA > 0.01 && (
        <div style={{ position: "absolute", left: 960 - 300, top: 820, width: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 18, opacity: clamp(noCopyA) }}>
          <svg width={52} height={52}>
            <Cross x={26} y={26} r={22} />
          </svg>
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 44, color: C.ink }}>no copies</span>
          <span style={{ fontFamily: FONT.mono, fontSize: 20, color: OK, opacity: gpuRead }}>same bytes, same place</span>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 3: a wide road
const BARS = [
  { name: "M4", gbs: 120, at: "m4" as const },
  { name: "M4 Pro", gbs: 273, at: "max" as const },
  { name: "M4 Max", gbs: 546, at: "half" as const },
];

const Wide: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const lanesA = prog(f, b.wide - 2, 20);
  const LANES = 32;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.blue}>close, so it can be wide</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <rect x={200} y={230} width={300} height={360} rx={24} fill="rgba(30,14,40,0.9)" stroke={hexA(C.violet, 0.8)} strokeWidth={3} />
        <text x={350} y={420} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={40} fill={C.ink}>
          SoC
        </text>
        <rect x={1420} y={230} width={300} height={360} rx={24} fill="rgba(6,24,24,0.9)" stroke={TIER.dram} strokeWidth={3} />
        <text x={1570} y={420} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={40} fill={C.ink}>
          memory
        </text>
        {new Array(LANES).fill(0).map((_, i) => {
          const y = 250 + i * (320 / LANES);
          const p = clamp(lanesA * LANES * 1.2 - i * 0.6);
          return (
            <g key={i} opacity={p}>
              <line x1={500} y1={y} x2={1420} y2={y} stroke={hexA(C.cyan, 0.25)} strokeWidth={2} />
              {new Array(3).fill(0).map((__, k) => {
                const t = (((f * rnd(`ls${i}`, 0.018, 0.03) + k / 3 + rnd(`lo${i}`)) % 1) + 1) % 1;
                const dir = i % 2 ? 1 : -1;
                const x = dir > 0 ? mix(510, 1410, t) : mix(1410, 510, t);
                return <rect key={k} x={x - 14} y={y - 3} width={28} height={6} rx={3} fill={dir > 0 ? C.cyan : TIER.dram} opacity={Math.sin(t * Math.PI)} />;
              })}
            </g>
          );
        })}
      </svg>
      {/* bandwidth bars */}
      <div style={{ position: "absolute", left: 200, top: 660, width: 1520 }}>
        {BARS.map((bar) => {
          const p = prog(f, b[bar.at] - 4, 30, EASE.out);
          return (
            <div key={bar.name} style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 22, opacity: clamp(p * 2) }}>
              <div style={{ width: 150, fontFamily: FONT.display, fontWeight: 700, fontSize: 32, color: C.ink }}>{bar.name}</div>
              <div style={{ flex: 1, height: 44, borderRadius: 12, background: hexA(C.ink, 0.06), position: "relative" }}>
                <div style={{ width: `${(bar.gbs / 546) * 100 * p}%`, height: "100%", borderRadius: 12, background: `linear-gradient(90deg, ${C.blue}, ${C.cyan})`, boxShadow: `0 0 20px ${hexA(C.cyan, 0.4)}` }} />
              </div>
              <div style={{ width: 230, fontFamily: FONT.mono, fontWeight: 700, fontSize: 30, color: C.ink, textAlign: "right" }}>{Math.round(bar.gbs * p)} GB/s</div>
            </div>
          );
        })}
        <div style={{ fontFamily: FONT.mono, fontSize: 16, color: C.ink3, marginTop: 4 }}>Apple’s published peak memory bandwidth</div>
      </div>
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const a1 = 1 - prog(f, b.apple - 14, 10, EASE.in);
  const a2 = inOut(f, b.apple - 4, 12, b.wide - 14, 10);
  const a3 = prog(f, b.wide - 4, 12);
  return (
    <SceneShell dur={s.durationInFrames} enter={22} exit={14} delay={66}>
      {a1 > 0.01 && <PcCopy b={b} a={a1} />}
      {a2 > 0.01 && <OnePool b={b} a={a2} />}
      {a3 > 0.01 && <Wide b={b} a={a3} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.copied - 10, name: "data_long", vol: 0.3 },
    { at: b.apple - 4, name: "whoosh_soft", vol: 0.3 },
    { at: b.share - 10, name: "pop", vol: 0.25 },
    { at: b.share - 2, name: "pop", vol: 0.25, rate: 1.1 },
    { at: b.share + 6, name: "pop", vol: 0.25, rate: 1.2 },
    { at: b.noCopy - 4, name: "thud", vol: 0.35 },
    { at: b.same - 6, name: "shimmer", vol: 0.25 },
    { at: b.wide - 2, name: "electrons", vol: 0.3 },
    { at: b.m4 - 4, name: "sweep_up", vol: 0.25 },
    { at: b.max - 4, name: "sweep_up", vol: 0.25, rate: 1.1 },
    { at: b.half - 4, name: "sweep_up", vol: 0.3, rate: 1.2 },
    { at: b.half + 20, name: "chime", vol: 0.3 },
  ];
};

export const Unified: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.blue, hueB: C.cyan, hueC: C.violet, intensity: 0.5 },
};
