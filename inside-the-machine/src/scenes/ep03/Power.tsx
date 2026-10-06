import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { cam, project } from "../../lib/proj3d";
import { Chip3D, ChipLabel, blockAnchor } from "../../components/chip";
import { Camera, Glow, Kicker, NeonPath, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { Check, Cross, PowerSymbol, ScopeFrame, BAD, OK } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    w1: c.w1.from,
    close: wordAt(c.w1, "closes a tiny switch") + 6,
    wakes: wordAt(c.w1, "wakes a power"),
    never: wordAt(c.w1, "never fully sleeps"),
    w2: c.w2.from,
    supplies: wordAt(c.w2, "power supplies"),
    order: wordAt(c.w2, "strict order"),
    settle: wordAt(c.w2, "settle"),
    w2end: c.w2.end,
    wrong: c.w2b.from,
    misbehave: wordAt(c.w2b, "misbehave"),
    damaged: wordAt(c.w2b, "damaged"),
    w2bEnd: c.w2b.end,
    quartz: c.w3.from,
    vibrate: wordAt(c.w3, "vibrate"),
    hz: wordAt(c.w3, "twenty-four megahertz"),
    ep1: wordAt(c.w3, "Episode One"),
    lock: wordAt(c.w3, "the clocks lock on"),
    reset: c.w4.from,
    released: wordAt(c.w4, "released"),
    core: wordAt(c.w4, "A single processor core"),
    wakeUp: wordAt(c.w4, "wakes up"),
    knowing: wordAt(c.w4, "knowing exactly"),
    where: wordAt(c.w4, "where to find"),
    first: wordAt(c.w4, "first instruction"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

// ---------------------------------------------------------------- schematic geometry
const BTN = { x: 250, y: 450, r: 64 };
const SWA = { x: 400, y: 450 };
const SWB = { x: 500, y: 450 };
const PM = { x: 620, y: 300, w: 300, h: 300 };
const SOC = { x: 1340, y: 280, w: 330, h: 340 };
const RAILS = [
  { v: 1.8, name: "I/O", col: C.gold },
  { v: 1.2, name: "MEMORY", col: C.amber },
  { v: 0.9, name: "FABRIC", col: C.orange },
  { v: 0.8, name: "GPU", col: C.rose },
  { v: 0.75, name: "CPU", col: C.pink },
];
const railY = (k: number) => PM.y + 50 + k * 50;
// SoC power domains (inside the SoC box), one per rail
const DOMAINS = [
  { k: 0, x: 0, y: 0, w: 1, h: 1, ring: true },
  { k: 1, x: 0.72, y: 0.1, w: 0.2, h: 0.8 },
  { k: 2, x: 0.1, y: 0.42, w: 0.58, h: 0.16 },
  { k: 3, x: 0.1, y: 0.62, w: 0.58, h: 0.28 },
  { k: 4, x: 0.1, y: 0.1, w: 0.58, h: 0.28 },
];

/** Underdamped step response: smooth start, ~9% overshoot, settles by u≈1.6. */
const step = (u: number) => (u <= 0 ? 0 : 1 - Math.exp(-3.2 * u) * (Math.cos(4.2 * u) + 0.76 * Math.sin(4.2 * u)));

const SCOPE = { x: 420, y: 680, w: 1080, h: 330 };
const LANE = (SCOPE.h - 70) / 5;

// ---------------------------------------------------------------- act 1: switch → PMIC → rails
const Schematic: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // timing for the correct sequence
  const T0 = b.w2 + 10;
  const T1 = b.w2end + 14;
  const starts = RAILS.map((_, k) => b.supplies + 6 + k * Math.round((b.w2end - b.supplies - 40) / 5));
  const D = 24; // frames for u = 1
  const railP = (k: number, t = f) => step((t - starts[k]) / D);
  const settled = (k: number) => f > starts[k] + D * 1.6;

  // the wrong-order replay
  const wrongA = inOut(f, b.wrong - 4, 12, b.w2bEnd + 4, 16);
  const W0 = b.wrong + 6;
  const wStarts = [4, 0, 3, 1, 2].map((o) => W0 + o * 7);
  const wP = (k: number, t = f) => step((t - wStarts[k]) / (D * 0.8));
  const glitch = prog(f, b.misbehave - 2, 6) * (1 - prog(f, b.w2bEnd - 6, 14));
  const crack = prog(f, b.damaged - 2, 10, EASE.out) * (1 - prog(f, b.w2bEnd - 4, 14));

  // switch + PMIC wake
  const close = spr(f, fps, b.close - 4, { damping: 13, stiffness: 300 });
  const lever = mix(-30, 0, clamp(close));
  const sig = prog(f, b.close, 18, EASE.inOut);
  const wake = prog(f, b.wakes, 24);
  const breath = 0.5 + 0.5 * Math.sin((f / fps) * Math.PI * 0.9);
  const neverA = inOut(f, b.never - 6, 16, b.w2 + 20, 16);

  const cams = [
    { f: 0, x: -440, y: -90, s: 1.45 },
    { f: b.w1 + 20, x: -400, y: -90, s: 1.5 },
    { f: b.never + 6, x: -280, y: -60, s: 1.38 },
    { f: b.supplies - 4, x: 0, y: 100, s: 1.0 },
    { f: b.wrong, x: 0, y: 100, s: 1.0 },
    { f: b.damaged, x: 60, y: 70, s: 1.05 },
    { f: b.quartz + 10, x: 60, y: 80, s: 1.02 },
  ];
  const lit = (k: number) => clamp(railP(k)) * (1 - wrongA) + clamp(wP(k)) * wrongA;
  const socShake = glitch * (Math.sin(f * 2.3) * 4 + Math.sin(f * 3.7) * 3);
  const flick = (k: number) => (glitch > 0.01 ? (rnd(`fl${k}-${Math.floor(f / 2)}`) > 0.5 ? 1 : 0.25) : 1);

  const tToX = (t: number) => SCOPE.x + 120 + ((t - T0) / (T1 - T0)) * (SCOPE.w - 150);
  const laneBase = (k: number) => SCOPE.y + 54 + (k + 1) * LANE - 6;
  const trace = (k: number, P: (k: number, t: number) => number, from: number, to: number) => {
    let d = "";
    for (let t = from; t <= to; t += 1) {
      const v = P(k, t);
      const x = tToX(t);
      const y = laneBase(k) - v * (RAILS[k].v / 1.8) * (LANE - 14);
      d += `${t === from ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }
    return d;
  };
  const scopeA = prog(f, b.supplies - 10, 20);
  const now = Math.min(f, T1);

  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Camera keys={cams}>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {/* ---- button */}
          <circle cx={BTN.x} cy={BTN.y} r={BTN.r + 18} fill={hexA(C.orange, 0.05 + 0.15 * prog(f, b.close - 2, 6) * (1 - prog(f, b.close + 4, 30)))} />
          <circle cx={BTN.x} cy={BTN.y} r={BTN.r} fill="#141826" stroke={hexA(C.ink, 0.25)} strokeWidth={2} />
          <g transform={`translate(${BTN.x} ${BTN.y}) scale(${1 - 0.06 * clamp(close) * (1 - prog(f, b.close + 10, 10))}) translate(${-BTN.x} ${-BTN.y})`}>
            <PowerSymbol x={BTN.x} y={BTN.y + 4} r={30} col={close > 0.5 ? "#ffd9a8" : C.ink2} width={6} glow={close > 0.5 ? 0.6 : 0} />
          </g>
          <text x={BTN.x} y={BTN.y + BTN.r + 42} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={17} letterSpacing="0.25em" fill={hexA(C.ink, 0.6)}>
            POWER BUTTON
          </text>
          {/* ---- wires + switch */}
          <path d={`M${BTN.x + BTN.r},${BTN.y} L${SWA.x},${SWA.y}`} stroke={hexA(C.ink, 0.35)} strokeWidth={3} />
          <path d={`M${SWB.x},${SWB.y} L${PM.x},${SWB.y}`} stroke={hexA(C.ink, 0.35)} strokeWidth={3} />
          <NeonPath d={`M${BTN.x + BTN.r},${BTN.y} L${SWA.x},${SWA.y} L${SWB.x},${SWB.y} L${PM.x},${SWB.y}`} color={C.orange} width={3} progress={sig} length={360} />
          <circle cx={SWA.x} cy={SWA.y} r={8} fill="#0b0e18" stroke={C.ink2} strokeWidth={3} />
          <circle cx={SWB.x} cy={SWB.y} r={8} fill="#0b0e18" stroke={C.ink2} strokeWidth={3} />
          <line x1={SWA.x} y1={SWA.y} x2={SWA.x + Math.cos((lever * Math.PI) / 180) * 100} y2={SWA.y + Math.sin((lever * Math.PI) / 180) * 100} stroke={close > 0.9 ? C.amber : C.ink} strokeWidth={6} strokeLinecap="round" />
          <text x={(SWA.x + SWB.x) / 2} y={SWA.y + 48} textAnchor="middle" fontFamily={FONT.mono} fontSize={16} fill={hexA(C.ink, 0.55)}>
            {close > 0.9 ? "closed" : "open"}
          </text>
          {prog(f, b.close - 1, 2) > 0 && prog(f, b.close, 16) < 1 && <Spark x={SWB.x} y={SWB.y} color={C.amber} r={9} a={1 - prog(f, b.close, 16)} />}
          {sig > 0.02 && sig < 0.98 && (() => {
            const L1 = SWA.x - (BTN.x + BTN.r);
            const L2 = SWB.x - SWA.x;
            const L3 = PM.x - SWB.x;
            const d = sig * (L1 + L2 + L3);
            const x = BTN.x + BTN.r + d;
            return <Spark x={x} y={BTN.y} color={C.orange} r={7} />;
          })()}

          {/* ---- PMIC */}
          <rect x={PM.x - 10} y={PM.y - 10} width={PM.w + 20} height={PM.h + 20} rx={26} fill="none" stroke={hexA(C.orange, 0.3 * wake)} strokeWidth={10} />
          <rect x={PM.x} y={PM.y} width={PM.w} height={PM.h} rx={18} fill="#121624" stroke={wake > 0.5 ? C.orange : hexA(C.ink, 0.3)} strokeWidth={2.5} />
          {new Array(6).fill(0).map((_, i) => (
            <g key={i}>
              <rect x={PM.x - 14} y={PM.y + 28 + i * 46} width={14} height={14} fill="#2a3044" />
              <rect x={PM.x + PM.w} y={PM.y + 28 + i * 46} width={14} height={14} fill="#2a3044" />
            </g>
          ))}
          <rect x={PM.x + 20} y={PM.y + 20} width={118} height={64} rx={10} fill={hexA(C.orange, 0.12 + 0.2 * breath * (1 - wake))} stroke={hexA(C.orange, 0.8)} strokeWidth={1.5} />
          <text x={PM.x + 79} y={PM.y + 49} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={13} letterSpacing="0.15em" fill={C.orange}>
            ALWAYS-ON
          </text>
          <text x={PM.x + 79} y={PM.y + 70} textAnchor="middle" fontFamily={FONT.mono} fontSize={12} fill={hexA(C.ink, 0.6)}>
            µW standby
          </text>
          <rect x={PM.x} y={PM.y} width={PM.w} height={PM.h} rx={18} fill={hexA(C.orange, 0.12 * wake)} />
          <text x={PM.x + PM.w / 2} y={PM.y + PM.h / 2 + 30} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={30} fill={wake > 0.5 ? C.ink : hexA(C.ink, 0.5)}>
            POWER
          </text>
          <text x={PM.x + PM.w / 2} y={PM.y + PM.h / 2 + 64} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={30} fill={wake > 0.5 ? C.ink : hexA(C.ink, 0.5)}>
            MANAGEMENT
          </text>
          <text x={PM.x + PM.w / 2} y={PM.y + PM.h - 22} textAnchor="middle" fontFamily={FONT.mono} fontSize={15} fill={hexA(C.orange, 0.9 * wake)}>
            {wake > 0.5 ? "● awake" : ""}
          </text>

          {/* ---- rails to the SoC */}
          {RAILS.map((r, k) => {
            const y = railY(k);
            const p = lit(k);
            const col = wrongA > 0.5 ? BAD : r.col;
            return (
              <g key={k} opacity={prog(f, b.supplies - 16, 16)}>
                <line x1={PM.x + PM.w + 14} y1={y} x2={SOC.x} y2={y} stroke={hexA(C.ink, 0.18)} strokeWidth={3} />
                <line x1={PM.x + PM.w + 14} y1={y} x2={mix(PM.x + PM.w + 14, SOC.x, clamp(p * 1.4))} y2={y} stroke={col} strokeWidth={4} opacity={0.35 + 0.65 * clamp(p)} style={{ filter: `drop-shadow(0 0 6px ${col})` }} />
                <text x={(PM.x + PM.w + SOC.x) / 2 + 14} y={y - 12} textAnchor="middle" fontFamily={FONT.mono} fontSize={18} fill={hexA(col, 0.4 + 0.6 * clamp(p))}>
                  {r.v.toFixed(2)} V · {r.name}
                </text>
              </g>
            );
          })}

          {/* ---- SoC with power domains */}
          <g transform={`translate(${socShake} 0)`} opacity={prog(f, b.supplies - 16, 16)}>
            <rect x={SOC.x} y={SOC.y} width={SOC.w} height={SOC.h} rx={16} fill="#11151f" stroke={crack > 0.1 ? BAD : hexA(C.ink, 0.35)} strokeWidth={2.5} />
            {DOMAINS.map((d, i) => {
              const p = clamp(lit(d.k)) * flick(i);
              const col = wrongA > 0.5 ? BAD : RAILS[d.k].col;
              if (d.ring)
                return <rect key={i} x={SOC.x + 8} y={SOC.y + 8} width={SOC.w - 16} height={SOC.h - 16} rx={12} fill="none" stroke={col} strokeOpacity={0.15 + 0.7 * p} strokeWidth={8} />;
              return (
                <rect
                  key={i}
                  x={SOC.x + d.x * SOC.w}
                  y={SOC.y + d.y * SOC.h}
                  width={d.w * SOC.w}
                  height={d.h * SOC.h}
                  rx={8}
                  fill={hexA(col, 0.08 + 0.5 * p)}
                  stroke={hexA(col, 0.3 + 0.7 * p)}
                  strokeWidth={1.5}
                />
              );
            })}
            {[
              ["CPU", 0.39, 0.25],
              ["FABRIC", 0.39, 0.51],
              ["GPU", 0.39, 0.77],
              ["MEM", 0.82, 0.5],
            ].map(([t, x, y]) => (
              <text key={t as string} x={SOC.x + (x as number) * SOC.w} y={SOC.y + (y as number) * SOC.h + 6} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.12em" fill={hexA(C.ink, 0.75)}>
                {t}
              </text>
            ))}
            <text x={SOC.x + SOC.w / 2} y={SOC.y - 18} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={28} fill={C.ink}>
              SoC
            </text>
            {crack > 0.01 && (
              <g opacity={crack}>
                <path d={`M${SOC.x + 150},${SOC.y} L${SOC.x + 175},${SOC.y + 90} L${SOC.x + 140},${SOC.y + 150} L${SOC.x + 190},${SOC.y + 230} L${SOC.x + 165},${SOC.y + SOC.h}`} fill="none" stroke={BAD} strokeWidth={4} style={{ filter: `drop-shadow(0 0 8px ${BAD})` }} />
                {new Array(7).fill(0).map((_, i) => {
                  const t = (f - b.damaged) / 30 - i * 0.18;
                  if (t < 0) return null;
                  return <circle key={i} cx={SOC.x + 170 + Math.sin(i * 2.1 + t * 3) * 20} cy={SOC.y + 120 - t * 140} r={14 + t * 30} fill={hexA("#9aa3b8", 0.25 * (1 - clamp(t)))} />;
                })}
              </g>
            )}
          </g>
          {wrongA > 0.01 && (
            <g opacity={wrongA}>
              <rect x={SOC.x - 20} y={SOC.y - 20} width={SOC.w + 40} height={SOC.h + 40} rx={26} fill="none" stroke={BAD} strokeWidth={3} strokeDasharray="10 8" opacity={0.6 + 0.4 * Math.sin(f * 0.5)} />
            </g>
          )}

          {/* ---- scope */}
          {scopeA > 0.01 && (
            <ScopeFrame x={SCOPE.x} y={SCOPE.y} w={SCOPE.w} h={SCOPE.h} title="POWER RAILS · VOLTAGE vs TIME" col={C.orange} a={scopeA}>
              {RAILS.map((r, k) => (
                <text key={k} x={20} y={laneBase(k) - 10 - SCOPE.y} fontFamily={FONT.mono} fontSize={15} fill={hexA(r.col, 0.95)}>
                  {r.name}
                </text>
              ))}
            </ScopeFrame>
          )}
          {scopeA > 0.01 && (
            <g opacity={scopeA}>
              {RAILS.map((r, k) => {
                const from = T0;
                const to = Math.max(T0, Math.round(now));
                return (
                  <g key={k} opacity={1 - wrongA * 0.85}>
                    <line x1={tToX(T0)} y1={laneBase(k)} x2={tToX(T1)} y2={laneBase(k)} stroke={hexA(r.col, 0.15)} strokeWidth={1} />
                    {to > from && <path d={trace(k, (kk, t) => step((t - starts[kk]) / D), from, to)} fill="none" stroke={r.col} strokeWidth={2.6} style={{ filter: `drop-shadow(0 0 4px ${r.col})` }} />}
                    {settled(k) && <Check x={SCOPE.x + SCOPE.w - 34} y={laneBase(k) - 16} r={13} a={prog(f, starts[k] + D * 1.6, 8)} />}
                  </g>
                );
              })}
              {/* "wait for it to settle" cue */}
              {(() => {
                const k = RAILS.findIndex((_, kk) => f >= starts[kk] && f < starts[kk] + D * 1.6);
                if (k < 0 || wrongA > 0.1) return null;
                const x = tToX(starts[k] + D * 0.8);
                return (
                  <text x={x} y={laneBase(k) - LANE + 8} fontFamily={FONT.mono} fontSize={14} fill={hexA(C.ink, 0.7)}>
                    settling…
                  </text>
                );
              })()}
              {/* the wrong order */}
              {wrongA > 0.01 &&
                RAILS.map((r, k) => {
                  const from = W0;
                  const to = Math.max(W0, Math.min(f, W0 + 60));
                  const tx = (t: number) => tToX(T0 + (t - W0) * 2.2);
                  let d = "";
                  for (let t = from; t <= to; t++) {
                    const v = wP(k, t) + (glitch > 0 ? (rnd(`gn${k}-${t}`) - 0.5) * 0.25 * glitch : 0);
                    d += `${t === from ? "M" : "L"}${tx(t).toFixed(1)},${(laneBase(k) - v * (r.v / 1.8) * (LANE - 14)).toFixed(1)}`;
                  }
                  return <path key={k} d={d} fill="none" stroke={BAD} strokeWidth={2.6} opacity={wrongA} style={{ filter: `drop-shadow(0 0 4px ${BAD})` }} />;
                })}
            </g>
          )}
        </svg>
      </Camera>
      {/* captions (screen space) */}
      <div style={{ position: "absolute", left: 120, top: 150, opacity: neverA }}>
        <Kicker color={C.orange}>never fully asleep</Kicker>
        <div style={{ fontFamily: FONT.ui, fontSize: 26, color: C.ink2, marginTop: 10, maxWidth: 520 }}>A tiny always-on corner keeps listening for the button, sipping almost no power.</div>
      </div>
      <div style={{ position: "absolute", left: 120, top: 110, opacity: inOut(f, b.order - 6, 14, b.wrong - 6, 12) }}>
        <Kicker color={C.amber}>one at a time · in order</Kicker>
      </div>
      <div style={{ position: "absolute", right: 120, top: 110, opacity: inOut(f, b.supplies, 14, b.wrong - 6, 12), fontFamily: FONT.mono, fontSize: 15, color: hexA(C.ink, 0.45) }}>
        illustrative voltages
      </div>
      {wrongA > 0.01 && (
        <div style={{ position: "absolute", left: 120, top: 110, opacity: wrongA, display: "flex", alignItems: "center", gap: 16 }}>
          <svg width={44} height={44}>
            <Cross x={22} y={22} r={20} />
          </svg>
          <span style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 26, letterSpacing: "0.3em", color: BAD }}>WRONG ORDER</span>
        </div>
      )}
      {glitch > 0.01 && (
        <AbsoluteFill style={{ background: `repeating-linear-gradient(0deg, ${hexA(BAD, 0.05 * glitch)} 0px, transparent 3px, transparent 7px)`, transform: `translateY(${(f % 7) - 3}px)` }} />
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 2: crystal → clocks
const PLLS = [
  { name: "CPU", mult: 6, col: C.pink },
  { name: "GPU", mult: 4, col: C.violet },
  { name: "FABRIC", mult: 3, col: C.orange },
];

const Crystal: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const start = b.vibrate - 6;
  const amp = clamp(1 - Math.exp(-Math.max(0, f - start) / 16));
  const noise = (1 - amp) * 0.25;
  const canA = prog(f, b.quartz - 6, 16);
  const waveA = prog(f, start - 4, 12);
  const hzA = prog(f, b.hz - 4, 14);
  const epA = inOut(f, b.ep1 - 4, 14, b.reset - 8, 12);
  const pllA = prog(f, b.lock - 24, 16);
  const vib = Math.sin(f * 2.4) * amp;
  // sine
  const sine = (() => {
    let d = "";
    for (let x = 0; x <= 560; x += 4) {
      const ph = (x / 560) * Math.PI * 6 - f * 0.45;
      const yy = 520 + (Math.sin(ph) * amp * 70 + (rnd(`n${x}-${Math.floor(f / 2)}`) - 0.5) * 60 * noise) * waveA;
      d += `${x === 0 ? "M" : "L"}${560 + x},${yy.toFixed(1)}`;
    }
    return d;
  })();
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.cyan}>The heartbeat</Kicker>
      </div>
      <Glow x={330} y={520} size={600} color={C.cyan} a={0.1 + 0.25 * amp} />
      {/* the crystal: a metal can with a cut-away of the quartz blank */}
      <div style={{ position: "absolute", left: 180, top: 430, opacity: canA, transform: `translateX(${vib * 1.2}px)` }}>
        <div style={{ width: 300, height: 180, borderRadius: 90, background: "linear-gradient(170deg, #d9e0ee 0%, #8e98ad 40%, #5b647a 70%, #b9c2d4 100%)", boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 ${40 * amp}px ${hexA(C.cyan, 0.5)}`, position: "relative", overflow: "hidden" }}>
          {/* cut-away window */}
          <div style={{ position: "absolute", left: 40, top: 30, width: 220, height: 120, borderRadius: 60, background: "#0a0f1c", border: "2px solid rgba(255,255,255,0.35)", overflow: "hidden" }}>
            <svg width={220} height={120}>
              <g transform={`translate(110 60) skewX(${vib * 9})`}>
                <rect x={-70} y={-32} width={140} height={64} rx={8} fill={hexA(C.cyanHi, 0.22)} stroke={hexA(C.cyanHi, 0.9)} strokeWidth={2} />
                <rect x={-40} y={-24} width={80} height={48} rx={6} fill={hexA("#e8eef9", 0.35)} />
              </g>
              {amp > 0.05 &&
                [0, 1, 2].map((i) => {
                  const ph = ((f * 0.08 + i / 3) % 1 + 1) % 1;
                  return <ellipse key={i} cx={110} cy={60} rx={70 + ph * 60} ry={30 + ph * 30} fill="none" stroke={C.cyanHi} strokeOpacity={(1 - ph) * 0.5 * amp} strokeWidth={2} />;
                })}
            </svg>
          </div>
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.cyan, marginTop: 18, textAlign: "center", width: 300 }}>quartz crystal</div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d={sine} fill="none" stroke={C.cyanHi} strokeWidth={3.2} opacity={waveA} style={{ filter: `drop-shadow(0 0 6px ${C.cyan})` }} />
        <path d="M500,520 L556,520" stroke={hexA(C.ink, 0.4)} strokeWidth={2} strokeDasharray="6 6" opacity={waveA} />
      </svg>
      <div style={{ position: "absolute", left: 640, top: 270, opacity: hzA, textAlign: "center", width: 400 }}>
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 84, color: C.ink, textShadow: `0 0 30px ${hexA(C.cyan, 0.6)}` }}>24 MHz</div>
        <div style={{ fontFamily: FONT.ui, fontSize: 20, letterSpacing: "0.3em", color: hexA(C.cyan, 0.9), fontWeight: 600 }}>24 MILLION TICKS / SECOND</div>
      </div>
      <div style={{ position: "absolute", left: 650, top: 640, opacity: epA, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 18, padding: "6px 12px", borderRadius: 8, background: hexA(C.cyan, 0.15), border: `1px solid ${hexA(C.cyan, 0.6)}`, color: C.cyanHi }}>EP 01</span>
        <span style={{ fontFamily: FONT.ui, fontSize: 22, color: C.ink2 }}>same crystal, same beat</span>
      </div>
      {/* PLLs lock on */}
      {PLLS.map((p, i) => {
        const y = 330 + i * 190;
        const at = b.lock - 18 + i * 8;
        const lockP = prog(f, at + 6, 22, EASE.inOut);
        const locked = lockP >= 0.98;
        const err = (1 - lockP) * Math.sin(f * 0.6 + i) * 30;
        const sq = (() => {
          let d = "";
          const per = 120 / p.mult;
          const off = ((f * 4) % per) + err;
          for (let x = -2 * per; x <= 420; x += per) {
            const xa = x - off;
            const a0 = Math.max(0, Math.min(420, xa));
            const a1 = Math.max(0, Math.min(420, xa + per / 2));
            const a2 = Math.max(0, Math.min(420, xa + per));
            d += `M${1380 + a0},${y + 40} L${1380 + a0},${y} L${1380 + a1},${y} L${1380 + a1},${y + 40} L${1380 + a2},${y + 40} `;
          }
          return d;
        })();
        return (
          <div key={p.name} style={{ position: "absolute", left: 0, top: 0, opacity: pllA * prog(f, at - 6, 12) }}>
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
              <path d={`M1120,520 C1160,520 1160,${y + 20} 1200,${y + 20}`} fill="none" stroke={hexA(C.cyan, 0.4)} strokeWidth={2} strokeDasharray="5 6" />
              <path d={sq} fill="none" stroke={p.col} strokeWidth={2.4} opacity={locked ? 1 : 0.6} />
            </svg>
            <div style={{ position: "absolute", left: 1200, top: y - 26, width: 160, height: 92, borderRadius: 14, background: "rgba(12,16,30,0.92)", border: `1.5px solid ${hexA(p.col, 0.7)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 26, color: C.ink }}>PLL</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 14, color: p.col }}>{p.name} clock</div>
            </div>
            <div style={{ position: "absolute", left: 1380, top: y + 54, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 14, height: 14, borderRadius: 7, background: locked ? OK : hexA(C.ink, 0.25), boxShadow: locked ? `0 0 14px ${OK}` : undefined }} />
              <span style={{ fontFamily: FONT.mono, fontSize: 16, color: locked ? OK : hexA(C.ink, 0.5), letterSpacing: "0.1em" }}>{locked ? "LOCKED" : "locking…"}</span>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 3: reset → one core
const ROM_AT: [number, number, number] = [-60, -230, 26];

const ResetCore: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const rel = prog(f, b.released - 2, 5, EASE.out);
  const sigA = inOut(f, b.reset - 6, 14, b.core + 8, 14);
  const chipA = prog(f, b.core + 4, 18);
  const coreP = prog(f, b.wakeUp - 4, 20);
  const t = prog(f, b.core, b.end - b.core, EASE.inOut);
  const c = cam({ yaw: mix(-30, -22, t), pitch: mix(52, 46, t), dist: 2600, scale: mix(0.72, 0.84, t), target: [mix(-200, -280, t), mix(80, 60, t), 0], cy: 600 });
  const st = { power: 0.3 + 0.2 * coreP, lit: { p0: coreP }, rise: { p0: 0.5 * coreP }, sparkle: 0, frame: f };
  const ap = blockAnchor(c, "p0", st, 10);
  const rom = project(c, ROM_AT);
  const knowA = prog(f, b.knowing - 4, 14);
  const arrowP = prog(f, b.where - 4, 26, EASE.inOut);
  const romA = prog(f, b.first - 8, 14);

  // timing diagram: POWER good, CLOCK running, then RESET released
  const X0 = 520;
  const X1 = 1560;
  const xRel = mix(X0, X1, 0.58);
  const run = clamp((f - (b.reset - 6)) / (b.released - b.reset + 40));
  const head = mix(X0, X1, run);
  const lanes = [
    { name: "POWER", y: 400, col: C.amber },
    { name: "CLOCK", y: 540, col: C.cyan },
    { name: "RESET", y: 680, col: rel > 0.5 ? OK : BAD },
  ];
  const H = 70;
  const clk = (() => {
    let d = "";
    const per = 26;
    for (let x = X0; x < head; x += per) {
      const x1 = Math.min(head, x + per / 2);
      const x2 = Math.min(head, x + per);
      d += `${x === X0 ? "M" : "L"}${x},${540} L${x},${540 - H} L${x1},${540 - H} L${x1},${540} L${x2},${540} `;
    }
    return d;
  })();
  return (
    <AbsoluteFill style={{ opacity: a }}>
      {sigA > 0.01 && (
        <AbsoluteFill style={{ opacity: sigA }}>
          <div style={{ position: "absolute", left: 120, top: 110 }}>
            <Kicker color={rel > 0.5 ? OK : BAD}>{rel > 0.5 ? "reset released · go" : "reset held · wait"}</Kicker>
          </div>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            {lanes.map((L) => (
              <g key={L.name}>
                <text x={X0 - 36} y={L.y - H / 2 + 10} textAnchor="end" fontFamily={FONT.mono} fontSize={28} fontWeight={700} fill={L.name === "RESET" ? C.ink : hexA(C.ink, 0.6)}>
                  {L.name}
                </text>
                <line x1={X0} y1={L.y} x2={X1} y2={L.y} stroke={hexA(C.ink, 0.08)} />
                <line x1={X0} y1={L.y - H} x2={X1} y2={L.y - H} stroke={hexA(C.ink, 0.08)} strokeDasharray="6 8" />
              </g>
            ))}
            {/* power: already good */}
            <path d={`M${X0},${400 - H} L${head},${400 - H}`} stroke={C.amber} strokeWidth={4} opacity={0.75} />
            {/* clock: running */}
            <path d={clk} fill="none" stroke={C.cyan} strokeWidth={2.6} opacity={0.75} />
            {/* reset: low, then released */}
            <path
              d={`M${X0},680 L${Math.min(head, xRel)},680` + (head > xRel ? ` L${xRel},${mix(680, 680 - H, rel)} L${head},${mix(680, 680 - H, rel)}` : "")}
              fill="none"
              stroke={rel > 0.5 ? OK : BAD}
              strokeWidth={6}
              strokeLinejoin="round"
              style={{ filter: `drop-shadow(0 0 10px ${rel > 0.5 ? OK : BAD})` }}
            />
            <line x1={xRel} y1={300} x2={xRel} y2={720} stroke={hexA(OK, 0.5 * rel)} strokeWidth={2} strokeDasharray="4 6" />
            {rel > 0 && rel < 1 && <Spark x={xRel} y={mix(680, 680 - H, rel)} color={OK} r={12} />}
            <text x={X1 + 24} y={400 - H + 8} fontFamily={FONT.mono} fontSize={18} fill={hexA(C.amber, 0.9)}>stable ✓</text>
            <text x={X1 + 24} y={540 - H / 2 + 6} fontFamily={FONT.mono} fontSize={18} fill={hexA(C.cyan, 0.9)}>running ✓</text>
            <text x={X1 + 24} y={rel > 0.5 ? 680 - H + 8 : 688} fontFamily={FONT.mono} fontSize={18} fill={rel > 0.5 ? OK : BAD}>{rel > 0.5 ? "GO" : "hold"}</text>
          </svg>
        </AbsoluteFill>
      )}
      {chipA > 0.01 && (
        <AbsoluteFill style={{ opacity: chipA }}>
          <Glow x={ap.x} y={ap.y} size={700} color={C.pink} a={0.35 * coreP} />
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <Chip3D cam={c} st={st} />
            {arrowP > 0.01 && (
              <NeonPath d={`M${ap.x},${ap.y - 10} C${ap.x + 120},${ap.y - 260} ${rom.x - 60},${rom.y - 300} ${rom.x},${rom.y - 16}`} color={C.gold} width={3} progress={arrowP} length={1200} />
            )}
            {romA > 0.01 && (
              <g opacity={romA}>
                <circle cx={rom.x} cy={rom.y} r={24 + 8 * Math.sin(f * 0.3)} fill={hexA(C.gold, 0.2)} stroke={C.gold} strokeWidth={2.5} />
                <circle cx={rom.x} cy={rom.y} r={7} fill={C.gold} />
              </g>
            )}
          </svg>
          <ChipLabel x={ap.x} y={ap.y - 16} text="One core, awake" sub="it knows exactly one address" color={C.pink} a={knowA} dx={-120} dy={-150} />
          <ChipLabel x={rom.x} y={rom.y} text="First instruction" sub="the reset vector points here" color={C.gold} a={romA} dx={170} dy={-120} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const schA = 1 - prog(f, b.quartz - 18, 10, EASE.in);
  const cryA = inOut(f, b.quartz - 6, 12, b.reset - 18, 12);
  const resA = prog(f, b.reset - 5, 12);
  return (
    <SceneShell dur={s.durationInFrames} enter={22} exit={14} delay={66}>
      {schA > 0.01 && <Schematic b={b} a={schA} />}
      {cryA > 0.01 && <Crystal b={b} a={cryA} />}
      {resA > 0.01 && <ResetCore b={b} a={resA} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const starts = RAILS.map((_, k) => b.supplies + 6 + k * Math.round((b.w2end - b.supplies - 40) / 5));
  return [
    { at: b.close - 4, name: "key_click", vol: 0.7 },
    { at: b.close, name: "zap", vol: 0.25 },
    { at: b.wakes, name: "power_up", vol: 0.4 },
    ...starts.map((t, k) => ({ at: t, name: "sweep_up", vol: 0.14, rate: 0.9 + k * 0.08 })),
    ...starts.map((t, k) => ({ at: t + 38, name: "tick_hi", vol: 0.22, rate: 1 + k * 0.05 })),
    { at: b.wrong + 6, name: "glitch", vol: 0.4 },
    { at: b.misbehave, name: "alarm", vol: 0.18 },
    { at: b.damaged, name: "thud", vol: 0.5 },
    { at: b.damaged + 2, name: "zap", vol: 0.35 },
    { at: b.vibrate - 6, name: "hum", vol: 0.3 },
    { at: b.hz, name: "chime", vol: 0.2 },
    { at: b.lock - 6, name: "blip", vol: 0.3 },
    { at: b.lock + 2, name: "blip", vol: 0.3, rate: 1.2 },
    { at: b.lock + 10, name: "blip_hi", vol: 0.3 },
    { at: b.released - 2, name: "thud", vol: 0.45 },
    { at: b.released, name: "pop_hi", vol: 0.35 },
    { at: b.wakeUp - 6, name: "power_up", vol: 0.35 },
    { at: b.where, name: "sweep_up", vol: 0.25 },
    { at: b.first, name: "shimmer", vol: 0.3 },
  ];
};

export const Power: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.orange, hueB: C.amber, hueC: C.pink, intensity: 0.6 },
};
