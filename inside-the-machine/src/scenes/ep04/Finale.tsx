import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { BAD, Check, Cross, OK, TIER } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    once: c.x1.from,
    tlb: wordAt(c.x2, "asks the T L B"),
    l1: wordAt(c.x2, "checks L one"),
    l2: wordAt(c.x2, "Then L two"),
    slc: wordAt(c.x2, "the system cache"),
    mc: wordAt(c.x2, "memory controller"),
    row: wordAt(c.x2, "opens a row"),
    sense: wordAt(c.x2, "Sense amplifiers"),
    burst: wordAt(c.x2, "a burst of bytes"),
    hundred: c.x3.from,
    almost: wordAt(c.x3, "almost every time"),
    next: c.x4.from,
    power: wordAt(c.x4, "power goes out"),
    traps: wordAt(c.x4, "tiny electron traps"),
    x4end: c.x4.end,
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

const SX = 760; // shaft center
const LEVELS = [
  { key: "core", name: "CORE", y: 206, col: TIER.reg, ns: 0 },
  { key: "tlb", name: "TLB", y: 306, col: C.pink, ns: 0.3 },
  { key: "l1", name: "L1 cache", y: 396, col: TIER.l1, ns: 1 },
  { key: "l2", name: "L2 cache", y: 486, col: TIER.l2, ns: 6 },
  { key: "slc", name: "system cache", y: 576, col: TIER.slc, ns: 20 },
  { key: "mc", name: "memory controller", y: 666, col: C.indigo, ns: 30 },
  { key: "dram", name: "DRAM", y: 796, col: TIER.dram, ns: 95 },
] as const;

// ---------------------------------------------------------------- the round trip
const Trip: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const arrive = [b.once + 20, b.tlb, b.l1, b.l2, b.slc, b.mc, b.row];
  // current depth of the request (continuous)
  let depth = 0;
  for (let i = 1; i < arrive.length; i++) depth += prog(f, arrive[i] - 12, 12, EASE.inOut);
  const back = prog(f, b.burst - 4, 24, EASE.in);
  const yAt = (d: number) => {
    const i = Math.floor(d);
    const fr = d - i;
    const y0 = LEVELS[Math.min(i, LEVELS.length - 1)].y;
    const y1 = LEVELS[Math.min(i + 1, LEVELS.length - 1)].y;
    return mix(y0, y1, fr);
  };
  const reqY = back > 0 ? mix(LEVELS[6].y, LEVELS[0].y, back) : yAt(depth);
  const rowOpen = prog(f, b.row - 4, 10);
  const senseP = prog(f, b.sense - 4, 16);
  // nanosecond clock: follows the deepest level reached
  const deep = Math.min(6, Math.floor(depth + 0.001));
  const nsTarget = back > 0 ? mix(LEVELS[6].ns, 100, back) : mix(LEVELS[deep].ns, LEVELS[Math.min(6, deep + 1)].ns, depth - deep);
  const quick = prog(f, b.almost - 6, 30, EASE.inOut);
  const quickBack = prog(f, b.almost + 24, 16, EASE.in);
  const showQuick = f > b.almost - 6;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.cyan}>{showQuick ? "but usually…" : "one load, all the way down"}</Kicker>
      </div>
      <Glow x={SX + 170} y={reqY} size={600} color={C.amber} a={0.14} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={SX + 170} y1={LEVELS[0].y} x2={SX + 170} y2={LEVELS[6].y} stroke={hexA(C.ink, 0.15)} strokeWidth={4} />
        {LEVELS.map((L, i) => {
          const reached = i === 0 || f >= arrive[i] - 2;
          const missed = !showQuick && reached && i > 1 && i < 6 && (back > 0 || depth > i + 0.2);
          const isD = L.key === "dram";
          const w = isD ? 760 : 520 - i * 10;
          const h = isD ? 190 : 60;
          return (
            <g key={L.key} opacity={reached || showQuick ? 1 : 0.35}>
              <rect x={SX - w / 2} y={L.y - h / 2} width={w} height={h} rx={14} fill={hexA(L.col, 0.12 + (reached ? 0.12 : 0))} stroke={L.col} strokeWidth={reached ? 2.5 : 1.5} />
              <text x={SX - w / 2 + 20} y={isD ? L.y - h / 2 + 34 : L.y + 8} fontFamily={FONT.ui} fontWeight={700} fontSize={isD ? 22 : 20} letterSpacing="0.12em" fill={C.ink}>
                {L.name}
              </text>
              {missed && <Cross x={SX + w / 2 + 34} y={L.y} r={16} />}
              {L.key === "tlb" && reached && !showQuick && <Check x={SX + w / 2 + 34} y={L.y} r={16} />}
              {/* DRAM: a row of capacitors opening */}
              {isD && (
                <g>
                  {new Array(3).fill(0).map((_, r) =>
                    new Array(22).fill(0).map((__, c) => {
                      const open = r === 1 ? rowOpen : 0;
                      const bit = rnd(`fd${r}-${c}`) > 0.45;
                      return <rect key={`${r}-${c}`} x={SX - 340 + c * 31} y={L.y - 40 + r * 34} width={22} height={24} rx={4} fill={hexA(TIER.dram, bit ? 0.25 + 0.6 * open : 0.08)} stroke={open > 0.5 ? C.amber : hexA(TIER.dram, 0.4)} strokeWidth={open > 0.5 ? 1.5 : 1} />;
                    }),
                  )}
                  {/* sense amps */}
                  {new Array(22).fill(0).map((_, c) => (
                    <path key={c} d={`M${SX - 340 + c * 31},${L.y + 66} l11,14 l11,-14 Z`} fill={hexA(C.violet, 0.2 + 0.7 * senseP)} />
                  ))}
                  {senseP > 0.2 && (
                    <text x={SX + 400} y={L.y + 80} fontFamily={FONT.mono} fontSize={16} fill={C.violet} opacity={senseP}>
                      thousands of cells, sensed at once
                    </text>
                  )}
                </g>
              )}
            </g>
          );
        })}
        {/* the request / the returning burst */}
        {!showQuick && f > b.once + 4 && (
          <g transform={`translate(${SX + 170} ${reqY})`}>
            <rect x={-60} y={-18} width={120} height={36} rx={18} fill={hexA(back > 0 ? C.cyan : C.amber, 0.35)} stroke={back > 0 ? C.cyan : C.amber} strokeWidth={2.5} style={{ filter: `drop-shadow(0 0 12px ${back > 0 ? C.cyan : C.amber})` }} />
            <text y={6} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={16} fill={C.ink}>
              {back > 0 ? "DATA" : "LOAD"}
            </text>
          </g>
        )}
        {/* the common case: an L1 hit */}
        {showQuick && (
          <g>
            {quick > 0 && quickBack < 1 && (
              <g transform={`translate(${SX + 170} ${quickBack > 0 ? mix(LEVELS[2].y, LEVELS[0].y, quickBack) : mix(LEVELS[0].y, LEVELS[2].y, quick)})`}>
                <rect x={-60} y={-18} width={120} height={36} rx={18} fill={hexA(OK, 0.35)} stroke={OK} strokeWidth={2.5} />
                <text y={6} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={16} fill={C.ink}>
                  LOAD
                </text>
              </g>
            )}
            {quick > 0.9 && <Check x={SX + 290} y={LEVELS[2].y} r={22} />}
            {quick > 0.9 && (
              <text x={SX + 330} y={LEVELS[2].y + 8} fontFamily={FONT.display} fontWeight={700} fontSize={30} fill={OK}>
                L1 hit · about a nanosecond
              </text>
            )}
          </g>
        )}
      </svg>
      {/* the nanosecond clock */}
      <div style={{ position: "absolute", right: 140, top: 260, textAlign: "right", opacity: prog(f, b.tlb - 10, 14) * (1 - quick * 0.6) }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: hexA(C.ink, 0.6) }}>ELAPSED</div>
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 84, color: C.ink, fontVariantNumeric: "tabular-nums", textShadow: `0 0 30px ${hexA(C.cyan, 0.4)}` }}>
          {nsTarget < 10 ? nsTarget.toFixed(1) : Math.round(nsTarget)} <span style={{ fontSize: 36, color: C.ink3 }}>ns</span>
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 16, color: C.ink3 }}>rough · total measured on an M1 ≈ 100 ns</div>
      </div>
      <div style={{ position: "absolute", right: 140, top: 470, width: 420, textAlign: "right", opacity: inOut(f, b.hundred - 4, 14, b.next - 10, 10) }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 44, color: C.ink, lineHeight: 1.1 }}>about a hundred nanoseconds</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- next time: storage
const NextStorage: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spr(f, fps, b.next, { damping: 20, stiffness: 90 });
  const off = prog(f, b.power - 6, 14);
  const trap = prog(f, b.traps - 10, 40, EASE.inOut);
  const cx = 1340;
  const cy = 540;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Glow x={cx} y={cy} size={1100} color={TIER.ssd} a={0.16 * clamp(p)} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* a charge-trap flash cell, stylized */}
        <g opacity={clamp(p)}>
          <rect x={cx - 300} y={cy + 120} width={600} height={70} rx={10} fill="#1a1d2a" stroke={hexA(C.ink, 0.3)} strokeWidth={2} />
          <text x={cx} y={cy + 165} textAnchor="middle" fontFamily={FONT.mono} fontSize={18} fill={C.ink3}>
            silicon channel
          </text>
          <rect x={cx - 220} y={cy + 30} width={440} height={56} rx={8} fill={hexA(TIER.ssd, 0.12)} stroke={TIER.ssd} strokeWidth={2.5} />
          <text x={cx + 240} y={cy + 66} fontFamily={FONT.mono} fontSize={17} fill={TIER.ssd}>
            trap layer
          </text>
          <rect x={cx - 220} y={cy - 80} width={440} height={70} rx={10} fill="#262a3c" stroke={hexA(C.ink, 0.4)} strokeWidth={2} />
          <text x={cx} y={cy - 36} textAnchor="middle" fontFamily={FONT.mono} fontSize={18} fill={C.ink2}>
            gate
          </text>
          {new Array(26).fill(0).map((_, i) => {
            const tx = cx - 200 + (i % 13) * 32 + 8;
            const ty = cy + 46 + Math.floor(i / 13) * 22;
            const sx = cx - 260 + rnd(`es${i}`) * 520;
            const sy = cy + 155;
            const t = clamp(trap * 1.4 - i * 0.015);
            return <circle key={i} cx={mix(sx, tx, t)} cy={mix(sy, ty, t)} r={6} fill="#ffe2a8" opacity={0.9} style={{ filter: "drop-shadow(0 0 6px #ffb84d)" }} />;
          })}
          {off > 0.01 && (
            <g opacity={off}>
              <text x={cx} y={cy - 150} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={20} letterSpacing="0.3em" fill={hexA(C.ink, 0.7)}>
                POWER OFF · THE ELECTRONS STAY
              </text>
            </g>
          )}
        </g>
      </svg>
      <div style={{ position: "absolute", left: 110, top: 300, opacity: clamp(p * 1.3), transform: `translateY(${(1 - p) * 30}px)` }}>
        <Kicker color={TIER.ssd}>Next time · Episode 05</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 130, color: C.ink, marginTop: 14, letterSpacing: "-0.04em", lineHeight: 1 }}>Storage</div>
        <div style={{ fontFamily: FONT.ui, fontSize: 32, color: C.ink2, marginTop: 18, maxWidth: 640, lineHeight: 1.35 }}>Where your files go when the power goes out, and how flash keeps them for years.</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- end card
const EndCard: React.FC<{ a: number }> = ({ a }) => (
  <AbsoluteFill style={{ opacity: a, alignItems: "center", justifyContent: "center", background: `radial-gradient(60% 50% at 50% 50%, ${hexA(TIER.slc, 0.12)}, rgba(2,3,9,0.94) 70%)` }}>
    <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 22, letterSpacing: "0.6em", color: TIER.slc, paddingLeft: "0.6em" }}>EPISODE 04</div>
    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 120, color: C.ink, letterSpacing: "-0.02em", marginTop: 16 }}>INSIDE THE MACHINE</div>
    <div style={{ height: 2, width: 900, marginTop: 24, background: `linear-gradient(90deg, transparent, ${TIER.l1}, ${TIER.slc}, ${TIER.dram}, transparent)` }} />
    <div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 56, marginTop: 28, background: `linear-gradient(90deg, ${TIER.l1}, ${TIER.slc} 50%, ${TIER.dram})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Memory</div>
    <div style={{ marginTop: 60, fontFamily: FONT.mono, fontSize: 19, color: C.ink3, textAlign: "center", lineHeight: 1.7 }}>
      Narration: Kokoro-82M neural TTS · Score & sound design: procedurally synthesized
      <br />
      Animated in code with Remotion · Diagrams are illustrative simplifications
    </div>
  </AbsoluteFill>
);

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const tripA = inOut(f, 0, 12, b.next - 16, 12);
  const nextA = inOut(f, b.next - 4, 14, b.x4end + 20, 16);
  const endA = prog(f, b.x4end + 20, 20);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={24}>
      {tripA > 0.01 && <Trip b={b} a={tripA} />}
      {nextA > 0.01 && <NextStorage b={b} a={nextA} />}
      {endA > 0.01 && <EndCard a={endA} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.once, name: "whoosh_rev", vol: 0.3 },
    { at: b.tlb - 6, name: "blip_hi", vol: 0.3 },
    { at: b.l1 - 6, name: "blip_lo", vol: 0.3 },
    { at: b.l2 - 6, name: "blip_lo", vol: 0.3, rate: 0.95 },
    { at: b.slc - 6, name: "blip_lo", vol: 0.3, rate: 0.9 },
    { at: b.mc - 6, name: "whoosh_soft", vol: 0.25 },
    { at: b.row - 4, name: "zap", vol: 0.3 },
    { at: b.sense - 4, name: "pop_hi", vol: 0.3 },
    { at: b.burst - 4, name: "sweep_up", vol: 0.4 },
    { at: b.burst + 20, name: "chime", vol: 0.3 },
    { at: b.almost - 6, name: "tick_hi", vol: 0.35 },
    { at: b.next - 4, name: "whoosh_soft", vol: 0.35 },
    { at: b.power - 6, name: "power_down", vol: 0.3 },
    { at: b.traps - 10, name: "electrons", vol: 0.3 },
    { at: b.x4end + 20, name: "impact", vol: 0.5 },
    { at: b.x4end + 22, name: "braam", vol: 0.45 },
  ];
};

export const Finale: SceneModule = {
  Visual,
  sfx,
  hud: false,
  backdrop: { hueA: C.cyan, hueB: C.violet, hueC: C.amber, intensity: 0.7 },
};
