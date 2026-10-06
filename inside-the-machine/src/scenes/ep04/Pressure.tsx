import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { BAD, Check, Cross, OK, Packet, TIER } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    touch: c.q1.from,
    stops: wordAt(c.q1, "the hardware stops"),
    kernel: wordAt(c.q1, "asks the kernel"),
    fault: wordAt(c.q1, "page fault"),
    finds: c.q2.from,
    maps: wordAt(c.q2, "maps it in"),
    carries: wordAt(c.q2, "carries on"),
    short: c.q3.from,
    squeezes: wordAt(c.q3, "squeezes pages"),
    compressing: wordAt(c.q3, "compressing them"),
    swap: c.q4.from,
    ssd: wordAt(c.q4, "out to the SSD"),
    swapWord: wordAt(c.q4, "That's swap"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

// ---------------------------------------------------------------- act 1: a page fault
const Fault: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const access = prog(f, b.touch + 10, 22, EASE.inOut);
  const stop = prog(f, b.stops - 4, 10, EASE.outBack);
  const trap = prog(f, b.kernel - 6, 20, EASE.inOut);
  const faultA = prog(f, b.fault - 6, 14);
  const fetch = prog(f, b.finds + 6, 30, EASE.inOut);
  const mapped = prog(f, b.maps - 4, 12);
  const resume = prog(f, b.carries - 6, 20, EASE.inOut);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={faultA > 0.5 && mapped < 0.5 ? BAD : C.pink}>{mapped > 0.5 ? "fixed, invisibly" : "a page fault"}</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* program */}
        <rect x={140} y={300} width={360} height={220} rx={22} fill="rgba(30,10,26,0.9)" stroke={TIER.reg} strokeWidth={2.5} />
        <text x={164} y={340} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={TIER.reg}>
          PROGRAM
        </text>
        <text x={164} y={400} fontFamily={FONT.mono} fontSize={24} fill={C.ink}>
          load page 7
        </text>
        <text x={164} y={460} fontFamily={FONT.mono} fontSize={20} fill={resume > 0.5 ? OK : stop > 0.5 ? BAD : C.ink3}>
          {resume > 0.5 ? "▶ carries on" : stop > 0.5 ? "⏸ paused" : "running"}
        </text>
        {/* page table */}
        <rect x={720} y={260} width={460} height={300} rx={20} fill="rgba(24,18,6,0.9)" stroke={hexA(C.amber, 0.7)} strokeWidth={2} />
        <text x={744} y={298} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={C.amber}>
          PAGE TABLE
        </text>
        {[5, 6, 7, 8].map((pg, i) => {
          const isT = pg === 7;
          const present = !isT || mapped > 0.5;
          return (
            <g key={pg}>
              <rect x={744} y={320 + i * 56} width={412} height={44} rx={10} fill={isT ? hexA(present ? OK : BAD, 0.18 * Math.max(faultA, mapped)) : hexA(C.ink, 0.05)} stroke={isT && faultA > 0.3 ? (present ? OK : BAD) : hexA(C.ink, 0.15)} strokeWidth={isT ? 2 : 1} />
              <text x={764} y={349 + i * 56} fontFamily={FONT.mono} fontSize={20} fill={C.ink2}>
                page {pg} → {present ? `frame ${[18, 31, 9, 26][i]}` : "not in memory"}
              </text>
            </g>
          );
        })}
        <Packet x0={500} y0={410} x1={720} y1={410} p={access} col={C.amber} label="page 7?" w={110} />
        {stop > 0.01 && mapped < 0.5 && <Cross x={1210} y={448} r={24} a={clamp(stop)} />}
        {/* the kernel */}
        <g opacity={trap}>
          <rect x={720} y={640} width={460} height={140} rx={20} fill="rgba(20,14,40,0.92)" stroke={C.violet} strokeWidth={2.5} />
          <text x={744} y={680} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={C.violet}>
            KERNEL
          </text>
          <text x={744} y={730} fontFamily={FONT.mono} fontSize={22} fill={C.ink}>
            {mapped > 0.5 ? "mapped ✓ · resume" : fetch > 0 ? "fetching page 7…" : "page fault!"}
          </text>
        </g>
        <path d="M950,560 L950,640" stroke={C.violet} strokeWidth={3} strokeDasharray={`${trap * 80} 80`} />
        {/* where the data lives */}
        <g opacity={prog(f, b.finds - 4, 14)}>
          <rect x={1380} y={640} width={360} height={140} rx={20} fill={hexA(TIER.ssd, 0.12)} stroke={TIER.ssd} strokeWidth={2.5} />
          <text x={1404} y={680} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={TIER.ssd}>
            SSD / FILE
          </text>
          <text x={1404} y={730} fontFamily={FONT.mono} fontSize={22} fill={C.ink}>
            page 7’s data
          </text>
        </g>
        {fetch > 0 && fetch < 1 && <Spark x={mix(1380, 1180, fetch)} y={710} color={TIER.ssd} r={9} />}
        {mapped > 0.5 && <Check x={1210} y={448} r={24} a={mapped} />}
        <Packet x0={720} y0={470} x1={500} y1={470} p={resume} col={OK} label="data" w={80} />
      </svg>
      {faultA > 0.01 && mapped < 0.5 && (
        <div style={{ position: "absolute", left: 140, top: 600, opacity: faultA }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 52, color: BAD }}>page fault</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 19, color: C.ink2, marginTop: 4 }}>the hardware asks the kernel for help</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 2: pressure → compression → swap
const NPAGES = 40;
const pageCol = (i: number) => [C.pink, C.violet, C.blue, C.cyan, C.teal, C.green, C.amber, C.orange][i % 8];
const coldPage = (i: number) => rnd(`cold${i}`) > 0.55; // not used lately
const coldIndex = (i: number) => new Array(i).fill(0).filter((_, k) => coldPage(k)).length;
const Squeeze: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const fill = prog(f, b.short - 4, 30, EASE.inOut);
  const press = mix(0.35, 0.92, fill) - 0.3 * prog(f, b.compressing, 40) + 0.12 * prog(f, b.swap, 20) - 0.25 * prog(f, b.ssd, 30);
  const squeeze = prog(f, b.squeezes - 4, 40, EASE.inOut);
  const swapP = prog(f, b.ssd - 10, 34, EASE.inOut);
  const gaugeCol = press > 0.8 ? BAD : press > 0.6 ? C.amber : OK;
  const MX = 200;
  const MY = 260;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={swapP > 0.3 ? TIER.ssd : C.cyan}>{swapP > 0.3 ? "swap: out to the SSD" : "memory pressure"}</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* memory full of pages */}
        <rect x={MX - 20} y={MY - 20} width={1040} height={520} rx={22} fill="rgba(6,24,24,0.6)" stroke={hexA(TIER.dram, 0.6)} strokeWidth={2} />
        <text x={MX} y={MY - 34} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={TIER.dram}>
          MAIN MEMORY
        </text>
        {new Array(NPAGES).fill(0).map((_, i) => {
          const c = i % 10;
          const r = Math.floor(i / 10);
          const x = MX + c * 100;
          const y = MY + r * 120;
          const appear = clamp(fill * NPAGES * 1.1 - i);
          const cold = coldPage(i);
          const sq = cold ? squeeze : 0;
          // squeezed pages slide into the compressed area at the bottom right; some then move out to the SSD
          const goSwap = cold && rnd(`sw${i}`) > 0.5;
          const sw = goSwap ? swapP : 0;
          const ci = coldIndex(i);
          const tx = mix(x, 752 + (ci % 8) * 33, sq);
          const ty = mix(y, 606 + (Math.floor(ci / 8) % 2) * 40, sq);
          const fx = mix(tx, 1500 + (i % 5) * 50, sw);
          const fy = mix(ty, 600 + (i % 3) * 40, sw);
          const w = mix(84, 26, sq);
          const h = mix(100, 34, sq);
          return (
            <g key={i} opacity={appear}>
              <rect x={fx} y={fy} width={w} height={h} rx={8} fill={hexA(pageCol(i), sq > 0.5 ? 0.6 : 0.35)} stroke={pageCol(i)} strokeWidth={1.5} />
              {sq < 0.3 && (
                <text x={fx + w / 2} y={fy + h / 2 + 6} textAnchor="middle" fontFamily={FONT.mono} fontSize={14} fill={C.ink2}>
                  {cold ? "idle" : "busy"}
                </text>
              )}
            </g>
          );
        })}
        {/* compressed region */}
        <g opacity={prog(f, b.squeezes - 4, 16)}>
          <rect x={740} y={600} width={280} height={90} rx={14} fill="none" stroke={C.cyan} strokeWidth={2} strokeDasharray="8 6" />
          <text x={750} y={716} fontFamily={FONT.mono} fontSize={17} fill={C.cyan}>
            compressed, still in memory
          </text>
        </g>
        {/* the SSD */}
        <g opacity={prog(f, b.swap - 4, 14)}>
          <rect x={1460} y={560} width={360} height={200} rx={22} fill={hexA(TIER.ssd, 0.1)} stroke={TIER.ssd} strokeWidth={2.5} />
          <text x={1484} y={598} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={TIER.ssd}>
            SSD · SWAP
          </text>
        </g>
        {/* the pressure gauge */}
        <g transform="translate(1480 300)">
          <text x={0} y={-30} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={hexA(C.ink, 0.7)}>
            MEMORY PRESSURE
          </text>
          <rect x={0} y={0} width={340} height={30} rx={15} fill={hexA(C.ink, 0.08)} />
          <rect x={0} y={0} width={340 * clamp(press)} height={30} rx={15} fill={gaugeCol} style={{ filter: `drop-shadow(0 0 10px ${gaugeCol})` }} />
          <text x={0} y={70} fontFamily={FONT.mono} fontSize={20} fill={gaugeCol}>
            {press > 0.8 ? "high" : press > 0.6 ? "rising" : "comfortable"}
          </text>
        </g>
      </svg>
      <div style={{ position: "absolute", left: 200, top: 860, opacity: prog(f, b.compressing - 4, 16), fontFamily: FONT.mono, fontSize: 20, color: C.ink2 }}>
        idle pages are squeezed first: <span style={{ color: C.cyan }}>fast to unsqueeze</span> · only then: <span style={{ color: TIER.ssd }}>out to the SSD</span>
      </div>
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const a1 = 1 - prog(f, b.short - 14, 10, EASE.in);
  const a2 = prog(f, b.short - 4, 12);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      <Glow x={960} y={560} size={1500} color={C.violet} a={0.06} />
      {a1 > 0.01 && <Fault b={b} a={a1} />}
      {a2 > 0.01 && <Squeeze b={b} a={a2} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.touch + 10, name: "whoosh_soft", vol: 0.25 },
    { at: b.stops - 4, name: "blip_lo", vol: 0.4 },
    { at: b.kernel - 6, name: "sweep_down", vol: 0.25 },
    { at: b.fault - 6, name: "alarm", vol: 0.1 },
    { at: b.finds + 6, name: "data", vol: 0.3 },
    { at: b.maps - 4, name: "pop", vol: 0.3 },
    { at: b.carries - 6, name: "chime", vol: 0.25 },
    { at: b.short - 4, name: "riser", vol: 0.25 },
    { at: b.squeezes - 4, name: "sweep_down", vol: 0.3 },
    { at: b.compressing, name: "thud", vol: 0.25 },
    { at: b.ssd - 10, name: "whoosh", vol: 0.3 },
  ];
};

export const Pressure: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.violet, hueB: C.cyan, hueC: C.amber, intensity: 0.5 },
};
