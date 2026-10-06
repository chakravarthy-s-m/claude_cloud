import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { Backdrop, FontGate, Glow, Grain } from "../../components/core";
import { TIER, TIERS } from "../../scenes/ep04/shared";

/** Poster / YouTube thumbnail for Episode 04: the glowing memory pyramid. */
export const Ep04Thumbnail: React.FC = () => {
  const PX = 1230;
  const TOP = 200;
  const TH = 104;
  const GAP = 12;
  const W0 = 150;
  const DW = 138;
  return (
    <FontGate>
      <AbsoluteFill style={{ background: C.void }}>
        <Backdrop hueA={C.cyan} hueB={C.violet} hueC={C.teal} intensity={1.0} dust={false} />
        <Glow x={PX} y={560} size={1300} color={TIER.slc} a={0.22} />
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          {TIERS.map((t, i) => {
            const y0 = TOP + i * (TH + GAP);
            const wTop = W0 + i * DW;
            const wBot = W0 + (i + 1) * DW - 20;
            const col = TIER[t.key];
            return (
              <g key={t.key}>
                <path d={`M${PX - wTop / 2},${y0} L${PX + wTop / 2},${y0} L${PX + wTop / 2 - 16},${y0 - 14} L${PX - wTop / 2 + 16},${y0 - 14} Z`} fill={hexA(col, 0.6)} />
                <path
                  d={`M${PX - wTop / 2},${y0} L${PX + wTop / 2},${y0} L${PX + wBot / 2},${y0 + TH} L${PX - wBot / 2},${y0 + TH} Z`}
                  fill={hexA(col, 0.32)}
                  stroke={col}
                  strokeWidth={4}
                  style={{ filter: `drop-shadow(0 0 22px ${hexA(col, 0.8)})` }}
                />
                <text x={PX} y={y0 + TH / 2 + 12} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={34} fill={C.ink}>
                  {t.name}
                </text>
                <text x={PX + wBot / 2 + 24} y={y0 + TH / 2 + 12} fontFamily={FONT.mono} fontWeight={700} fontSize={28} fill={col}>
                  {t.lat}
                </text>
              </g>
            );
          })}
        </svg>
        <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(2,3,9,0.96) 0%, rgba(2,3,9,0.8) 28%, rgba(2,3,9,0.1) 44%, rgba(2,3,9,0) 56%)" }} />
        <div style={{ position: "absolute", left: 110, top: 220 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 30, padding: "6px 16px", borderRadius: 12, color: "#05070d", background: TIER.slc }}>EP 04</span>
            <span style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 30, letterSpacing: "0.35em", color: hexA(C.ink, 0.85) }}>INSIDE THE MACHINE</span>
          </div>
          <div
            style={{
              fontFamily: FONT.display,
              fontWeight: 700,
              fontSize: 200,
              lineHeight: 0.95,
              letterSpacing: "-0.045em",
              marginTop: 40,
              background: `linear-gradient(90deg, ${TIER.l1}, ${TIER.slc} 50%, ${TIER.dram})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            MEMORY
          </div>
          <div style={{ fontFamily: FONT.ui, fontWeight: 500, fontSize: 46, color: C.ink2, marginTop: 34, maxWidth: 760 }}>Why your Mac never waits for it (almost)</div>
        </div>
        <Grain opacity={0.05} />
      </AbsoluteFill>
    </FontGate>
  );
};
