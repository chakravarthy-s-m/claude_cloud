import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { TIER } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    decades: c.w1.from,
    memory: wordAt(c.w1, "memory did"),
    name: c.w2.from,
    wall: wordAt(c.w2, "the memory wall"),
    today: c.w3.from,
    hundreds: wordAt(c.w3, "hundreds of instructions"),
    fetch: wordAt(c.w3, "fetch one number"),
    wait: c.w4.from,
    life: wordAt(c.w4, "whole life waiting"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

// ---------------------------------------------------------------- the chart
const CH = { x: 220, y: 230, w: 1160, h: 600 };
const Y0 = 1980;
const Y1 = 2020;
// illustrative, normalized to 1980 = 1 (log scale): processors ~50%/yr until ~2005, then slower; DRAM latency ~7%/yr
const cpu = (yr: number) => (yr < 2005 ? Math.pow(1.5, yr - Y0) : Math.pow(1.5, 25) * Math.pow(1.2, yr - 2005));
const dram = (yr: number) => Math.pow(1.07, yr - Y0);
const LOGMAX = Math.log10(cpu(Y1));
const px = (yr: number) => CH.x + ((yr - Y0) / (Y1 - Y0)) * CH.w;
const py = (v: number) => CH.y + CH.h - (Math.log10(v) / LOGMAX) * CH.h;

const Chart: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const draw = prog(f, b.decades - 4, b.memory - b.decades + 30, EASE.inOut);
  const yrNow = mix(Y0, Y1, draw);
  const curve = (fn: (y: number) => number) => {
    let d = "";
    for (let yr = Y0; yr <= yrNow; yr += 0.5) d += `${yr === Y0 ? "M" : "L"}${px(yr).toFixed(1)},${py(fn(yr)).toFixed(1)}`;
    return d;
  };
  const gap = (() => {
    let d = "";
    for (let yr = Y0; yr <= yrNow; yr += 0.5) d += `${yr === Y0 ? "M" : "L"}${px(yr).toFixed(1)},${py(cpu(yr)).toFixed(1)}`;
    for (let yr = yrNow; yr >= Y0; yr -= 0.5) d += `L${px(yr).toFixed(1)},${py(dram(yr)).toFixed(1)}`;
    return d + "Z";
  })();
  const mark = spr(f, fps, b.name + 6, { damping: 16, stiffness: 120 });
  const wallP = prog(f, b.name + 36, b.wall - b.name - 20, EASE.out);
  const bricks: React.ReactNode[] = [];
  // a brick wall rising inside the gap, around 1995–2020
  for (let r = 0; r < 14; r++) {
    for (let k = 0; k < 6; k++) {
      const yr = 1996 + k * 4 + (r % 2 ? 2 : 0);
      if (yr > 2019) continue;
      const top = py(cpu(yr));
      const bot = py(dram(yr));
      const hgt = (bot - top) / 14;
      const by = bot - (r + 1) * hgt;
      const show = clamp(wallP * 16 - r - k * 0.3);
      if (show <= 0) continue;
      bricks.push(<rect key={`${r}-${k}`} x={px(yr) - 30} y={by + (1 - show) * -40} width={58} height={hgt - 3} rx={3} fill={hexA(C.rose, 0.25)} stroke={hexA(C.rose, 0.8)} strokeWidth={1.2} opacity={show} />);
    }
  }
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.orange}>the speed gap</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* grid */}
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={CH.x} y1={CH.y + (CH.h / 4) * i} x2={CH.x + CH.w} y2={CH.y + (CH.h / 4) * i} stroke={hexA(C.ink, 0.07)} />
        ))}
        {[1980, 1990, 2000, 2010, 2020].map((yr) => (
          <g key={yr}>
            <line x1={px(yr)} y1={CH.y + CH.h} x2={px(yr)} y2={CH.y + CH.h + 10} stroke={hexA(C.ink, 0.4)} />
            <text x={px(yr)} y={CH.y + CH.h + 36} textAnchor="middle" fontFamily={FONT.mono} fontSize={18} fill={C.ink3}>
              {yr}
            </text>
          </g>
        ))}
        <line x1={CH.x} y1={CH.y + CH.h} x2={CH.x + CH.w} y2={CH.y + CH.h} stroke={hexA(C.ink, 0.35)} strokeWidth={2} />
        <text x={CH.x - 20} y={CH.y + 10} textAnchor="end" fontFamily={FONT.mono} fontSize={16} fill={C.ink3} transform={`rotate(-90 ${CH.x - 40} ${CH.y + CH.h / 2})`}>
          speed (log scale)
        </text>
        <path d={gap} fill={hexA(C.rose, 0.1 + 0.08 * wallP)} />
        {bricks}
        <path d={curve(cpu)} fill="none" stroke={TIER.reg} strokeWidth={5} style={{ filter: `drop-shadow(0 0 10px ${TIER.reg})` }} />
        <path d={curve(dram)} fill="none" stroke={TIER.dram} strokeWidth={5} style={{ filter: `drop-shadow(0 0 10px ${TIER.dram})` }} />
        {draw > 0.6 && (
          <>
            <text x={px(2012)} y={py(cpu(2012)) - 26} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={24} fill={TIER.reg} opacity={prog(f, b.memory - 30, 14)}>
              processors
            </text>
            <text x={px(2012)} y={py(dram(2012)) - 20} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={24} fill={TIER.dram} opacity={prog(f, b.memory - 10, 14)}>
              memory
            </text>
          </>
        )}
        {/* 1995 marker */}
        {mark > 0.01 && (
          <g opacity={clamp(mark)}>
            <line x1={px(1995)} y1={CH.y - 10} x2={px(1995)} y2={CH.y + CH.h} stroke={hexA(C.ink, 0.5)} strokeDasharray="6 6" />
            <text x={px(1995) + 14} y={CH.y + 14} fontFamily={FONT.mono} fontSize={18} fill={C.ink}>
              1995
            </text>
          </g>
        )}
      </svg>
      <div style={{ position: "absolute", left: CH.x + CH.w + 60, top: 330, width: 420, opacity: prog(f, b.wall - 8, 14) }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 64, color: C.ink, lineHeight: 1 }}>the memory wall</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 19, color: hexA(C.rose, 0.95), marginTop: 14, lineHeight: 1.5 }}>
          Wulf &amp; McKee, 1995:
          <br />
          “Hitting the Memory Wall:
          <br />
          Implications of the Obvious”
        </div>
      </div>
      <div style={{ position: "absolute", left: CH.x, top: CH.y + CH.h + 60, fontFamily: FONT.mono, fontSize: 16, color: C.ink3, opacity: draw }}>illustrative trend · processor performance vs. DRAM speed</div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the wait
const Wait: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const trip = prog(f, b.today + 34, b.wait - b.today - 38, EASE.linear);
  const N = 300;
  const ticksDone = Math.floor(trip * N);
  const instr = Math.round(trip * 2.2 * N);
  const lifeA = prog(f, b.wait - 4, 16);
  const work = prog(f, b.life - 6, 30, EASE.inOut);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.orange}>one trip to main memory</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* 300 clock ticks */}
        {new Array(N).fill(0).map((_, i) => {
          const col = i % 50;
          const row = Math.floor(i / 50);
          const x = 260 + col * 28;
          const y = 300 + row * 56;
          const done = i < ticksDone;
          // instructions the core could have run in this tick
          const k = 1 + Math.floor(rnd(`ins${i}`) * 3);
          return (
            <g key={i}>
              <rect x={x} y={y} width={22} height={44} rx={4} fill="none" stroke={hexA(C.ink, 0.12)} strokeWidth={1} />
              {done &&
                new Array(k).fill(0).map((__, j) => (
                  <rect key={j} x={x + 3} y={y + 40 - (j + 1) * 12} width={16} height={9} rx={2} fill={hexA([C.violet, C.cyan, C.pink][j], 0.75)} />
                ))}
            </g>
          );
        })}
        {/* the load crawling to memory and back */}
        <rect x={260} y={680} width={50 * 28 - 6} height={10} rx={5} fill={hexA(C.ink, 0.08)} />
        <rect x={260} y={680} width={(50 * 28 - 6) * trip} height={10} rx={5} fill={TIER.dram} />
        <text x={260} y={724} fontFamily={FONT.mono} fontSize={18} fill={TIER.dram}>
          LOAD → main memory → back
        </text>
      </svg>
      <div style={{ position: "absolute", right: 140, top: 760, textAlign: "right", opacity: prog(f, b.today + 34, 14) }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 64, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{ticksDone}</div>
        <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: hexA(C.ink, 0.6) }}>CLOCK TICKS WAITED</div>
      </div>
      <div style={{ position: "absolute", left: 260, top: 760, opacity: prog(f, Math.max(b.hundreds - 4, b.today + 40), 14) }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 64, fontWeight: 700, color: C.violet, fontVariantNumeric: "tabular-nums" }}>{instr}</div>
        <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: hexA(C.ink, 0.6) }}>INSTRUCTIONS IT COULD HAVE RUN</div>
      </div>
      {/* a life spent waiting */}
      {lifeA > 0.01 && (
        <AbsoluteFill style={{ opacity: lifeA, background: "rgba(5,6,13,0.86)" }}>
          <div style={{ position: "absolute", left: 260, right: 260, top: 470 }}>
            <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 18, letterSpacing: "0.3em", color: hexA(C.ink, 0.7) }}>A CORE THAT ALWAYS WAITED · illustrative</div>
            <div style={{ display: "flex", height: 70, marginTop: 18, borderRadius: 14, overflow: "hidden", border: `1px solid ${hexA(C.ink, 0.25)}` }}>
              <div style={{ width: `${mix(1, 1, work) * 1.5}%`, background: C.violet }} />
              <div style={{ flex: 1, background: `repeating-linear-gradient(90deg, ${hexA(C.ink, 0.12)} 0 12px, ${hexA(C.ink, 0.06)} 12px 24px)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.mono, fontSize: 26, color: C.ink2 }}>
                waiting{".".repeat(1 + (Math.floor(f / 10) % 3))}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontFamily: FONT.mono, fontSize: 18 }}>
              <span style={{ color: C.violet }}>working</span>
              <span style={{ color: C.ink3 }}>everything else</span>
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const a1 = 1 - prog(f, b.today + 22, 10, EASE.in);
  const a2 = prog(f, b.today + 30, 12);
  return (
    <SceneShell dur={s.durationInFrames} enter={22} exit={14} delay={66}>
      <Glow x={960} y={560} size={1500} color={C.orange} a={0.06} />
      {a1 > 0.01 && <Chart b={b} a={a1} />}
      {a2 > 0.01 && <Wait b={b} a={a2} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.decades - 4, name: "sweep_up", vol: 0.3 },
    { at: b.name + 6, name: "tick_hi", vol: 0.3 },
    { at: b.wall - 4, name: "thud", vol: 0.4 },
    { at: b.wall + 4, name: "thud", vol: 0.3, rate: 1.1 },
    { at: b.wall + 12, name: "thud", vol: 0.25, rate: 1.2 },
    { at: b.today + 6, name: "data_long", vol: 0.25 },
    { at: b.wait - 4, name: "hum", vol: 0.25 },
  ];
};

export const Wall: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.orange, hueB: C.rose, hueC: C.violet, intensity: 0.5 },
};
