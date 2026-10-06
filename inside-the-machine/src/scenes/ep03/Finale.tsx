import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { Check, PowerSymbol } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  const x2 = c.x2;
  return {
    c,
    top: c.x1.from,
    links: [
      wordAt(x2, "A press"),
      wordAt(x2, "Power, in sequence"),
      wordAt(x2, "A crystal"),
      wordAt(x2, "a clock"),
      wordAt(x2, "a single core"),
      wordAt(x2, "The Boot ROM"),
      wordAt(x2, "checks the bootloader") + 6,
      wordAt(x2, "checks iBoot") + 6,
      wordAt(x2, "checks the kernel") + 6,
      wordAt(x2, "every system file"),
      wordAt(x2, "launchd"),
      wordAt(x2, "The login window"),
      wordAt(x2, "You."),
    ],
    checks: [wordAt(x2, "checks the bootloader"), wordAt(x2, "checks iBoot"), wordAt(x2, "checks the kernel"), wordAt(x2, "The kernel checks")],
    every: c.x3.from,
    chain: wordAt(c.x3, "A chain of trust"),
    forged: wordAt(c.x3, "forged from scratch"),
    press: wordAt(c.x3, "every time you press"),
    button: wordAt(c.x3, "that button"),
    next: c.x4.from,
    where: wordAt(c.x4, "Where does all this data"),
    fast: wordAt(c.x4, "so fast"),
    x4end: c.x4.end,
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

const LINKS = [
  { t: "PRESS", col: C.orange },
  { t: "POWER", col: C.orange },
  { t: "CRYSTAL", col: C.cyan },
  { t: "CLOCK", col: C.cyan },
  { t: "CORE", col: C.pink },
  { t: "BOOT ROM", col: C.gold },
  { t: "LLB", col: C.gold },
  { t: "iBOOT", col: C.gold },
  { t: "KERNEL", col: C.gold },
  { t: "SYSTEM", col: C.gold },
  { t: "launchd", col: C.green },
  { t: "LOGIN", col: C.green },
  { t: "YOU", col: C.pink },
];
const STEP = 250;
const LW = 210;
const LH = 96;

// ---------------------------------------------------------------- the chain, then the button
const Chain: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = b.links;
  // camera along the line
  const camKeys: [number, number][] = at.map((t, i) => [t, Math.max(560, i * STEP - 340)]);
  const zoomOut = prog(f, b.every - 6, 34, EASE.inOut);
  const camX = mix(keyframes(f, [[0, 560], ...camKeys]), 1500, zoomOut);
  const zoom = mix(1, 0.5, zoomOut);
  const morph = prog(f, b.chain - 4, b.press - b.chain + 6, EASE.inOut);
  const pulse = prog(f, b.button - 4, 8) * (1 - prog(f, b.button + 4, 30));
  const glow = prog(f, b.chain, 30);
  const R = 330;
  const th0 = -52;
  const th1 = 232;
  const arc = (k: number) => {
    if (k === 0) return { x: 960, y: 560 - 205, rot: 90 };
    const th = th0 + ((k - 1) / (LINKS.length - 2)) * (th1 - th0);
    const r = (th * Math.PI) / 180;
    return { x: 960 + Math.cos(r) * R, y: 560 + Math.sin(r) * R, rot: th + 90 };
  };
  const topA = inOut(f, b.top - 4, 10, at[0] - 4, 10);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      {/* "from the top" rewind */}
      {topA > 0.01 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: topA }}>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 34, letterSpacing: "0.6em", color: hexA(C.ink, 0.85), paddingLeft: "0.6em" }}>FROM THE TOP</div>
        </AbsoluteFill>
      )}
      <Glow x={960} y={560} size={1400} color={C.gold} a={0.1 * glow + 0.25 * pulse} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {/* the connecting chain line (only in line mode) */}
        {LINKS.map((_, i) => {
          if (i === 0 || f < at[i]) return null;
          const x0 = 960 + ((i - 1) * STEP - camX) * zoom + (LW / 2) * zoom;
          const x1 = 960 + (i * STEP - camX) * zoom - (LW / 2) * zoom;
          const p = prog(f, at[i] - 4, 8);
          return <line key={`l${i}`} x1={x0} y1={540} x2={mix(x0, x1, p)} y2={540} stroke={hexA(C.ink, 0.35)} strokeWidth={4 * zoom} opacity={1 - morph} />;
        })}
        {/* check arrows along the trust stretch */}
        {b.checks.map((t, k) => {
          const i = 5 + k;
          const p = prog(f, t - 2, 12, EASE.inOut);
          if (p <= 0) return null;
          const xa = 960 + (i * STEP - camX) * zoom;
          const xb = 960 + ((i + 1) * STEP - camX) * zoom;
          const y = 540 - (LH / 2 + 20) * zoom;
          const mid = (xa + xb) / 2;
          return (
            <g key={`c${k}`} opacity={1 - morph}>
              <path d={`M${xa + 20 * zoom},${y} Q${mid},${y - 70 * zoom} ${xb - 20 * zoom},${y}`} fill="none" stroke={C.gold} strokeWidth={3 * zoom} strokeDasharray={`${p * 400} 400`} />
              {p > 0.9 && <Check x={mid} y={y - 46 * zoom} r={16 * zoom} />}
            </g>
          );
        })}
        {/* links */}
        {LINKS.map((L, i) => {
          if (f < at[i] - 4) return null;
          const s = spr(f, fps, at[i] - 4, { damping: 13, stiffness: 180 });
          const lx = 960 + (i * STEP - camX) * zoom;
          const ly = 540;
          const ap = arc(i);
          // stagger the morph a little along the chain
          const m = clamp(morph * 1.25 - (i / LINKS.length) * 0.25);
          const x = mix(lx, ap.x, m);
          const y = mix(ly, ap.y, m) - Math.sin(m * Math.PI) * 60;
          const rot = mix(0, ap.rot, m);
          const sc = mix(zoom, 0.6, m) * mix(0.7, 1, clamp(s));
          const verified = prog(f, b.every + 4 + i * 3, 8);
          const col = mix(0, 1, glow) > 0.5 ? C.gold : L.col;
          return (
            <g key={L.t} transform={`translate(${x} ${y}) rotate(${rot}) scale(${sc})`} opacity={clamp(s * 1.5)}>
              <rect x={-LW / 2} y={-LH / 2} width={LW} height={LH} rx={LH / 2} fill={hexA(col, 0.12 + 0.2 * pulse)} stroke={col} strokeWidth={7} style={{ filter: glow > 0.1 ? `drop-shadow(0 0 ${12 * glow + 20 * pulse}px ${hexA(C.gold, 0.8)})` : undefined }} />
              <rect x={-LW / 2 + 18} y={-LH / 2 + 18} width={LW - 36} height={LH - 36} rx={(LH - 36) / 2} fill="none" stroke={hexA(col, 0.3)} strokeWidth={2} />
              <text y={9} textAnchor="middle" fontFamily={i === 10 ? FONT.mono : FONT.display} fontWeight={700} fontSize={i === 10 ? 26 : 28} fill={C.ink} transform={m > 0.5 && ap.rot > 90 && ap.rot < 270 ? "rotate(180)" : undefined}>
                {L.t}
              </text>
              {verified > 0.01 && morph < 0.4 && <Check x={LW / 2 - 8} y={-LH / 2 + 2} r={18} a={verified * (1 - morph * 2.5)} />}
            </g>
          );
        })}
        {/* forging sparks */}
        {morph > 0.05 && morph < 0.95 &&
          new Array(24).fill(0).map((_, i) => {
            const ang = rnd(`fs${i}`, 0, Math.PI * 2);
            const r = R + rnd(`fr${i}`, -30, 30);
            const t = (f * 0.07 + rnd(`ft${i}`)) % 1;
            return <Spark key={i} x={960 + Math.cos(ang) * r * (1 + t * 0.2)} y={560 + Math.sin(ang) * r * (1 + t * 0.2)} color={i % 2 ? C.gold : C.amber} r={4} a={1 - t} />;
          })}
        {/* the button outline, completing the symbol */}
        {morph > 0.6 && (
          <g opacity={prog(f, b.press - 6, 20)}>
            <PowerSymbol x={960} y={560 + 30} r={R * 1.0 + 70} col={hexA(C.gold, 0.18)} width={4} />
          </g>
        )}
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 110, textAlign: "center", opacity: inOut(f, b.every, 14, b.chain - 4, 10) }}>
        <span style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 26, letterSpacing: "0.4em", color: C.green }}>EVERY LINK VERIFIED BEFORE IT RUNS</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 90, textAlign: "center", opacity: prog(f, b.press - 2, 16) }}>
        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 44, color: C.ink }}>forged from scratch, every time you press that button</span>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- next time: memory
const MemTeaser: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spr(f, fps, b.next, { damping: 20, stiffness: 90 });
  const COLS = 28;
  const ROWS = 14;
  const refresh = ((f - b.next) * 0.6) % (ROWS + 6);
  const zoom = mix(1, 1.1, prog(f, b.where - 6, b.x4end - b.where + 20, EASE.inOut));
  const streak = prog(f, b.fast - 10, 20);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Glow x={1300} y={560} size={1200} color={C.blue} a={0.18 * clamp(p)} />
      {/* a DRAM array: each cell a capacitor holding (or leaking) charge */}
      <div style={{ position: "absolute", left: 830, top: 230, transform: `scale(${zoom})`, transformOrigin: "50% 50%", opacity: clamp(p) }}>
        <svg width={COLS * 34} height={ROWS * 44}>
          {new Array(COLS * ROWS).fill(0).map((_, i) => {
            const x = i % COLS;
            const y = Math.floor(i / COLS);
            const bit = rnd(`mb${i}`) > 0.45;
            const age = (refresh - y + ROWS + 6) % (ROWS + 6);
            const charge = bit ? Math.max(0.25, 1 - age * 0.045) : 0.05;
            const hot = Math.abs(refresh - y) < 0.8;
            return (
              <g key={i} transform={`translate(${x * 34 + 4} ${y * 44 + 4})`}>
                <rect width={24} height={34} rx={5} fill="none" stroke={hexA(C.blue, hot ? 0.9 : 0.35)} strokeWidth={1.4} />
                <rect y={34 - 34 * charge} width={24} height={34 * charge} rx={5} fill={hexA(bit ? C.cyan : C.blue, 0.25 + 0.6 * charge)} />
              </g>
            );
          })}
        </svg>
      </div>
      {/* speed streaks between the chip and memory */}
      {streak > 0.01 && (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: streak }}>
          {new Array(16).fill(0).map((_, i) => {
            const y = 300 + i * 34;
            const t = ((f * 0.06 + rnd(`ss${i}`)) % 1 + 1) % 1;
            const x = mix(700, 1900, t);
            return <line key={i} x1={x - 160} y1={y} x2={x} y2={y} stroke={i % 2 ? C.cyan : C.violet} strokeWidth={3} strokeLinecap="round" opacity={Math.sin(t * Math.PI)} />;
          })}
        </svg>
      )}
      <div style={{ position: "absolute", left: 110, top: 300, opacity: clamp(p * 1.3), transform: `translateY(${(1 - p) * 30}px)` }}>
        <Kicker color={C.cyan}>Next time · Episode 04</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 130, color: C.ink, marginTop: 14, letterSpacing: "-0.04em", lineHeight: 1 }}>Memory</div>
        <div style={{ fontFamily: FONT.ui, fontSize: 32, color: C.ink2, marginTop: 18, maxWidth: 640, lineHeight: 1.35 }}>Where your data really lives, and how the chip reaches it in nanoseconds.</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- end card
const EndCard: React.FC<{ a: number }> = ({ a }) => (
  <AbsoluteFill style={{ opacity: a, alignItems: "center", justifyContent: "center", background: `radial-gradient(60% 50% at 50% 50%, ${hexA(C.orange, 0.12)}, rgba(2,3,9,0.94) 70%)` }}>
    <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 22, letterSpacing: "0.6em", color: C.amber, paddingLeft: "0.6em" }}>EPISODE 03</div>
    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 120, color: C.ink, letterSpacing: "-0.02em", marginTop: 16 }}>INSIDE THE MACHINE</div>
    <div style={{ height: 2, width: 900, marginTop: 24, background: `linear-gradient(90deg, transparent, ${C.orange}, ${C.gold}, transparent)` }} />
    <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 28 }}>
      <svg width={64} height={64} style={{ overflow: "visible" }}>
        <PowerSymbol x={32} y={36} r={28} col={C.amber} width={6} glow={0.6} />
      </svg>
      <div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 56, background: `linear-gradient(90deg, ${C.orange}, ${C.amber} 50%, ${C.gold})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Power On</div>
    </div>
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
  const chainA = inOut(f, 0, 12, b.next - 8, 16);
  const nextA = inOut(f, b.next - 8, 16, b.x4end + 20, 16);
  const endA = prog(f, b.x4end + 20, 20);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={24}>
      {chainA > 0.01 && <Chain b={b} a={chainA} />}
      {nextA > 0.01 && <MemTeaser b={b} a={nextA} />}
      {endA > 0.01 && <EndCard a={endA} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.top - 4, name: "whoosh_rev", vol: 0.4 },
    { at: b.top, name: "sweep_down", vol: 0.25 },
    ...b.links.map((t, i) => ({ at: t - 4, name: i === 12 ? "chime" : i >= 5 && i <= 9 ? "tick_hi" : "pop", vol: i === 12 ? 0.35 : 0.28, rate: 0.9 + i * 0.035 })),
    ...b.checks.map((t) => ({ at: t + 8, name: "blip_hi", vol: 0.2 })),
    { at: b.every - 6, name: "whoosh_soft", vol: 0.3 },
    ...LINKS.map((_, i) => ({ at: b.every + 4 + i * 3, name: "tick", vol: 0.12, rate: 1 + i * 0.04 })),
    { at: b.chain - 4, name: "riser", vol: 0.4 },
    { at: b.forged, name: "electrons", vol: 0.3 },
    { at: b.button - 4, name: "impact", vol: 0.5 },
    { at: b.button - 2, name: "power_up", vol: 0.45 },
    { at: b.next - 8, name: "whoosh_soft", vol: 0.35 },
    { at: b.fast - 10, name: "data_long", vol: 0.3 },
    { at: b.x4end + 20, name: "impact", vol: 0.5 },
    { at: b.x4end + 22, name: "braam", vol: 0.45 },
  ];
};

export const Finale: SceneModule = {
  Visual,
  sfx,
  hud: false,
  backdrop: { hueA: C.gold, hueB: C.orange, hueC: C.violet, intensity: 0.7 },
};
