import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { TIER } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    numbers: c.o1.from,
    flowing: wordAt(c.o1, "flowing"),
    add: c.o2.from,
    fraction: wordAt(c.o2, "a fraction"),
    fetch: c.o3.from,
    trouble: wordAt(c.o3, "trouble"),
    slow: c.o4.from,
    tick: wordAt(c.o4, "one tick"),
    second: wordAt(c.o4, "one second"),
    three: c.o5.from,
    threeSec: wordAt(c.o5, "three seconds"),
    mem: c.o6.from,
    five: wordAt(c.o6, "five minutes"),
    ssd: c.o7.from,
    days: wordAt(c.o7, "two days"),
    how: c.o8.from,
    today: wordAt(c.o8, "Today"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

// ---------------------------------------------------------------- act 1: numbers flowing; the core adds, then waits
const CORE = { x: 560, y: 540 };
const MEM = { x: 1500, y: 540 };

const Flow: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const open = prog(f, 0, 50, EASE.inOut);
  const sum = spr(f, fps, b.fraction - 6, { damping: 14, stiffness: 160 });
  const flash = prog(f, b.fraction + 4, 3) * (1 - prog(f, b.fraction + 7, 18));
  const unknown = prog(f, b.fetch + 4, 10);
  const req = prog(f, b.trouble - 8, 34, EASE.in);
  const wait = prog(f, b.trouble, 16);
  const flowOn = 1 - prog(f, b.fetch, 20) * 0.75;
  const lanes = 9;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Glow x={CORE.x} y={CORE.y} size={700} color={TIER.reg} a={0.2 * open} />
      <Glow x={MEM.x} y={MEM.y} size={700} color={TIER.dram} a={0.18 * open} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* data lanes between core and memory */}
        {new Array(lanes).fill(0).map((_, li) => {
          const y = 380 + li * 40;
          const dir = li % 2 ? 1 : -1;
          return (
            <g key={li} opacity={open * flowOn}>
              <line x1={CORE.x + 150} y1={y} x2={MEM.x - 170} y2={y} stroke={hexA(C.ink, 0.06)} strokeWidth={2} />
              {new Array(7).fill(0).map((__, k) => {
                const sp = rnd(`sp${li}`, 0.004, 0.008);
                const p = (((f * sp + k / 7 + rnd(`ph${li}`)) % 1) + 1) % 1;
                const x = dir > 0 ? mix(CORE.x + 160, MEM.x - 180, p) : mix(MEM.x - 180, CORE.x + 160, p);
                const v = Math.floor(rnd(`v${li}-${k}-${Math.floor((f * sp + k / 7) % 1000)}`) * 256)
                  .toString(16)
                  .padStart(2, "0");
                return (
                  <text key={k} x={x} y={y + 6} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={20} fill={dir > 0 ? hexA(TIER.reg, 0.85) : hexA(TIER.dram, 0.9)} opacity={Math.sin(p * Math.PI)}>
                    {v}
                  </text>
                );
              })}
            </g>
          );
        })}
        {/* the core */}
        <g opacity={open}>
          <rect x={CORE.x - 150} y={CORE.y - 150} width={300} height={300} rx={28} fill="rgba(30,10,26,0.92)" stroke={TIER.reg} strokeWidth={3} style={{ filter: `drop-shadow(0 0 ${20 + 40 * flash}px ${hexA(TIER.reg, 0.7)})` }} />
          {new Array(10).fill(0).map((_, i) => (
            <g key={i}>
              <rect x={CORE.x - 140 + i * 30} y={CORE.y - 168} width={14} height={14} fill="#3a2a40" />
              <rect x={CORE.x - 140 + i * 30} y={CORE.y + 154} width={14} height={14} fill="#3a2a40" />
            </g>
          ))}
          <text x={CORE.x} y={CORE.y - 92} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={18} letterSpacing="0.3em" fill={hexA(TIER.reg, 0.95)}>
            CORE
          </text>
        </g>
        {/* the memory */}
        <g opacity={open}>
          <rect x={MEM.x - 170} y={MEM.y - 210} width={340} height={420} rx={24} fill="rgba(6,24,24,0.92)" stroke={TIER.dram} strokeWidth={3} />
          {new Array(12).fill(0).map((_, r) =>
            new Array(8).fill(0).map((__, c) => {
              const on = Math.sin(f * 0.07 + r * 1.3 + c * 0.7) > 0.3;
              return <rect key={`${r}-${c}`} x={MEM.x - 140 + c * 36} y={MEM.y - 170 + r * 30} width={26} height={20} rx={4} fill={hexA(TIER.dram, on ? 0.5 : 0.12)} />;
            }),
          )}
          <text x={MEM.x} y={MEM.y + 196} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={18} letterSpacing="0.3em" fill={hexA(TIER.dram, 0.95)}>
            MEMORY
          </text>
        </g>
        {/* the request leaving */}
        {req > 0 && req < 1 && (
          <g transform={`translate(${mix(CORE.x + 160, MEM.x - 180, req)} ${CORE.y})`}>
            <rect x={-56} y={-20} width={112} height={40} rx={20} fill={hexA(C.amber, 0.25)} stroke={C.amber} strokeWidth={2.5} style={{ filter: `drop-shadow(0 0 12px ${C.amber})` }} />
            <text y={7} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={18} fill={C.ink}>
              LOAD
            </text>
          </g>
        )}
      </svg>
      {/* the sum inside the core */}
      <div style={{ position: "absolute", left: CORE.x - 150, top: CORE.y - 40, width: 300, textAlign: "center", opacity: clamp(sum * 1.4) }}>
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 38, color: C.ink, whiteSpace: "nowrap" }}>
          {unknown > 0.5 ? (
            <>
              <span style={{ color: C.amber }}>?</span> + <span style={{ color: C.amber }}>?</span>
            </>
          ) : (
            <>
              41 + 17 = <span style={{ color: TIER.reg, textShadow: `0 0 ${20 * flash}px ${TIER.reg}` }}>58</span>
            </>
          )}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 20, color: unknown > 0.5 ? C.amber : C.ink2, marginTop: 10 }}>{unknown > 0.5 ? (wait > 0.5 ? "waiting" + ".".repeat(1 + (Math.floor(f / 8) % 3)) : "need the numbers") : "≈ 0.3 ns"}</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 2: the slowed-down clock and the time axis
const X0 = 230;
const SPAN = 1460;
const MARKS = [
  { t: 3, name: "beside the core", sub: "L1 cache", val: "3 seconds", col: TIER.l1, key: "three" as const },
  { t: 18, name: "", sub: "L2 cache", val: "18 seconds", col: TIER.l2, key: "three" as const, minor: true },
  { t: 300, name: "main memory", sub: "DRAM", val: "≈ 5 minutes", col: TIER.dram, key: "mem" as const },
  { t: 200000, name: "the SSD", sub: "storage", val: "≈ 2 days", col: TIER.ssd, key: "ssd" as const },
];
const REF = [
  { t: 1, l: "1 s" },
  { t: 10, l: "10 s" },
  { t: 60, l: "1 min" },
  { t: 600, l: "10 min" },
  { t: 3600, l: "1 hour" },
  { t: 21600, l: "6 hours" },
  { t: 86400, l: "1 day" },
  { t: 172800, l: "2 days" },
];

const Axis: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // pixels per second on the axis, animated in log space
  const lp = keyframes(
    f,
    [
      [b.slow, Math.log((SPAN * 0.62) / 3)],
      [b.three + 10, Math.log((SPAN * 0.62) / 3)],
      [b.five - 6, Math.log((SPAN * 0.72) / 300)],
      [b.ssd + 4, Math.log((SPAN * 0.72) / 300)],
      [b.days + 4, Math.log((SPAN * 0.8) / 200000)],
    ],
    EASE.inOut,
  );
  const pps = Math.exp(lp);
  const X = (t: number) => X0 + t * pps;
  const collapse = prog(f, b.today - 10, 24, EASE.in);
  const tickBeat = (f - b.tick) / fps; // one visual "tick" per second of real time
  const tickPulse = f > b.tick ? Math.exp(-((tickBeat % 1) * 6)) : 0;
  const clockA = inOut(f, b.slow - 6, 14, b.three + 30, 20);
  return (
    <AbsoluteFill style={{ opacity: a * (1 - collapse) }}>
      {/* "1 tick = 1 second" */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center", opacity: clockA }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 22, letterSpacing: "0.45em", color: hexA(C.ink, 0.8) }}>SLOW TIME DOWN</div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 76, color: C.ink, marginTop: 12 }}>
          1 tick <span style={{ color: C.ink3 }}>=</span> <span style={{ color: C.amber, textShadow: `0 0 ${30 * tickPulse}px ${C.amber}` }}>1 second</span>
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 20, color: C.ink3, marginTop: 8 }}>(really: about a third of a nanosecond)</div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* axis */}
        <line x1={X0} y1={640} x2={1860} y2={640} stroke={hexA(C.ink, 0.3)} strokeWidth={2} />
        {/* reference ticks, fading when crowded */}
        {REF.map((r, i) => {
          const x = X(r.t);
          if (x > 1880) return null;
          const prevX = i > 0 ? X(REF[i - 1].t) : X0;
          const dens = clamp((x - prevX - 30) / 60);
          return (
            <g key={r.l} opacity={0.7 * dens}>
              <line x1={x} y1={630} x2={x} y2={650} stroke={hexA(C.ink, 0.5)} strokeWidth={2} />
              <text x={x} y={680} textAnchor="middle" fontFamily={FONT.mono} fontSize={17} fill={C.ink3}>
                {r.l}
              </text>
            </g>
          );
        })}
        {/* the core at the origin */}
        <circle cx={X0} cy={640} r={18} fill={TIER.reg} style={{ filter: `drop-shadow(0 0 14px ${TIER.reg})` }} />
        <text x={X0} y={600} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.2em" fill={TIER.reg}>
          CORE
        </text>
        {/* markers */}
        {MARKS.map((m) => {
          const at = b[m.key] - 2 + (m.minor ? 30 : 0);
          const s = spr(f, fps, at, { damping: 15, stiffness: 140 });
          if (f < at) return null;
          const x = X(m.t);
          if (x > 1900) return null;
          const crowd = clamp((x - X0 - 40) / 90);
          // a request pulse travelling out and back
          const trip = prog(f, at, 26, EASE.inOut);
          const px = trip < 0.5 ? mix(X0, x, trip * 2) : mix(x, X0, (trip - 0.5) * 2);
          return (
            <g key={m.val} opacity={clamp(s * 1.4) * (m.minor ? 0.75 : 1)}>
              <line x1={x} y1={m.minor ? 600 : 520} x2={x} y2={640} stroke={m.col} strokeWidth={m.minor ? 2 : 3} style={{ filter: `drop-shadow(0 0 8px ${m.col})` }} />
              <circle cx={x} cy={640} r={m.minor ? 8 : 12} fill={m.col} />
              {trip > 0 && trip < 1 && <Spark x={px} y={640} color={m.col} r={8} />}
              <g opacity={crowd} transform={`translate(${x} ${m.minor ? 590 : 500})`}>
                {m.minor ? (
                  <text textAnchor="middle" fontFamily={FONT.mono} fontSize={16} fill={hexA(m.col, 0.95)}>
                    L2 · 18 s
                  </text>
                ) : (
                  <>
                    <text y={-56} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={17} letterSpacing="0.2em" fill={hexA(m.col, 0.95)}>
                      {m.sub.toUpperCase()}
                    </text>
                    <text y={-14} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={44} fill={C.ink} style={{ filter: `drop-shadow(0 0 12px ${hexA(m.col, 0.6)})` }}>
                      {m.val}
                    </text>
                  </>
                )}
              </g>
            </g>
          );
        })}
      </svg>
      {/* captions under the axis */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 760, textAlign: "center", opacity: inOut(f, b.days + 6, 16, b.today - 10, 10) }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 24, color: C.ink2 }}>
          the same trip, measured in clock ticks: <span style={{ color: TIER.l1 }}>3</span> · <span style={{ color: TIER.dram }}>≈ 300</span> · <span style={{ color: TIER.ssd }}>≈ 200,000</span>
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 3: collapse to a point → title
const Collapse: React.FC<{ b: B }> = ({ b }) => {
  const f = useCurrentFrame();
  const p = prog(f, b.today - 10, 24, EASE.in);
  const burst = prog(f, b.end - 18, 18, EASE.in);
  return (
    <AbsoluteFill style={{ opacity: prog(f, b.today - 12, 8) }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {new Array(60).fill(0).map((_, i) => {
          const ang = rnd(`ca${i}`, 0, Math.PI * 2);
          const r0 = rnd(`cr${i}`, 200, 900);
          const r = r0 * (1 - p) + burst * 1400;
          const col = [TIER.l1, TIER.l2, TIER.slc, TIER.dram, TIER.ssd][i % 5];
          return <circle key={i} cx={960 + Math.cos(ang) * r} cy={540 + Math.sin(ang) * r * 0.6} r={3 + 3 * p} fill={col} opacity={0.8} />;
        })}
        <circle cx={960} cy={540} r={6 + 30 * p} fill="#eafcff" opacity={0.4 + 0.5 * p} />
      </svg>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, rgba(232,251,255,${0.95 * burst}) 0%, rgba(140,230,255,${0.5 * burst}) ${10 + 50 * burst}%, rgba(5,6,13,0) ${30 + 70 * burst}%)` }} />
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const flowA = 1 - prog(f, b.slow - 14, 12, EASE.in);
  const axisA = prog(f, b.slow - 4, 14);
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={0}>
      {flowA > 0.01 && <Flow b={b} a={flowA} />}
      {axisA > 0.01 && f < b.today + 20 && <Axis b={b} a={axisA} />}
      {f >= b.today - 12 && <Collapse b={b} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const ticks: SfxEvent[] = [];
  for (let t = b.tick; t < b.three + 40; t += 30) ticks.push({ at: t, name: "clock_tick", vol: 0.35 });
  return [
    { at: 0, name: "data_long", vol: 0.25 },
    { at: b.fraction - 6, name: "pop_hi", vol: 0.4 },
    { at: b.fraction + 4, name: "zap", vol: 0.25 },
    { at: b.fetch + 4, name: "blip_lo", vol: 0.35 },
    { at: b.trouble - 8, name: "whoosh", vol: 0.35 },
    { at: b.slow - 4, name: "sweep_down", vol: 0.35 },
    ...ticks,
    { at: b.three - 2, name: "chime", vol: 0.3 },
    { at: b.five - 6, name: "whoosh_rev", vol: 0.35 },
    { at: b.mem - 2, name: "chime_lo", vol: 0.35 },
    { at: b.days - 20, name: "riser", vol: 0.4 },
    { at: b.ssd - 2, name: "boom_soft", vol: 0.45 },
    { at: b.today - 10, name: "sweep_up", vol: 0.4 },
    { at: b.end - 16, name: "whoosh_rev", vol: 0.45 },
  ];
};

export const ColdOpen: SceneModule = {
  Visual,
  sfx,
  hud: false,
  backdrop: { hueA: C.cyan, hueB: C.violet, hueC: C.teal, intensity: 0.45, dots: false },
};
