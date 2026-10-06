import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { Backdrop, FontGate, Glow, Grain } from "../../components/core";
import { Check, PowerSymbol } from "../../scenes/ep03/shared";

const LINKS = ["PRESS", "POWER", "CRYSTAL", "CLOCK", "CORE", "BOOT ROM", "LLB", "iBOOT", "KERNEL", "SYSTEM", "launchd", "LOGIN", "YOU"];

/** Poster / YouTube thumbnail for Episode 03: the chain of trust, forged into a power button. */
export const Ep03Thumbnail: React.FC = () => {
  const cx = 1340;
  const cy = 560;
  const R = 330;
  const th0 = -52;
  const th1 = 232;
  return (
    <FontGate>
      <AbsoluteFill style={{ background: C.void }}>
        <Backdrop hueA={C.orange} hueB={C.gold} hueC={C.violet} intensity={1.0} dust={false} />
        <Glow x={cx} y={cy} size={1300} color={C.amber} a={0.3} />
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <PowerSymbol x={cx} y={cy + 30} r={R + 70} col={hexA(C.gold, 0.2)} width={5} />
          {LINKS.map((t, k) => {
            let x: number;
            let y: number;
            let rot: number;
            if (k === 0) {
              x = cx;
              y = cy - 205;
              rot = 90;
            } else {
              const th = th0 + ((k - 1) / (LINKS.length - 2)) * (th1 - th0);
              const r = (th * Math.PI) / 180;
              x = cx + Math.cos(r) * R;
              y = cy + Math.sin(r) * R;
              rot = th + 90;
            }
            const flip = rot > 90 && rot < 270;
            return (
              <g key={t} transform={`translate(${x} ${y}) rotate(${rot}) scale(0.62)`}>
                <rect x={-105} y={-48} width={210} height={96} rx={48} fill={hexA(C.gold, 0.18)} stroke={C.gold} strokeWidth={7} style={{ filter: `drop-shadow(0 0 18px ${hexA(C.gold, 0.85)})` }} />
                <rect x={-87} y={-30} width={174} height={60} rx={30} fill="none" stroke={hexA(C.gold, 0.35)} strokeWidth={2} />
                <text y={10} textAnchor="middle" fontFamily={t === "launchd" ? FONT.mono : FONT.display} fontWeight={700} fontSize={28} fill={C.ink} transform={flip ? "rotate(180)" : undefined}>
                  {t}
                </text>
              </g>
            );
          })}
          <Check x={cx + 390} y={cy - 330} r={40} />
        </svg>
        <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(2,3,9,0.96) 0%, rgba(2,3,9,0.86) 34%, rgba(2,3,9,0.15) 58%, rgba(2,3,9,0) 75%)" }} />
        <div style={{ position: "absolute", left: 110, top: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 30, padding: "6px 16px", borderRadius: 12, color: "#05070d", background: C.amber }}>EP 03</span>
            <span style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 30, letterSpacing: "0.35em", color: hexA(C.ink, 0.85) }}>INSIDE THE MACHINE</span>
          </div>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 190, lineHeight: 0.95, letterSpacing: "-0.04em", color: C.ink, marginTop: 40 }}>POWER</div>
          <div
            style={{
              fontFamily: FONT.display,
              fontWeight: 700,
              fontSize: 190,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              background: `linear-gradient(90deg, ${C.orange}, ${C.amber} 45%, ${C.gold})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            ON
          </div>
          <div style={{ fontFamily: FONT.ui, fontWeight: 500, fontSize: 46, color: C.ink2, marginTop: 34, maxWidth: 820 }}>What really happens when you press the button</div>
        </div>
        <Grain opacity={0.05} />
      </AbsoluteFill>
    </FontGate>
  );
};
