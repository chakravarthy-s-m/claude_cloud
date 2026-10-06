import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, mix, prog, rnd } from "../../lib/anim";
import type { SceneData, SfxEvent } from "../../lib/timeline";
import { SceneShell } from "../../components/frame";
import { Glow } from "../../components/core";
import type { SceneModule } from "../../components/Episode";
import { PowerSymbol } from "./shared";

const TITLE = "INSIDE THE MACHINE";

/** Neon-tube start-up: a few stuttering flashes, then steady. */
const flicker = (f: number, at: number, seed: number) => {
  const t = f - at;
  if (t < 0) return 0;
  if (t > 14) return 1;
  const pattern = [1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1];
  const off = Math.floor(rnd(`fl${seed}`, 0, 4));
  return pattern[Math.min(14, t + off)] ? mix(0.55, 1, t / 14) : 0.06;
};

/** A charge runs along a power rail; each letter strikes as it passes, like a tube lighting. */
const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const flash = 1 - prog(f, 0, 20, EASE.out);
  const rail = prog(f, 4, 34, EASE.inOut);
  const railX = mix(250, 1670, rail);
  const letters = TITLE.split("");
  const LW = 1420 / letters.length;
  const epA = prog(f, 26, 18);
  const sub = prog(f, 52, 22);
  const sub2 = prog(f, 70, 22);
  const sym = prog(f, 44, 30, EASE.inOut);
  const hum = 0.92 + 0.08 * Math.sin(f * 0.9) * Math.sin(f * 0.37);
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={22} zoomOut={1.1}>
      <Glow x={960} y={470} size={1500} color={C.orange} a={0.1 + 0.1 * rail} />
      {/* rail */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="t3-rail" x1="0" x2="1">
            <stop offset="0%" stopColor={C.orange} stopOpacity={0} />
            <stop offset="20%" stopColor={C.orange} />
            <stop offset="80%" stopColor={C.gold} />
            <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
          </linearGradient>
        </defs>
        <rect x={250} y={545} width={railX - 250} height={3} fill="url(#t3-rail)" opacity={0.9} />
        {rail > 0 && rail < 1 && (
          <>
            <circle cx={railX} cy={546} r={34} fill={C.amber} opacity={0.18} />
            <circle cx={railX} cy={546} r={12} fill="#fff4dc" />
          </>
        )}
      </svg>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 24, letterSpacing: "0.6em", color: hexA(C.ink, 0.85), opacity: epA, marginBottom: 30, paddingLeft: "0.6em", marginTop: -120 }}>
          EPISODE 03
        </div>
        <div style={{ display: "flex", height: 160, alignItems: "center" }}>
          {letters.map((ch, i) => {
            const x = 250 + (i + 0.5) * LW;
            const at = 4 + ((x - 250) / 1420) * 34 + 1;
            const on = flicker(f, at, i);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  width: ch === " " ? 40 : undefined,
                  fontFamily: FONT.display,
                  fontWeight: 700,
                  fontSize: 140,
                  letterSpacing: "-0.01em",
                  color: on > 0.1 ? "#fff6ea" : "#3a3020",
                  opacity: 0.25 + 0.75 * on * hum,
                  textShadow: on > 0.1 ? `0 0 ${18 * on}px ${hexA(C.amber, 0.9)}, 0 0 ${60 * on}px ${hexA(C.orange, 0.55)}` : "none",
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 56, opacity: sub, transform: `translateY(${(1 - sub) * 20}px)` }}>
          <svg width={90} height={90} style={{ overflow: "visible" }}>
            <g strokeDasharray="400 400" strokeDashoffset={400 * (1 - sym)}>
              <PowerSymbol x={45} y={50} r={40} col={C.amber} glow={0.8} width={8} />
            </g>
          </svg>
          <div
            style={{
              fontFamily: FONT.display,
              fontWeight: 600,
              fontSize: 78,
              letterSpacing: "-0.02em",
              background: `linear-gradient(90deg, ${C.orange}, ${C.amber} 50%, ${C.gold})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Power On
          </div>
        </div>
        <div style={{ marginTop: 16, fontFamily: FONT.ui, fontSize: 30, color: C.ink2, opacity: sub2, letterSpacing: "0.02em" }}>From the power button to your desktop</div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff1df", opacity: flash * 0.5, mixBlendMode: "screen" }} />
      {/* faint scanline shimmer */}
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 2px, transparent 4px)", opacity: clamp(1 - f / 120) }} />
    </SceneShell>
  );
};

const sfx = (_s: SceneData): SfxEvent[] => [
  { at: 0, name: "braam", vol: 0.8 },
  { at: 0, name: "impact", vol: 0.6 },
  { at: 4, name: "sweep_up", vol: 0.3 },
  { at: 8, name: "electrons", vol: 0.25 },
  { at: 20, name: "zap", vol: 0.12 },
  { at: 44, name: "power_up", vol: 0.35 },
  { at: 52, name: "chime", vol: 0.2 },
];

export const Title: SceneModule = {
  Visual,
  sfx,
  hud: false,
  backdrop: { hueA: C.orange, hueB: C.gold, hueC: C.pink, intensity: 0.7, dots: false },
};
