import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { BAD, CacheLineBar, Check, Cross, LINE_NUMS, OK, Packet, TIER, numAt } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    needs: c.c1.from,
    own: wordAt(c.c1, "its own cache"),
    miss: c.c2.from,
    travels: wordAt(c.c2, "travels down"),
    back: wordAt(c.c2, "comes back"),
    line: wordAt(c.c2, "a cache line"),
    bytes: c.c2b.from,
    sixteen: wordAt(c.c2b, "sixteen numbers"),
    predictable: c.c3.from,
    neighbor: wordAt(c.c3, "its neighbor next"),
    again: wordAt(c.c3, "use it again"),
    pays: c.c4.from,
    win: wordAt(c.c4, "they win"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

const CORE = { x: 70, y: 290, w: 320, h: 320 };
const L1 = { x: 480, y: 290 };
const MEMX = 1200;
const LW = 600;
const VALUES = new Array(64).fill(0).map((_, i) => numAt(i));

/** Access schedule after the first miss: i = 1..31 with a miss at 16. */
const schedule = (b: B) => {
  const ev: { i: number; at: number; miss: boolean }[] = [];
  let t = b.predictable + 6;
  for (let i = 1; i < 32; i++) {
    const miss = i % LINE_NUMS === 0;
    ev.push({ i, at: t, miss });
    t += miss ? 46 : 9;
  }
  return ev;
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const ev = schedule(b);
  // phase 1: the first access (a miss)
  const ask = prog(f, b.needs + 6, 18, EASE.inOut);
  const scan = prog(f, b.own - 4, 20, EASE.inOut);
  const missX = prog(f, b.miss - 2, 10, EASE.outBack);
  const down = prog(f, b.travels - 6, 22, EASE.inOut);
  const lineHi0 = prog(f, b.travels + 12, 10);
  const up = prog(f, b.back - 2, 26, EASE.inOut);
  const inL1 = prog(f, b.back + 20, 8);
  const deliver = prog(f, b.line + 6, 14, EASE.inOut);
  const rulerA = inOut(f, b.bytes - 4, 14, b.predictable + 4, 12);
  // loop progress
  const done = ev.filter((e) => f >= e.at);
  const cur = done.length ? done[done.length - 1] : null;
  const idx = cur ? cur.i : f >= b.line + 10 ? 0 : -1;
  const hits = done.filter((e) => !e.miss).length;
  const misses = 1 + done.filter((e) => e.miss).length;
  const line2Fetch = ev.find((e) => e.miss)!;
  const l2p = prog(f, line2Fetch.at, 40, EASE.inOut);
  const sum = new Array(Math.max(0, idx + 1)).fill(0).reduce((acc, _, i) => acc + Number(VALUES[i]), 0);
  const tallyA = prog(f, b.pays - 4, 16);
  const localA = inOut(f, b.neighbor - 6, 14, b.pays - 4, 12);
  const againA = inOut(f, b.again - 6, 14, b.pays - 4, 12);
  // which slots of each L1 line have been used
  const used0 = idx >= 0 ? Math.min(16, idx + 1) : 0;
  const used1 = idx >= 16 ? Math.min(16, idx - 15) : 0;
  const curHit = cur && !cur.miss && f - cur.at < 8;
  return (
    <SceneShell dur={s.durationInFrames} enter={22} exit={14} delay={66}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={TIER.l1}>{f < b.predictable ? "a miss, and a cache line" : "then: hit after hit"}</Kicker>
      </div>
      <Glow x={L1.x + LW / 2} y={480} size={900} color={TIER.l1} a={0.12} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* core */}
        <rect x={CORE.x} y={CORE.y} width={CORE.w} height={CORE.h} rx={24} fill="rgba(30,10,26,0.9)" stroke={TIER.reg} strokeWidth={3} style={curHit ? { filter: `drop-shadow(0 0 16px ${OK})` } : undefined} />
        <text x={CORE.x + 24} y={CORE.y + 42} fontFamily={FONT.ui} fontWeight={700} fontSize={18} letterSpacing="0.3em" fill={TIER.reg}>
          CORE
        </text>
        <text x={CORE.x + 24} y={CORE.y + 100} fontFamily={FONT.mono} fontSize={22} fill={C.ink2}>
          sum += a[i]
        </text>
        <text x={CORE.x + 24} y={CORE.y + 160} fontFamily={FONT.mono} fontWeight={700} fontSize={34} fill={C.ink}>
          i = {Math.max(0, idx)}
        </text>
        <text x={CORE.x + 24} y={CORE.y + 220} fontFamily={FONT.mono} fontWeight={700} fontSize={36} fill={TIER.reg}>
          sum = {idx >= 0 ? sum : 0}
        </text>
        {/* L1 */}
        <text x={L1.x} y={L1.y - 20} fontFamily={FONT.ui} fontWeight={700} fontSize={18} letterSpacing="0.3em" fill={TIER.l1}>
          L1 CACHE
        </text>
        <rect x={L1.x - 20} y={L1.y} width={LW + 40} height={300} rx={20} fill="rgba(16,10,32,0.85)" stroke={hexA(TIER.l1, 0.6)} strokeWidth={2} />
        {[0, 1, 2].map((k) => (
          <rect key={k} x={L1.x} y={L1.y + 30 + k * 86} width={LW} height={54} rx={10} fill="none" stroke={hexA(C.ink, 0.12)} strokeDasharray="6 6" />
        ))}
        {scan > 0 && scan < 1 && <rect x={L1.x} y={L1.y + 24 + scan * 200} width={LW} height={4} fill={TIER.l1} opacity={0.8} />}
        {inL1 > 0 && <CacheLineBar x={L1.x} y={L1.y + 30} w={LW} values={VALUES.slice(0, 16)} lit={used0} a={inL1} />}
        {l2p > 0.95 && <CacheLineBar x={L1.x} y={L1.y + 116} w={LW} values={VALUES.slice(16, 32)} lit={used1} />}
        {missX > 0.01 && f < b.back + 10 && <Cross x={L1.x + LW + 50} y={L1.y + 56} r={26} a={clamp(missX)} />}
        {/* main memory: the array, four lines of sixteen */}
        <text x={MEMX} y={L1.y - 20} fontFamily={FONT.ui} fontWeight={700} fontSize={18} letterSpacing="0.3em" fill={TIER.dram}>
          MAIN MEMORY
        </text>
        <rect x={MEMX - 20} y={L1.y} width={LW + 40} height={380} rx={20} fill="rgba(6,24,24,0.85)" stroke={hexA(TIER.dram, 0.6)} strokeWidth={2} />
        {[0, 1, 2, 3].map((k) => {
          const hi = k === 0 ? lineHi0 * (1 - prog(f, b.back + 30, 20)) : k === 1 ? clamp(l2p * 3) * (1 - prog(f, line2Fetch.at + 40, 20)) : 0;
          return (
            <g key={k}>
              <CacheLineBar x={MEMX} y={L1.y + 30 + k * 86} w={LW} col={TIER.dram} values={VALUES.slice(k * 16, k * 16 + 16)} />
              {hi > 0.01 && <rect x={MEMX - 8} y={L1.y + 22 + k * 86} width={LW + 16} height={70} rx={12} fill="none" stroke={C.amber} strokeWidth={3} opacity={hi} style={{ filter: `drop-shadow(0 0 10px ${C.amber})` }} />}
            </g>
          );
        })}
        {/* request & line traffic */}
        <Packet x0={CORE.x + CORE.w} y0={CORE.y + 80} x1={L1.x - 30} y1={CORE.y + 80} p={ask} col={C.amber} label="a[0]?" w={90} />
        <Packet x0={L1.x + LW + 30} y0={L1.y + 57} x1={MEMX - 30} y1={L1.y + 57} p={down} col={C.amber} label="a[0]?" w={90} />
        {up > 0 && up < 1 && <CacheLineBar x={mix(MEMX, L1.x, up)} y={L1.y + 30} w={LW} values={VALUES.slice(0, 16)} a={1} col={C.amber} />}
        <Packet x0={L1.x - 30} y0={CORE.y + 150} x1={CORE.x + CORE.w} y1={CORE.y + 150} p={deliver} col={OK} label={VALUES[0]} w={70} />
        {/* second miss */}
        {l2p > 0 && l2p < 1 && <CacheLineBar x={mix(MEMX, L1.x, l2p)} y={L1.y + 116} w={LW} values={VALUES.slice(16, 32)} col={C.amber} />}
        {/* hit / miss marks on the current access */}
        {cur && f - cur.at < 10 && (cur.miss ? <Cross x={L1.x + LW + 50} y={L1.y + 142} r={22} /> : <Check x={L1.x + LW + 50} y={L1.y + 56 + (cur.i >= 16 ? 86 : 0)} r={20} />)}
        {/* 128-byte ruler */}
        {rulerA > 0.01 && (
          <g opacity={rulerA}>
            <path d={`M${L1.x},${L1.y + 100} v14 h${LW} v-14`} fill="none" stroke={C.ink2} strokeWidth={2} />
            <text x={L1.x + LW / 2} y={L1.y + 142} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={22} fill={C.ink}>
              128 bytes = 16 numbers × 8 bytes
            </text>
            <text x={L1.x + LW / 2} y={L1.y + 170} textAnchor="middle" fontFamily={FONT.mono} fontSize={17} fill={C.ink3}>
              $ sysctl hw.cachelinesize → 128
            </text>
          </g>
        )}
      </svg>
      {/* locality captions */}
      <div style={{ position: "absolute", left: CORE.x, top: 700, display: "flex", gap: 30 }}>
        <div style={{ opacity: localA, padding: "14px 20px", borderRadius: 14, background: "rgba(10,14,28,0.9)", border: `1.5px solid ${hexA(TIER.l1, 0.7)}` }}>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.25em", color: TIER.l1 }}>NEXT DOOR</div>
          <div style={{ fontFamily: FONT.ui, fontSize: 24, color: C.ink, marginTop: 4 }}>use a number → use its neighbor</div>
        </div>
        <div style={{ opacity: againA, padding: "14px 20px", borderRadius: 14, background: "rgba(10,14,28,0.9)", border: `1.5px solid ${hexA(TIER.reg, 0.7)}` }}>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.25em", color: TIER.reg }}>AGAIN SOON</div>
          <div style={{ fontFamily: FONT.ui, fontSize: 24, color: C.ink, marginTop: 4 }}>use it once → use it again</div>
        </div>
      </div>
      {/* tally */}
      <div style={{ position: "absolute", left: CORE.x, top: 860, display: "flex", alignItems: "center", gap: 40, opacity: tallyA }}>
        <div>
          <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 56, color: OK, fontVariantNumeric: "tabular-nums" }}>{hits}</div>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 15, letterSpacing: "0.3em", color: hexA(C.ink, 0.6) }}>FAST HITS</div>
        </div>
        <div>
          <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 56, color: BAD, fontVariantNumeric: "tabular-nums" }}>{misses}</div>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 15, letterSpacing: "0.3em", color: hexA(C.ink, 0.6) }}>SLOW TRIPS</div>
        </div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: C.ink, marginLeft: 20, opacity: prog(f, b.win - 6, 14) }}>one slow trip, fifteen fast hits</div>
      </div>
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const ev = schedule(b);
  return [
    { at: b.needs + 6, name: "whoosh_soft", vol: 0.25 },
    { at: b.own - 4, name: "scan", vol: 0.25 },
    { at: b.miss - 2, name: "blip_lo", vol: 0.4 },
    { at: b.travels - 6, name: "whoosh", vol: 0.3 },
    { at: b.back - 2, name: "data", vol: 0.35 },
    { at: b.line + 6, name: "pop", vol: 0.3 },
    ...ev.map((e) => (e.miss ? { at: e.at, name: "blip_lo", vol: 0.35 } : { at: e.at, name: "tick_hi", vol: 0.14, rate: 1 + (e.i % 16) * 0.03 })),
    { at: b.win - 6, name: "chime", vol: 0.3 },
  ];
};

export const CacheLine: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.violet, hueB: C.indigo, hueC: C.pink, intensity: 0.5 },
};
