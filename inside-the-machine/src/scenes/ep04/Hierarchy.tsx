import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { DramCell, SramCell, TIER, TIERS } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    pyramid: c.h1.from,
    top: c.h2.from,
    caches: c.h3.from,
    six: wordAt(c.h3, "six transistors"),
    m1: c.h4.from,
    share12: wordAt(c.h4, "The cores share"),
    whole: wordAt(c.h4, "the whole chip"),
    main: c.h5.from,
    dense: wordAt(c.h5, "Dense"),
    ssd: c.h6.from,
    step: c.h7.from,
    bigger: wordAt(c.h7, "bigger"),
    further: wordAt(c.h7, "further away"),
    end: s.durationInFrames,
  };
};

// pyramid geometry
const PX = 700; // center x
const TOP = 210;
const TH = 96; // tier height
const GAP = 12;
const W0 = 170;
const DW = 150;

const tierPoly = (i: number, lift = 0) => {
  const y0 = TOP + i * (TH + GAP) - lift;
  const wTop = W0 + i * DW;
  const wBot = W0 + (i + 1) * DW - 20;
  return { y0, wTop, wBot, d: `M${PX - wTop / 2},${y0} L${PX + wTop / 2},${y0} L${PX + wBot / 2},${y0 + TH} L${PX - wBot / 2},${y0 + TH} Z` };
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const b = beats(s);
  // which tiers are spotlighted
  const focus: Record<string, number> = {
    reg: inOut(f, b.top - 4, 12, b.caches - 4, 12),
    l1: inOut(f, b.caches - 4, 12, b.main - 4, 12),
    l2: inOut(f, b.caches + 6, 12, b.main - 4, 12),
    slc: inOut(f, b.caches + 12, 12, b.main - 4, 12),
    dram: inOut(f, b.main - 4, 12, b.ssd - 4, 12),
    ssd: inOut(f, b.ssd - 4, 12, b.step - 4, 12),
  };
  const anyFocus = Math.max(...Object.values(focus));
  const sizeA = (i: number) => {
    const key = TIERS[i].key;
    if (key === "reg") return prog(f, b.top + 4, 14);
    if (key === "l1") return prog(f, b.m1 + 4, 14);
    if (key === "l2") return prog(f, b.share12, 14);
    if (key === "slc") return prog(f, b.whole, 14);
    if (key === "dram") return prog(f, b.main + 10, 14);
    return prog(f, b.ssd + 6, 14);
  };
  const latA = prog(f, b.step - 4, 20);
  const arrows = prog(f, b.bigger - 6, 24, EASE.inOut);
  const sramA = inOut(f, b.six - 8, 14, b.main - 6, 12);
  const dramA = inOut(f, b.dense - 10, 14, b.ssd + 30, 14);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.cyan}>the memory pyramid</Kicker>
      </div>
      <Glow x={PX} y={540} size={1200} color={C.cyan} a={0.08} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {TIERS.map((t, i) => {
          const sp = spr(f, fps, b.pyramid + 4 + i * 5, { damping: 14, stiffness: 120 });
          const fo = focus[t.key];
          const lift = 18 * fo;
          const g = tierPoly(i, lift);
          const col = TIER[t.key];
          const dim = anyFocus > 0.05 && fo < 0.05 ? 0.45 : 1;
          return (
            <g key={t.key} opacity={clamp(sp * 1.3) * dim} transform={`translate(0 ${(1 - clamp(sp)) * 60})`}>
              {/* top face for depth */}
              <path d={`M${PX - g.wTop / 2},${g.y0} L${PX + g.wTop / 2},${g.y0} L${PX + g.wTop / 2 - 16},${g.y0 - 14} L${PX - g.wTop / 2 + 16},${g.y0 - 14} Z`} fill={hexA(col, 0.35 + 0.3 * fo)} />
              <path d={g.d} fill={hexA(col, 0.14 + 0.22 * fo)} stroke={col} strokeWidth={2 + 2 * fo} style={fo > 0.05 ? { filter: `drop-shadow(0 0 ${18 * fo}px ${hexA(col, 0.8)})` } : undefined} />
              <text x={PX} y={g.y0 + TH / 2 + 2} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={30} fill={C.ink}>
                {t.name}
              </text>
              <text x={PX} y={g.y0 + TH / 2 + 30} textAnchor="middle" fontFamily={FONT.mono} fontSize={17} fill={hexA(col, 0.95)} opacity={sizeA(i)}>
                {t.size}
              </text>
              {/* latency, to the left */}
              <text x={PX - g.wBot / 2 - 30} y={g.y0 + TH / 2 + 10} textAnchor="end" fontFamily={FONT.mono} fontWeight={700} fontSize={24} fill={hexA(col, 0.95)} opacity={latA}>
                {t.lat}
              </text>
            </g>
          );
        })}
        {/* bigger / slower arrows */}
        <g opacity={arrows}>
          <line x1={1240} y1={230} x2={1240} y2={230 + 560 * arrows} stroke={hexA(C.ink, 0.5)} strokeWidth={3} />
          <path d={`M1228,${222 + 560 * arrows} L1240,${244 + 560 * arrows} L1252,${222 + 560 * arrows}`} fill="none" stroke={hexA(C.ink, 0.5)} strokeWidth={3} />
          <text x={1262} y={520} fontFamily={FONT.ui} fontWeight={700} fontSize={22} letterSpacing="0.2em" fill={C.ink2}>
            BIGGER
          </text>
          <text x={1262} y={552} fontFamily={FONT.ui} fontWeight={700} fontSize={22} letterSpacing="0.2em" fill={C.ink2}>
            CHEAPER
          </text>
          <text x={1262} y={584} fontFamily={FONT.ui} fontWeight={700} fontSize={22} letterSpacing="0.2em" fill={C.ink2}>
            FURTHER AWAY
          </text>
        </g>
        {/* insets: an SRAM bit vs a DRAM bit */}
        {sramA > 0.01 && (
          <g opacity={sramA}>
            <SramCell x={1520} y={420} s={1.4} />
            <text x={1520} y={290} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={18} letterSpacing="0.25em" fill={TIER.l1}>
              ONE BIT OF CACHE · SRAM
            </text>
          </g>
        )}
        {dramA > 0.01 && (
          <g opacity={dramA}>
            <DramCell x={1500} y={700} s={1.3} charge={0.85} label />
            <text x={1520} y={560} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={18} letterSpacing="0.25em" fill={TIER.dram}>
              ONE BIT OF MAIN MEMORY · DRAM
            </text>
          </g>
        )}
      </svg>
      <div style={{ position: "absolute", left: 120, bottom: 70, fontFamily: FONT.mono, fontSize: 16, color: C.ink3, opacity: prog(f, b.m1, 20) }}>sizes and times: Apple M1 performance cores (published / measured)</div>
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ at: b.pyramid + 4 + i * 5, name: "thud", vol: 0.22, rate: 1.3 - i * 0.08 })),
    { at: b.top - 4, name: "blip_hi", vol: 0.3 },
    { at: b.caches - 4, name: "blip", vol: 0.3 },
    { at: b.six - 8, name: "pop", vol: 0.3 },
    { at: b.m1 + 4, name: "tick_hi", vol: 0.25 },
    { at: b.share12, name: "tick_hi", vol: 0.25, rate: 1.06 },
    { at: b.whole, name: "tick_hi", vol: 0.25, rate: 1.12 },
    { at: b.main - 4, name: "blip_lo", vol: 0.3 },
    { at: b.ssd - 4, name: "blip_lo", vol: 0.3, rate: 0.85 },
    { at: b.bigger - 6, name: "sweep_down", vol: 0.3 },
  ];
};

export const Hierarchy: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.cyan, hueB: C.violet, hueC: C.teal, intensity: 0.5 },
};
