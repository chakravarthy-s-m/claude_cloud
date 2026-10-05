import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { cam, project } from "../../lib/proj3d";
import { findKey, keyCenter } from "../../components/keyboard";
import { Chip3D } from "../../components/chip";
import { Stack3D, type StackLayer } from "../../components/stack";
import { MacBook3D } from "../../components/macbook";
import { Glow, Kicker, Spark } from "../../components/core";
import { GateShape } from "../../components/gates";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    rise: c.e1.from,
    l0: c.e2.from,
    l1: wordAt(c.e2, "Switches, into gates"),
    l2: wordAt(c.e2, "Gates, into adders"),
    l3: wordAt(c.e2, "Cores, running"),
    l4: wordAt(c.e2, "A kernel, serving"),
    l5: wordAt(c.e2, "your apps"),
    every: c.e3.from,
    sand: c.e4.from,
    machine: wordAt(c.e4, "becomes a machine"),
    touch: wordAt(c.e4, "answers your touch"),
    next: c.e5.from,
    end: c.e5.end + 10,
  };
};
type B = ReturnType<typeof beats>;

const LEVELS = [
  { label: "ELECTRONS", color: C.amber },
  { label: "TRANSISTORS", color: C.orange },
  { label: "LOGIC GATES", color: C.lime },
  { label: "SILICON", color: C.green },
  { label: "KERNEL", color: C.cyan },
  { label: "FRAMEWORKS", color: C.violet },
  { label: "APPS", color: C.pink },
  { label: "YOU", color: C.ink },
];

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const powersA = inOut(f, 0, 14, b.every - 4, 16);
  const stackA = inOut(f, b.every - 8, 18, b.sand - 4, 14);
  const sandA = inOut(f, b.sand - 6, 14, b.next - 6, 16);
  const nextA = inOut(f, b.next - 8, 16, b.end, 16);
  const endA = prog(f, b.end - 4, 20);
  // gauge level (0 = electrons … 7 = you)
  const level = keyframes(f, [[b.rise, 0], [b.l1, 1.2], [b.l2, 2.5], [b.l3, 3.6], [b.l4, 4.6], [b.l5, 6.2], [b.machine, 7]], EASE.inOut);
  const gaugeA = inOut(f, b.rise - 6, 16, b.next - 10, 16);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={24}>
      {powersA > 0.01 && <Powers a={powersA} b={b} />}
      {stackA > 0.01 && <WholeStack a={stackA} b={b} />}
      {sandA > 0.01 && <SandToMachine a={sandA} b={b} />}
      {nextA > 0.01 && <NextTime a={nextA} b={b} />}
      {endA > 0.01 && <EndCard a={endA} />}
      {gaugeA > 0.01 && <Gauge a={gaugeA} level={level} />}
    </SceneShell>
  );
};

// ---------------------------------------------------------------- gauge
const Gauge: React.FC<{ a: number; level: number }> = ({ a, level }) => {
  const x = 1760;
  const top = 200;
  const step = 90;
  const n = LEVELS.length;
  const y = (lv: number) => top + (n - 1 - lv) * step;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={x} y1={y(n - 1)} x2={x} y2={y(0)} stroke={hexA(C.ink, 0.18)} strokeWidth={3} />
        <line x1={x} y1={y(0)} x2={x} y2={y(level)} stroke={C.cyan} strokeWidth={3} />
        {LEVELS.map((L, i) => (
          <g key={L.label}>
            <circle cx={x} cy={y(i)} r={7} fill={C.bg} stroke={L.color} strokeWidth={2.5} opacity={level >= i - 0.3 ? 1 : 0.4} />
            <text x={x - 22} y={y(i) + 7} textAnchor="end" fontFamily={FONT.ui} fontWeight={700} fontSize={19} letterSpacing="0.12em" fill={L.color} opacity={level >= i - 0.3 ? 1 : 0.35}>
              {L.label}
            </text>
          </g>
        ))}
        <Spark x={x} y={y(level)} color={C.ink} r={10} />
      </svg>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- powers of ten
const Powers: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const stages = [b.rise, b.l1, b.l2, b.l3, b.l4, b.l5, b.every];
  const show = (i: number) => {
    const s0 = stages[i];
    const s1 = stages[i + 1];
    const inP = prog(f, s0 - 6, 18, EASE.out);
    const outP = prog(f, s1 - 8, 18, EASE.in);
    return { a: inP * (1 - outP), scale: mix(1.8, 1, inP) * mix(1, 0.25, outP) };
  };
  const words = ["Electrons", "→ switches", "→ gates", "→ adders & cores", "→ a kernel", "→ your apps"];
  const visuals: React.ReactNode[] = [
    // 0 electrons
    <svg key="e" width={700} height={500}>
      {new Array(70).fill(0).map((_, i) => {
        const ang = rnd(`fe${i}`) * Math.PI * 2 + f * 0.02;
        const r = 40 + rnd(`fr${i}`) * 180;
        return <Spark key={i} x={350 + Math.cos(ang) * r} y={250 + Math.sin(ang) * r * 0.6} color={C.amber} r={5 + rnd(`fs${i}`) * 5} />;
      })}
    </svg>,
    // 1 transistor symbol
    <svg key="t" width={700} height={500}>
      <g transform="translate(350, 250) scale(3)" stroke={C.orange} strokeWidth={3} fill="none">
        <line x1={0} y1={-60} x2={0} y2={-26} />
        <line x1={0} y1={26} x2={0} y2={60} />
        <line x1={0} y1={-26} x2={0} y2={26} stroke={C.amber} />
        <line x1={-30} y1={-30} x2={-30} y2={30} />
        <line x1={-70} y1={0} x2={-30} y2={0} />
      </g>
    </svg>,
    // 2 gate
    <svg key="g" width={700} height={500}>
      <g transform="translate(200, 130) scale(3)">
        <GateShape kind="NAND" x={0} y={0} color={C.lime} lit={0.6} />
      </g>
    </svg>,
    // 3 core
    <svg key="c" width={700} height={500}>
      {new Array(4).fill(0).map((_, i) =>
        new Array(4).fill(0).map((__, j) => (
          <rect key={`${i}${j}`} x={170 + i * 92} y={70 + j * 92} width={80} height={80} rx={12} fill={hexA(i < 2 ? C.pink : C.teal, 0.3)} stroke={i < 2 ? C.pink : C.teal} strokeWidth={2} />
        )),
      )}
    </svg>,
    // 4 kernel slab
    <svg key="k" width={700} height={500}>
      <path d="M120,300 L350,180 L620,300 L390,420 Z" fill={hexA(C.cyan, 0.2)} stroke={C.cyan} strokeWidth={3} />
      <text x={370} y={312} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={56} fill={C.ink}>
        XNU
      </text>
    </svg>,
    // 5 apps
    <svg key="a" width={700} height={500}>
      {[C.pink, C.cyan, C.violet, C.amber, C.green, C.blue].map((col, i) => (
        <rect key={i} x={140 + (i % 3) * 150} y={110 + Math.floor(i / 3) * 150} width={120} height={120} rx={30} fill={col} opacity={0.85} />
      ))}
    </svg>,
  ];
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 110, top: 130, opacity: prog(f, b.rise - 4, 16) }}>
        <Kicker color={C.cyan}>Rising back up</Kicker>
      </div>
      {visuals.map((v, i) => {
        const st = show(i);
        if (st.a <= 0.01) return null;
        return (
          <div key={i} style={{ position: "absolute", left: 960 - 350 - 100, top: 540 - 250 - 40, opacity: st.a, transform: `scale(${st.scale})` }}>
            {v}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 110, bottom: 140, display: "flex", gap: 18, flexWrap: "wrap", width: 1500 }}>
        {words.map((w, i) => (
          <span key={w} style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 46, color: LEVELS[Math.min(7, [0, 1, 2, 3, 4, 6][i])].color, opacity: prog(f, stages[i] - 4, 12), letterSpacing: "-0.02em" }}>
            {w}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the whole stack, lit
const WholeStack: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const t = f - b.every;
  const c = cam({ yaw: -40 + t * 0.12, pitch: 18, dist: 6000, scale: 0.34, target: [140, 0, 800], cx: 1080, cy: 560 });
  const layers: StackLayer[] = [
    { id: "kernel", name: "", desc: "", color: C.cyan, z: 380, a: 1, lit: 0.6, tiles: ["Mach", "BSD", "I/O Kit"] },
    { id: "services", name: "", desc: "", color: C.blue, z: 780, a: 1, lit: 0.6, tiles: ["WindowServer", "launchd"] },
    { id: "frameworks", name: "", desc: "", color: C.violet, z: 1180, a: 1, lit: 0.6, tiles: ["AppKit", "SwiftUI", "Metal"] },
    { id: "apps", name: "", desc: "", color: C.pink, z: 1580, a: 1, lit: 0.6, tiles: ["Notes", "Browser", "Music", "Photos"] },
  ];
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Glow x={960} y={560} size={1800} color={C.violet} a={0.14} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Chip3D cam={c} st={{ power: 1, lit: { pcore: 0.8, ecore: 0.8, gpu: 0.8, npu: 0.8, slc: 0.5 }, rise: { pcore: 0.3, gpu: 0.3, npu: 0.3 }, sparkle: 0.6, frame: f, memLit: 0.6 }} />
        <Stack3D cam={c} layers={layers} />
      </svg>
      <div style={{ position: "absolute", left: 110, top: 140, width: 500 }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 50, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.08 }}>
          Each layer hides the complexity beneath it —
        </div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 50, color: C.violet, letterSpacing: "-0.03em", lineHeight: 1.08, marginTop: 10, opacity: prog(f, b.every + 50, 20) }}>
          so the one above can do something greater.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- sand → wafer → machine
const SandToMachine: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const gather = prog(f, b.sand, 50, EASE.inOut);
  const wafer = prog(f, b.sand + 30, 30);
  const mac = prog(f, b.machine - 6, 30, EASE.inOut);
  const touch = f >= b.touch;
  const press = touch ? clamp(spr(f, fps, b.touch, { damping: 14, stiffness: 400 }) - spr(f, fps, b.touch + 12, { damping: 12, stiffness: 260 })) : 0;
  const mc = cam({ yaw: -28 + (f - b.machine) * 0.05, pitch: 24, dist: 4200, scale: 0.52, target: [0, 140, 320], cy: 600 });
  return (
    <AbsoluteFill style={{ opacity: a }}>
      {mac < 1 && (
        <AbsoluteFill style={{ opacity: 1 - mac }}>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <defs>
              <radialGradient id="wafer" cx="0.4" cy="0.35" r="0.8">
                <stop offset="0%" stopColor="#e9ecf7" />
                <stop offset="30%" stopColor="#8aa0d6" />
                <stop offset="55%" stopColor="#c084fc" />
                <stop offset="75%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#334155" />
              </radialGradient>
              <clipPath id="wclip">
                <circle cx={960} cy={540} r={300} />
              </clipPath>
            </defs>
            {/* sand */}
            {new Array(260).fill(0).map((_, i) => {
              const ang = rnd(`sa${i}`) * Math.PI * 2;
              const r0 = rnd(`sr${i}`, 300, 900);
              const r = mix(r0, rnd(`sr2${i}`) * 290, gather);
              const x = 960 + Math.cos(ang + gather * 1.5) * r;
              const y = 540 + Math.sin(ang + gather * 1.5) * r * 0.75;
              return <circle key={i} cx={x} cy={y} r={rnd(`sz${i}`, 2, 5)} fill={`rgba(${200 + rnd(`c${i}`) * 40}, ${180 + rnd(`d${i}`) * 30}, 140, ${0.85 * (1 - wafer)})`} />;
            })}
            {/* wafer */}
            <g opacity={wafer}>
              <circle cx={960} cy={540} r={300} fill="url(#wafer)" opacity={0.9} />
              <g clipPath="url(#wclip)">
                {new Array(14).fill(0).map((_, i) =>
                  new Array(14).fill(0).map((__, j) => <rect key={`${i}-${j}`} x={660 + i * 43} y={240 + j * 43} width={39} height={39} fill="none" stroke="rgba(10,14,30,0.45)" strokeWidth={1.5} />),
                )}
              </g>
              <circle cx={960} cy={540} r={300} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
            </g>
          </svg>
          <div style={{ position: "absolute", left: 0, right: 0, top: 880, textAlign: "center", fontFamily: FONT.mono, fontSize: 26, color: C.ink2 }}>
            {wafer < 0.5 ? "purified sand → silicon" : "a silicon wafer — hundreds of chips"}
          </div>
        </AbsoluteFill>
      )}
      {mac > 0.01 && (
        <AbsoluteFill style={{ opacity: mac }}>
          <Glow x={960} y={560} size={1700} color={C.indigo} a={0.2} />
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <MacBook3D cam={mc} frame={f} st={{ explode: 0, lid: 1, socGlow: 0, screen: 1 }} press={{ A: press }} glow={{ A: touch ? 1 - prog(f, b.touch + 10, 50) * 0.5 : 0 }} />
          </svg>
          {touch &&
            (() => {
              const k = keyCenter(findKey("A"));
              const p = project(mc, [k[0], k[1] + 168, 40]);
              return <Glow x={p.x} y={p.y} size={300 * (0.6 + press)} color={C.cyan} a={0.6 * (1 - prog(f, b.touch + 4, 40))} />;
            })()}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- next episode
const NextTime: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spr(f, fps, b.next, { damping: 20, stiffness: 90 });
  const beam = prog(f, b.next + 10, 40, EASE.inOut);
  const cols = [C.rose, C.orange, C.amber, C.lime, C.cyan, C.blue, C.violet];
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* white beam → prism → spectrum */}
        <line x1={0} y1={600} x2={mix(0, 880, beam)} y2={560} stroke="#ffffff" strokeWidth={6} strokeOpacity={0.9} />
        <path d="M880,420 L1000,640 L760,640 Z" fill={hexA("#ffffff", 0.08)} stroke={hexA("#ffffff", 0.6)} strokeWidth={2} transform="translate(0,-40)" />
        {beam > 0.95 &&
          cols.map((c, i) => <line key={i} x1={920} y1={560} x2={1920} y2={380 + i * 40 + Math.sin(f * 0.05 + i) * 4} stroke={c} strokeWidth={10} strokeOpacity={0.75 * prog(f, b.next + 50, 20)} />)}
      </svg>
      <div style={{ position: "absolute", left: 110, top: 150, opacity: clamp(p * 1.3), transform: `translateY(${(1 - p) * 30}px)` }}>
        <Kicker color={C.amber}>Next time · Episode 02</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 104, color: C.ink, marginTop: 14, letterSpacing: "-0.04em", lineHeight: 1 }}>Painting with Light</div>
        <div style={{ fontFamily: FONT.ui, fontSize: 32, color: C.ink2, marginTop: 16 }}>How the GPU and display turn numbers into millions of pixels — every frame.</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- end card
const EndCard: React.FC<{ a: number }> = ({ a }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: a, alignItems: "center", justifyContent: "center", background: `radial-gradient(60% 50% at 50% 50%, ${hexA(C.indigo, 0.18)}, rgba(2,3,9,0.92) 70%)` }}>
      <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 22, letterSpacing: "0.6em", color: C.cyan, paddingLeft: "0.6em" }}>EPISODE 01</div>
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 120, color: C.ink, letterSpacing: "-0.02em", marginTop: 16 }}>INSIDE THE MACHINE</div>
      <div style={{ height: 2, width: 900, marginTop: 24, background: `linear-gradient(90deg, transparent, ${C.cyan}, ${C.violet}, transparent)` }} />
      <div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 48, color: C.ink, marginTop: 28 }}>
        From Keystroke <span style={{ color: C.cyan }}>→</span> Electron
      </div>
      <div style={{ marginTop: 60, fontFamily: FONT.mono, fontSize: 19, color: C.ink3, textAlign: "center", lineHeight: 1.7, opacity: prog(f, 0, 1) }}>
        Narration: Kokoro-82M neural TTS · Score & sound design: procedurally synthesized
        <br />
        Animated in code with Remotion · Diagrams are illustrative, not die shots
      </div>
    </AbsoluteFill>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.rise - 6, name: "riser", vol: 0.25 },
    { at: b.rise, name: "sweep_up", vol: 0.3 },
    { at: b.l0, name: "whoosh_rev", vol: 0.3 },
    { at: b.l1 - 6, name: "whoosh_rev", vol: 0.3 },
    { at: b.l2 - 6, name: "whoosh_rev", vol: 0.3 },
    { at: b.l3 - 6, name: "whoosh_rev", vol: 0.3 },
    { at: b.l4 - 6, name: "whoosh_rev", vol: 0.3 },
    { at: b.l5 - 6, name: "whoosh_rev", vol: 0.3 },
    { at: b.every - 8, name: "boom_soft", vol: 0.35 },
    { at: b.every - 4, name: "shimmer", vol: 0.3 },
    { at: b.sand, name: "electrons", vol: 0.2 },
    { at: b.sand + 30, name: "chime", vol: 0.25 },
    { at: b.machine - 6, name: "whoosh", vol: 0.35 },
    { at: b.touch - 2, name: "key_click", vol: 0.8 },
    { at: b.touch, name: "shimmer", vol: 0.3 },
    { at: b.next - 8, name: "whoosh_big", vol: 0.35 },
    { at: b.next + 10, name: "sweep_up", vol: 0.25 },
    { at: b.next + 50, name: "shimmer", vol: 0.3 },
    { at: b.end - 4, name: "impact", vol: 0.5 },
    { at: b.end - 2, name: "braam", vol: 0.45 },
  ];
};

export const Finale: SceneModule = {
  Visual,
  sfx,
  hud: false,
  backdrop: { hueA: C.cyan, hueB: C.violet, hueC: C.pink, intensity: 0.85 },
};
