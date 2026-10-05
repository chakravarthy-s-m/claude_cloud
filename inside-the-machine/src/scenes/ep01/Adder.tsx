import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glass, Glow, Kicker, Spark } from "../../components/core";
import { GateShape, TRUTH, type GateKind } from "../../components/gates";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    adder: c.d1.from,
    repeated: wordAt(c.d1, "repeated for every bit"),
    full: c.d2.from,
    takes: wordAt(c.d2, "takes two bits"),
    carryIn: wordAt(c.d2, "plus a carry"),
    onePlus: wordAt(c.d2, "One plus one"),
    school: wordAt(c.d2, "just like you learned"),
    parallel: wordAt(c.d3, "in parallel"),
    blocks: wordAt(c.d3, "logic gates"),
    and: wordAt(c.d4, "the and gate"),
    or: wordAt(c.d4, "The or gate"),
    xor: wordAt(c.d4, "Exclusive"),
    nand: wordAt(c.d4, "most versatile"),
    alone: wordAt(c.d4, "built from nand gates alone"),
  };
};
type B = ReturnType<typeof beats>;

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const rowA = inOut(f, 0, 14, b.full - 8, 10);
  const faA = inOut(f, b.full - 6, 16, b.c.d3.from + 10, 14);
  const pfxA = inOut(f, b.c.d3.from, 16, b.and - 14, 14);
  const gatesA = prog(f, b.and - 18, 16);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      {rowA > 0.01 && <AdderRow a={rowA} b={b} />}
      {faA > 0.01 && <FullAdder a={faA} b={b} />}
      {pfxA > 0.01 && <Prefix a={pfxA} b={b} />}
      {gatesA > 0.01 && <Gates a={gatesA} b={b} />}
    </SceneShell>
  );
};

// ---------------------------------------------------------------- 64 copies
const AdderRow: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const n = 16;
  const W = 98;
  const X0 = 960 - (n * W) / 2;
  const A = (41).toString(2).padStart(n, "0");
  const Bv = (1).toString(2).padStart(n, "0");
  const S = (42).toString(2).padStart(n, "0");
  const zoom = prog(f, b.full - 26, 30, EASE.in);
  const carryP = prog(f, b.repeated, 40, EASE.inOut);
  return (
    <AbsoluteFill style={{ opacity: a, transform: `scale(${mix(1, 6, zoom)})`, transformOrigin: `${X0 + (n - 0.5) * W}px 520px` }}>
      <div style={{ position: "absolute", left: 110, top: 130, opacity: 1 - zoom }}>
        <Kicker color={C.amber}>The adder inside the ALU</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 56, color: C.ink, marginTop: 10, letterSpacing: "-0.03em" }}>One circuit × 64</div>
      </div>
      {new Array(n).fill(0).map((_, i) => {
        const p = prog(f, b.adder + 6 + (n - i) * 2, 10);
        const bit = n - 1 - i;
        const carryHere = carryP * n > n - 1 - i;
        return (
          <div key={i} style={{ position: "absolute", left: X0 + i * W, top: 420, width: W - 14, opacity: p }}>
            <div style={{ textAlign: "center", fontFamily: FONT.mono, fontSize: 22, color: A[i] === "1" ? C.amber : C.ink3 }}>{A[i]}</div>
            <div style={{ textAlign: "center", fontFamily: FONT.mono, fontSize: 22, color: Bv[i] === "1" ? C.amber : C.ink3 }}>{Bv[i]}</div>
            <div style={{ height: 120, marginTop: 8, borderRadius: 14, background: hexA(C.amber, i === n - 1 ? 0.25 : 0.08), border: `1.5px solid ${hexA(C.amber, i === n - 1 ? 1 : 0.4)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 26, color: C.ink }}>FA</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 14, color: C.ink3 }}>bit {bit}</div>
            </div>
            <div style={{ textAlign: "center", fontFamily: FONT.mono, fontSize: 26, fontWeight: 700, marginTop: 8, color: carryHere ? (S[i] === "1" ? C.green : C.ink2) : C.ink4 }}>{carryHere ? S[i] : "·"}</div>
          </div>
        );
      })}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {new Array(n - 1).fill(0).map((_, i) => {
          const x = X0 + (i + 1) * W - 14;
          return <path key={i} d={`M${x + 4},560 L${x - 4},560`} stroke={hexA(C.amber, 0.6)} strokeWidth={2} markerEnd="" />;
        })}
      </svg>
      <div style={{ position: "absolute", left: X0 - 150, top: 425, fontFamily: FONT.mono, fontSize: 20, color: C.ink3, lineHeight: 1.45, opacity: 1 - zoom }}>
        A = 41
        <br />B = 1
      </div>
      <div style={{ position: "absolute", left: X0 - 150, top: 600, fontFamily: FONT.mono, fontSize: 20, color: C.green, opacity: carryP * (1 - zoom) }}>sum = 42</div>
      <div style={{ position: "absolute", left: X0, top: 680, fontFamily: FONT.mono, fontSize: 20, color: C.ink3, opacity: prog(f, b.repeated, 16) * (1 - zoom) }}>← carry ripples from bit to bit · 48 more off-screen</div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- full adder gates
type W = { d: string; v: number; at: number };
const FullAdder: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const t0 = b.takes - 4;
  const lvl = (k: number) => t0 + k * 18;
  const onA = (at: number) => f >= at;
  const wires: W[] = [
    { d: "M380,320 L640,320", v: 1, at: lvl(0) },
    { d: "M460,320 L460,540 L640,540", v: 1, at: lvl(0) },
    { d: "M380,360 L640,360", v: 1, at: lvl(0) },
    { d: "M520,360 L520,580 L640,580", v: 1, at: lvl(0) },
    { d: "M380,460 L880,460 L880,390 L1000,390", v: 0, at: b.carryIn },
    { d: "M880,460 L880,660 L1000,660", v: 0, at: b.carryIn },
    { d: "M740,340 L840,340 L840,350 L1000,350", v: 0, at: lvl(1) + 30 },
    { d: "M800,340 L800,620 L1000,620", v: 0, at: lvl(1) + 30 },
    { d: "M740,560 L1200,560 L1200,580 L1280,580", v: 1, at: lvl(1) + 30 },
    { d: "M1100,640 L1200,640 L1200,620 L1280,620", v: 0, at: lvl(2) + 40 },
    { d: "M1100,370 L1500,370", v: 0, at: lvl(2) + 40 },
    { d: "M1380,600 L1500,600", v: 1, at: lvl(3) + 46 },
  ];
  const gate = (kind: GateKind, x: number, y: number, at: number) => <GateShape kind={kind} x={x} y={y} color={C.amber} lit={prog(f, at, 10) * 0.8} />;
  const schoolA = prog(f, b.onePlus - 6, 16);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 110, top: 120 }}>
        <Kicker color={C.amber}>One full adder</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 52, color: C.ink, marginTop: 8, letterSpacing: "-0.03em" }}>Two bits + a carry in</div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {wires.map((w, i) => {
          const live = onA(w.at);
          const hot = live && w.v === 1;
          return (
            <g key={i}>
              {hot && <path d={w.d} fill="none" stroke={C.amber} strokeWidth={12} strokeOpacity={0.18} />}
              <path d={w.d} fill="none" stroke={hot ? C.amber : live ? hexA(C.ink, 0.35) : hexA(C.ink, 0.15)} strokeWidth={hot ? 3.5 : 2} />
            </g>
          );
        })}
        {gate("XOR", 640, 300, lvl(1))}
        {gate("AND", 640, 520, lvl(1))}
        {gate("XOR", 1000, 330, lvl(2) + 30)}
        {gate("AND", 1000, 600, lvl(2) + 30)}
        {gate("OR", 1280, 560, lvl(3) + 40)}
        {/* labels */}
        {[
          ["A", 1, 320, lvl(0)],
          ["B", 1, 360, lvl(0)],
          ["Cin", 0, 460, b.carryIn],
        ].map(([n, v, y, at]) => (
          <g key={n as string} opacity={prog(f, (at as number) - 4, 10)}>
            <text x={360} y={(y as number) + 8} textAnchor="end" fontFamily={FONT.mono} fontWeight={700} fontSize={26} fill={C.ink}>
              {n} = <tspan fill={v ? C.amber : C.ink3}>{v}</tspan>
            </text>
          </g>
        ))}
        <g opacity={prog(f, lvl(2) + 40, 10)}>
          <text x={1520} y={380} fontFamily={FONT.mono} fontWeight={700} fontSize={30} fill={C.ink}>
            Sum = <tspan fill={C.ink3}>0</tspan>
          </text>
        </g>
        <g opacity={prog(f, lvl(3) + 46, 10)}>
          <text x={1520} y={610} fontFamily={FONT.mono} fontWeight={700} fontSize={30} fill={C.ink}>
            Carry = <tspan fill={C.amber}>1</tspan>
          </text>
        </g>
        {f > lvl(0) && f < lvl(3) + 60 && <Spark x={mix(380, 1500, clamp((f - lvl(0)) / 90))} y={mix(320, 600, clamp((f - lvl(0)) / 90))} color={C.amber} r={6} a={0.6} />}
      </svg>
      {schoolA > 0.01 && (
        <div style={{ position: "absolute", left: 1280, top: 760, opacity: schoolA }}>
          <Glass color={C.amber} style={{ padding: "18px 30px", display: "flex", alignItems: "center", gap: 30 }} glow={0.5}>
            <div style={{ fontFamily: FONT.mono, fontSize: 36, color: C.ink, lineHeight: 1.25, textAlign: "right" }}>
              <div style={{ fontSize: 22, color: C.amber }}>1 ←carry</div>
              <div>&nbsp;1</div>
              <div>+ 1</div>
              <div style={{ borderTop: `2px solid ${C.ink3}` }}>10</div>
            </div>
            <div style={{ fontFamily: FONT.ui, fontSize: 24, color: C.ink2, width: 230 }}>“one plus one is zero, carry the one”</div>
          </Glass>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- parallel-prefix carries
const Prefix: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const n = 16;
  const X0 = 360;
  const dx = 80;
  const Y0 = 300;
  const dy = 130;
  const levels = 4;
  const p = prog(f, b.c.d3.from + 6, b.parallel - b.c.d3.from + 30, EASE.inOut);
  const gatesHint = prog(f, b.blocks - 8, 16);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 110, top: 120 }}>
        <Kicker color={C.cyan}>Faster: carry-lookahead</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 52, color: C.ink, marginTop: 8, letterSpacing: "-0.03em" }}>All carries, in parallel</div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {new Array(levels).fill(0).map((_, l) => {
          const span = 2 ** l;
          const lp = clamp(p * levels - l);
          return new Array(n).fill(0).map((__, i) => {
            const x = X0 + (n - 1 - i) * dx;
            const y = Y0 + l * dy;
            const hasPartner = i - span >= 0;
            const px = X0 + (n - 1 - (i - span)) * dx;
            return (
              <g key={`${l}-${i}`} opacity={lp}>
                <line x1={x} y1={y} x2={x} y2={y + dy} stroke={hexA(C.cyan, 0.35)} strokeWidth={2} />
                {hasPartner && <line x1={px} y1={y} x2={x} y2={y + dy} stroke={C.cyan} strokeWidth={2.2} />}
                <circle cx={x} cy={y + dy} r={hasPartner ? 9 : 5} fill={hasPartner ? C.cyan : hexA(C.cyan, 0.5)} />
              </g>
            );
          });
        })}
        {new Array(n).fill(0).map((_, i) => (
          <text key={i} x={X0 + (n - 1 - i) * dx} y={Y0 - 20} textAnchor="middle" fontFamily={FONT.mono} fontSize={18} fill={C.ink3}>
            {i}
          </text>
        ))}
      </svg>
      <div style={{ position: "absolute", left: X0, top: Y0 + levels * dy + 40, fontFamily: FONT.mono, fontSize: 22, color: C.cyan, opacity: p }}>
        log₂(64) = 6 levels instead of 64 ripple steps
      </div>
      <div style={{ position: "absolute", right: 120, top: Y0 + levels * dy + 30, fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: C.ink, opacity: gatesHint }}>
        …all built from <span style={{ color: C.amber }}>logic gates</span>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the gates
const Gates: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cards: { kind: Exclude<GateKind, "NOT">; at: number; col: string }[] = [
    { kind: "AND", at: b.and, col: C.cyan },
    { kind: "OR", at: b.or, col: C.violet },
    { kind: "XOR", at: b.xor, col: C.pink },
    { kind: "NAND", at: b.nand, col: C.amber },
  ];
  const uni = prog(f, b.alone - 10, 18);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 110, top: 120 }}>
        <Kicker color={C.amber}>Logic gates</Kicker>
      </div>
      {cards.map((cd, i) => {
        const p = spr(f, fps, cd.at - 4, { damping: 16, stiffness: 140 });
        const star = cd.kind === "NAND";
        const x = 150 + i * 420;
        return (
          <div key={cd.kind} style={{ position: "absolute", left: x, top: 240, opacity: clamp(p * 1.3), transform: `translateY(${(1 - p) * 40}px) scale(${star ? mix(1, 1.06, uni) : 1})` }}>
            <Glass color={cd.col} style={{ width: 380, height: 480, padding: 24 }} glow={star ? 0.6 + uni : 0.5}>
              <svg width={330} height={150} style={{ overflow: "visible" }}>
                <line x1={20} y1={50} x2={110} y2={50} stroke={cd.col} strokeWidth={3} />
                <line x1={20} y1={90} x2={110} y2={90} stroke={cd.col} strokeWidth={3} />
                <line x1={star ? 218 : 205} y1={70} x2={300} y2={70} stroke={cd.col} strokeWidth={3} />
                <GateShape kind={cd.kind} x={110} y={30} color={cd.col} lit={0.6} label={false} />
              </svg>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 44, color: C.ink, marginTop: 4 }}>{cd.kind}</div>
              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", rowGap: 6, fontFamily: FONT.mono, fontSize: 24 }}>
                {["A", "B", "out"].map((h) => (
                  <div key={h} style={{ color: C.ink3, fontSize: 18 }}>
                    {h}
                  </div>
                ))}
                {[
                  [0, 0],
                  [0, 1],
                  [1, 0],
                  [1, 1],
                ].map(([x1, x2]) => {
                  const o = TRUTH[cd.kind](x1, x2);
                  return (
                    <React.Fragment key={`${x1}${x2}`}>
                      <div style={{ color: C.ink2 }}>{x1}</div>
                      <div style={{ color: C.ink2 }}>{x2}</div>
                      <div style={{ color: o ? cd.col : C.ink3, fontWeight: 700 }}>{o}</div>
                    </React.Fragment>
                  );
                })}
              </div>
            </Glass>
          </div>
        );
      })}
      {uni > 0.01 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 790, textAlign: "center", opacity: uni }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 52, color: C.ink, letterSpacing: "-0.02em" }}>
            NAND is <span style={{ color: C.amber }}>universal</span>
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 24, color: C.ink2, marginTop: 10 }}>NOT · AND · OR · XOR · adders · CPUs — all buildable from NAND alone</div>
        </div>
      )}
      {uni > 0.01 && <Glow x={150 + 3 * 420 + 190} y={480} size={700} color={C.amber} a={0.18 * uni} />}
    </AbsoluteFill>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.adder + 6, name: "data", vol: 0.25 },
    { at: b.repeated, name: "sweep_up", vol: 0.2 },
    { at: b.full - 26, name: "whoosh_big", vol: 0.4 },
    { at: b.takes - 4, name: "blip", vol: 0.3 },
    { at: b.takes + 14, name: "blip", vol: 0.25 },
    { at: b.carryIn, name: "blip_lo", vol: 0.3 },
    { at: b.takes + 50, name: "blip_hi", vol: 0.3 },
    { at: b.onePlus - 6, name: "pop", vol: 0.3 },
    { at: b.school, name: "chime_lo", vol: 0.2 },
    { at: b.c.d3.from, name: "whoosh_soft", vol: 0.35 },
    { at: b.parallel - 10, name: "data", vol: 0.25 },
    { at: b.and - 4, name: "pop", vol: 0.35 },
    { at: b.or - 4, name: "pop", vol: 0.35 },
    { at: b.xor - 4, name: "pop", vol: 0.35 },
    { at: b.nand - 4, name: "pop_hi", vol: 0.4 },
    { at: b.alone - 10, name: "shimmer", vol: 0.3 },
  ];
};

export const Adder: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.amber, hueB: C.cyan, hueC: C.violet, intensity: 0.7 },
};
