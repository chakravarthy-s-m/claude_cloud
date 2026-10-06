import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker } from "../../components/core";
import { useCanvas } from "../../components/fx";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { RGB, wallpaper } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    rewind: c.x1.from,
    s0: c.x2.from,
    s1: wordAt(c.x2, "The GPU turns"),
    s2: wordAt(c.x2, "The Window Server"),
    s3: wordAt(c.x2, "The display engine"),
    s4: wordAt(c.x2, "Transistors set"),
    s5: wordAt(c.x2, "And electrons"),
    light: wordAt(c.x2, "pour out as light"),
    rate: c.x3.from,
    every: wordAt(c.x3, "Every scroll"),
    painted: wordAt(c.x3, "painted in light"),
    you: wordAt(c.x3, "just for you"),
    next: c.x4.from,
    power: wordAt(c.x4, "power button"),
    end: c.x4.end + 12,
  };
};
type B = ReturnType<typeof beats>;

const STAGES = [
  { t: "App", sub: "describes a scene", col: C.pink },
  { t: "GPU", sub: "triangles → pixels, tile by tile", col: C.violet },
  { t: "WindowServer", sub: "composites the frame", col: C.blue },
  { t: "Display engine", sub: "streams it, row by row", col: C.cyan },
  { t: "Light valves", sub: "18 million transistors", col: C.green },
  { t: "LEDs", sub: "electrons → light", col: C.amber },
];

const Icon: React.FC<{ k: number; col: string; on: number; f: number }> = ({ k, col, on, f }) => {
  const s = hexA(col, 0.35 + 0.65 * on);
  switch (k) {
    case 0:
      return (
        <g>
          <rect x={-46} y={-34} width={92} height={68} rx={10} fill="none" stroke={s} strokeWidth={3} />
          <circle cx={-34} cy={-24} r={3} fill={s} />
          <path d="M-16,8 L0,-14 L18,8 Z" fill={hexA(col, 0.2 + 0.5 * on)} stroke={s} strokeWidth={2.5} />
        </g>
      );
    case 1:
      return (
        <g>
          {new Array(16).fill(0).map((_, i) => (
            <rect key={i} x={-40 + (i % 4) * 20} y={-40 + Math.floor(i / 4) * 20} width={18} height={18} rx={2} fill={hexA(col, (i * 7) % 5 < 2 + 3 * on ? 0.15 + 0.6 * on : 0.08)} />
          ))}
          <path d="M-30,30 L0,-34 L32,24 Z" fill="none" stroke="#fff" strokeOpacity={0.4 + 0.6 * on} strokeWidth={2.5} />
        </g>
      );
    case 2:
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <rect key={i} x={-44 + i * 14} y={-36 + i * 14} width={60} height={42} rx={7} fill={hexA(col, 0.12 + 0.25 * on)} stroke={s} strokeWidth={2.5} />
          ))}
        </g>
      );
    case 3:
      return (
        <g>
          {new Array(6).fill(0).map((_, i) => {
            const sel = Math.floor((f * 0.4) % 6) === i && on > 0.5;
            return <rect key={i} x={-46} y={-36 + i * 13} width={92} height={8} rx={3} fill={sel ? "#fff" : hexA(col, 0.25 + 0.4 * on)} />;
          })}
        </g>
      );
    case 4:
      return (
        <g>
          {[RGB.r, RGB.g, RGB.b].map((c, i) => (
            <rect key={i} x={-36 + i * 26} y={-40} width={20} height={80} rx={4} fill={hexA(c, 0.15 + 0.75 * on * (0.6 + 0.4 * Math.sin(f * 0.2 + i * 2)))} />
          ))}
        </g>
      );
    default:
      return (
        <g>
          {new Array(12).fill(0).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <line key={i} x1={Math.cos(a) * 18} y1={Math.sin(a) * 18} x2={Math.cos(a) * (30 + 14 * on)} y2={Math.sin(a) * (30 + 14 * on)} stroke={s} strokeWidth={3} strokeLinecap="round" />;
          })}
          <circle r={14} fill={on > 0.5 ? "#fff6dd" : hexA(col, 0.4)} />
        </g>
      );
  }
};

const Chain: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ats = [b.s0, b.s1, b.s2, b.s3, b.s4, b.s5];
  const N = STAGES.length;
  const xAt = (i: number) => 960 + (i - (N - 1) / 2) * 300;
  const y = 560;
  // after the walk-through, pulses race along the chain ("120 times a second")
  const fast = prog(f, b.rate - 6, 30);
  const pulseX = (() => {
    if (f < b.rate - 6) {
      // follows the narration from card to card
      let i = 0;
      for (let k = 0; k < N; k++) if (f >= ats[k] - 6) i = k;
      const nextAt = i < N - 1 ? ats[i + 1] - 6 : ats[i] + 30;
      const t = clamp((f - (ats[i] - 6)) / Math.max(1, nextAt - (ats[i] - 6)));
      return mix(xAt(i), xAt(Math.min(N - 1, i + 1)), EASE.inOut(clamp((t - 0.6) / 0.4)));
    }
    return mix(xAt(0), xAt(N - 1), ((f - b.rate) * 0.09) % 1);
  })();
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 110, top: 112, opacity: prog(f, b.rewind, 14) }}>
        <Kicker color={C.cyan}>One frame, start to finish</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <line x1={xAt(0)} y1={y} x2={xAt(N - 1)} y2={y} stroke={hexA(C.ink, 0.12)} strokeWidth={4} />
        <line x1={xAt(0)} y1={y} x2={Math.max(xAt(0), pulseX)} y2={y} stroke={hexA(C.cyan, 0.7)} strokeWidth={4} style={{ filter: `drop-shadow(0 0 8px ${C.cyan})` }} />
        {f >= b.s0 - 6 && (
          <g>
            <circle cx={pulseX} cy={y} r={18 + 8 * fast} fill={hexA("#ffffff", 0.2)} />
            <circle cx={pulseX} cy={y} r={9} fill="#fff" style={{ filter: "drop-shadow(0 0 12px #fff)" }} />
            {fast > 0.01 &&
              new Array(6).fill(0).map((_, k) => <circle key={k} cx={pulseX - (k + 1) * 26} cy={y} r={7 - k} fill="#fff" opacity={(0.5 - k * 0.08) * fast} />)}
          </g>
        )}
      </svg>
      {STAGES.map((st, i) => {
        const on = spr(f, fps, ats[i] - 6, { damping: 18, stiffness: 120 });
        const lit = clamp(on) * (fast > 0 ? 0.75 + 0.25 * Math.sin(f * 0.8 - i) : 1);
        return (
          <div key={st.t} style={{ position: "absolute", left: xAt(i) - 140, top: y - 230, width: 280, textAlign: "center", opacity: 0.35 + 0.65 * clamp(on * 1.3), transform: `translateY(${(1 - clamp(on)) * 20}px)` }}>
            <div style={{ width: 200, height: 180, margin: "0 auto", borderRadius: 26, transformOrigin: "50% 50%", background: `linear-gradient(160deg, ${hexA(st.col, 0.16 * lit)}, rgba(8,10,22,0.9))`, border: `2px solid ${hexA(st.col, 0.3 + 0.7 * lit)}`, boxShadow: `0 0 ${40 * lit}px ${hexA(st.col, 0.45 * lit)}` }}>
              <svg width={200} height={180}>
                <g transform="translate(100 90) scale(1.2)">
                  <Icon k={i} col={st.col} on={lit} f={f} />
                </g>
              </svg>
            </div>
            <div style={{ marginTop: 82, fontFamily: FONT.display, fontWeight: 700, fontSize: 32, color: C.ink }}>{st.t}</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 19, color: hexA(st.col, 0.95), marginTop: 4 }}>{st.sub}</div>
          </div>
        );
      })}
      {fast > 0.01 && (
        <div style={{ position: "absolute", top: 820, width: "100%", textAlign: "center", opacity: fast * (1 - prog(f, b.every - 10, 12)) }}>
          <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 72, color: C.ink, textShadow: `0 0 40px ${hexA(C.cyan, 0.6)}` }}>× 120</span>
          <span style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 26, letterSpacing: "0.3em", color: C.cyan, marginLeft: 18 }}>EVERY SECOND</span>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ "painted in light, just for you"
const Painted: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.every - 8, { damping: 26, stiffness: 50 });
  const W = 1280;
  const H = 720;
  const ref = useCanvas((ctx) => ctx.drawImage(wallpaper(), 0, 0, W, H), []);
  const t1 = spr(f, fps, b.painted - 4, { damping: 20, stiffness: 100 });
  const t2 = spr(f, fps, b.you - 4, { damping: 20, stiffness: 100 });
  // particles of light assembling the picture
  const assemble = prog(f, b.every - 10, 40, EASE.out);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Glow x={960} y={520} size={1800} color="#ffb38a" a={0.16 * inP} />
      <div style={{ position: "absolute", left: 960 - W / 2, top: 520 - H / 2, width: W, height: H, borderRadius: 22, overflow: "hidden", opacity: clamp(inP * 1.2), transform: `scale(${mix(0.86, 1, inP) * (1 + 0.02 * Math.sin(f / 60))})`, boxShadow: `0 0 0 16px #0b0e18, 0 60px 160px rgba(0,0,0,0.7), 0 0 160px ${hexA("#ff9a6a", 0.3)}` }}>
        <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(2,3,9,0) 50%, rgba(2,3,9,0.7) 100%)" }} />
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {new Array(160).fill(0).map((_, i) => {
          const tx = 960 - W / 2 + rnd(`fx${i}`) * W;
          const ty = 520 - H / 2 + rnd(`fy${i}`) * H;
          const sx = 960 + Math.cos(rnd(`fa${i}`) * 6.28) * 1300;
          const sy = 540 + Math.sin(rnd(`fa${i}`) * 6.28) * 900;
          const k = clamp(assemble * 1.2 - rnd(`fd${i}`) * 0.2);
          const col = [RGB.r, RGB.g, RGB.b, "#ffffff"][i % 4];
          return k < 0.99 ? <circle key={i} cx={mix(sx, tx, k)} cy={mix(sy, ty, k)} r={3} fill={col} opacity={0.8 * (1 - k)} /> : null;
        })}
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 520 + H / 2 - 170, textAlign: "center" }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 92, letterSpacing: "-0.035em", color: "#fff", opacity: clamp(t1 * 1.3), transform: `translateY(${(1 - t1) * 30}px)`, textShadow: "0 6px 40px rgba(0,0,0,0.8)" }}>
          Painted in light.
        </div>
        <div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 48, color: "#ffd9b8", opacity: clamp(t2 * 1.3), transform: `translateY(${(1 - t2) * 20}px)`, textShadow: "0 4px 30px rgba(0,0,0,0.8)" }}>Just for you.</div>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ next episode
const NextTime: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spr(f, fps, b.next, { damping: 20, stiffness: 90 });
  const press = prog(f, b.power - 4, 10);
  const boot = prog(f, b.power + 6, 40, EASE.out);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Glow x={1400} y={540} size={1000 * (0.5 + boot)} color={C.green} a={0.25 * boot} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(1400 540) scale(${mix(1, 0.92, press) * mix(1, 1.04, boot)})`}>
          <circle r={150} fill="#0d1220" stroke={hexA(C.green, 0.4 + 0.6 * boot)} strokeWidth={4} style={{ filter: boot > 0.1 ? `drop-shadow(0 0 ${30 * boot}px ${C.green})` : undefined }} />
          <path d="M-58,-38 A70,70 0 1 0 58,-38" fill="none" stroke={boot > 0.1 ? "#d1fae5" : C.ink3} strokeWidth={14} strokeLinecap="round" />
          <line x1={0} y1={-86} x2={0} y2={-6} stroke={boot > 0.1 ? "#d1fae5" : C.ink3} strokeWidth={14} strokeLinecap="round" />
          {boot > 0.01 && <circle r={150 + 260 * boot} fill="none" stroke={C.green} strokeOpacity={0.5 * (1 - boot)} strokeWidth={3} />}
        </g>
      </svg>
      <div style={{ position: "absolute", left: 110, top: 300, opacity: clamp(p * 1.3), transform: `translateY(${(1 - p) * 30}px)` }}>
        <Kicker color={C.green}>Next time · Episode 03</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 120, color: C.ink, marginTop: 14, letterSpacing: "-0.04em", lineHeight: 1 }}>Power On</div>
        <div style={{ fontFamily: FONT.ui, fontSize: 32, color: C.ink2, marginTop: 18, maxWidth: 820, lineHeight: 1.35 }}>From the power button to your desktop: boot ROM, bootloader, kernel, and the first process.</div>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ end card
const EndCard: React.FC<{ a: number }> = ({ a }) => (
  <AbsoluteFill style={{ opacity: a, alignItems: "center", justifyContent: "center", background: `radial-gradient(60% 50% at 50% 50%, ${hexA(C.pink, 0.12)}, rgba(2,3,9,0.94) 70%)` }}>
    <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 22, letterSpacing: "0.6em", color: C.amber, paddingLeft: "0.6em" }}>EPISODE 02</div>
    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 120, color: C.ink, letterSpacing: "-0.02em", marginTop: 16 }}>INSIDE THE MACHINE</div>
    <div style={{ height: 2, width: 900, marginTop: 24, background: `linear-gradient(90deg, transparent, ${RGB.r}, ${RGB.g}, ${RGB.b}, transparent)` }} />
    <div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 52, marginTop: 28, background: `linear-gradient(90deg, ${C.pink}, ${C.amber} 45%, ${C.cyan})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Painting with Light</div>
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
  const chainA = inOut(f, 0, 14, b.every - 8, 16);
  const paintA = inOut(f, b.every - 12, 18, b.next - 8, 16);
  const nextA = inOut(f, b.next - 8, 16, b.end, 16);
  const endA = prog(f, b.end - 4, 20);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={24}>
      {chainA > 0.01 && <Chain b={b} a={chainA} />}
      {paintA > 0.01 && <Painted b={b} a={paintA} />}
      {nextA > 0.01 && <NextTime b={b} a={nextA} />}
      {endA > 0.01 && <EndCard a={endA} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const ats = [b.s0, b.s1, b.s2, b.s3, b.s4, b.s5];
  const race: SfxEvent[] = [];
  for (let k = 0; k < 8; k++) race.push({ at: b.rate + k * 11, name: "tick_hi", vol: 0.2 });
  return [
    { at: b.rewind - 4, name: "whoosh_rev", vol: 0.4 },
    { at: b.rewind, name: "sweep_down", vol: 0.25 },
    ...ats.map((t, i) => ({ at: t - 6, name: i === 5 ? "shimmer" : "pop", vol: 0.3, rate: 1 + i * 0.06 })),
    { at: b.rate - 6, name: "riser", vol: 0.3 },
    ...race,
    { at: b.every - 12, name: "whoosh_big", vol: 0.4 },
    { at: b.painted - 4, name: "swell", vol: 0.35 },
    { at: b.you - 4, name: "chime", vol: 0.3 },
    { at: b.next - 8, name: "whoosh_soft", vol: 0.35 },
    { at: b.power - 4, name: "mouse_click", vol: 0.5 },
    { at: b.power + 6, name: "power_up", vol: 0.45 },
    { at: b.end - 4, name: "impact", vol: 0.5 },
    { at: b.end - 2, name: "braam", vol: 0.45 },
  ];
};

export const Finale: SceneModule = {
  Visual,
  sfx,
  hud: false,
  backdrop: { hueA: C.pink, hueB: C.amber, hueC: C.cyan, intensity: 0.8 },
};
