import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { BAD, Check, Cross, OK, TIER } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    asked: c.p1.from,
    watches: wordAt(c.p1, "watches the stream"),
    pattern: wordAt(c.p1, "spots the pattern"),
    before: wordAt(c.p1, "before the program needs"),
    lazy: c.p2.from,
    dirty: wordAt(c.p2, "marked dirty"),
    evicted: wordAt(c.p2, "finally evicted"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

const LANE_Y = 330;
const MEM_Y = 820;
const X0 = 380;
const DX = 180;

// ---------------------------------------------------------------- act 1: the prefetcher
const Stream: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const N = 8;
  // request i is issued at reqAt(i); the first four miss, then the prefetcher has run ahead
  const reqAt = (i: number) => b.asked + 6 + i * (i < 4 ? 26 : 22) + (i >= 4 ? Math.max(0, b.before - b.asked - 6 - 4 * 26) : 0);
  const learn = prog(f, b.pattern - 6, 18);
  const pfAt = (i: number) => b.pattern + 4 + (i - 4) * 9; // prefetch issue times for lines 4..7
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={TIER.l1}>the prefetcher</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <text x={X0 - 40} y={LANE_Y + 8} textAnchor="end" fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.2em" fill={TIER.reg}>
          CORE ASKS
        </text>
        <text x={X0 - 40} y={(LANE_Y + MEM_Y) / 2 + 8} textAnchor="end" fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.2em" fill={TIER.l1}>
          L1 CACHE
        </text>
        <text x={X0 - 40} y={MEM_Y + 8} textAnchor="end" fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.2em" fill={TIER.dram}>
          MEMORY
        </text>
        <line x1={X0 - 20} y1={(LANE_Y + MEM_Y) / 2} x2={1800} y2={(LANE_Y + MEM_Y) / 2} stroke={hexA(TIER.l1, 0.25)} strokeWidth={2} strokeDasharray="8 8" />
        {new Array(N).fill(0).map((_, i) => {
          const x = X0 + i * DX;
          const addr = (0x1000 + i * 0x80).toString(16);
          const rq = prog(f, reqAt(i), 10);
          const prefetched = i >= 4;
          // when does this line arrive in L1?
          const arriveStart = prefetched ? pfAt(i) : reqAt(i) + 4;
          const arrive = prog(f, arriveStart, prefetched ? 16 : 22, EASE.inOut);
          const midY = (LANE_Y + MEM_Y) / 2;
          const hit = prefetched && f >= reqAt(i);
          const miss = !prefetched && f >= reqAt(i);
          return (
            <g key={i}>
              {/* request marker */}
              <g opacity={rq}>
                <rect x={x - 66} y={LANE_Y - 26} width={132} height={52} rx={12} fill="rgba(30,10,26,0.9)" stroke={TIER.reg} strokeWidth={2} />
                <text x={x} y={LANE_Y + 7} textAnchor="middle" fontFamily={FONT.mono} fontSize={19} fill={C.ink}>
                  0x{addr}
                </text>
              </g>
              {/* the line travelling up from memory */}
              <rect x={x - 60} y={MEM_Y - 18} width={120} height={36} rx={8} fill={hexA(TIER.dram, 0.2)} stroke={hexA(TIER.dram, 0.6)} strokeWidth={1.5} />
              {arrive > 0 && (
                <rect x={x - 60} y={mix(MEM_Y - 18, midY - 18, arrive)} width={120} height={36} rx={8} fill={hexA(prefetched ? C.cyan : TIER.l1, 0.35)} stroke={prefetched ? C.cyan : TIER.l1} strokeWidth={2} style={prefetched ? { filter: `drop-shadow(0 0 10px ${C.cyan})` } : undefined} />
              )}
              {miss && f - reqAt(i) < 40 && <Cross x={x + 80} y={LANE_Y - 26} r={16} />}
              {hit && f - reqAt(i) < 40 && <Check x={x + 80} y={LANE_Y - 26} r={16} />}
              {prefetched && arrive > 0.95 && f < reqAt(i) && (
                <text x={x} y={midY + 50} textAnchor="middle" fontFamily={FONT.mono} fontSize={19} fill={C.cyan}>
                  already here
                </text>
              )}
            </g>
          );
        })}
        {/* stride detection */}
        <g opacity={learn}>
          {[0, 1, 2].map((k) => (
            <g key={k}>
              <path d={`M${X0 + k * DX + 10},${LANE_Y - 40} Q${X0 + k * DX + DX / 2},${LANE_Y - 90} ${X0 + (k + 1) * DX - 10},${LANE_Y - 40}`} fill="none" stroke={C.amber} strokeWidth={2.5} />
              <text x={X0 + k * DX + DX / 2} y={LANE_Y - 80} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={17} fill={C.amber}>
                +128
              </text>
            </g>
          ))}
        </g>
      </svg>
      <div style={{ position: "absolute", left: 1330, top: 130, width: 440, opacity: learn, padding: "16px 20px", borderRadius: 16, background: "rgba(24,18,6,0.92)", border: `1.5px solid ${hexA(C.amber, 0.8)}` }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.25em", color: C.amber }}>PREFETCHER</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 21, color: C.ink, marginTop: 6 }}>pattern: every 128 bytes</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 19, color: C.cyan, marginTop: 4, opacity: prog(f, b.pattern + 4, 12) }}>→ fetching ahead…</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 2: write-back
const WriteBack: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const writes = Math.min(5, Math.max(0, Math.floor((f - b.lazy - 6) / 12) + 1));
  const val = 42 + writes;
  const dirtyA = prog(f, b.dirty - 4, 10, EASE.outBack);
  const evictP = prog(f, b.evicted - 6, 26, EASE.inOut);
  const memVal = evictP > 0.9 ? val : 42;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.orange}>lazy writes</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* core */}
        <rect x={260} y={390} width={300} height={200} rx={22} fill="rgba(30,10,26,0.9)" stroke={TIER.reg} strokeWidth={3} />
        <text x={410} y={460} textAnchor="middle" fontFamily={FONT.mono} fontSize={26} fill={C.ink2}>
          x = x + 1
        </text>
        <text x={410} y={520} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} fill={TIER.reg}>
          writes: {writes}
        </text>
        {/* cache line */}
        <g transform={`translate(${mix(760, 1340, evictP)} ${mix(430, 750, evictP)})`} opacity={1 - prog(evictP, 0.7, 0.3)}>
          <rect width={360} height={120} rx={16} fill={hexA(TIER.l1, 0.18)} stroke={TIER.l1} strokeWidth={2.5} />
          <text x={24} y={46} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={TIER.l1}>
            L1 · LINE WITH x
          </text>
          <text x={24} y={98} fontFamily={FONT.mono} fontWeight={700} fontSize={40} fill={C.ink}>
            x = {val}
          </text>
          <g opacity={clamp(dirtyA)}>
            <circle cx={318} cy={40} r={20} fill={C.orange} style={{ filter: `drop-shadow(0 0 10px ${C.orange})` }} />
            <text x={318} y={47} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={20} fill="#1a0e04">
              D
            </text>
            <text x={250} y={98} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.2em" fill={C.orange}>
              DIRTY
            </text>
          </g>
        </g>
        {/* memory */}
        <rect x={1300} y={700} width={440} height={220} rx={20} fill="rgba(6,24,24,0.85)" stroke={hexA(TIER.dram, 0.7)} strokeWidth={2} />
        <text x={1324} y={740} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={TIER.dram}>
          MAIN MEMORY
        </text>
        <text x={1324} y={880} fontFamily={FONT.mono} fontWeight={700} fontSize={40} fill={evictP > 0.9 ? OK : C.ink3}>
          x = {memVal}
        </text>
        {evictP <= 0.9 && writes > 0 && (
          <text x={1520} y={880} fontFamily={FONT.mono} fontSize={18} fill={C.ink3}>
            (old: and that's fine)
          </text>
        )}
        <line x1={560} y1={490} x2={760} y2={490} stroke={hexA(TIER.reg, 0.5)} strokeWidth={3} strokeDasharray="8 6" />
      </svg>
      <div style={{ position: "absolute", left: 260, top: 700, opacity: prog(f, b.evicted - 6, 16) }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: C.ink }}>five writes, one trip down</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 19, color: C.orange, marginTop: 6 }}>the line is written back only when it’s evicted</div>
      </div>
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const a1 = 1 - prog(f, b.lazy - 14, 10, EASE.in);
  const a2 = prog(f, b.lazy - 4, 12);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      <Glow x={960} y={560} size={1400} color={C.cyan} a={0.07} />
      {a1 > 0.01 && <Stream b={b} a={a1} />}
      {a2 > 0.01 && <WriteBack b={b} a={a2} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.asked + 6, name: "blip_lo", vol: 0.3 },
    { at: b.asked + 32, name: "blip_lo", vol: 0.3 },
    { at: b.watches - 4, name: "scan", vol: 0.25 },
    { at: b.pattern - 6, name: "blip_hi", vol: 0.3 },
    { at: b.pattern + 4, name: "data", vol: 0.3 },
    { at: b.before + 4, name: "chime", vol: 0.25 },
    ...[0, 1, 2, 3, 4].map((k) => ({ at: b.lazy + 6 + k * 12, name: "tick", vol: 0.2, rate: 1 + k * 0.05 })),
    { at: b.dirty - 4, name: "pop", vol: 0.3 },
    { at: b.evicted - 6, name: "whoosh", vol: 0.3 },
    { at: b.evicted + 18, name: "thud", vol: 0.3 },
  ];
};

export const Prefetch: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.cyan, hueB: C.violet, hueC: C.amber, intensity: 0.5 },
};
