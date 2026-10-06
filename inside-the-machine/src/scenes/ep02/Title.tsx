import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, mix, prog, rnd, spr } from "../../lib/anim";
import type { SceneData, SfxEvent } from "../../lib/timeline";
import { SceneShell } from "../../components/frame";
import { Glow } from "../../components/core";
import type { SceneModule } from "../../components/Episode";
import { RGB } from "./shared";

/** Three beams of red, green and blue light converge — and the title resolves to white. */
const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = "INSIDE THE MACHINE";
  const conv = prog(f, 0, 46, EASE.out); // RGB layers converge
  const flash = 1 - prog(f, 0, 22, EASE.out);
  const beam = prog(f, 0, 40, EASE.out);
  const sub = prog(f, 30, 22);
  const sub2 = prog(f, 44, 22);
  const lineP = prog(f, 22, 36, EASE.inOut);
  const layers: { col: string; dx: number; dy: number }[] = [
    { col: RGB.r, dx: -1, dy: -0.35 },
    { col: RGB.g, dx: 0.1, dy: 1 },
    { col: RGB.b, dx: 1, dy: -0.4 },
  ];
  const D = (1 - conv) * 70;
  const beams = [
    { col: RGB.r, ang: -28, x: -420 },
    { col: RGB.g, ang: 90, x: 0 },
    { col: RGB.b, ang: 208, x: 420 },
  ];
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={22} zoomOut={1.1}>
      {/* converging beams */}
      <AbsoluteFill style={{ mixBlendMode: "screen" }}>
        {beams.map((bm, i) => {
          const len = 1500;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 960,
                top: 540,
                width: len,
                height: 260,
                marginTop: -130,
                transformOrigin: "0 50%",
                transform: `rotate(${bm.ang + 180}deg) translateX(${mix(260, 0, beam)}px)`,
                background: `linear-gradient(90deg, ${hexA(bm.col, 0.0)} 0%, ${hexA(bm.col, 0.55 * (0.5 + 0.5 * beam))} 12%, ${hexA(bm.col, 0.16)} 60%, transparent 100%)`,
                filter: "blur(30px)",
                opacity: 0.9 - prog(f, 60, 60) * 0.4,
              }}
            />
          );
        })}
      </AbsoluteFill>
      <Glow x={960} y={500} size={1300} color="#ffffff" a={0.1 + 0.12 * conv} />
      {/* floating light motes */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {new Array(90).fill(0).map((_, i) => {
          const a = rnd(`tm${i}`, 0, Math.PI * 2);
          const r = rnd(`tr${i}`, 200, 900) + f * rnd(`tv${i}`, 0.6, 2.2);
          const col = [RGB.r, RGB.g, RGB.b, "#ffffff"][i % 4];
          return <circle key={i} cx={960 + Math.cos(a) * r * 1.4} cy={520 + Math.sin(a) * r * 0.7} r={rnd(`ts${i}`, 1, 3.2)} fill={col} opacity={0.55 * clamp(f / 20) * (1 - clamp((r - 700) / 500))} />;
        })}
      </svg>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 24, letterSpacing: "0.6em", color: hexA(C.ink, 0.85), opacity: prog(f, 16, 20), marginBottom: 26, paddingLeft: "0.6em" }}>EPISODE 02</div>
        <div style={{ position: "relative", height: 170, width: 1700 }}>
          {layers.map((L, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontFamily: FONT.display,
                fontWeight: 700,
                fontSize: 150,
                letterSpacing: "-0.02em",
                whiteSpace: "nowrap",
                color: L.col,
                mixBlendMode: "screen",
                transform: `translate(${L.dx * D}px, ${L.dy * D}px)`,
                filter: `blur(${(1 - conv) * 6}px)`,
                opacity: clamp(f / 8),
              }}
            >
              {title}
            </div>
          ))}
          {/* white core once converged */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontFamily: FONT.display,
              fontWeight: 700,
              fontSize: 150,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
              color: "#ffffff",
              opacity: prog(f, 34, 20) * 0.9,
              textShadow: `0 0 40px ${hexA("#ffffff", 0.45)}`,
            }}
          >
            {title}
          </div>
        </div>
        <div style={{ height: 2, width: 1100 * lineP, background: `linear-gradient(90deg, transparent, ${RGB.r}, ${RGB.g}, ${RGB.b}, transparent)`, marginTop: 24, boxShadow: "0 0 18px rgba(255,255,255,0.6)" }} />
        <div
          style={{
            marginTop: 34,
            fontFamily: FONT.display,
            fontWeight: 600,
            fontSize: 66,
            letterSpacing: "-0.02em",
            opacity: sub,
            transform: `translateY(${(1 - sub) * 20}px)`,
            background: `linear-gradient(90deg, ${C.pink}, ${C.amber} 45%, ${C.cyan})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Painting with Light
        </div>
        <div style={{ marginTop: 14, fontFamily: FONT.ui, fontSize: 30, color: C.ink2, opacity: sub2, letterSpacing: "0.02em" }}>How your Mac turns numbers into light</div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff4ee", opacity: flash * 0.38, mixBlendMode: "screen" }} />
    </SceneShell>
  );
};

const sfx = (_s: SceneData): SfxEvent[] => [
  { at: 0, name: "braam", vol: 0.85 },
  { at: 0, name: "impact", vol: 0.65 },
  { at: 4, name: "shimmer", vol: 0.35 },
  { at: 30, name: "sweep_up", vol: 0.2 },
  { at: 44, name: "chime", vol: 0.18 },
];

export const Title: SceneModule = {
  Visual,
  sfx,
  hud: false,
  backdrop: { hueA: C.pink, hueB: C.cyan, hueC: C.amber, intensity: 0.8, dots: false },
};
