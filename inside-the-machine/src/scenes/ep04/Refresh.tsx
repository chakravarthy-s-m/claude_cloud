import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { BAD, OK, TIER } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    leak: c.f1.from,
    drains: c.f2.from,
    zeros: wordAt(c.f2, "fade into zeros"),
    rewrite: c.f3.from,
    thirty: wordAt(c.f3, "thirty times a second"),
    forget: c.f4.from,
    reminded: wordAt(c.f4, "being reminded"),
    tight: c.f5.from,
    over: wordAt(c.f5, "over and over"),
    flip: wordAt(c.f5, "can flip"),
    called: wordAt(c.f5, "It's called"),
    watches: wordAt(c.f5, "watches out"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

const ROWS = 14;
const COLS = 30;
const GX = 210;
const GY = 250;
const CW = 50;
const RH = 46;
const bitOf = (r: number, c: number) => (rnd(`rb${r}-${c}`) > 0.42 ? 1 : 0);
const leakOf = (r: number, c: number) => rnd(`lk${r}-${c}`, 0.003, 0.0085);
const PERIOD = 46; // frames per refresh sweep, on screen (real life: 32 ms)

// ---------------------------------------------------------------- act 1: leak and refresh
const Leak: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const t0 = b.leak;
  const refreshOn = f >= b.rewrite;
  const sweepRow = refreshOn ? (((f - b.rewrite) / PERIOD) * ROWS) % ROWS : -1;
  const lastRefresh = (r: number) => {
    if (!refreshOn) return t0;
    const k = Math.floor((f - b.rewrite - (r / ROWS) * PERIOD) / PERIOD);
    if (k < 0) return t0;
    return b.rewrite + (r / ROWS) * PERIOD + k * PERIOD;
  };
  const lost = new Array(ROWS * COLS).fill(0).filter((_, i) => {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    return bitOf(r, c) && 1 - leakOf(r, c) * (f - lastRefresh(r)) < 0.5;
  }).length;
  const sweeps = refreshOn ? Math.floor((f - b.rewrite) / PERIOD) : 0;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={refreshOn ? OK : BAD}>{refreshOn ? "refresh: read it, write it back" : "capacitors leak"}</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {new Array(ROWS).fill(0).map((_, r) =>
          new Array(COLS).fill(0).map((__, c) => {
            const x = GX + c * CW;
            const y = GY + r * RH;
            const bit = bitOf(r, c);
            const q = bit ? clamp(1 - leakOf(r, c) * Math.max(0, f - lastRefresh(r))) : 0.04;
            const danger = bit && q < 0.55;
            return (
              <g key={`${r}-${c}`}>
                <rect x={x} y={y} width={CW - 12} height={RH - 10} rx={5} fill="#091416" stroke={danger ? BAD : hexA(TIER.dram, 0.35)} strokeWidth={danger ? 2 : 1} />
                <rect x={x + 2} y={y + RH - 12 - (RH - 14) * q} width={CW - 16} height={(RH - 14) * q} rx={3} fill={hexA(danger ? BAD : TIER.dram, 0.85)} />
              </g>
            );
          }),
        )}
        {/* threshold reminder */}
        <text x={GX + COLS * CW + 10} y={GY + 20} fontFamily={FONT.mono} fontSize={16} fill={C.ink3}>
          ▮ full = 1
        </text>
        <text x={GX + COLS * CW + 10} y={GY + 46} fontFamily={FONT.mono} fontSize={16} fill={BAD}>
          ▮ below half → read as 0
        </text>
        {/* the refresh sweep */}
        {refreshOn && (
          <g>
            <rect x={GX - 20} y={GY + sweepRow * RH - 6} width={COLS * CW + 20} height={RH} rx={10} fill={hexA(OK, 0.12)} stroke={OK} strokeWidth={2.5} style={{ filter: `drop-shadow(0 0 12px ${OK})` }} />
          </g>
        )}
      </svg>
      <div style={{ position: "absolute", left: GX, top: GY + ROWS * RH + 20, display: "flex", gap: 60, alignItems: "flex-end" }}>
        <div style={{ opacity: prog(f, b.drains, 14) }}>
          <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 48, color: lost > 0 ? BAD : OK, fontVariantNumeric: "tabular-nums" }}>{lost}</div>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 15, letterSpacing: "0.3em", color: hexA(C.ink, 0.6) }}>BITS FORGOTTEN</div>
        </div>
        <div style={{ opacity: prog(f, b.rewrite + 4, 14) }}>
          <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 48, color: OK, fontVariantNumeric: "tabular-nums" }}>{sweeps}</div>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 15, letterSpacing: "0.3em", color: hexA(C.ink, 0.6) }}>REFRESH SWEEPS</div>
        </div>
        <div style={{ opacity: prog(f, b.thirty - 4, 14), fontFamily: FONT.mono, fontSize: 20, color: C.ink2, lineHeight: 1.5 }}>
          every row, at least every <span style={{ color: OK }}>32 ms</span>
          <br />
          <span style={{ color: C.ink3 }}>(slowed down here, so you can see it)</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 170, textAlign: "center", opacity: inOut(f, b.forget - 4, 16, b.tight - 10, 12) }}>
        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 44, color: C.ink }}>
          forgetting, <span style={{ color: OK }}>reminded</span>, forgetting, <span style={{ color: OK }}>reminded</span>…
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 2: Rowhammer
const HR = 5;
const HC = 14;
const AGG = 2;
const FLIP = { r: 1, c: 8 };

const Hammer: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const hammer = f >= b.over - 4 && f < b.called + 10;
  const blink = hammer ? (Math.floor((f - b.over) / 2) % 2 === 0 ? 1 : 0.2) : 0;
  const count = hammer || f >= b.called ? Math.floor(clamp((f - b.over + 4) / (b.called - b.over + 10)) ** 1.6 * 20000) : 0;
  const flipped = f >= b.flip + 6;
  const flipFlash = prog(f, b.flip + 6, 3) * (1 - prog(f, b.flip + 9, 24));
  const guard = prog(f, b.watches - 6, 20);
  const nameA = prog(f, b.called - 4, 14);
  const ox = 960 - (HC * 86) / 2;
  const oy = 330;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={BAD}>{nameA > 0.5 ? "Rowhammer" : "too close for comfort"}</Kicker>
      </div>
      <Glow x={960} y={oy + AGG * 96} size={1100} color={BAD} a={0.1 * blink} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {new Array(HR).fill(0).map((_, r) => {
          const y = oy + r * 96;
          const isAgg = r === AGG;
          const isVictim = Math.abs(r - AGG) === 1;
          return (
            <g key={r}>
              <line x1={ox - 40} y1={y - 10} x2={ox + HC * 86} y2={y - 10} stroke={isAgg ? hexA(C.amber, 0.3 + 0.7 * blink) : hexA(C.amber, 0.2)} strokeWidth={isAgg ? 4 : 2} />
              {isVictim && guard > 0.01 && <rect x={ox - 30} y={y - 22} width={HC * 86 + 10} height={86} rx={12} fill={hexA(OK, 0.08 * guard)} stroke={OK} strokeWidth={2} opacity={guard} />}
              {new Array(HC).fill(0).map((__, c) => {
                const x = ox + c * 86;
                let bit = rnd(`hb${r}-${c}`) > 0.4 ? 1 : 0;
                if (r === FLIP.r && c === FLIP.c) bit = 1;
                const isFlip = r === FLIP.r && c === FLIP.c && flipped && guard < 0.5;
                const jitter = isVictim && hammer ? (rnd(`j${r}-${c}-${f}`) - 0.5) * 3 : 0;
                const q = isFlip ? 0.1 : bit ? 0.9 : 0.05;
                return (
                  <g key={c} transform={`translate(${jitter} 0)`}>
                    <rect x={x} y={y} width={60} height={60} rx={8} fill="#0a1416" stroke={isFlip ? BAD : isAgg ? hexA(C.amber, 0.4 + 0.6 * blink) : hexA(TIER.dram, 0.45)} strokeWidth={isFlip ? 3 : 1.5} />
                    <rect x={x + 4} y={y + 56 - 52 * q} width={52} height={52 * q} rx={5} fill={hexA(isFlip ? BAD : TIER.dram, 0.8)} />
                    <text x={x + 30} y={y + 39} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={22} fill={isFlip ? "#fff" : C.ink}>
                      {isFlip ? 0 : bit}
                    </text>
                  </g>
                );
              })}
              <text x={ox - 54} y={y + 38} textAnchor="end" fontFamily={FONT.mono} fontSize={16} fill={isAgg ? C.amber : isVictim ? hexA(BAD, 0.9) : C.ink3}>
                {isAgg ? "hammered row" : isVictim ? "neighbor" : ""}
              </text>
            </g>
          );
        })}
        {flipFlash > 0.01 && guard < 0.5 && <circle cx={ox + FLIP.c * 86 + 30} cy={oy + FLIP.r * 96 + 30} r={60 + 80 * (1 - flipFlash)} fill="none" stroke={BAD} strokeWidth={4} opacity={flipFlash} />}
      </svg>
      <div style={{ position: "absolute", left: ox, top: oy + HR * 96 + 20, display: "flex", gap: 60, alignItems: "flex-end" }}>
        <div>
          <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 48, color: C.amber, fontVariantNumeric: "tabular-nums" }}>{count.toLocaleString("en-US")}</div>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 15, letterSpacing: "0.3em", color: hexA(C.ink, 0.6) }}>TIMES THE ROW WAS OPENED</div>
        </div>
        {flipped && guard < 0.5 && <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 44, color: BAD }}>a bit flipped, in a row nobody touched</div>}
        {guard > 0.5 && <div style={{ fontFamily: FONT.mono, fontSize: 22, color: OK }}>defense: spot hammered rows, refresh their neighbors early</div>}
      </div>
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const a1 = 1 - prog(f, b.tight - 12, 10, EASE.in);
  const a2 = prog(f, b.tight - 2, 12);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      {a1 > 0.01 && <Leak b={b} a={a1} />}
      {a2 > 0.01 && <Hammer b={b} a={a2} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const sweeps: SfxEvent[] = [];
  for (let t = b.rewrite; t < b.tight - 14; t += PERIOD) sweeps.push({ at: t, name: "scan", vol: 0.12 });
  const hits: SfxEvent[] = [];
  for (let t = b.over - 4; t < b.called + 10; t += 4) hits.push({ at: t, name: "tick", vol: 0.1, rate: 1.4 });
  return [
    { at: b.leak, name: "power_down", vol: 0.3 },
    { at: b.zeros - 6, name: "glitch", vol: 0.2 },
    ...sweeps,
    { at: b.reminded - 4, name: "shimmer", vol: 0.25 },
    ...hits,
    { at: b.flip + 6, name: "zap", vol: 0.4 },
    { at: b.flip + 7, name: "alarm", vol: 0.12 },
    { at: b.watches - 6, name: "chime", vol: 0.3 },
  ];
};

export const Refresh: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.teal, hueB: C.rose, hueC: C.green, intensity: 0.5 },
};
