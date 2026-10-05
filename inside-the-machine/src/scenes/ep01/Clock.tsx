import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glass, Glow, Kicker, Spark } from "../../components/core";
import { TransistorField } from "../../components/fx";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    thousand: wordAt(c.t1, "a few thousand electrons"),
    cross: wordAt(c.t1, "cross the channel"),
    beat: c.t2.from,
    quartz: wordAt(c.t2, "A quartz crystal"),
    pll: wordAt(c.t2, "phase-locked loops"),
    four: wordAt(c.t2, "four billion"),
    pace: c.t3.from,
    light: wordAt(c.t3, "even light travels"),
    card: wordAt(c.t3, "credit card"),
    add: c.t4.from,
    irq: wordAt(c.t4, "Every interrupt"),
    pixel: wordAt(c.t4, "Every pixel"),
    choreo: wordAt(c.t4, "billions of switches"),
  };
};
type B = ReturnType<typeof beats>;

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const segA = inOut(f, 0, 12, b.beat - 4, 14);
  const segB = inOut(f, b.beat - 6, 16, b.pace - 4, 14);
  const segC = inOut(f, b.pace - 6, 16, b.add - 4, 14);
  const segD = prog(f, b.add - 6, 16);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      {segA > 0.01 && <Crossing a={segA} b={b} />}
      {segB > 0.01 && <Beat a={segB} b={b} />}
      {segC > 0.01 && <Light a={segC} b={b} />}
      {segD > 0.01 && <Choreo a={segD} b={b} />}
    </SceneShell>
  );
};

// ---------------------------------------------------------------- electrons crossing
const Crossing: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const x0 = 360;
  const x1 = 1560;
  const y = 560;
  const countA = prog(f, b.thousand - 6, 16);
  const timeA = prog(f, b.cross - 6, 16);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 110, top: 130 }}>
        <Kicker color={C.amber}>Electrons</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 60, color: C.ink, marginTop: 10, letterSpacing: "-0.03em" }}>Every switch, every time</div>
      </div>
      <div style={{ position: "absolute", left: x0, top: y - 110, width: x1 - x0, height: 220, borderRadius: 30, background: `linear-gradient(90deg, ${hexA(C.blue, 0.25)}, ${hexA(C.amber, 0.12)} 50%, ${hexA(C.pink, 0.25)})`, border: `1px solid ${hexA(C.ink, 0.15)}` }} />
      <div style={{ position: "absolute", left: x0 - 200, top: y - 20, width: 180, textAlign: "right", fontFamily: FONT.mono, fontSize: 26, color: C.blue }}>source</div>
      <div style={{ position: "absolute", left: x1 + 20, top: y - 20, fontFamily: FONT.mono, fontSize: 26, color: C.pink }}>drain</div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {new Array(90).fill(0).map((_, i) => {
          const sp = rnd(`cs${i}`, 0.6, 1.4);
          const t = ((f * 0.012 * sp + rnd(`co${i}`)) % 1) ** 1.2;
          const x = mix(x0 + 20, x1 - 20, t);
          const yy = y + (rnd(`cy${i}`) - 0.5) * 170 + Math.sin(f * 0.2 + i) * 6;
          return <Spark key={i} x={x} y={yy} color={C.amber} r={6 + rnd(`cr${i}`) * 4} a={0.85} />;
        })}
      </svg>
      <div style={{ position: "absolute", left: x0, top: y + 160, opacity: countA, display: "flex", gap: 60 }}>
        <div>
          <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 56, color: C.ink }}>~ thousands</div>
          <div style={{ fontFamily: FONT.ui, fontSize: 22, color: C.amber, letterSpacing: "0.2em", fontWeight: 600 }}>ELECTRONS PER SWITCH</div>
        </div>
        <div style={{ opacity: timeA }}>
          <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 56, color: C.ink }}>&lt; 1 ps</div>
          <div style={{ fontFamily: FONT.ui, fontSize: 22, color: C.amber, letterSpacing: "0.2em", fontWeight: 600 }}>TO CROSS THE CHANNEL</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: x0, top: y + 300, opacity: timeA, fontFamily: FONT.ui, fontSize: 22, color: C.ink3 }}>1 picosecond = one trillionth of a second</div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- crystal → PLL → GHz
const Beat: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const qA = prog(f, Math.min(b.quartz - 6, b.beat + 14), 16);
  const pA = prog(f, b.pll - 6, 16);
  const gA = prog(f, b.four - 10, 18);
  const sine = (() => {
    let d = "";
    for (let x = 0; x <= 520; x += 4) {
      const yy = 520 + Math.sin((x / 520) * Math.PI * 4 - f * 0.08) * 60;
      d += `${x === 0 ? "M" : "L"}${200 + x},${yy.toFixed(1)}`;
    }
    return d;
  })();
  const square = (() => {
    let d = "";
    const per = 14;
    const off = (f * 3) % per;
    for (let x = -per; x <= 600; x += per) {
      const xa = 1220 + x - off;
      d += `M${Math.max(1220, xa)},600 L${Math.max(1220, xa)},460 L${Math.max(1220, Math.min(1820, xa + per / 2))},460 L${Math.max(1220, Math.min(1820, xa + per / 2))},600 L${Math.max(1220, Math.min(1820, xa + per))},600 `;
    }
    return d;
  })();
  const ticks = Math.round(mix(0, 4.3e9, prog(f, b.four - 6, 50, EASE.out)));
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 110, top: 130 }}>
        <Kicker color={C.cyan}>The clock</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 60, color: C.ink, marginTop: 10, letterSpacing: "-0.03em" }}>Everything marches to a beat</div>
      </div>
      {/* crystal */}
      <div style={{ position: "absolute", left: 200, top: 330, opacity: qA }}>
        <div style={{ width: 150, height: 90, borderRadius: 45, background: `linear-gradient(160deg, ${hexA("#ffffff", 0.35)}, ${hexA(C.cyan, 0.15)})`, border: `2px solid ${hexA(C.cyanHi, 0.8)}`, boxShadow: `0 0 ${30 + 20 * Math.sin(f * 0.4)}px ${hexA(C.cyan, 0.5)}`, transform: `translateX(${Math.sin(f * 1.3) * 1.5}px)` }} />
        <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.cyan, marginTop: 14 }}>quartz crystal · 24 MHz</div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d={sine} fill="none" stroke={C.cyan} strokeWidth={3} opacity={qA} />
        <g opacity={pA}>
          <path d="M740,520 L880,520" stroke={hexA(C.ink, 0.5)} strokeWidth={2} strokeDasharray="6 6" />
          <path d="M1120,530 L1210,530" stroke={hexA(C.ink, 0.5)} strokeWidth={2} strokeDasharray="6 6" />
        </g>
        <path d={square} fill="none" stroke={C.amber} strokeWidth={2.2} opacity={gA} />
      </svg>
      <div style={{ position: "absolute", left: 880, top: 430, opacity: pA, transform: `scale(${mix(0.9, 1, pA)})` }}>
        <Glass color={C.violet} style={{ width: 240, height: 190, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }} glow={0.8}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 52, color: C.ink }}>PLL</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 18, color: C.violet }}>phase-locked loop</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 26, color: C.ink, marginTop: 8 }}>× ~180</div>
        </Glass>
      </div>
      <div style={{ position: "absolute", left: 1220, top: 640, opacity: gA }}>
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 64, color: C.ink, fontVariantNumeric: "tabular-nums", textShadow: `0 0 30px ${hexA(C.amber, 0.5)}` }}>{ticks.toLocaleString("en-US")}</div>
        <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 20, letterSpacing: "0.3em", color: C.amber }}>TICKS PER SECOND · 4+ GHz</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- light in one tick
const Light: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pxPerCm = 150;
  const x0 = 320;
  const yR = 700;
  const run = prog(f, b.light - 4, 40, EASE.inOut);
  const card = spr(f, fps, b.card - 8, { damping: 18, stiffness: 100 });
  const px = x0 + run * 7 * pxPerCm;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 110, top: 130 }}>
        <Kicker color={C.ink}>One tick ≈ 0.23 nanoseconds</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 60, color: C.ink, marginTop: 10, letterSpacing: "-0.03em" }}>How far does light get?</div>
      </div>
      {/* credit card */}
      <div
        style={{
          position: "absolute",
          left: x0,
          top: yR - 54 * (pxPerCm / 10) - 40,
          width: 8.56 * pxPerCm,
          height: 5.4 * pxPerCm,
          borderRadius: 40,
          background: `linear-gradient(135deg, ${hexA(C.violet, 0.25)}, ${hexA(C.cyan, 0.12)})`,
          border: `2px solid ${hexA(C.ink, 0.35)}`,
          opacity: clamp(card * 1.3) * 0.9,
          transform: `translateY(${(1 - card) * 30}px)`,
        }}
      >
        <div style={{ position: "absolute", left: 70, top: 110, width: 110, height: 80, borderRadius: 14, background: hexA(C.gold, 0.5) }} />
        <div style={{ position: "absolute", left: 70, bottom: 60, fontFamily: FONT.mono, fontSize: 34, color: hexA(C.ink, 0.6), letterSpacing: "0.15em" }}>•••• •••• •••• 4242</div>
        <div style={{ position: "absolute", right: 40, top: 30, fontFamily: FONT.ui, fontSize: 20, color: C.ink3 }}>85.6 mm</div>
      </div>
      {/* ruler */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={x0} y1={yR} x2={x0 + 9 * pxPerCm} y2={yR} stroke={hexA(C.ink, 0.6)} strokeWidth={2} />
        {new Array(91).fill(0).map((_, i) => (
          <line key={i} x1={x0 + (i / 10) * pxPerCm} y1={yR} x2={x0 + (i / 10) * pxPerCm} y2={yR + (i % 10 === 0 ? 28 : i % 5 === 0 ? 18 : 10)} stroke={hexA(C.ink, 0.5)} strokeWidth={i % 10 === 0 ? 2 : 1} />
        ))}
        {new Array(10).fill(0).map((_, i) => (
          <text key={i} x={x0 + i * pxPerCm} y={yR + 56} textAnchor="middle" fontFamily={FONT.mono} fontSize={22} fill={C.ink3}>
            {i} cm
          </text>
        ))}
        {/* photon */}
        {run > 0 && (
          <>
            <line x1={x0} y1={yR - 30} x2={px} y2={yR - 30} stroke="#ffffff" strokeWidth={4} strokeOpacity={0.5} />
            <line x1={Math.max(x0, px - 260)} y1={yR - 30} x2={px} y2={yR - 30} stroke="#ffffff" strokeWidth={10} strokeOpacity={0.25} />
            <Spark x={px} y={yR - 30} color="#ffffff" r={12} />
          </>
        )}
      </svg>
      {run > 0.98 && (
        <div style={{ position: "absolute", left: px - 140, top: yR - 130, width: 280, textAlign: "center", fontFamily: FONT.mono, fontWeight: 700, fontSize: 40, color: C.ink, opacity: prog(f, b.light + 36, 12) }}>
          ≈ 7 cm
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- choreography
const Choreo: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fieldA = prog(f, b.choreo - 10, 24);
  const items = [
    { at: b.add, t: "41 + 1 = 42", s: "every add", col: C.amber },
    { at: b.irq, t: "IRQ", s: "every interrupt", col: C.rose },
    { at: b.pixel, t: "a", s: "every pixel of that letter", col: C.cyan },
  ];
  const beat = Math.floor((f - b.add) / 15);
  const pulse = 1 - (((f - b.add) % 15) / 15);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      {fieldA > 0.01 && (
        <AbsoluteFill style={{ opacity: fieldA }}>
          <TransistorField start={b.choreo - 10} dur={200} zoom={[1.4, 1.0]} color={C.cyan} />
          <AbsoluteFill style={{ background: `radial-gradient(60% 50% at 50% 50%, ${hexA(C.cyan, 0.08 * pulse)}, transparent 70%)` }} />
          <AbsoluteFill style={{ background: "radial-gradient(75% 65% at 50% 50%, transparent 25%, rgba(2,3,9,0.9) 100%)" }} />
        </AbsoluteFill>
      )}
      <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", justifyContent: "center", gap: 60, opacity: 1 - fieldA * 0.85 }}>
        {items.map((it, i) => {
          const p = spr(f, fps, it.at - 4, { damping: 14, stiffness: 160 });
          const lit = beat >= 0 && beat % 3 === i ? pulse : 0;
          return (
            <div key={i} style={{ opacity: clamp(p * 1.3), transform: `scale(${mix(0.7, 1, p) * (1 + lit * 0.05)})` }}>
              <Glass color={it.col} style={{ width: 420, height: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }} glow={0.5 + lit}>
                <div style={{ fontFamily: i === 2 ? FONT.ui : FONT.mono, fontWeight: 700, fontSize: i === 2 ? 150 : 54, whiteSpace: "nowrap", color: C.ink, textShadow: `0 0 30px ${hexA(it.col, 0.6)}` }}>{it.t}</div>
                <div style={{ fontFamily: FONT.ui, fontSize: 24, color: it.col, marginTop: 10 }}>{it.s}</div>
              </Glass>
            </div>
          );
        })}
      </div>
      {fieldA > 0.01 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, textAlign: "center", opacity: fieldA }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 64, color: C.ink, letterSpacing: "-0.03em", textShadow: `0 0 40px ${hexA(C.cyan, 0.6)}` }}>
            Billions of switches. <span style={{ color: C.cyan }}>Perfect choreography.</span>
          </div>
        </div>
      )}
      {/* metronome strip */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, display: "flex", justifyContent: "center", gap: 14 }}>
        {new Array(24).fill(0).map((_, i) => (
          <div key={i} style={{ width: 16, height: 16, borderRadius: 4, background: (beat + 24) % 24 === i ? C.cyan : hexA(C.ink, 0.12), boxShadow: (beat + 24) % 24 === i ? `0 0 14px ${C.cyan}` : undefined }} />
        ))}
      </div>
      {fieldA > 0.5 && <Glow x={960} y={540} size={900} color={C.cyan} a={0.06 * pulse} />}
    </AbsoluteFill>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const ev: SfxEvent[] = [
    { at: 0, name: "electrons", vol: 0.45 },
    { at: 60, name: "electrons", vol: 0.35 },
    { at: b.thousand - 6, name: "pop", vol: 0.3 },
    { at: b.cross - 6, name: "blip_hi", vol: 0.3 },
    { at: b.beat - 6, name: "whoosh_soft", vol: 0.35 },
    { at: b.quartz - 6, name: "chime_lo", vol: 0.2 },
    { at: b.pll - 6, name: "pop", vol: 0.3 },
    { at: b.four - 10, name: "riser", vol: 0.3 },
    { at: b.pace - 6, name: "whoosh", vol: 0.35 },
    { at: b.light - 4, name: "sweep_up", vol: 0.35 },
    { at: b.light + 36, name: "pop_hi", vol: 0.3 },
    { at: b.card - 8, name: "whoosh_soft", vol: 0.3 },
    { at: b.add - 4, name: "pop", vol: 0.3 },
    { at: b.irq - 4, name: "pop", vol: 0.3 },
    { at: b.pixel - 4, name: "pop_hi", vol: 0.3 },
    { at: b.choreo - 10, name: "swell", vol: 0.35 },
    { at: b.choreo - 4, name: "shimmer", vol: 0.3 },
  ];
  // clock ticks throughout the beat & choreography sections
  for (let t = b.beat + 6; t < b.pace - 10; t += 15) ev.push({ at: t, name: "clock_tick", vol: 0.25 });
  for (let t = b.add; t < s.durationInFrames - 20; t += 15) ev.push({ at: t, name: "clock_tick", vol: 0.3 });
  return ev;
};

export const Clock: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.cyan, hueB: C.amber, hueC: C.violet, intensity: 0.7 },
};
