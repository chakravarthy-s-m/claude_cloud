import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { cam, groundMatrix, project, type Cam, type V3 } from "../../lib/proj3d";
import { Chip3D } from "../../components/chip";
import { SLAB, SideLabel, Stack3D, layerAnchor, type StackLayer } from "../../components/stack";
import { Glow, Kicker, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";

export const Z = { kernel: 380, services: 780, frameworks: 1180, apps: 1580, wall: 590 };

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    kernel: wordAt(c.s2, "the kernel"),
    xnu: wordAt(c.s2, "called"),
    control: wordAt(c.s2, "total control"),
    services: wordAt(c.s3, "system services"),
    ws: wordAt(c.s3, "WindowServer"),
    frameworks: wordAt(c.s4, "frameworks"),
    apps: c.s5.from,
    doors: wordAt(c.s6, "well-defined doors"),
    abstraction: wordAt(c.s6, "That's abstraction"),
    wall: c.s7.from + 10,
    kmode: wordAt(c.s8, "The kernel runs"),
    outside: wordAt(c.s8, "Code on the outside"),
    hit: wordAt(c.s8, "touch the hardware"),
    door: wordAt(c.s8, "except through"),
    pass: wordAt(c.s8, "the kernel guards"),
  };
};

/** Point along a 3D polyline at fraction p (by segment length). */
const along = (pts: V3[], p: number): V3 => {
  const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1], q[2] - pts[i][2]));
  const total = lens.reduce((a, b) => a + b, 0);
  let t = clamp(p) * total;
  for (let i = 0; i < lens.length; i++) {
    if (t <= lens[i]) {
      const k = t / lens[i];
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k, pts[i][2] + (pts[i + 1][2] - pts[i][2]) * k];
    }
    t -= lens[i];
  }
  return pts[pts.length - 1];
};

const Ring: React.FC<{ c: Cam; at: V3; r: number; color: string; a: number; fill?: number }> = ({ c, at, r, color, a, fill = 0.25 }) => {
  if (a <= 0.01) return null;
  const m = groundMatrix(c, at[0], at[1], at[2]);
  return (
    <g transform={m} opacity={a}>
      <ellipse rx={r} ry={r} fill={hexA(color, fill)} stroke={color} strokeWidth={10} />
      <ellipse rx={r * 1.5} ry={r * 1.5} fill="none" stroke={color} strokeWidth={4} strokeOpacity={0.4} />
    </g>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const b = beats(s);
  const end = s.durationInFrames;

  const appear = (at: number) => spr(f, fps, at, { damping: 20, stiffness: 90 });
  const kA = appear(b.kernel);
  const sA = appear(b.services);
  const fA = appear(b.frameworks);
  const aA = appear(b.apps - 6);

  const c = cam({
    yaw: keyframes(f, [[0, -45], [b.kernel, -40], [b.apps, -34], [b.doors, -28], [b.wall, -22], [end, -18]]),
    pitch: keyframes(f, [[0, 33], [b.kernel, 30], [b.services, 25], [b.apps, 20], [b.wall, 17], [end, 16]]),
    dist: 6000,
    scale: keyframes(f, [[0, 0.52], [b.kernel, 0.5], [b.services, 0.46], [b.frameworks, 0.42], [b.apps, 0.38], [b.doors, 0.375], [end, 0.37]]),
    target: [keyframes(f, [[0, 170], [b.apps, 140]]), 0, keyframes(f, [[0, 40], [b.kernel, 260], [b.services, 470], [b.frameworks, 640], [b.apps, 800], [end, 820]])],
    cy: keyframes(f, [[0, 560], [b.apps, 520]]),
  });

  const wallA = prog(f, b.wall, 24, EASE.out);
  const lit = (id: string) => {
    // brief highlight while a layer is being described
    if (id === "kernel") return inOut(f, b.kernel, 12, b.services - 10, 20) + inOut(f, b.pass, 8, b.pass + 50, 20);
    if (id === "services") return inOut(f, b.services, 12, b.frameworks - 10, 20);
    if (id === "frameworks") return inOut(f, b.frameworks, 12, b.apps - 6, 20);
    if (id === "apps") return inOut(f, b.apps, 12, b.doors - 30, 20);
    return 0;
  };

  const layers: StackLayer[] = [
    { id: "kernel", name: "Kernel", desc: "XNU · Mach + BSD + I/O Kit", color: C.cyan, z: Z.kernel, a: kA, lit: lit("kernel"), tiles: ["Mach", "BSD", "I/O Kit"] },
    { id: "services", name: "System services", desc: "WindowServer · launchd · …", color: C.blue, z: Z.services, a: sA, lit: lit("services"), tiles: ["WindowServer", "launchd"] },
    { id: "frameworks", name: "Frameworks", desc: "AppKit · SwiftUI · Metal · Core Animation", color: C.violet, z: Z.frameworks, a: fA, lit: lit("frameworks"), tiles: ["AppKit", "SwiftUI", "Metal"] },
    { id: "apps", name: "Apps", desc: "what you see and touch", color: C.pink, z: Z.apps, a: aA, lit: lit("apps"), tiles: ["Notes", "Browser", "Music", "Photos"] },
  ];

  const chipPower = 0.25 + 0.5 * prog(f, b.control, 20) * (1 - prog(f, b.services, 30) * 0.5);

  // doors (s6): packet beams between adjacent layers
  const doorDefs = [
    { from: Z.apps, to: Z.frameworks + SLAB.t, x: -520, y: -260, color: C.pink, label: "API calls", at: b.doors - 6 },
    { from: Z.frameworks, to: Z.services + SLAB.t, x: 120, y: -330, color: C.violet, label: "messages", at: b.doors + 8 },
    { from: Z.services, to: Z.kernel + SLAB.t, x: 700, y: -300, color: C.blue, label: "system calls", at: b.doors + 22 },
    { from: Z.kernel, to: 30, x: 380, y: -200, color: C.cyan, label: "drivers", at: b.doors + 36 },
  ];
  const doorsOn = inOut(f, b.doors - 10, 16, b.wall - 6, 20);

  // packet demonstration (s8)
  const pktStart: V3 = [760, -260, Z.apps + SLAB.t + 30];
  const pktHit: V3 = [760, -260, Z.wall + 30];
  const doorAt: V3 = [-260, -260, Z.wall];
  const pktDown = prog(f, b.outside, b.hit - b.outside, EASE.in);
  const bounce = prog(f, b.hit, 14, EASE.out);
  const slide = prog(f, b.hit + 18, b.door - b.hit - 6, EASE.inOut);
  const through = prog(f, b.pass - 6, 30, EASE.inOut);
  let pkt: V3 = pktStart;
  if (f < b.hit) pkt = along([pktStart, pktHit], pktDown);
  else if (f < b.hit + 18) pkt = [760, -260, Z.wall + 30 + Math.sin(bounce * Math.PI) * 120];
  else if (f < b.pass - 6) pkt = along([[760, -260, Z.wall + 30], [760, -260, Z.wall + 140], [-260, -260, Z.wall + 140], [-260, -260, Z.wall + 40]], slide);
  else pkt = along([[-260, -260, Z.wall + 40], [-260, -260, Z.kernel + SLAB.t + 10]], through);
  const pktA = inOut(f, b.outside - 4, 8, b.pass + 40, 14);
  const hitFlash = inOut(f, b.hit - 1, 3, b.hit + 6, 16);
  const doorOpen = inOut(f, b.door - 4, 14, b.pass + 50, 20);

  const wallM = groundMatrix(c, SLAB.cx - 1350, SLAB.cy + 950, Z.wall);
  const absA = inOut(f, b.abstraction - 4, 16, b.wall - 10, 16);
  const modeA = prog(f, b.c.s8.from - 4, 16);

  return (
    <SceneShell dur={end} enter={0} exit={12}>
      <Glow x={960} y={620} size={1900} color={C.violet} a={0.1} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Chip3D cam={c} st={{ power: chipPower, lit: { pcore: chipPower * 0.6, gpu: chipPower * 0.5, npu: chipPower * 0.4, ecore: chipPower * 0.5 }, frame: f, sparkle: 0.3 * chipPower }} />
        <Stack3D cam={c} layers={layers.filter((l) => l.z < Z.wall)} />
        {/* the wall */}
        {wallA > 0.01 && (
          <g transform={wallM} opacity={wallA}>
            <rect width={2700} height={1900} rx={60} fill={hexA(C.rose, 0.10 + hitFlash * 0.25)} stroke={C.rose} strokeWidth={8} />
            {new Array(20).fill(0).map((_, i) => {
              const y = ((i * 95 + f * 4) % 1900) + 0;
              return <line key={i} x1={40} y1={y} x2={2660} y2={y} stroke={hexA(C.rose, 0.18)} strokeWidth={6} />;
            })}
            <text x={1350} y={1000} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={190} fill={hexA(C.rose, 0.5)} letterSpacing="0.08em">
              USER / KERNEL BOUNDARY
            </text>
          </g>
        )}
        <Ring c={c} at={doorAt} r={150} color={C.cyan} a={doorOpen * wallA} fill={0.35} />
        <Stack3D cam={c} layers={layers.filter((l) => l.z > Z.wall)} />
        {/* doors */}
        {doorDefs.map((d, i) => {
          const p = (((f - d.at) % 60) + 60) % 60 / 60;
          const a = doorsOn * prog(f, d.at, 10);
          if (a <= 0.01) return null;
          const top = project(c, [d.x, d.y, d.from]);
          const bot = project(c, [d.x, d.y, d.to]);
          const mid = along([[d.x, d.y, d.from], [d.x, d.y, d.to]], p);
          const mp = project(c, mid);
          return (
            <g key={i} opacity={a}>
              <line x1={top.x} y1={top.y} x2={bot.x} y2={bot.y} stroke={d.color} strokeWidth={10} strokeOpacity={0.15} />
              <line x1={top.x} y1={top.y} x2={bot.x} y2={bot.y} stroke={d.color} strokeWidth={2.5} strokeDasharray="6 8" />
              <Ring c={c} at={[d.x, d.y, d.to]} r={60} color={d.color} a={1} />
              <Spark x={mp.x} y={mp.y} color={d.color} r={7} />
              <text x={(top.x + bot.x) / 2 + 22} y={(top.y + bot.y) / 2} fontFamily={FONT.mono} fontSize={22} fill={C.ink} opacity={0.95}>
                {d.label}
              </text>
            </g>
          );
        })}
        {/* rejected/accepted packet */}
        {pktA > 0.01 &&
          (() => {
            const p = project(c, pkt);
            const col = f < b.hit + 18 && f >= b.hit - 2 ? C.rose : f >= b.pass - 6 ? C.cyan : C.pink;
            return (
              <g opacity={pktA}>
                <Spark x={p.x} y={p.y} color={col} r={13} />
                {hitFlash > 0.01 && <circle cx={p.x} cy={p.y + 30} r={60 + hitFlash * 80} fill="none" stroke={C.rose} strokeWidth={4} opacity={hitFlash} />}
              </g>
            );
          })()}
      </svg>
      {/* side labels */}
      {layers.map((ly) => {
        const p = layerAnchor(c, ly.z, "right");
        const a = ly.a * (1 - prog(f, b.wall - 20, 16) * 0.55);
        return <SideLabel key={ly.id} x={p.x} y={p.y} name={ly.name} desc={ly.desc} color={ly.color} a={a} dx={70} />;
      })}
      {(() => {
        const p = layerAnchor(c, 0, "right");
        return <SideLabel x={p.x} y={p.y} name="Hardware" desc="Apple silicon" color={C.green} a={prog(f, 4, 20) * (1 - prog(f, b.wall - 20, 16) * 0.55)} dx={70} />;
      })()}
      {/* abstraction callout */}
      {absA > 0.01 && (
        <div style={{ position: "absolute", left: 110, top: 150, opacity: absA, transform: `translateY(${(1 - absA) * 20}px)` }}>
          <Kicker color={C.violet}>The big idea</Kicker>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 96, color: C.ink, letterSpacing: "-0.04em", marginTop: 10 }}>Abstraction</div>
          <div style={{ fontFamily: FONT.ui, fontSize: 28, color: C.ink2, maxWidth: 560, lineHeight: 1.35, marginTop: 6 }}>
            Every layer hides the complexity beneath it — and talks only through well-defined doors.
          </div>
        </div>
      )}
      {/* user / kernel mode labels */}
      {modeA > 0.01 &&
        (() => {
          const up = layerAnchor(c, Z.frameworks, "left");
          const dn = layerAnchor(c, Z.kernel, "left");
          return (
            <>
              <ModeTag x={up.x - 40} y={up.y - 30} title="USER MODE" sub="EL0 · apps & services" color={C.pink} a={modeA} />
              <ModeTag x={dn.x - 40} y={dn.y - 10} title="KERNEL MODE" sub="EL1 · full control" color={C.cyan} a={prog(f, b.kmode - 4, 16)} />
            </>
          );
        })()}
      {hitFlash > 0.01 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 120, textAlign: "center", opacity: inOut(f, b.hit - 1, 4, b.hit + 30, 12) }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 40, fontWeight: 700, letterSpacing: "0.2em", color: C.rose, textShadow: `0 0 30px ${C.rose}` }}>ACCESS DENIED</span>
        </div>
      )}
    </SceneShell>
  );
};

const ModeTag: React.FC<{ x: number; y: number; title: string; sub: string; color: string; a: number }> = ({ x, y, title, sub, color, a }) => (
  <div style={{ position: "absolute", right: 1920 - x, top: y, opacity: a, textAlign: "right", transform: `translateX(${(1 - a) * -30}px)` }}>
    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 40, letterSpacing: "0.04em", color, textShadow: `0 0 30px ${hexA(color, 0.6)}` }}>{title}</div>
    <div style={{ fontFamily: FONT.mono, fontSize: 20, color: C.ink2 }}>{sub}</div>
  </div>
);

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.kernel - 4, name: "whoosh_soft", vol: 0.4 },
    { at: b.kernel + 2, name: "boom_soft", vol: 0.3 },
    { at: b.control, name: "power_up", vol: 0.25 },
    { at: b.services - 4, name: "whoosh_soft", vol: 0.4 },
    { at: b.services + 2, name: "pop", vol: 0.3 },
    { at: b.frameworks - 4, name: "whoosh_soft", vol: 0.4 },
    { at: b.frameworks + 2, name: "pop", vol: 0.3 },
    { at: b.apps - 6, name: "whoosh_soft", vol: 0.4 },
    { at: b.apps, name: "pop_hi", vol: 0.35 },
    { at: b.doors - 6, name: "blip", vol: 0.25 },
    { at: b.doors + 8, name: "blip", vol: 0.25 },
    { at: b.doors + 22, name: "blip_lo", vol: 0.25 },
    { at: b.doors + 36, name: "blip_lo", vol: 0.25 },
    { at: b.abstraction - 4, name: "shimmer", vol: 0.25 },
    { at: b.wall - 4, name: "power_up", vol: 0.35 },
    { at: b.wall, name: "hum", vol: 0.25 },
    { at: b.outside, name: "sweep_down", vol: 0.25 },
    { at: b.hit - 1, name: "thud", vol: 0.45 },
    { at: b.hit, name: "alarm", vol: 0.25 },
    { at: b.door - 4, name: "portal", vol: 0.45 },
    { at: b.pass - 4, name: "whoosh", vol: 0.35 },
    { at: b.pass + 10, name: "chime_lo", vol: 0.25 },
  ];
};

export const Stack: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.violet, hueB: C.cyan, hueC: C.pink, intensity: 0.8 },
};
