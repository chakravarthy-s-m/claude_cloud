import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { cam, planeMatrix, project, type Cam, type V3 } from "../../lib/proj3d";
import { Glow, Kicker, mixWhite } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { RGB } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    magic: c.l1.from,
    rods: wordAt(c.l1, "long and thin"),
    first: c.l2.from,
    oneDir: wordAt(c.l2, "one direction"),
    second: wordAt(c.l2, "The second"),
    blocks: wordAt(c.l2, "blocks that light"),
    apply: c.l3.from,
    rotate: wordAt(c.l3, "crystals rotate"),
    twisting: wordAt(c.l3, "twisting the light"),
    slips: wordAt(c.l3, "slips through"),
    more: c.l4.from,
    valve: wordAt(c.l4, "light valve"),
    tints: wordAt(c.l4, "color filter tints"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

const XP1 = -380;
const XP2 = 380;
const XL0 = -250;
const XL1 = 250;
const HALF = 170;

// rods of the liquid crystal (deterministic jitter)
const RODS: { x: number; y: number; z: number; j: number }[] = [];
for (let i = 0; i < 7; i++)
  for (let jy = 0; jy < 4; jy++)
    for (let jz = 0; jz < 5; jz++)
      RODS.push({ x: mix(XL0 + 30, XL1 - 30, i / 6) + rnd(`rx${i}${jy}${jz}`, -16, 16), y: mix(-HALF + 35, HALF - 35, jy / 3) + rnd(`ry${i}${jy}${jz}`, -14, 14), z: mix(-HALF + 30, HALF - 30, jz / 4) + rnd(`rz${i}${jy}${jz}`, -14, 14), j: rnd(`rj${i}${jy}${jz}`) });

/** Polarization angle (0 = vertical/Z, 90° = horizontal/Y) at position x, given the LC twist. */
const polAt = (x: number, twist: number) => {
  if (x < XL0) return 0;
  if (x > XL1) return twist;
  return twist * ((x - XL0) / (XL1 - XL0));
};

const Plate: React.FC<{ c: Cam; x: number; vertical: boolean; col: string; label: string; a: number }> = ({ c, x, vertical, col, label, a }) => {
  const corners: V3[] = [
    [x, -HALF - 20, -HALF - 20],
    [x, HALF + 20, -HALF - 20],
    [x, HALF + 20, HALF + 20],
    [x, -HALF - 20, HALF + 20],
  ];
  const pc = corners.map((p) => project(c, p));
  const m = planeMatrix(c, [x, -HALF - 20, HALF + 20], [0, 1, 0], [0, 0, -1]);
  const S = 2 * HALF + 40;
  const top = project(c, [x, 0, HALF + 70]);
  return (
    <g opacity={a}>
      <path d={`M${pc.map((p) => `${p.x},${p.y}`).join("L")}Z`} fill={hexA(col, 0.1)} stroke={hexA(col, 0.8)} strokeWidth={2} />
      <g transform={m} stroke={hexA(col, 0.6)} strokeWidth={3}>
        {new Array(13).fill(0).map((_, i) => {
          const t = ((i + 0.5) / 13) * S;
          return vertical ? <line key={i} x1={t} y1={10} x2={t} y2={S - 10} /> : <line key={i} x1={10} y1={t} x2={S - 10} y2={t} />;
        })}
      </g>
      <text x={top.x} y={top.y} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={24} fill={C.ink}>
        {label}
      </text>
    </g>
  );
};

const Optics: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // camera: start inside the crystal among the rods, pull back to the whole light path
  const pull = prog(f, b.first - 30, 60, EASE.inOut);
  const c = cam({
    yaw: keyframes(f, [[0, -70], [b.first + 30, -38], [b.apply, -34], [b.more, -28], [b.end, -24]]),
    pitch: keyframes(f, [[0, 10], [b.first + 30, 16], [b.end, 20]]),
    dist: 2600,
    scale: mix(2.6, 0.95, pull) * mix(1, 0.92, prog(f, b.valve - 10, 30, EASE.inOut)),
    target: [mix(0, 60, pull), 0, mix(0, -10, pull)],
    cx: 960,
    cy: mix(560, 600, pull),
  });
  // voltage → twist
  const V = keyframes(f, [[b.rotate - 10, 0], [b.rotate + 30, 1], [b.more + 10, 1], [b.more + 50, 0.35], [b.more + 90, 0.75], [b.valve - 10, 0.55]], EASE.inOut);
  const twist = (V * Math.PI) / 2;
  const plates = prog(f, b.first - 4, 20);
  const p2A = prog(f, b.second - 6, 16);
  const lightOn = prog(f, b.first + 6, 20);
  const outI = Math.pow(Math.sin(twist), 2); // Malus's law through the crossed polarizer
  const t = f * 0.22;
  // rods
  const rods = RODS.map((r) => {
    const phi = polAt(r.x, twist) + Math.sin(f * 0.05 + r.j * 6) * 0.06;
    const L = 26;
    const d: V3 = [0, Math.sin(phi) * L, Math.cos(phi) * L];
    const tilt = 0.25; // a little out of plane so they read as 3D rods
    const p0 = project(c, [r.x - L * tilt, r.y - d[1], r.z - d[2]]);
    const p1 = project(c, [r.x + L * tilt, r.y + d[1], r.z + d[2]]);
    return { p0, p1, depth: (p0.depth + p1.depth) / 2, k: (p0.k + p1.k) / 2 };
  }).sort((p, q) => q.depth - p.depth);
  const dMin = Math.min(...rods.map((r) => r.depth));
  const dMax = Math.max(...rods.map((r) => r.depth));
  const rodA = mix(1, 0.55, pull);
  // light waves: unpolarized before P1, polarized after
  const wave = (x0: number, x1: number, ang: (x: number) => number, amp: (x: number) => number, ph = 0) => {
    let d = "";
    for (let x = x0; x <= x1; x += 6) {
      const s = Math.sin(x * 0.045 - t + ph) * amp(x);
      const a2 = ang(x);
      const p = project(c, [x, Math.sin(a2) * s, Math.cos(a2) * s]);
      d += `${d ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }
    return d;
  };
  const A = 90;
  const blocked = 1 - outI;
  const axis0 = project(c, [-820, 0, 0]);
  const axis1 = project(c, [820, 0, 0]);
  const screen = project(c, [640, 0, 0]);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* beam axis */}
        <line x1={axis0.x} y1={axis0.y} x2={axis1.x} y2={axis1.y} stroke={hexA(C.ink, 0.12 * plates)} strokeWidth={2} strokeDasharray="6 10" />
        {/* unpolarized light: many planes */}
        {lightOn > 0.01 &&
          [0, 0.8, 1.6, 2.4].map((ang, i) => (
            <path key={i} d={wave(-820, XP1, () => ang, () => A * 0.8, i * 1.3)} fill="none" stroke="#fff6dd" strokeOpacity={0.45 * lightOn} strokeWidth={2.5} />
          ))}
        <Plate c={c} x={XP1} vertical col={C.ink2} label="polarizer 1" a={plates} />
      </svg>
      {/* the rods */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {rods.map((r, i) => {
          const near = 1 - (r.depth - dMin) / Math.max(1, dMax - dMin);
          return (
            <g key={i} opacity={rodA * (0.35 + 0.65 * near)}>
              <line x1={r.p0.x} y1={r.p0.y} x2={r.p1.x} y2={r.p1.y} stroke={hexA(C.violet, 0.45)} strokeWidth={Math.max(3, 9 * r.k * c.scale)} strokeLinecap="round" />
              <line x1={r.p0.x} y1={r.p0.y} x2={r.p1.x} y2={r.p1.y} stroke={mixWhite(C.violet, 0.35)} strokeWidth={Math.max(1.5, 4 * r.k * c.scale)} strokeLinecap="round" />
            </g>
          );
        })}
        {/* the polarized wave, drawn over the crystal so you can follow its twist */}
        {lightOn > 0.01 && (
          <>
            <path d={wave(XP1, XP2, (x) => polAt(x, twist), () => A, 0)} fill="none" stroke="#fff3c4" strokeOpacity={0.3 * lightOn} strokeWidth={12} />
            <path d={wave(XP1, XP2, (x) => polAt(x, twist), () => A, 0)} fill="none" stroke="#ffffff" strokeOpacity={lightOn} strokeWidth={3.5} />
          </>
        )}
      </svg>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Plate c={c} x={XP2} vertical={false} col={C.cyan} label="polarizer 2 · turned 90°" a={p2A} />
        {/* light that makes it through */}
        {lightOn > 0.01 && outI > 0.01 && (
          <>
            <path d={wave(XP2, 820, () => Math.PI / 2, () => A * Math.sqrt(outI), 0)} fill="none" stroke="#fff3c4" strokeOpacity={0.25 * lightOn} strokeWidth={10} />
            <path d={wave(XP2, 820, () => Math.PI / 2, () => A * Math.sqrt(outI), 0)} fill="none" stroke="#fffbe8" strokeOpacity={0.95 * lightOn} strokeWidth={3} />
          </>
        )}
        {/* blocked marker */}
        {p2A > 0.5 && blocked > 0.6 && f >= b.blocks - 6 && (
          <g opacity={prog(f, b.blocks - 6, 10) * (blocked - 0.6) / 0.4}>
            <circle cx={project(c, [XP2 + 70, 0, 0]).x} cy={project(c, [XP2 + 70, 0, 0]).y} r={34} fill="none" stroke={C.rose} strokeWidth={5} />
            <line x1={project(c, [XP2 + 70, 0, 0]).x - 22} y1={project(c, [XP2 + 70, 0, 0]).y - 22} x2={project(c, [XP2 + 70, 0, 0]).x + 22} y2={project(c, [XP2 + 70, 0, 0]).y + 22} stroke={C.rose} strokeWidth={5} strokeLinecap="round" />
          </g>
        )}
      </svg>
      {/* the result: brightness of this subpixel */}
      {pull > 0.5 && (
        <>
          <Glow x={screen.x} y={screen.y} size={520 * (0.4 + outI)} color="#fff6dd" a={0.5 * outI * lightOn} />
          <div style={{ position: "absolute", left: screen.x + 40, top: screen.y - 80, width: 120, height: 160, borderRadius: 12, background: `rgba(255,248,225,${0.06 + 0.9 * outI * lightOn})`, border: "2px solid rgba(255,255,255,0.35)", boxShadow: `0 0 ${80 * outI}px rgba(255,240,200,${0.7 * outI})` }} />
          <div style={{ position: "absolute", left: screen.x + 20, top: screen.y + 96, width: 160, textAlign: "center", fontFamily: FONT.mono, fontSize: 20, color: C.ink2 }}>what you see</div>
        </>
      )}
      {/* voltage HUD */}
      {f >= b.apply - 10 && (
        <div style={{ position: "absolute", right: 110, top: 150, width: 300, opacity: inOut(f, b.apply - 10, 14, b.valve, 12) }}>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 18, letterSpacing: "0.3em", color: C.amber }}>VOLTAGE</div>
          <div style={{ marginTop: 10, height: 16, borderRadius: 8, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ width: `${V * 100}%`, height: "100%", background: `linear-gradient(90deg, ${C.amber}, #fff1c2)`, boxShadow: `0 0 16px ${C.amber}` }} />
          </div>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 18, letterSpacing: "0.3em", color: "#fff6dd", marginTop: 22 }}>LIGHT OUT</div>
          <div style={{ marginTop: 10, height: 16, borderRadius: 8, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ width: `${outI * 100}%`, height: "100%", background: "#fff6dd", boxShadow: "0 0 16px #fff6dd" }} />
          </div>
        </div>
      )}
      <div style={{ position: "absolute", left: 110, top: 112, opacity: inOut(f, 6, 16, b.valve - 6, 12) }}>
        <Kicker color={C.violet}>{f < b.first ? "Liquid crystal molecules" : f < b.apply ? "Crossed polarizers: dark" : "Voltage twists the light"}</Kicker>
      </div>
      {f > b.rods - 6 && f < b.first + 10 && (
        <div style={{ position: "absolute", left: 110, bottom: 110, padding: "14px 26px", borderRadius: 18, background: "rgba(4,6,14,0.78)", opacity: inOut(f, b.rods - 6, 14, b.first - 4, 12), fontFamily: FONT.display, fontWeight: 700, fontSize: 52, color: C.ink, letterSpacing: "-0.03em" }}>
          long, thin, <span style={{ color: C.violet }}>rod-shaped</span> molecules
        </div>
      )}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ three valves → one color
const Valves: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.valve - 8, { damping: 22, stiffness: 100 });
  const tint = prog(f, b.tints - 6, 18);
  const lv = [keyframes(f, [[b.valve, 0.3], [b.tints + 10, 0.95], [b.end, 0.9]]), keyframes(f, [[b.valve, 0.6], [b.tints + 10, 0.55], [b.end, 0.45]]), keyframes(f, [[b.valve, 0.2], [b.tints + 10, 0.25], [b.end, 0.6]])];
  const cols = [RGB.r, RGB.g, RGB.b];
  const mixCol = `rgb(${Math.round(255 * lv[0])}, ${Math.round(255 * lv[1])}, ${Math.round(255 * lv[2])})`;
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.4) }}>
      <div style={{ position: "absolute", left: 110, top: 112 }}>
        <Kicker color={C.amber} at={b.valve - 8}>
          Every subpixel: a light valve
        </Kicker>
      </div>
      <div style={{ position: "absolute", left: 300, top: 300, display: "flex", gap: 60 }}>
        {cols.map((col, i) => {
          const I = lv[i];
          const c = tint > 0.5 ? col : "#fff6dd";
          return (
            <div key={i} style={{ width: 180, textAlign: "center" }}>
              <div style={{ position: "relative", width: 180, height: 300, borderRadius: 16, background: "#090b14", border: "1px solid rgba(255,255,255,0.12)", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 10, borderRadius: 10, background: hexA(c, 0.06 + 0.9 * I), boxShadow: `0 0 ${60 * I}px ${hexA(c, 0.8 * I)}` }} />
                {/* the valve "shutter" */}
                <div style={{ position: "absolute", left: 10, right: 10, top: 10, height: `${(1 - I) * 280}px`, background: "repeating-linear-gradient(0deg, rgba(10,12,22,0.95) 0 8px, rgba(30,34,52,0.95) 8px 10px)" }} />
              </div>
              <div style={{ marginTop: 16, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.08)" }}>
                <div style={{ width: `${I * 100}%`, height: "100%", borderRadius: 5, background: C.amber }} />
              </div>
              <div style={{ fontFamily: FONT.mono, fontSize: 20, color: C.ink3, marginTop: 8 }}>voltage</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 1340, top: 330, width: 300, height: 300, borderRadius: "50%", background: mixCol, opacity: tint, boxShadow: `0 0 120px ${mixCol}` }} />
      <div style={{ position: "absolute", left: 1340, top: 660, width: 300, textAlign: "center", fontFamily: FONT.ui, fontWeight: 600, fontSize: 22, letterSpacing: "0.35em", color: C.ink3, opacity: tint }}>ONE PIXEL</div>
      <div style={{ position: "absolute", left: 1150, top: 470, fontFamily: FONT.mono, fontSize: 60, color: C.ink3, opacity: tint }}>=</div>
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const opA = 1 - prog(f, b.valve - 10, 14);
  const vA = prog(f, b.valve - 10, 14);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      {opA > 0.01 && <Optics b={b} a={opA} />}
      {vA > 0.01 && <Valves b={b} a={vA} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: 6, name: "shimmer", vol: 0.25 },
    { at: b.first - 30, name: "whoosh_rev", vol: 0.35 },
    { at: b.first + 6, name: "swell", vol: 0.3 },
    { at: b.second - 6, name: "pop", vol: 0.3 },
    { at: b.blocks - 6, name: "thud", vol: 0.35 },
    { at: b.rotate - 10, name: "power_up", vol: 0.35 },
    { at: b.twisting - 4, name: "sweep_up", vol: 0.3 },
    { at: b.slips - 4, name: "shimmer", vol: 0.35 },
    { at: b.more + 10, name: "sweep_down", vol: 0.25 },
    { at: b.more + 50, name: "sweep_up", vol: 0.25 },
    { at: b.valve - 10, name: "whoosh_soft", vol: 0.3 },
    { at: b.tints - 6, name: "chime", vol: 0.25 },
  ];
};

export const Crystals: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.violet, hueB: C.amber, hueC: C.cyan, intensity: 0.55 },
};
