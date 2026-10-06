import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, mix, prog, rnd } from "../../lib/anim";
import type { SceneData, SfxEvent } from "../../lib/timeline";
import { SceneShell } from "../../components/frame";
import { Glow } from "../../components/core";
import type { SceneModule } from "../../components/Episode";
import { TIER } from "./shared";

/** The title "loads" like a memory dump: rows of cells stream in, then the letters lock into place. */
const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const flash = 1 - prog(f, 0, 20, EASE.out);
  const load = prog(f, 4, 40, EASE.inOut); // rows loaded, top → bottom
  const lock = prog(f, 30, 20);
  const sub = prog(f, 50, 22);
  const sub2 = prog(f, 68, 22);
  const epA = prog(f, 22, 18);
  // a field of DRAM-like cells behind the title
  const COLS = 64;
  const ROWS = 18;
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={22} zoomOut={1.1}>
      <Glow x={960} y={470} size={1500} color={TIER.slc} a={0.12 + 0.1 * load} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 0.55 }}>
        {new Array(COLS * ROWS).fill(0).map((_, i) => {
          const c = i % COLS;
          const r = Math.floor(i / COLS);
          const rowP = clamp(load * (ROWS + 4) - r);
          if (rowP <= 0) return null;
          const on = rnd(`tc${i}-${Math.floor(f / 4)}`) > 0.62;
          const col = [TIER.l1, TIER.l2, TIER.slc, TIER.dram][r % 4];
          return <rect key={i} x={36 + c * 29} y={280 + r * 26} width={22} height={18} rx={3} fill={hexA(col, (on ? 0.45 : 0.08) * rowP * (1 - lock * 0.7))} />;
        })}
        {/* the scanning "row open" line */}
        {load > 0 && load < 1 && <rect x={0} y={280 + load * (ROWS + 4) * 26 - 30} width={1920} height={4} fill={hexA("#e6fbff", 0.8)} />}
      </svg>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 24, letterSpacing: "0.6em", color: hexA(C.ink, 0.85), opacity: epA, marginBottom: 26, paddingLeft: "0.6em", marginTop: -100 }}>EPISODE 04</div>
        <div style={{ position: "relative" }}>
          {/* letters assembled from cells: a grid texture clipped to the text, revealed row by row */}
          <div
            style={{
              fontFamily: FONT.display,
              fontWeight: 700,
              fontSize: 150,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
              backgroundImage: `repeating-linear-gradient(0deg, rgba(5,6,13,0.55) 0px, rgba(5,6,13,0.55) 3px, transparent 3px, transparent 12px), repeating-linear-gradient(90deg, rgba(5,6,13,0.55) 0px, rgba(5,6,13,0.55) 3px, transparent 3px, transparent 12px), linear-gradient(180deg, #ffffff, ${TIER.slc})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              clipPath: `inset(0 0 ${(1 - clamp(load * 1.25)) * 100}% 0)`,
              opacity: 1 - lock,
            }}
          >
            INSIDE THE MACHINE
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              fontFamily: FONT.display,
              fontWeight: 700,
              fontSize: 150,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
              color: "#fff",
              opacity: lock,
              textShadow: `0 0 ${40 * (1 - lock * 0.5)}px ${hexA(TIER.slc, 0.6)}`,
            }}
          >
            INSIDE THE MACHINE
          </div>
        </div>
        <div style={{ height: 2, width: 1100 * lock, background: `linear-gradient(90deg, transparent, ${TIER.l1}, ${TIER.slc}, ${TIER.dram}, transparent)`, marginTop: 24, boxShadow: "0 0 18px rgba(140,240,255,0.6)" }} />
        <div
          style={{
            marginTop: 34,
            fontFamily: FONT.display,
            fontWeight: 600,
            fontSize: 74,
            letterSpacing: "-0.02em",
            opacity: sub,
            transform: `translateY(${(1 - sub) * 20}px)`,
            background: `linear-gradient(90deg, ${TIER.l1}, ${TIER.slc} 50%, ${TIER.dram})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Memory
        </div>
        <div style={{ marginTop: 14, fontFamily: FONT.ui, fontSize: 30, color: C.ink2, opacity: sub2, letterSpacing: "0.02em" }}>Where your data lives, and how the chip gets to it so fast</div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#e8fbff", opacity: flash * 0.5, mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ opacity: mix(0.6, 0, clamp(f / 60)), background: "radial-gradient(60% 50% at 50% 45%, transparent, rgba(0,0,0,0.6))" }} />
    </SceneShell>
  );
};

const sfx = (_s: SceneData): SfxEvent[] => [
  { at: 0, name: "braam", vol: 0.8 },
  { at: 0, name: "impact", vol: 0.6 },
  { at: 4, name: "data_long", vol: 0.35 },
  { at: 30, name: "shimmer", vol: 0.3 },
  { at: 50, name: "chime", vol: 0.2 },
];

export const Title: SceneModule = {
  Visual,
  sfx,
  hud: false,
  backdrop: { hueA: C.cyan, hueB: C.violet, hueC: C.teal, intensity: 0.7, dots: false },
};
