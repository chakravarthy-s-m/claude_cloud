import React from "react";
import { useCurrentFrame } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { BAD, OK, Packet, TIER } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    many: c.k1.from,
    copies: wordAt(c.k1, "copies of the same line"),
    writes: c.k2.from,
    invalid: wordAt(c.k2, "invalidated"),
    stale: wordAt(c.k2, "stale value"),
    honest: c.k3.from,
    coherence: wordAt(c.k3, "coherence"),
    end: s.durationInFrames,
  };
};

const CORES = [0, 1, 2, 3];
const CX = (i: number) => 330 + i * 420;
const CY = 330;
const L1Y = 560;
const L2Y = 840;
const HAS = [true, true, false, true]; // which cores hold a copy of x
const WRITER = 1;
const READER = 3;

type St = "S" | "M" | "I" | "-";
const STATE_COL: Record<St, string> = { S: C.cyan, M: C.orange, I: hexA(C.ink, 0.35), "-": hexA(C.ink, 0.2) };
const STATE_NAME: Record<St, string> = { S: "shared", M: "modified", I: "invalid", "-": "empty" };

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const copiesA = (i: number) => prog(f, b.copies - 4 + i * 4, 12);
  const write = prog(f, b.writes + 6, 12, EASE.out);
  const inval = prog(f, b.invalid - 8, 20, EASE.out);
  const readAt = b.stale - 6;
  const read = prog(f, readAt, 30, EASE.inOut);
  const ok = prog(f, readAt + 30, 10, EASE.outBack);
  const coA = prog(f, b.coherence - 6, 16);
  const val = (i: number) => {
    if (i === WRITER && write > 0.5) return 8;
    if (i === READER && ok > 0.5) return 8;
    return 7;
  };
  const state = (i: number): St => {
    if (!HAS[i]) return "-";
    if (i === WRITER) return ok > 0.5 ? "S" : write > 0.5 ? "M" : "S";
    if (i === READER) return ok > 0.5 ? "S" : inval > 0.5 ? "I" : "S";
    return inval > 0.5 ? "I" : "S";
  };
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.cyan}>{coA > 0.5 ? "coherence" : "many cores, many copies"}</Kicker>
      </div>
      <Glow x={960} y={600} size={1500} color={C.cyan} a={0.07 + 0.08 * coA} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* shared L2 */}
        <rect x={180} y={L2Y - 50} width={1560} height={110} rx={22} fill={hexA(TIER.l2, 0.1)} stroke={hexA(TIER.l2, 0.7)} strokeWidth={2} />
        <text x={210} y={L2Y - 10} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={TIER.l2}>
          SHARED L2 · keeps track of who has which line
        </text>
        <text x={210} y={L2Y + 34} fontFamily={FONT.mono} fontSize={22} fill={C.ink2}>
          x = {val(WRITER) === 8 && read > 0.5 ? 8 : 7}
        </text>
        {CORES.map((i) => {
          const x = CX(i);
          const st = state(i);
          const isW = i === WRITER;
          const hasA = HAS[i] ? copiesA(i) : 0;
          return (
            <g key={i}>
              {/* core */}
              <rect x={x - 150} y={CY - 90} width={300} height={150} rx={22} fill="rgba(30,10,26,0.9)" stroke={TIER.reg} strokeWidth={isW && write > 0 && write < 1 ? 4 : 2.5} style={isW && write > 0.05 ? { filter: `drop-shadow(0 0 ${14 * (1 - prog(f, b.writes + 30, 20))}px ${C.orange})` } : undefined} />
              <text x={x} y={CY - 44} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={18} letterSpacing="0.3em" fill={TIER.reg}>
                CORE {i}
              </text>
              <text x={x} y={CY + 20} textAnchor="middle" fontFamily={FONT.mono} fontSize={24} fill={C.ink2}>
                {isW && write > 0.05 ? "x = 8" : i === READER && read > 0.05 ? "read x" : "…"}
              </text>
              <line x1={x} y1={CY + 60} x2={x} y2={L1Y - 60} stroke={hexA(C.ink, 0.2)} strokeWidth={3} />
              {/* its L1 */}
              <rect x={x - 150} y={L1Y - 60} width={300} height={120} rx={18} fill={hexA(TIER.l1, 0.1)} stroke={hexA(TIER.l1, 0.6)} strokeWidth={2} />
              <text x={x - 130} y={L1Y - 30} fontFamily={FONT.ui} fontWeight={700} fontSize={14} letterSpacing="0.25em" fill={TIER.l1}>
                L1
              </text>
              <g opacity={HAS[i] ? hasA : 0.6}>
                <rect x={x - 120} y={L1Y - 14} width={240} height={56} rx={12} fill={hexA(STATE_COL[st], st === "I" ? 0.06 : 0.2)} stroke={STATE_COL[st]} strokeWidth={2.5} strokeDasharray={st === "I" ? "8 6" : undefined} />
                <text x={x - 100} y={L1Y + 22} fontFamily={FONT.mono} fontWeight={700} fontSize={26} fill={st === "I" ? C.ink3 : C.ink} textDecoration={st === "I" ? "line-through" : undefined}>
                  {HAS[i] ? `x = ${val(i)}` : "—"}
                </text>
                {HAS[i] && (
                  <text x={x + 100} y={L1Y + 22} textAnchor="end" fontFamily={FONT.mono} fontSize={16} fill={STATE_COL[st]}>
                    {STATE_NAME[st]}
                  </text>
                )}
              </g>
              <line x1={x} y1={L1Y + 60} x2={x} y2={L2Y - 50} stroke={hexA(C.ink, 0.2)} strokeWidth={3} />
            </g>
          );
        })}
        {/* invalidation messages from the writer to every other copy */}
        {inval > 0 && inval < 1 &&
          CORES.filter((i) => HAS[i] && i !== WRITER).map((i) => {
            const x0 = CX(WRITER);
            const x1 = CX(i);
            const p = inval;
            return (
              <g key={i}>
                <path d={`M${x0},${L1Y + 60} C${x0},${L1Y + 160} ${x1},${L1Y + 160} ${x1},${L1Y + 60}`} fill="none" stroke={BAD} strokeWidth={2.5} strokeDasharray={`${p * 900} 900`} />
                <circle cx={mix(x0, x1, p)} cy={L1Y + 135} r={8} fill={BAD} style={{ filter: `drop-shadow(0 0 8px ${BAD})` }} />
              </g>
            );
          })}
        {inval > 0.2 && inval < 1.2 && f < b.stale + 20 && (
          <text x={(CX(0) + CX(3)) / 2} y={L1Y + 190} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={20} fill={BAD} opacity={1 - prog(f, b.stale + 4, 14)}>
            “invalidate your copy of x”
          </text>
        )}
        {/* the reader misses and gets the fresh value */}
        <Packet x0={CX(WRITER) + 60} y0={L1Y + 100} x1={CX(READER) - 60} y1={L1Y + 100} p={read} col={OK} label="x = 8" w={100} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, textAlign: "center", opacity: coA }}>
        <span style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 24, letterSpacing: "0.3em", color: C.cyan }}>EVERY CORE SEES THE SAME MEMORY</span>
      </div>
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    ...[0, 1, 3].map((i) => ({ at: b.copies - 4 + i * 4, name: "pop", vol: 0.25, rate: 1 + i * 0.05 })),
    { at: b.writes + 6, name: "zap", vol: 0.3 },
    { at: b.invalid - 8, name: "sweep_down", vol: 0.3 },
    { at: b.invalid + 6, name: "blip_lo", vol: 0.3 },
    { at: b.stale - 6, name: "whoosh_soft", vol: 0.25 },
    { at: b.stale + 24, name: "chime", vol: 0.3 },
    { at: b.coherence - 6, name: "shimmer", vol: 0.3 },
  ];
};

export const Coherence: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.cyan, hueB: C.blue, hueC: C.orange, intensity: 0.5 },
};
