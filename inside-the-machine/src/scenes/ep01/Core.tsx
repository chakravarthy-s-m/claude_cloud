import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { cam } from "../../lib/proj3d";
import { Chip3D } from "../../components/chip";
import { Glass, Glow, Kicker, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    inside: c.p1.from,
    line: wordAt(c.p2, "assembly line"),
    fetch: wordAt(c.p2, "Fetch"),
    decode: wordAt(c.p2, "Decode them"),
    eight: wordAt(c.p2, "eight or more"),
    ooo: wordAt(c.p3, "out of order"),
    flight: wordAt(c.p3, "Hundreds of instructions"),
    ready: wordAt(c.p3, "the instant its inputs"),
    order: c.p4.from,
    never: wordAt(c.p4, "never knows"),
    alu: wordAt(c.p5, "arithmetic logic unit"),
    tick: wordAt(c.p5, "single tick"),
  };
};
type B = ReturnType<typeof beats>;

const STAGES = [
  { t: "FETCH", c: C.blue, sub: "from L1 cache" },
  { t: "DECODE", c: C.cyan, sub: "8+ per cycle" },
  { t: "RENAME", c: C.teal, sub: "untangle registers" },
  { t: "SCHEDULE", c: C.violet, sub: "wait until ready" },
  { t: "EXECUTE", c: C.pink, sub: "ALUs · load/store · FP" },
  { t: "RETIRE", c: C.green, sub: "commit in order" },
];

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const zoomA = inOut(f, 0, 10, b.line - 4, 16);
  const pipeA = inOut(f, b.line - 10, 16, b.alu - 8, 14);
  const aluA = prog(f, b.alu - 10, 16);
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={14}>
      {zoomA > 0.01 && <ZoomIn a={zoomA} b={b} />}
      {pipeA > 0.01 && <Pipeline a={pipeA} b={b} />}
      {aluA > 0.01 && <Alu a={aluA} b={b} />}
    </SceneShell>
  );
};

const ZoomIn: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const z = prog(f, 0, b.line, EASE.inOut);
  const c = cam({
    yaw: keyframes(f, [[0, -30], [b.line, -12]]),
    pitch: keyframes(f, [[0, 50], [b.line, 72]]),
    dist: 5200,
    scale: mix(0.7, 4.2, z * z),
    target: [mix(170, -327, z), mix(0, 358, z), 0],
    cy: 560,
  });
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Chip3D cam={c} st={{ lit: { p1: 1, pcore: 0.35 }, rise: { p1: 0.35 }, power: 1, frame: f, sparkle: 0.4 }} />
      </svg>
      <div style={{ position: "absolute", left: 110, top: 150, opacity: inOut(f, 6, 16, b.line - 20, 10) }}>
        <Kicker color={C.pink}>Performance core</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 60, color: C.ink, marginTop: 10, letterSpacing: "-0.03em" }}>Step inside</div>
      </div>
    </AbsoluteFill>
  );
};

// instruction chips: program order index, color, stage timing (deterministic)
const N = 150;

const Pipeline: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const X0 = 150;
  const SW = 270;
  const top = 300;
  const oooA = prog(f, b.ooo - 8, 16);
  const robA = prog(f, b.order - 8, 16);
  const t = f - b.line;
  const chips: React.ReactNode[] = [];
  for (let i = 0; i < N; i++) {
    // each instruction: enters fetch at time i*4, progresses through stages;
    // the schedule stage waits a random, dependency-like delay (out of order!)
    const enter = i * 5;
    const wait = rnd(`w${i}`, 6, 60) * (oooA > 0 ? 1 : 0.3);
    const tt = t - enter;
    if (tt < 0) continue;
    const stageDur = 16;
    let stage = 0;
    let local = 0;
    let rem = tt;
    const durs = [stageDur, stageDur, stageDur, stageDur + wait, stageDur, stageDur];
    for (stage = 0; stage < 6; stage++) {
      if (rem < durs[stage]) {
        local = rem / durs[stage];
        break;
      }
      rem -= durs[stage];
    }
    if (stage >= 6) continue;
    const lane = i % 8;
    const x = X0 + stage * SW + 30 + mix(0, SW - 120, stage === 3 ? 0.3 + 0.2 * rnd(`sx${i}`) : local);
    const y = top + 40 + lane * 62;
    const col = STAGES[stage].c;
    const fired = stage >= 4;
    chips.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: 82,
          height: 46,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT.mono,
          fontWeight: 700,
          fontSize: 22,
          color: "#05070d",
          background: col,
          boxShadow: `0 0 ${fired ? 24 : 10}px ${hexA(col, 0.6)}`,
          opacity: stage === 3 && oooA > 0 ? 0.65 + 0.35 * Math.sin(f * 0.3 + i) : 1,
        }}
      >
        #{i + 1}
      </div>,
    );
  }
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 110, top: 110 }}>
        <Kicker color={C.pink}>Inside a performance core</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 52, color: C.ink, marginTop: 8, letterSpacing: "-0.03em" }}>
          {oooA > 0.5 ? (robA > 0.5 ? "…then put back in order." : "Out of order — whatever's ready, fires.") : "A hyper-efficient assembly line"}
        </div>
      </div>
      {STAGES.map((st, i) => {
        const lit = i === 0 ? prog(f, b.fetch - 6, 12) : i === 1 ? prog(f, b.decode - 6, 12) : i === 3 || i === 4 ? Math.max(prog(f, b.decode + 20, 12), oooA) : i === 5 ? Math.max(prog(f, b.decode + 30, 12), robA) : prog(f, b.decode + 10, 12);
        return (
          <div key={st.t} style={{ position: "absolute", left: X0 + i * SW, top: top - 70, width: SW - 16 }}>
            <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 22, letterSpacing: "0.2em", color: hexA(st.c, 0.4 + lit * 0.6) }}>{st.t}</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 16, color: C.ink3, marginTop: 4 }}>{st.sub}</div>
            <div style={{ position: "absolute", top: 70, left: 0, width: SW - 16, height: 8 * 62 + 30, borderRadius: 18, background: hexA(st.c, 0.04 + lit * 0.05), border: `1px solid ${hexA(st.c, 0.15 + lit * 0.35)}` }} />
          </div>
        );
      })}
      {chips}
      {/* "8 wide" brace */}
      <div style={{ position: "absolute", left: X0 + SW + 10, top: top + 8 * 62 + 60, opacity: prog(f, b.eight - 6, 14), fontFamily: FONT.mono, fontSize: 22, color: C.cyan }}>↑ 8 lanes wide</div>
      {oooA > 0.01 && (
        <div style={{ position: "absolute", left: X0 + 3 * SW, top: top + 8 * 62 + 60, opacity: prog(f, b.flight - 6, 14), fontFamily: FONT.mono, fontSize: 22, color: C.violet, width: 560 }}>
          hundreds of instructions in flight
        </div>
      )}
      {robA > 0.01 && (
        <div style={{ position: "absolute", left: X0 + 5 * SW - 20, top: top + 8 * 62 + 60, opacity: robA, fontFamily: FONT.mono, fontSize: 22, color: C.green }}>
          #1 #2 #3 #4 … ✓
        </div>
      )}
    </AbsoluteFill>
  );
};

const Alu: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.alu - 6, { damping: 18, stiffness: 100 });
  const go = prog(f, b.tick - 8, 16, EASE.inOut);
  const res = prog(f, b.tick + 6, 12);
  const clockX = (t: number) => 380 + t * 1160;
  let wave = "";
  for (let i = 0; i <= 8; i++) {
    const x0 = clockX(i / 8);
    const x1 = clockX((i + 0.5) / 8);
    wave += `${i === 0 ? "M" : "L"}${x0},880 L${x0},820 L${x1},820 L${x1},880 `;
  }
  const edgeX = clockX(4 / 8);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 110, top: 120 }}>
        <Kicker color={C.amber}>Arithmetic logic unit</Kicker>
      </div>
      {/* ALU trapezoid */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: clamp(inP * 1.3) }}>
        <defs>
          <linearGradient id="aluG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hexA(C.amber, 0.35)} />
            <stop offset="100%" stopColor={hexA(C.pink, 0.2)} />
          </linearGradient>
        </defs>
        <path d="M720,300 L1200,300 L1110,560 L810,560 Z M920,300 L960,350 L1000,300" fill="url(#aluG)" stroke={C.amber} strokeWidth={3} />
        <text x={960} y={470} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={64} fill={C.ink}>
          ALU
        </text>
        <text x={960} y={520} textAnchor="middle" fontFamily={FONT.mono} fontSize={22} fill={C.amber}>
          op = ADD
        </text>
        {/* inputs */}
        <line x1={820} y1={200} x2={820} y2={300} stroke={C.cyan} strokeWidth={3} />
        <line x1={1100} y1={200} x2={1100} y2={300} stroke={C.cyan} strokeWidth={3} />
        <line x1={960} y1={560} x2={960} y2={680} stroke={C.green} strokeWidth={3} />
        {go > 0 && go < 1 && (
          <>
            <Spark x={820} y={mix(200, 300, go)} color={C.cyan} r={10} />
            <Spark x={1100} y={mix(200, 300, go)} color={C.cyan} r={10} />
          </>
        )}
        {res > 0 && res < 1 && <Spark x={960} y={mix(560, 680, res)} color={C.green} r={12} />}
        {/* clock */}
        <path d={wave} fill="none" stroke={hexA(C.ink, 0.5)} strokeWidth={2.5} />
        <line x1={edgeX} y1={800} x2={edgeX} y2={900} stroke={C.amber} strokeWidth={2} strokeDasharray="4 6" opacity={prog(f, b.tick - 6, 10)} />
        <text x={edgeX + 14} y={930} fontFamily={FONT.mono} fontSize={22} fill={C.amber} opacity={prog(f, b.tick - 6, 10)}>
          one tick ≈ ¼ nanosecond
        </text>
        <text x={380} y={790} fontFamily={FONT.mono} fontSize={18} fill={C.ink3}>
          clock
        </text>
      </svg>
      <div style={{ position: "absolute", left: 620, top: 130, width: 400, textAlign: "center", opacity: clamp(inP * 1.3) }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 20, color: C.ink3 }}>x0</div>
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 44, color: C.ink }}>41</div>
      </div>
      <div style={{ position: "absolute", left: 900, top: 130, width: 400, textAlign: "center", opacity: clamp(inP * 1.3) }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 20, color: C.ink3 }}>#imm</div>
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 44, color: C.ink }}>1</div>
      </div>
      <div style={{ position: "absolute", left: 760, top: 690, width: 400, textAlign: "center", opacity: res, transform: `scale(${mix(1.4, 1, res)})` }}>
        <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 60, color: C.green, textShadow: `0 0 30px ${hexA(C.green, 0.6)}` }}>42</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 24, color: C.ink3, marginLeft: 14 }}>→ x0</span>
      </div>
      {res > 0.5 && <Glow x={960} y={430} size={700} color={C.amber} a={0.18 * (1 - prog(f, b.tick + 20, 30))} />}
      <div style={{ position: "absolute", right: 140, top: 330, width: 420, opacity: prog(f, b.alu + 10, 16) }}>
        <Glass color={C.amber} style={{ padding: "22px 26px" }} glow={0.5}>
          <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.ink2, lineHeight: 1.6 }}>
            0…0101001 <span style={{ color: C.ink3 }}>(41)</span>
            <br />+ 0…0000001 <span style={{ color: C.ink3 }}>(1)</span>
            <br />
            <span style={{ color: C.green }}>= 0…0101010</span> <span style={{ color: C.ink3 }}>(42)</span>
          </div>
          <div style={{ fontFamily: FONT.ui, fontSize: 20, color: C.ink3, marginTop: 8 }}>two 64-bit numbers, one tick</div>
        </Glass>
      </div>
    </AbsoluteFill>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const ev: SfxEvent[] = [
    { at: 0, name: "whoosh_big", vol: 0.35 },
    { at: b.line - 10, name: "whoosh_soft", vol: 0.35 },
    { at: b.fetch - 4, name: "blip", vol: 0.3 },
    { at: b.decode - 4, name: "blip_hi", vol: 0.3 },
    { at: b.ooo - 8, name: "glitch", vol: 0.2 },
    { at: b.ooo, name: "data_long", vol: 0.25 },
    { at: b.order - 6, name: "sweep_down", vol: 0.2 },
    { at: b.never - 4, name: "chime_lo", vol: 0.2 },
    { at: b.alu - 10, name: "whoosh", vol: 0.35 },
    { at: b.tick - 8, name: "clock_tick", vol: 0.5 },
    { at: b.tick + 6, name: "pop_hi", vol: 0.35 },
  ];
  for (let i = 0; i < 16; i++) ev.push({ at: b.line + 4 + i * 10, name: "tick", vol: 0.12 });
  return ev;
};

export const Core: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.pink, hueB: C.amber, hueC: C.violet, intensity: 0.7 },
};
