import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { cam, groundMatrix, project, roundRect, type V3 } from "../../lib/proj3d";
import { Keyboard3D, findKey, keyCenter } from "../../components/keyboard";
import { Chip3D } from "../../components/chip";
import { Glow, NeonPath, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { Check, ChainRow, PowerSymbol, type LinkItem } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    off: c.o1.from,
    almost: c.o2.from,
    inside: wordAt(c.o2, "Somewhere inside"),
    awake: wordAt(c.o2, "still awake"),
    waiting: wordAt(c.o2, "waiting"),
    comes: wordAt(c.o2, "single press") + 12,
    cold: wordAt(c.o3, "a cold slab"),
    turns: wordAt(c.o3, "turns itself"),
    working: wordAt(c.o3, "working computer"),
    seconds: wordAt(c.o3, "in a matter"),
    firmware: c.o4.from,
    loaders: wordAt(c.o4, "Bootloaders"),
    kernel: wordAt(c.o4, "A kernel"),
    hundreds: wordAt(c.o4, "Hundreds"),
    each: wordAt(c.o4, "each one"),
    trusted: c.o5.from,
    checked: wordAt(c.o5, "checked"),
    because: c.o6.from,
    first: wordAt(c.o6, "very first instruction"),
    controls2: wordAt(c.o6, "controls everything"),
    after: wordAt(c.o6, "after it"),
    today: c.o7.from,
    button: wordAt(c.o7, "press the power button"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

const PK = keyCenter(findKey("●"));
const PMIC: V3 = [330, 470, -46];

// Traces from the power key into the board (x-ray layer), Manhattan routed.
const KEY_TRACE: V3[] = [
  [PK[0], PK[1] + 10, -46],
  [PK[0], PK[1] + 110, -46],
  [PK[0] - 180, PK[1] + 110, -46],
  [PMIC[0] + 40, PMIC[1] - 98, -46],
  [PMIC[0] + 40, PMIC[1] - 40, -46],
];

// After the press: power traces racing away from the key across the deck.
const RACE: V3[][] = (() => {
  const out: V3[][] = [];
  const dirs: [number, number][] = [[-1, 0], [-1, -1], [-0.3, -1], [-1, -0.25], [-1, -0.6], [-0.6, -1], [-1, -1.6], [-1.4, -0.8]];
  dirs.forEach(([dx, dy], i) => {
    const pts: V3[] = [[PK[0], PK[1], 1]];
    let x = PK[0];
    let y = PK[1];
    for (let s = 0; s < 7; s++) {
      const horizontal = (s + i) % 2 === 0;
      const len = 110 + ((i * 41 + s * 59) % 150);
      if (horizontal) x += Math.sign(dx || -1) * len * (Math.abs(dx) > 0 ? 1 : 0.35);
      else y += Math.sign(dy || -1) * len * (Math.abs(dy) > 0 ? 1 : 0.35);
      pts.push([x, y, 1]);
    }
    out.push(pts);
  });
  return out;
})();

const polyHead = (pts: { x: number; y: number }[], p: number) => {
  let len = 0;
  for (let j = 1; j < pts.length; j++) len += Math.hypot(pts[j].x - pts[j - 1].x, pts[j].y - pts[j - 1].y);
  let target = len * p;
  let hx = pts[0].x;
  let hy = pts[0].y;
  for (let j = 1; j < pts.length; j++) {
    const L = Math.hypot(pts[j].x - pts[j - 1].x, pts[j].y - pts[j - 1].y);
    if (target <= L) {
      hx = pts[j - 1].x + ((pts[j].x - pts[j - 1].x) * target) / Math.max(1e-6, L);
      hy = pts[j - 1].y + ((pts[j].y - pts[j - 1].y) * target) / Math.max(1e-6, L);
      return { len, hx, hy };
    }
    target -= L;
    hx = pts[j].x;
    hy = pts[j].y;
  }
  return { len, hx, hy };
};

// ---------------------------------------------------------------- x-ray logic board
const BZ = -46;
const quad = (c: ReturnType<typeof cam>, x: number, y: number, w: number, h: number, z = BZ) =>
  "M" + ([[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]] as [number, number][]).map(([px, py]) => {
    const p = project(c, [px, py, z]);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join("L") + "Z";
const poly = (c: ReturnType<typeof cam>, pts: [number, number][], z = BZ, close = false) =>
  pts.map(([px, py], i) => {
    const p = project(c, [px, py, z]);
    return `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join("") + (close ? "Z" : "");

const BOARD_TRACES: [number, number][][] = new Array(16).fill(0).map((_, i) => {
  const x = -150 + i * 62;
  const y0 = 300 + (i % 3) * 20;
  return [[x, y0], [x, y0 + 110 + (i % 4) * 30], [x + ((i % 3) - 1) * 40, y0 + 170 + (i % 4) * 30], [x + ((i % 3) - 1) * 40, 680]];
});
const PARTS: [number, number, number, number][] = [
  [200, 330, 44, 26], [270, 330, 44, 26], [560, 330, 44, 26], [630, 330, 44, 26], [700, 330, 44, 26],
  [520, 470, 60, 40], [600, 470, 30, 30], [660, 470, 30, 30], [200, 600, 44, 26], [480, 610, 70, 40], [600, 610, 44, 26], [700, 610, 44, 26],
];

const Board: React.FC<{ c: ReturnType<typeof cam>; a: number; breath: number }> = ({ c, a, breath }) => {
  const outline = roundRect(330, 485, 1060, 430, 34, 5);
  const soc = project(c, [-5, 525, BZ]);
  return (
    <g opacity={a}>
      <path d={poly(c, outline, BZ, true)} fill="rgba(8,24,30,0.72)" stroke={hexA(C.teal, 0.55)} strokeWidth={1.6} />
      {BOARD_TRACES.map((t, i) => (
        <path key={i} d={poly(c, t)} fill="none" stroke={hexA(C.teal, 0.16)} strokeWidth={3} />
      ))}
      {PARTS.map(([x, y, w, h], i) => (
        <path key={i} d={quad(c, x, y, w, h)} fill="rgba(20,30,44,0.8)" stroke={hexA(C.teal, 0.3)} strokeWidth={1} />
      ))}
      {/* SoC package */}
      <path d={quad(c, -5, 525, 230, 190)} fill="rgba(16,22,36,0.9)" stroke={hexA(C.gold, 0.55)} strokeWidth={1.6} />
      <path d={quad(c, -5, 525, 150, 120)} fill="rgba(24,32,50,0.9)" stroke={hexA(C.cyan, 0.3)} strokeWidth={1} />
      <text x={soc.x} y={soc.y + 8} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={22} letterSpacing="0.1em" fill={hexA(C.ink, 0.45)}>
        SoC
      </text>
      {/* the always-on power-management chip */}
      <path d={quad(c, PMIC[0], PMIC[1], 100, 80)} fill={hexA(C.orange, 0.08 + 0.12 * breath)} stroke={hexA(C.orange, 0.6 + 0.4 * breath)} strokeWidth={2} />
    </g>
  );
};

// ---------------------------------------------------------------- act 1: the power key
const KeyAct: React.FC<{ b: B }> = ({ b }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const down = spr(f, fps, b.comes - 5, { damping: 14, stiffness: 420, mass: 0.6 });
  const up = spr(f, fps, b.comes + 12, { damping: 12, stiffness: 260 });
  const press = clamp(down - up * 0.85);
  const flash = prog(f, b.comes - 1, 3) * (1 - prog(f, b.comes + 2, 40, EASE.out));
  const xray = inOut(f, b.inside - 6, 26, b.waiting - 4, 24);
  // "breathing" standby light (always-on domain)
  const breath = 0.5 + 0.5 * Math.sin((f / fps) * Math.PI * 0.9 - 1.2);
  const standby = prog(f, b.awake - 10, 30) * (1 - prog(f, b.comes, 10));
  const wait = prog(f, b.waiting - 4, 20) * (1 - prog(f, b.comes, 6));
  const rise = prog(f, b.comes + 16, b.cold - b.comes + 6, EASE.inOut);

  const c = cam({
    yaw: keyframes(f, [[0, -42], [b.inside, -30], [b.waiting, -28], [b.comes, -26], [b.cold + 10, -12]]),
    pitch: keyframes(f, [[0, 18], [b.inside + 10, 50], [b.waiting - 4, 46], [b.waiting + 24, 24], [b.comes + 10, 26], [b.cold + 10, 54]]),
    dist: mix(900, 2400, rise),
    scale: keyframes(f, [[0, 2.7], [b.off + 20, 2.9], [b.inside + 10, 1.55], [b.waiting - 4, 1.62], [b.waiting + 24, 2.6], [b.comes - 6, 3.1], [b.comes + 16, 3.0], [b.cold + 10, 1.0]]),
    target: [mix(PK[0] - 60, 180, rise) - xray * 250, mix(PK[1] + 10, 240, rise) + xray * 130, 4],
    cx: 960,
    cy: 560,
  });

  const pk = project(c, [PK[0], PK[1], 10]);
  const pm = project(c, [PMIC[0], PMIC[1], PMIC[2]]);

  // trace from key to PMIC lights as the circuit waits; floods on the press
  const traceP = prog(f, b.inside + 30, 36, EASE.inOut);
  const tracePts = KEY_TRACE.map((p) => project(c, p));
  const traceD = tracePts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");
  const th = polyHead(tracePts, traceP);

  const ring = (start: number, maxR: number, col: string) => {
    const p = prog(f, start, 36, EASE.out);
    if (p <= 0 || p >= 1) return null;
    const pts: string[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const sp = project(c, [PK[0] + Math.cos(a) * maxR * p, PK[1] + Math.sin(a) * maxR * p, 1]);
      pts.push(`${i ? "L" : "M"}${sp.x.toFixed(1)},${sp.y.toFixed(1)}`);
    }
    return <path d={pts.join("") + "Z"} fill="none" stroke={col} strokeWidth={3 * (1 - p) + 0.5} strokeOpacity={(1 - p) * 0.9} />;
  };

  const fadeIn = prog(f, 0, 46, EASE.inOut);
  const offA = inOut(f, b.off - 4, 14, b.almost - 6, 14);

  // keys warm up after the press (backlight wave)
  const glow: Record<string, number> = {};
  glow["●"] = clamp(flash * 1.3 + standby * breath * 0.35 + wait * 0.4);
  const kbBack = 0.04 + 0.3 * prog(f, b.comes + 6, 40);

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      <Glow x={pk.x} y={pk.y} size={900} color={C.orange} a={0.08 + 0.4 * flash + 0.1 * standby * breath} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* x-ray: logic board under the deck (exact perspective) */}
        {xray > 0.01 && <Board c={c} a={xray} breath={breath} />}
        {/* key → PMIC trace */}
        {xray > 0.01 && traceP > 0.01 ? (
          <g opacity={xray}>
            <NeonPath d={traceD} color={C.orange} width={2.2} progress={traceP} length={th.len} opacity={0.75} />
            {traceP > 0.02 && traceP < 0.999 && <Spark x={th.hx} y={th.hy} color={C.orange} r={5} />}
            {/* the circuit listening: little pulses from the key to the chip */}
            {f > b.inside + 66 &&
              [0, 1, 2].map((k) => {
                const ph = (((f - (b.inside + 66)) / 42 - k / 3) % 1 + 1) % 1;
                const hp = polyHead(tracePts, ph);
                return <Spark key={k} x={hp.hx} y={hp.hy} color={C.amber} r={4} a={Math.sin(ph * Math.PI)} />;
              })}
          </g>
        ) : null}
        <g opacity={1 - xray * 0.85}>
          <Keyboard3D cam={c} press={{ "●": press }} glow={glow} glowColor={C.orange} backlight={kbBack} letters={0.25 + 0.6 * prog(f, b.comes + 4, 30)} focus={[PK[0], PK[1], 0]} focusRadius={mix(520, 1500, prog(f, b.comes, 60))} />
        </g>
        {/* power glyph on the key */}
        {(() => {
          const gm = groundMatrix(c, PK[0], PK[1], 14 - press * 9 + 0.6);
          const a = (0.35 + 0.65 * clamp(glow["●"] * 1.4)) * (1 - xray * 0.8);
          return (
            <g transform={gm} opacity={a}>
              <circle r={30} fill="#191c27" />
              <g transform="scale(1,-1)">
                <PowerSymbol x={0} y={0} r={17} col={glow["●"] > 0.05 ? "#ffd9a8" : "#c9d1ea"} width={3.4} />
              </g>
            </g>
          );
        })()}
        {/* race traces after press */}
        {RACE.map((tr, i) => {
          const p = prog(f, b.comes + 2 + (i % 4) * 3, 30, EASE.out);
          if (p <= 0) return null;
          const pts = tr.map((pt) => project(c, pt));
          const h = polyHead(pts, p);
          const d = pts.map((pt, j) => `${j ? "L" : "M"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join("");
          const col = [C.orange, C.amber, C.gold, C.orange][i % 4];
          return (
            <g key={i} opacity={(1 - prog(f, b.cold - 10, 16)) * 0.9} style={{ mixBlendMode: "screen" }}>
              <NeonPath d={d} color={col} width={2.2} progress={p} length={h.len} />
              {p < 1 && <Spark x={h.hx} y={h.hy} color={col} r={6} />}
            </g>
          );
        })}
        {ring(b.comes, 640, C.orange)}
        {ring(b.comes + 7, 420, C.amber)}
        {ring(b.comes + 14, 900, C.gold)}
      </svg>
      {/* PMIC glow + label */}
      {xray > 0.01 && (
        <>
          <Glow x={pm.x} y={pm.y} size={300} color={C.orange} a={(0.2 + 0.45 * breath) * xray} />
          <div style={{ position: "absolute", left: pm.x + 90, top: pm.y - 30, opacity: xray, fontFamily: FONT.mono, fontSize: 20, color: hexA(C.orange, 0.95), letterSpacing: "0.12em", whiteSpace: "nowrap" }}>
            <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 18, letterSpacing: "0.3em", color: hexA(C.ink, 0.75) }}>ALWAYS-ON</div>
            standby · listening
          </div>
        </>
      )}
      {/* "OFF" state tag */}
      {offA > 0.01 && (
        <div style={{ position: "absolute", left: pk.x - 340, top: pk.y - 210, opacity: offA * 0.9, fontFamily: FONT.ui, fontSize: 20, fontWeight: 600, letterSpacing: "0.5em", color: hexA(C.ink, 0.55) }}>
          POWER <span style={{ color: hexA(C.ink, 0.9), marginLeft: 8 }}>OFF</span>
        </div>
      )}
      <AbsoluteFill style={{ background: "#ffe2c0", opacity: flash * 0.22, mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 2: cold silicon wakes
const ChipAct: React.FC<{ b: B }> = ({ b }) => {
  const f = useCurrentFrame();
  const t = prog(f, b.cold - 10, b.firmware - b.cold, EASE.inOut);
  const c = cam({ yaw: mix(-22, -8, t), pitch: mix(58, 44, t), dist: 2600, scale: mix(0.62, 0.74, t), target: [140, 0, 0], cy: 560 });
  const power = prog(f, b.turns, 40, EASE.inOut);
  const wave = (f - b.turns) * 26; // world units per frame from the first core outward
  const lit: Record<string, number> = {};
  const origin = { x: -500, y: 360 };
  const BL = [
    ["p0", -500, 357], ["p1", -325, 357], ["p2", -500, 199], ["p3", -325, 199], ["pl2", -170, 275], ["e0", -531, 41], ["e1", -416, 41], ["e2", -301, 41],
    ["e3", -531, -84], ["e4", -416, -84], ["e5", -301, -84], ["el2", -170, -22], ["slc", 156, 42], ["media", 300, -108], ["display", 300, -246],
    ["secure", 492, -108], ["storage", 492, -246], ["io", 395, -383], ["phy", 560, 208], ["fabric", -345, -300],
  ] as [string, number, number][];
  for (const [id, x, y] of BL) {
    const d = Math.hypot(x - origin.x, y - origin.y);
    lit[id] = clamp((wave - d) / 160);
  }
  lit.gpu = clamp((wave - 520) / 200);
  lit.npu = clamp((wave - 560) / 200);
  const shown = inOut(f, b.cold - 4, 18, b.firmware - 4, 14);
  const timerA = inOut(f, b.seconds - 10, 14, b.firmware - 6, 10);
  const secs = Math.max(0, (f - b.comes) / 30);
  const frost = 1 - power;
  return (
    <AbsoluteFill style={{ opacity: shown }}>
      <Glow x={960} y={560} size={1600} color={power > 0.1 ? C.orange : C.blue} a={0.08 + 0.12 * power} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Chip3D cam={c} st={{ power: 0.25 + 0.75 * power, lit, rise: { p0: 0.4 * power }, sparkle: 0.7 * power, frame: f, memLit: clamp((wave - 1400) / 300) }} />
      </svg>
      {/* cold frost tint on the dead chip */}
      <AbsoluteFill style={{ background: `radial-gradient(50% 50% at 50% 52%, ${hexA("#7fb0ff", 0.12 * frost)}, transparent 70%)` }} />
      <div style={{ position: "absolute", left: 120, top: 120, opacity: inOut(f, b.cold - 4, 14, b.turns + 10, 14), fontFamily: FONT.ui, fontSize: 20, fontWeight: 600, letterSpacing: "0.45em", color: hexA("#9cc2ff", 0.85) }}>
        COLD SILICON · 0 V
      </div>
      {timerA > 0.01 && (
        <div style={{ position: "absolute", right: 130, top: 110, opacity: timerA, textAlign: "right" }}>
          <div style={{ fontFamily: FONT.ui, fontSize: 18, letterSpacing: "0.4em", color: hexA(C.orange, 0.9), fontWeight: 600 }}>TIME SINCE PRESS</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 76, color: C.ink, fontWeight: 600, textShadow: `0 0 30px ${hexA(C.orange, 0.5)}`, fontVariantNumeric: "tabular-nums" }}>
            {secs.toFixed(2)} <span style={{ fontSize: 40, color: C.ink3 }}>s</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 3: what has to start
const WORDS = [
  { t: "FIRMWARE", col: C.orange, key: "firmware" as const },
  { t: "BOOTLOADERS", col: C.cyan, key: "loaders" as const },
  { t: "A KERNEL", col: C.violet, key: "kernel" as const },
];

// rings of processes: every node is started by one in the ring inside it
type PNode = { x: number; y: number; px: number; py: number; ring: number; i: number };
const PROCS: PNode[] = (() => {
  const out: PNode[] = [];
  const rings = [6, 12, 24, 48, 96, 192];
  const pos = (ring: number, j: number): [number, number] => {
    if (ring < 0) return [960, 560];
    const n = rings[ring];
    const r = 105 + ring * 92;
    const a = ((j + 0.5) / n) * Math.PI * 2 - Math.PI / 2 + ring * 0.07;
    return [960 + Math.cos(a) * r * 1.65, 560 + Math.sin(a) * r];
  };
  rings.forEach((n, ring) => {
    for (let j = 0; j < n; j++) {
      const [x, y] = pos(ring, j);
      const [px, py] = pos(ring - 1, ring === 0 ? 0 : Math.floor(j / 2));
      out.push({ x, y, px, py, ring, i: out.length });
    }
  });
  return out;
})();

const MontageAct: React.FC<{ b: B }> = ({ b }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shown = inOut(f, b.firmware - 6, 10, b.because + 6, 18);
  const wordsOut = prog(f, b.hundreds - 8, 16, EASE.in);
  const scan = prog(f, b.trusted + 4, b.checked - b.trusted + 14, EASE.inOut);
  const scanX = mix(-200, 2120, scan);
  return (
    <AbsoluteFill style={{ opacity: shown }}>
      {/* the three big words, slammed in */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - wordsOut }}>
        {WORDS.map((w, i) => {
          const at = b[w.key];
          const s = spr(f, fps, at - 3, { damping: 15, stiffness: 220 });
          const next = i < WORDS.length - 1 ? b[WORDS[i + 1].key] : b.hundreds;
          const away = prog(f, next - 4, 10, EASE.in);
          if (f < at - 4) return null;
          return (
            <div
              key={w.t}
              style={{
                position: "absolute",
                fontFamily: FONT.display,
                fontWeight: 700,
                fontSize: 170,
                letterSpacing: "-0.03em",
                color: C.ink,
                textShadow: `0 0 50px ${hexA(w.col, 0.7)}`,
                transform: `scale(${mix(1.6, 1, s) * mix(1, 0.6, away)}) translateY(${away * -260 + i * 0}px)`,
                opacity: clamp(s * 1.5) * (1 - away * 0.85),
                filter: `blur(${(1 - clamp(s * 1.2)) * 14 + away * 4}px)`,
              }}
            >
              {w.t}
              <div style={{ height: 4, marginTop: -6, background: `linear-gradient(90deg, transparent, ${w.col}, transparent)`, boxShadow: `0 0 20px ${w.col}` }} />
            </div>
          );
        })}
      </AbsoluteFill>
      {/* hundreds of programs, each starting the next */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {PROCS.map((p) => {
          const at = b.hundreds + p.ring * 7 + rnd(`pt${p.i}`) * 5;
          const a = prog(f, at, 9);
          if (a <= 0) return null;
          const ck = f > b.trusted && scanX > p.x;
          const col = ck ? C.green : [C.orange, C.amber, C.cyan, C.violet, C.pink, C.blue][p.ring];
          const w = [46, 40, 30, 20, 13, 9][p.ring];
          const h = [20, 18, 14, 10, 8, 6][p.ring];
          return (
            <g key={p.i} opacity={a * (p.ring === 5 ? 0.75 : 1)}>
              <line x1={p.px} y1={p.py} x2={mix(p.px, p.x, a)} y2={mix(p.py, p.y, a)} stroke={hexA(col, 0.35)} strokeWidth={p.ring < 3 ? 2 : 1.2} />
              <rect x={p.x - w / 2} y={p.y - h / 2} width={w} height={h} rx={h / 2} fill={hexA(col, ck ? 0.5 : 0.25)} stroke={col} strokeWidth={p.ring < 3 ? 1.6 : 1} />
            </g>
          );
        })}
        <circle cx={960} cy={560} r={20} fill={C.orange} opacity={prog(f, b.hundreds - 4, 8)} />
      </svg>
      {/* the trust scan */}
      {scan > 0 && scan < 1 && (
        <div style={{ position: "absolute", top: 0, bottom: 0, left: scanX - 90, width: 180, background: `linear-gradient(90deg, transparent, ${hexA(C.green, 0.28)}, ${hexA("#ffffff", 0.35)}, ${hexA(C.green, 0.28)}, transparent)`, mixBlendMode: "screen" }} />
      )}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, textAlign: "center", opacity: inOut(f, b.trusted, 14, b.because, 14) }}>
        <span style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 24, letterSpacing: "0.5em", color: hexA(C.green, 0.95) }}>NOTHING RUNS UNCHECKED</span>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 4: the first instruction
const ChainAct: React.FC<{ b: B }> = ({ b }) => {
  const f = useCurrentFrame();
  const shown = inOut(f, b.because - 8, 18, b.today + 6, 16);
  const zoom = keyframes(f, [[b.because, 1.0], [b.first, 1.55], [b.controls2 - 4, 1.55], [b.after + 10, 0.92]], EASE.inOut);
  const panX = keyframes(f, [[b.because, 0], [b.first, 900], [b.controls2 - 4, 900], [b.after + 10, 0]], EASE.inOut);
  const take = (i: number) => prog(f, b.controls2 + 4 + i * 5, 10);
  const labels = ["1st instruction", "firmware", "loader", "loader", "kernel", "system", "services", "login", "apps", "you"];
  const items: LinkItem[] = labels.map((l, i) => ({ label: i === 0 ? "#1" : String(i + 1), sub: l, at: b.because + 4 + i * 3, col: C.gold }));
  const red = labels.map((_, i) => (i === 0 ? prog(f, b.first + 6, 10) : take(i)));
  return (
    <AbsoluteFill style={{ opacity: shown }}>
      <AbsoluteFill style={{ transform: `translateX(${panX}px) scale(${zoom})`, transformOrigin: "50% 50%" }}>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <ChainRow items={items} x0={180} x1={1740} y={540} size={0.95} />
          {/* hostile takeover overlay */}
          {labels.map((_, i) => {
            const x = 180 + (i * (1740 - 180)) / (labels.length - 1);
            const a = red[i];
            if (a <= 0.01) return null;
            return (
              <g key={i} opacity={a}>
                <rect x={x - 71} y={540 - 40} width={142} height={80} rx={40} fill={hexA(C.red, 0.28)} stroke={C.red} strokeWidth={6} />
                <circle cx={x} cy={540} r={60 * (1 - a) + 4} fill="none" stroke={C.red} strokeWidth={3} opacity={1 - a} />
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 210, textAlign: "center", opacity: inOut(f, b.first - 4, 14, b.controls2 - 6, 10) }}>
        <span style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 24, letterSpacing: "0.5em", color: hexA(C.gold, 0.95) }}>WHOEVER CONTROLS THE FIRST LINK…</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 210, textAlign: "center", opacity: inOut(f, b.controls2 + 2, 14, b.today, 10) }}>
        <span style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 24, letterSpacing: "0.5em", color: hexA(C.rose, 0.95) }}>…CONTROLS EVERY LINK AFTER IT</span>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 5: the button
const PowerAct: React.FC<{ b: B }> = ({ b }) => {
  const f = useCurrentFrame();
  const shown = prog(f, b.today - 6, 18);
  const draw = prog(f, b.today, 40, EASE.inOut);
  const pulse = prog(f, b.button, 10) * (1 - prog(f, b.button + 10, 30));
  const zoomOut = prog(f, b.end - 16, 16, EASE.in);
  const L = 520;
  return (
    <AbsoluteFill style={{ opacity: shown }}>
      <Glow x={960} y={540} size={1100} color={C.orange} a={0.15 + 0.35 * pulse} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(960 540) scale(${1 + pulse * 0.08 + zoomOut * 2.5}) translate(-960 -540)`}>
          <g strokeDasharray={`${L} ${L}`} strokeDashoffset={L * (1 - draw)}>
            <PowerSymbol x={960} y={560} r={130} col={C.amber} glow={0.6 + pulse} width={18} />
          </g>
        </g>
      </svg>
      <AbsoluteFill style={{ background: "#fff1df", opacity: zoomOut * 0.8, mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const keyOut = prog(f, b.cold - 16, 16, EASE.in);
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={0}>
      {keyOut < 1 && (
        <AbsoluteFill style={{ opacity: 1 - keyOut, filter: keyOut > 0.05 ? `blur(${keyOut * 14}px)` : undefined }}>
          <KeyAct b={b} />
        </AbsoluteFill>
      )}
      {f >= b.cold - 16 && f < b.firmware + 12 && <ChipAct b={b} />}
      {f >= b.firmware - 8 && f < b.because + 26 && <MontageAct b={b} />}
      {f >= b.because - 10 && f < b.today + 24 && <ChainAct b={b} />}
      {f >= b.today - 8 && <PowerAct b={b} />}
      {/* checks raining in on "checked" */}
      {f >= b.checked - 4 && f < b.because + 10 && (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: inOut(f, b.checked - 4, 8, b.because - 4, 12) }}>
          {new Array(12).fill(0).map((_, i) => {
            const p = prog(f, b.checked - 4 + i * 2, 10, EASE.outBack);
            return <Check key={i} x={rnd(`cx${i}`, 200, 1720)} y={rnd(`cy${i}`, 180, 900)} r={18 + 14 * p} a={p} />;
          })}
        </svg>
      )}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const ev: SfxEvent[] = [
    { at: 0, name: "hum", vol: 0.25 },
    { at: b.inside - 6, name: "sweep_up", vol: 0.18 },
    { at: b.awake, name: "pulse", vol: 0.22 },
    { at: b.waiting, name: "pulse", vol: 0.18 },
    { at: b.comes - 2, name: "key_click", vol: 0.9 },
    { at: b.comes, name: "power_up", vol: 0.7 },
    { at: b.comes + 1, name: "boom_soft", vol: 0.6 },
    { at: b.comes + 4, name: "electrons", vol: 0.4 },
    { at: b.turns, name: "riser", vol: 0.35 },
    { at: b.working, name: "shimmer", vol: 0.3 },
    { at: b.firmware - 2, name: "impact", vol: 0.5 },
    { at: b.loaders - 2, name: "impact", vol: 0.45 },
    { at: b.kernel - 2, name: "impact", vol: 0.5 },
    { at: b.hundreds, name: "data_long", vol: 0.35 },
    { at: b.trusted + 4, name: "scan", vol: 0.35 },
    { at: b.checked, name: "chime", vol: 0.25 },
    { at: b.because, name: "whoosh_soft", vol: 0.3 },
    { at: b.first + 6, name: "thud", vol: 0.5 },
    { at: b.controls2 + 4, name: "glitch", vol: 0.4 },
    { at: b.controls2 + 8, name: "alarm", vol: 0.12 },
    { at: b.today, name: "swell", vol: 0.35 },
    { at: b.button, name: "pulse", vol: 0.35 },
    { at: b.end - 14, name: "whoosh_rev", vol: 0.45 },
  ];
  return ev;
};

export const ColdOpen: SceneModule = {
  Visual,
  sfx,
  hud: false,
  backdrop: { hueA: C.orange, hueB: C.indigo, hueC: C.gold, intensity: 0.45, dots: false },
};
