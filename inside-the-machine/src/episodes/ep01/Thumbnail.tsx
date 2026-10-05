import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { cam } from "../../lib/proj3d";
import { Backdrop, FontGate, Glow, Grain } from "../../components/core";
import { Chip3D } from "../../components/chip";

/** Poster / YouTube thumbnail for Episode 01. */
export const Ep01Thumbnail: React.FC = () => {
  const c = cam({ yaw: -32, pitch: 40, dist: 5200, scale: 0.74, target: [170, 0, 0], cx: 1420, cy: 610 });
  return (
    <FontGate>
      <AbsoluteFill style={{ background: C.void }}>
        <Backdrop hueA={C.cyan} hueB={C.violet} hueC={C.pink} intensity={1.2} dust={false} />
        <Glow x={1300} y={560} size={1500} color={C.cyan} a={0.2} />
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <Chip3D
            cam={c}
            st={{
              rise: { pcore: 1, pl2: 0.6, ecore: 0.8, el2: 0.5, gpu: 0.9, npu: 0.85, storage: 0.7, display: 0.7, secure: 0.7, slc: 0.3 },
              lit: { pcore: 1, pl2: 0.7, ecore: 1, el2: 0.7, gpu: 1, npu: 1, storage: 1, display: 1, secure: 1, media: 0.6, io: 0.6, slc: 0.7, phy: 0.9 },
              memRise: 1,
              memLit: 1,
              power: 1,
              sparkle: 0.9,
              frame: 40,
            }}
          />
        </svg>
        <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(2,3,9,0.92) 0%, rgba(2,3,9,0.75) 38%, rgba(2,3,9,0) 62%)" }} />
        <div style={{ position: "absolute", left: 110, top: 190 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 30, padding: "6px 16px", borderRadius: 12, color: "#05070d", background: C.cyan }}>EP 01</span>
            <span style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 30, letterSpacing: "0.35em", color: hexA(C.ink, 0.85) }}>INSIDE THE MACHINE</span>
          </div>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 168, lineHeight: 0.95, letterSpacing: "-0.04em", color: C.ink, marginTop: 40 }}>KEYSTROKE</div>
          <div
            style={{
              fontFamily: FONT.display,
              fontWeight: 700,
              fontSize: 168,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              background: `linear-gradient(90deg, ${C.amber}, ${C.orange} 45%, ${C.pink})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            → ELECTRON
          </div>
          <div style={{ fontFamily: FONT.ui, fontWeight: 500, fontSize: 46, color: C.ink2, marginTop: 34 }}>How a modern Mac really works</div>
        </div>
        <Grain opacity={0.05} />
      </AbsoluteFill>
    </FontGate>
  );
};
