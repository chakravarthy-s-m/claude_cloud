import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { BAD, Check, OK, TIER } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    trick: c.v1.from,
    real: wordAt(c.v1, "a real memory address"),
    virt: c.v2.from,
    pages: wordAt(c.v2, "split into pages"),
    sixteen: wordAt(c.v2, "sixteen kilobytes"),
    table: wordAt(c.v2, "a page table"),
    walk: c.v3.from,
    tree: wordAt(c.v3, "a tree of tables"),
    trips: wordAt(c.v3, "several more trips"),
    tlb: c.v4.from,
    translations: wordAt(c.v4, "just for translations"),
    lookaside: wordAt(c.v4, "translation lookaside buffer"),
    big: c.v5.from,
    four: wordAt(c.v5, "four times"),
    intel: wordAt(c.v5, "older Intel Macs"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

const VPAGES = 8;
const FRAMES = { x: 1260, y: 260, cols: 6, rows: 8, w: 84, h: 62 };
const MAP = [17, 3, 40, 22, 9, 31, 44, 12]; // virtual page → physical frame
const PAGE_COL = [C.pink, C.violet, C.blue, C.cyan, C.teal, C.green, C.amber, C.orange];

// ---------------------------------------------------------------- act 1: virtual pages → physical frames
const Mapping: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const progA = prog(f, b.trick - 4, 16);
  const pagesA = prog(f, b.pages - 4, 16);
  const tableA = prog(f, b.table - 6, 16);
  const map = (i: number) => prog(f, b.table + 4 + i * 5, 18, EASE.inOut);
  const VX = 240;
  const VY = 250;
  const VH = 76;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.pink}>what a program sees · what’s really there</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* the program's tidy view */}
        <g opacity={progA}>
          <text x={VX} y={VY - 24} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={C.pink}>
            PROGRAM’S ADDRESSES (VIRTUAL)
          </text>
          {new Array(VPAGES).fill(0).map((_, i) => (
            <g key={i}>
              <rect x={VX} y={VY + i * VH} width={320} height={VH - 8} rx={10} fill={hexA(PAGE_COL[i], 0.12 + 0.2 * pagesA)} stroke={hexA(PAGE_COL[i], 0.4 + 0.5 * pagesA)} strokeWidth={2} />
              <text x={VX + 18} y={VY + i * VH + 42} fontFamily={FONT.mono} fontSize={20} fill={C.ink}>
                0x{(0x100000000 + i * 0x4000).toString(16)}
              </text>
              <text x={VX + 302} y={VY + i * VH + 42} textAnchor="end" fontFamily={FONT.mono} fontSize={16} fill={hexA(PAGE_COL[i], 0.95)} opacity={pagesA}>
                page {i}
              </text>
            </g>
          ))}
          <g opacity={prog(f, b.sixteen - 6, 14)}>
            <path d={`M${VX - 16},${VY} h-12 v${VH - 8} h12`} fill="none" stroke={C.ink2} strokeWidth={2} />
            <text x={VX - 40} y={VY + 40} textAnchor="end" fontFamily={FONT.mono} fontWeight={700} fontSize={20} fill={C.ink}>
              16 KB
            </text>
          </g>
        </g>
        {/* the page table in between */}
        <g opacity={tableA}>
          <text x={760} y={VY - 24} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={C.amber}>
            PAGE TABLE
          </text>
          {new Array(VPAGES).fill(0).map((_, i) => (
            <g key={i} opacity={0.4 + 0.6 * map(i)}>
              <rect x={760} y={VY + i * VH} width={280} height={VH - 8} rx={10} fill="rgba(24,18,6,0.9)" stroke={hexA(C.amber, 0.6)} strokeWidth={1.5} />
              <text x={780} y={VY + i * VH + 42} fontFamily={FONT.mono} fontSize={19} fill={C.ink2}>
                page {i} → frame {MAP[i]}
              </text>
            </g>
          ))}
        </g>
        {/* physical frames */}
        <text x={FRAMES.x} y={VY - 24} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={TIER.dram}>
          REAL MEMORY (PHYSICAL)
        </text>
        {new Array(FRAMES.cols * FRAMES.rows).fill(0).map((_, k) => {
          const x = FRAMES.x + (k % FRAMES.cols) * (FRAMES.w + 8);
          const y = FRAMES.y + Math.floor(k / FRAMES.cols) * (FRAMES.h + 14);
          const owner = MAP.indexOf(k);
          const lit = owner >= 0 ? map(owner) : 0;
          const other = owner < 0 && rnd(`fo${k}`) > 0.55;
          return (
            <g key={k}>
              <rect x={x} y={y} width={FRAMES.w} height={FRAMES.h} rx={8} fill={owner >= 0 ? hexA(PAGE_COL[owner], 0.1 + 0.45 * lit) : other ? hexA(C.ink, 0.08) : "rgba(10,14,24,0.6)"} stroke={owner >= 0 ? hexA(PAGE_COL[owner], 0.3 + 0.7 * lit) : hexA(C.ink, 0.15)} strokeWidth={owner >= 0 ? 2 : 1} />
              <text x={x + FRAMES.w / 2} y={y + FRAMES.h / 2 + 6} textAnchor="middle" fontFamily={FONT.mono} fontSize={15} fill={owner >= 0 && lit > 0.5 ? C.ink : C.ink3}>
                {k}
              </text>
            </g>
          );
        })}
        {/* mapping arrows */}
        {MAP.map((fr, i) => {
          const p = map(i);
          if (p <= 0) return null;
          const x0 = 1040;
          const y0 = VY + i * VH + 34;
          const x1 = FRAMES.x + (fr % FRAMES.cols) * (FRAMES.w + 8);
          const y1 = FRAMES.y + Math.floor(fr / FRAMES.cols) * (FRAMES.h + 14) + FRAMES.h / 2;
          return <path key={i} d={`M${x0},${y0} C${x0 + 120},${y0} ${x1 - 120},${y1} ${x1},${y1}`} fill="none" stroke={PAGE_COL[i]} strokeWidth={2.5} strokeDasharray={`${p * 900} 900`} opacity={0.85} />;
        })}
        {/* program → table arrows */}
        {new Array(VPAGES).fill(0).map((_, i) => (
          <line key={i} x1={VX + 320} y1={VY + i * VH + 34} x2={760} y2={VY + i * VH + 34} stroke={hexA(PAGE_COL[i], 0.5)} strokeWidth={2} opacity={tableA} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 2: the walk
const LEVELS = ["level 0", "level 1", "level 2", "level 3"];
const Walk: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const step = (i: number) => prog(f, b.tree - 4 + i * 16, 14, EASE.inOut);
  const tripsA = prog(f, b.trips - 6, 14);
  const n = [0, 1, 2, 3].filter((i) => step(i) > 0.5).length;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.amber}>the page-table walk</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g>
          <rect x={160} y={260} width={260} height={100} rx={16} fill="rgba(30,10,26,0.9)" stroke={TIER.reg} strokeWidth={2.5} />
          <text x={290} y={302} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={TIER.reg}>
            VIRTUAL ADDRESS
          </text>
          <text x={290} y={338} textAnchor="middle" fontFamily={FONT.mono} fontSize={22} fill={C.ink}>
            0x10000c2a8
          </text>
        </g>
        {LEVELS.map((lv, i) => {
          const x = 520 + i * 300;
          const y = 260 + i * 120;
          const p = step(i);
          return (
            <g key={lv} opacity={0.35 + 0.65 * p}>
              <rect x={x} y={y} width={240} height={180} rx={14} fill="rgba(24,18,6,0.9)" stroke={hexA(C.amber, 0.4 + 0.6 * p)} strokeWidth={2} />
              <text x={x + 16} y={y + 30} fontFamily={FONT.ui} fontWeight={700} fontSize={15} letterSpacing="0.2em" fill={C.amber}>
                TABLE · {lv.toUpperCase()}
              </text>
              {new Array(5).fill(0).map((_, k) => (
                <rect key={k} x={x + 16} y={y + 46 + k * 25} width={208} height={18} rx={4} fill={k === 2 && p > 0.5 ? hexA(C.amber, 0.6) : hexA(C.ink, 0.08)} />
              ))}
              {/* hop to the next level */}
              <path
                d={i === 0 ? `M420,310 C470,310 470,${y + 108} ${x},${y + 108}` : `M${x - 60},${y - 12} C${x - 30},${y - 12} ${x - 30},${y + 108} ${x},${y + 108}`}
                fill="none"
                stroke={C.amber}
                strokeWidth={2.5}
                strokeDasharray={`${p * 400} 400`}
              />
              {p > 0.05 && p < 0.95 && <Spark x={x - 6} y={y + 108} color={C.amber} r={7} />}
            </g>
          );
        })}
        {/* finally: the frame */}
        <g opacity={prog(f, b.tree + 70, 14)}>
          <rect x={1720} y={620} width={150} height={120} rx={14} fill={hexA(TIER.dram, 0.25)} stroke={TIER.dram} strokeWidth={2.5} />
          <text x={1795} y={688} textAnchor="middle" fontFamily={FONT.mono} fontSize={18} fill={C.ink}>
            the data
          </text>
        </g>
      </svg>
      <div style={{ position: "absolute", left: 160, top: 700, opacity: tripsA }}>
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 64, color: BAD, fontVariantNumeric: "tabular-nums" }}>+{n}</div>
        <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: hexA(C.ink, 0.6) }}>EXTRA TRIPS TO MEMORY</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 18, color: C.ink3, marginTop: 6 }}>…for every single access</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 3: the TLB, and why big pages help
const Tlb: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tlbA = spr(f, fps, b.translations - 8, { damping: 16, stiffness: 120 });
  const hitP = prog(f, b.lookaside - 4, 16, EASE.inOut);
  const hitOk = prog(f, b.lookaside + 12, 10, EASE.outBack);
  const cmpA = prog(f, b.big - 4, 16);
  const quad = prog(f, b.four - 6, 20, EASE.inOut);
  const intelA = prog(f, b.intel - 6, 14);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.pink}>{cmpA > 0.5 ? "bigger pages, more reach" : "a cache for translations"}</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* the TLB */}
        <g opacity={clamp(tlbA) * (1 - cmpA * 0.6)} transform={`translate(0 ${(1 - clamp(tlbA)) * 30})`}>
          <rect x={200} y={250} width={620} height={420} rx={22} fill="rgba(30,10,26,0.9)" stroke={C.pink} strokeWidth={2.5} />
          <text x={224} y={292} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={C.pink}>
            TLB · RECENT TRANSLATIONS
          </text>
          {new Array(8).fill(0).map((_, i) => {
            const hit = i === 5 && hitOk > 0.5;
            return (
              <g key={i}>
                <rect x={224} y={316 + i * 42} width={572} height={34} rx={8} fill={hit ? hexA(OK, 0.3) : hexA(C.ink, 0.06)} stroke={hit ? OK : hexA(C.ink, 0.12)} strokeWidth={hit ? 2.5 : 1} />
                <text x={244} y={339 + i * 42} fontFamily={FONT.mono} fontSize={18} fill={hit ? C.ink : C.ink2}>
                  page {(rnd(`tp${i}`) * 4000) | 0} → frame {(rnd(`tf${i}`) * 9000) | 0}
                </text>
              </g>
            );
          })}
        </g>
        {/* a lookup that hits instantly */}
        {hitP > 0 && hitP < 1 && <Spark x={mix(1000, 800, hitP)} y={mix(330, 546, hitP)} color={OK} r={10} />}
        <g opacity={clamp(tlbA) * (1 - cmpA)}>
          <rect x={980} y={300} width={300} height={70} rx={14} fill="rgba(10,14,28,0.9)" stroke={hexA(C.ink, 0.4)} strokeWidth={2} />
          <text x={1130} y={344} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} fill={C.ink}>
            where is page 2731?
          </text>
          {hitOk > 0.01 && (
            <>
              <Check x={1320} y={335} r={22} a={clamp(hitOk)} />
              <text x={1360} y={344} fontFamily={FONT.display} fontWeight={700} fontSize={32} fill={OK} opacity={clamp(hitOk)}>
                hit: no walk needed
              </text>
            </>
          )}
        </g>
        {/* page size comparison */}
        {cmpA > 0.01 && (
          <g opacity={cmpA}>
            {/* Apple silicon: one entry → 16 KB */}
            <text x={1000} y={300} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.2em" fill={C.pink}>
              ONE TLB ENTRY ON APPLE SILICON
            </text>
            <rect x={1000} y={320} width={360} height={360} rx={16} fill={hexA(C.pink, 0.2)} stroke={C.pink} strokeWidth={3} />
            <text x={1180} y={510} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={56} fill={C.ink}>
              16 KB
            </text>
            {/* the 4 KB grid inside, revealed */}
            {[0, 1, 2, 3].map((k) => (
              <rect key={k} x={1000 + (k % 2) * 180} y={320 + Math.floor(k / 2) * 180} width={180} height={180} fill="none" stroke={hexA(C.ink, 0.5)} strokeWidth={2} strokeDasharray="8 8" opacity={quad} />
            ))}
            {/* Intel: one entry → 4 KB */}
            <g opacity={intelA}>
              <text x={1460} y={300} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.2em" fill={C.blue}>
                ONE ENTRY ON AN INTEL MAC
              </text>
              <rect x={1460} y={320} width={180} height={180} rx={12} fill={hexA(C.blue, 0.2)} stroke={C.blue} strokeWidth={3} />
              <text x={1550} y={422} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={44} fill={C.ink}>
                4 KB
              </text>
            </g>
            <text x={1000} y={740} fontFamily={FONT.display} fontWeight={700} fontSize={44} fill={C.ink} opacity={quad}>
              4× the reach, from the same small cache
            </text>
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const a1 = 1 - prog(f, b.walk - 14, 10, EASE.in);
  const a2 = inOut(f, b.walk - 4, 12, b.tlb - 14, 10);
  const a3 = prog(f, b.tlb - 4, 12);
  return (
    <SceneShell dur={s.durationInFrames} enter={22} exit={14} delay={66}>
      <Glow x={960} y={560} size={1500} color={C.pink} a={0.06} />
      {a1 > 0.01 && <Mapping b={b} a={a1} />}
      {a2 > 0.01 && <Walk b={b} a={a2} />}
      {a3 > 0.01 && <Tlb b={b} a={a3} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.pages - 4, name: "data", vol: 0.25 },
    { at: b.sixteen - 6, name: "tick_hi", vol: 0.3 },
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ at: b.table + 4 + i * 5, name: "tick", vol: 0.16, rate: 1 + i * 0.04 })),
    ...[0, 1, 2, 3].map((i) => ({ at: b.tree - 4 + i * 16, name: "blip_lo", vol: 0.3, rate: 0.9 + i * 0.05 })),
    { at: b.translations - 8, name: "pop", vol: 0.3 },
    { at: b.lookaside + 12, name: "chime", vol: 0.3 },
    { at: b.four - 6, name: "sweep_up", vol: 0.25 },
    { at: b.intel - 6, name: "pop_hi", vol: 0.25 },
  ];
};

export const Virtual: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.pink, hueB: C.amber, hueC: C.violet, intensity: 0.5 },
};
