import React from "react";
import { useCurrentFrame } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { Check, OK, ScopeLike, TIER } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    opens: wordAt(c.a1, "opens an entire row"),
    spills: wordAt(c.a1, "spills its charge"),
    bitline: wordAt(c.a1, "called a bitline"),
    faint: c.a2.from,
    catches: wordAt(c.a2, "A sense amplifier"),
    clean: wordAt(c.a2, "a clean one or zero"),
    drains: c.a3.from,
    back: wordAt(c.a3, "write every value back"),
    buffer: wordAt(c.a4, "row buffer"),
    burst: wordAt(c.a4, "one quick burst"),
    end: s.durationInFrames,
  };
};

const ROWS = 6;
const COLS = 12;
const GX = 300;
const GY = 220;
const CW = 76;
const RH = 80;
const ROW = 3; // the row we open
const BIT = (r: number, c: number) => (rnd(`sb${r}-${c}`) > 0.48 ? 1 : 0);
const SA_Y = GY + ROWS * RH + 40;
const RB_Y = SA_Y + 90;
const COL_SEL = [4, 5, 6, 7];

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const wl = prog(f, b.opens - 4, 12);
  const share = prog(f, b.spills - 6, 24, EASE.out); // charge sharing
  const amp = prog(f, b.catches + 4, 18, EASE.inOut); // sense amps resolve
  const drained = share * (1 - prog(f, b.back - 6, 20));
  const restored = prog(f, b.back - 6, 20, EASE.inOut);
  const rbA = prog(f, b.buffer - 6, 14);
  const burst = prog(f, b.burst - 6, 30, EASE.linear);
  const faintZoom = inOut(f, b.faint - 4, 14, b.catches + 20, 14);
  // bitline voltage of one column (0..1, precharged to 0.5)
  const vcol = (c: number) => {
    const d = BIT(ROW, c) ? 1 : -1;
    const nudge = 0.06 * d * share;
    return clamp(0.5 + nudge + (d * 0.5 - nudge) * amp);
  };
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={TIER.dram}>{f < b.drains ? "reading a row" : f < b.buffer - 6 ? "write it back" : "the row buffer"}</Kicker>
      </div>
      <Glow x={GX + (COLS * CW) / 2} y={GY + ROW * RH} size={1100} color={C.amber} a={0.08 + 0.1 * wl} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* bitlines */}
        {new Array(COLS).fill(0).map((_, c) => {
          const x = GX + c * CW + CW / 2;
          const v = vcol(c);
          const col = amp > 0.5 ? (v > 0.5 ? TIER.dram : hexA(C.ink, 0.25)) : hexA(C.cyan, 0.4 + 0.3 * share);
          return <line key={c} x1={x} y1={GY - 20} x2={x} y2={SA_Y - 26} stroke={col} strokeWidth={amp > 0.5 && v > 0.5 ? 4 : 2.5} style={amp > 0.5 && v > 0.5 ? { filter: `drop-shadow(0 0 6px ${TIER.dram})` } : undefined} />;
        })}
        {/* wordlines + cells */}
        {new Array(ROWS).fill(0).map((_, r) => {
          const y = GY + r * RH + RH / 2;
          const open = r === ROW ? wl : 0;
          return (
            <g key={r}>
              <line x1={GX - 40} y1={y - 22} x2={GX + COLS * CW + 10} y2={y - 22} stroke={open > 0.05 ? C.amber : hexA(C.amber, 0.25)} strokeWidth={open > 0.05 ? 4 : 2} style={open > 0.05 ? { filter: `drop-shadow(0 0 ${10 * open}px ${C.amber})` } : undefined} />
              {new Array(COLS).fill(0).map((__, c) => {
                const x = GX + c * CW + CW / 2;
                const bit = BIT(r, c);
                let q = bit;
                if (r === ROW) q = bit ? mix(1, 0.55, drained) * (restored > 0 ? 1 : 1) : mix(0, 0.45, drained);
                if (r === ROW && restored > 0) q = mix(q, bit, restored);
                return (
                  <g key={c}>
                    <rect x={x + 8} y={y - 14} width={26} height={36} rx={4} fill="#0a1416" stroke={hexA(TIER.dram, r === ROW ? 0.9 : 0.45)} strokeWidth={1.5} />
                    <rect x={x + 10} y={y + 20 - 32 * q} width={22} height={32 * q} rx={3} fill={hexA(TIER.dram, 0.8)} />
                    <line x1={x} y1={y + 4} x2={x + 8} y2={y + 4} stroke={hexA(C.ink, 0.4)} strokeWidth={2} />
                  </g>
                );
              })}
            </g>
          );
        })}
        <text x={GX - 50} y={GY + ROW * RH + RH / 2 - 16} textAnchor="end" fontFamily={FONT.mono} fontSize={16} fill={C.amber} opacity={wl}>
          open row →
        </text>
        {/* sense amplifiers */}
        {new Array(COLS).fill(0).map((_, c) => {
          const x = GX + c * CW + CW / 2;
          const v = vcol(c);
          const on = amp > 0.5;
          return (
            <g key={c}>
              <path d={`M${x - 20},${SA_Y - 26} L${x + 20},${SA_Y - 26} L${x},${SA_Y + 8} Z`} fill={on ? hexA(v > 0.5 ? TIER.dram : C.ink, 0.35) : hexA(C.violet, 0.15)} stroke={on ? (v > 0.5 ? TIER.dram : hexA(C.ink, 0.5)) : hexA(C.violet, 0.6)} strokeWidth={2} />
            </g>
          );
        })}
        <text x={GX - 50} y={SA_Y - 4} textAnchor="end" fontFamily={FONT.mono} fontSize={16} fill={C.violet}>
          sense amps
        </text>
        {/* row buffer */}
        <g opacity={rbA}>
          <text x={GX - 50} y={RB_Y + 30} textAnchor="end" fontFamily={FONT.mono} fontSize={16} fill={C.cyan}>
            row buffer
          </text>
          {new Array(COLS).fill(0).map((_, c) => {
            const x = GX + c * CW + 8;
            const sel = COL_SEL.includes(c);
            return (
              <g key={c}>
                <rect x={x} y={RB_Y} width={CW - 16} height={48} rx={8} fill={hexA(C.cyan, sel && burst > 0 ? 0.35 : 0.12)} stroke={sel && burst > 0 ? C.cyan : hexA(C.cyan, 0.5)} strokeWidth={sel && burst > 0 ? 2.5 : 1.5} />
                <text x={x + (CW - 16) / 2} y={RB_Y + 32} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={22} fill={C.ink}>
                  {BIT(ROW, c)}
                </text>
              </g>
            );
          })}
          {/* the burst */}
          {burst > 0 &&
            COL_SEL.map((c, i) => {
              const p = clamp(burst * 2.2 - i * 0.25);
              if (p <= 0 || p >= 1) return null;
              const x0 = GX + c * CW + CW / 2;
              const x = mix(x0, 1880, p);
              return (
                <g key={c} transform={`translate(${x} ${RB_Y + 24})`}>
                  <rect x={-26} y={-18} width={52} height={36} rx={10} fill={hexA(C.cyan, 0.35)} stroke={C.cyan} strokeWidth={2} style={{ filter: `drop-shadow(0 0 10px ${C.cyan})` }} />
                  <text y={7} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={18} fill={C.ink}>
                    {BIT(ROW, c)}
                  </text>
                </g>
              );
            })}
          {burst > 0 && (
            <text x={GX + (COL_SEL[0] + 2) * CW} y={RB_Y + 92} textAnchor="middle" fontFamily={FONT.mono} fontSize={18} fill={C.cyan}>
              requested columns → out, in one burst
            </text>
          )}
        </g>
        {restored > 0.9 && f < b.buffer && <Check x={GX + COLS * CW + 60} y={GY + ROW * RH + RH / 2 - 10} r={22} a={prog(f, b.back + 14, 8)} />}
        {/* scope: one bitline's voltage */}
        <ScopeLike x={1330} y={230} w={500} h={300} share={share} amp={amp} zoom={faintZoom} f={f} />
      </svg>
      {restored > 0.5 && f < b.buffer && (
        <div style={{ position: "absolute", left: GX + COLS * CW + 100, top: GY + ROW * RH + 10, fontFamily: FONT.mono, fontSize: 18, color: OK, opacity: prog(f, b.back + 14, 10) }}>
          restored
        </div>
      )}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.opens - 4, name: "zap", vol: 0.3 },
    { at: b.spills - 6, name: "electrons", vol: 0.25 },
    { at: b.faint - 4, name: "blip_lo", vol: 0.25 },
    { at: b.catches + 4, name: "pop_hi", vol: 0.35 },
    { at: b.clean, name: "chime", vol: 0.25 },
    { at: b.back - 6, name: "sweep_up", vol: 0.25 },
    { at: b.buffer - 6, name: "blip", vol: 0.25 },
    { at: b.burst - 6, name: "data", vol: 0.35 },
  ];
};

export const SenseAmp: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.teal, hueB: C.amber, hueC: C.violet, intensity: 0.5 },
};
