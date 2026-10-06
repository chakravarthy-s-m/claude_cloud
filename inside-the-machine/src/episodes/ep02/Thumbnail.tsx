import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { Backdrop, FontGate, Glow, Grain } from "../../components/core";
import { RGB, SUN, SubpixelView } from "../../scenes/ep02/shared";

/** Poster / YouTube thumbnail for Episode 02. */
export const Ep02Thumbnail: React.FC = () => (
  <FontGate>
    <AbsoluteFill style={{ background: C.void }}>
      <Backdrop hueA={C.pink} hueB={C.amber} hueC={C.cyan} intensity={1.1} dust={false} />
      {/* a macro shot of real subpixels, right at the edge of the sun */}
      <AbsoluteFill style={{ left: 640 }}>
        <SubpixelView cx={SUN.x - SUN.r * 0.7071 + 4} cy={SUN.y - SUN.r * 0.7071 + 2} zoom={46} bloom={0.75} />
      </AbsoluteFill>
      <Glow x={1300} y={540} size={1400} color="#ffb38a" a={0.12} />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(2,3,9,0.97) 0%, rgba(2,3,9,0.9) 36%, rgba(2,3,9,0.2) 62%, rgba(2,3,9,0) 80%)" }} />
      <div style={{ position: "absolute", left: 110, top: 190 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 30, padding: "6px 16px", borderRadius: 12, color: "#05070d", background: C.amber }}>EP 02</span>
          <span style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 30, letterSpacing: "0.35em", color: hexA(C.ink, 0.85) }}>INSIDE THE MACHINE</span>
        </div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 168, lineHeight: 0.95, letterSpacing: "-0.04em", color: C.ink, marginTop: 40 }}>PAINTING</div>
        <div
          style={{
            fontFamily: FONT.display,
            fontWeight: 700,
            fontSize: 168,
            lineHeight: 0.95,
            letterSpacing: "-0.04em",
            background: `linear-gradient(90deg, ${RGB.r}, ${C.amber} 35%, ${RGB.g} 62%, ${C.cyan} 80%, ${RGB.b})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          WITH LIGHT
        </div>
        <div style={{ fontFamily: FONT.ui, fontWeight: 500, fontSize: 46, color: C.ink2, marginTop: 34 }}>How your Mac turns numbers into light</div>
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  </FontGate>
);
