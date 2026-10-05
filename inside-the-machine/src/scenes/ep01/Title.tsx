import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, mix, prog, rnd, spr } from "../../lib/anim";
import type { SceneData, SfxEvent } from "../../lib/timeline";
import { SceneShell } from "../../components/frame";
import { Glow } from "../../components/core";
import type { SceneModule } from "../../components/Episode";

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = "INSIDE THE MACHINE";
  const flash = 1 - prog(f, 0, 26, EASE.out);
  const sweep = prog(f, 26, 50, EASE.inOut);
  const ringP = spr(f, fps, 2, { damping: 26, stiffness: 60 });
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={22} zoomOut={1.12}>
      <AbsoluteFill style={{ background: `radial-gradient(60% 60% at 50% 50%, ${hexA(C.indigo, 0.22)}, transparent 70%)` }} />
      {/* hyperspace streaks */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {new Array(140).fill(0).map((_, i) => {
          const a = rnd(`ta${i}`, 0, Math.PI * 2);
          const sp = rnd(`ts${i}`, 0.6, 1.6);
          const t = ((f * 0.012 * sp + rnd(`to${i}`)) % 1) ** 2;
          const r0 = mix(60, 1400, t);
          const r1 = r0 + 30 + 220 * t;
          const col = [C.cyan, C.violet, C.pink, C.ink][i % 4];
          return (
            <line
              key={i}
              x1={960 + Math.cos(a) * r0}
              y1={540 + Math.sin(a) * r0 * 0.62}
              x2={960 + Math.cos(a) * r1}
              y2={540 + Math.sin(a) * r1 * 0.62}
              stroke={col}
              strokeWidth={1.2 + t * 2}
              strokeOpacity={0.5 * t}
              strokeLinecap="round"
            />
          );
        })}
        <ellipse cx={960} cy={540} rx={760 * ringP} ry={760 * ringP * 0.3} fill="none" stroke={hexA(C.cyan, 0.35)} strokeWidth={1.5} />
        <ellipse cx={960} cy={540} rx={840 * ringP} ry={840 * ringP * 0.34} fill="none" stroke={hexA(C.violet, 0.2)} strokeWidth={1} />
      </svg>
      <Glow x={960} y={540} size={1500} color={C.cyan} a={0.12} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 24, letterSpacing: "0.6em", color: hexA(C.cyan, 0.9), opacity: prog(f, 18, 20), marginBottom: 26, paddingLeft: "0.6em" }}>
          EPISODE 01
        </div>
        <div style={{ position: "relative", display: "flex" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              fontFamily: FONT.display,
              fontWeight: 700,
              fontSize: 150,
              letterSpacing: "-0.02em",
              textAlign: "center",
              whiteSpace: "nowrap",
              color: C.cyan,
              filter: "blur(28px)",
              opacity: 0.45 * prog(f, 10, 30),
            }}
          >
            {title}
          </div>
          {title.split("").map((ch, i) => {
            const p = spr(f, fps, 4 + Math.abs(i - title.length / 2) * 1.3, { damping: 18, stiffness: 110 });
            return (
              <span
                key={i}
                style={{
                  fontFamily: FONT.display,
                  fontWeight: 700,
                  fontSize: 150,
                  letterSpacing: "-0.02em",
                  width: ch === " " ? 46 : undefined,
                  display: "inline-block",
                  opacity: clamp(p * 1.4),
                  transform: `translateY(${(1 - p) * 60}px) scale(${mix(1.4, 1, p)})`,
                  filter: `blur(${(1 - clamp(p * 1.15)) * 18}px)`,
                  backgroundImage: `linear-gradient(100deg, ${C.ink} 0%, ${C.ink} ${mix(-20, 100, sweep) - 12}%, #ffffff ${mix(-20, 100, sweep)}%, ${C.cyanHi} ${mix(-20, 100, sweep) + 6}%, ${C.ink} ${mix(-20, 100, sweep) + 16}%, ${C.ink} 100%)`,
                  backgroundSize: `${title.length * 100}% 100%`,
                  backgroundPosition: `${(i / title.length) * 100}% 0`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  textShadow: "none",
                }}
              >
                {ch === " " ? " " : ch}
              </span>
            );
          })}
        </div>
        <div style={{ height: 2, width: 1100 * prog(f, 20, 40, EASE.inOut), background: `linear-gradient(90deg, transparent, ${C.cyan}, ${C.violet}, transparent)`, marginTop: 30, boxShadow: `0 0 20px ${C.cyan}` }} />
        <div
          style={{
            marginTop: 34,
            fontFamily: FONT.display,
            fontWeight: 600,
            fontSize: 62,
            letterSpacing: "-0.02em",
            color: C.ink,
            opacity: prog(f, 34, 22),
            transform: `translateY(${(1 - prog(f, 34, 22)) * 20}px)`,
          }}
        >
          From Keystroke <span style={{ color: C.cyan }}>→</span> Electron
        </div>
        <div style={{ marginTop: 14, fontFamily: FONT.ui, fontSize: 30, color: C.ink2, opacity: prog(f, 48, 22), letterSpacing: "0.02em" }}>How a modern Mac really works</div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#dff6ff", opacity: flash * 0.42, mixBlendMode: "screen" }} />
    </SceneShell>
  );
};

const sfx = (_s: SceneData): SfxEvent[] => [
  { at: 0, name: "braam", vol: 0.85 },
  { at: 0, name: "impact", vol: 0.7 },
  { at: 6, name: "shimmer", vol: 0.3 },
  { at: 26, name: "sweep_up", vol: 0.2 },
];

export const Title: SceneModule = {
  Visual,
  sfx,
  hud: false,
  backdrop: { hueA: C.cyan, hueB: C.violet, hueC: C.pink, intensity: 0.9, dots: false },
};
