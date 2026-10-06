import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { cam } from "../../lib/proj3d";
import { Chip3D, ChipLabel, kindAnchor, type ChipState } from "../../components/chip";
import { Glow, Kicker } from "../../components/core";
import { glowSprite, useCanvas } from "../../components/fx";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { Code, CodeWindow, type Tok, pixelAt } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    chip: c.c1.from,
    gpuWord: wordAt(c.c1, "the GPU sits"),
    cpuWord: wordAt(c.c1, "as the CPU"),
    core: c.c2.from,
    alus: wordAt(c.c2, "a hundred and twenty-eight"),
    squads: wordAt(c.c2, "squads of thirty-two"),
    simd: wordAt(c.c2, "SIMD groups"),
    oneInstr: wordAt(c.c2, "one instruction"),
    pixels32: wordAt(c.c2, "thirty-two pixels at once"),
    threads: c.c3.from,
    twentyFive: wordAt(c.c3, "twenty-five thousand"),
    metal: c.c4.from,
    metalWord: wordAt(c.c4, "through Metal"),
    pack: wordAt(c.c4, "They pack commands"),
    draw: wordAt(c.c4, "draw these triangles"),
    buffer: wordAt(c.c4, "command buffer"),
    hand: wordAt(c.c4, "hand it over"),
    what: c.c5.from,
    triangle: wordAt(c.c5, "a triangle"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

// ------------------------------------------------------------------ the SoC
const ChipPart: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const push = prog(f, b.core - 4, 34, EASE.in);
  const cc = cam({
    yaw: keyframes(f, [[0, -24], [b.cpuWord, -32], [b.core, -18]]),
    pitch: keyframes(f, [[0, 50], [b.core, 70]]),
    dist: 5200,
    scale: keyframes(f, [[0, 0.5], [b.gpuWord, 0.6], [b.core - 4, 0.64]]) * mix(1, 3.4, push * push),
    target: [mix(60, 110, push), mix(0, 360, push), 0],
    cx: mix(1080, 960, push),
    cy: 580,
  });
  const on = (at: number) => spr(f, fps, at, { damping: 18, stiffness: 120 });
  const st: ChipState = {
    rise: { gpu: on(b.gpuWord - 4) * 0.9, pcore: on(b.cpuWord - 4) * 0.7, ecore: on(b.cpuWord) * 0.55 },
    lit: { gpu: prog(f, b.gpuWord - 6, 14), pcore: prog(f, b.cpuWord - 6, 14) * (1 - push), ecore: prog(f, b.cpuWord - 2, 14) * (1 - push), fabric: 0.2, slc: 0.3 },
    memRise: 0.4,
    memLit: 0.3,
    power: 1,
    sparkle: 0.4,
    frame: f,
  };
  const G = kindAnchor(cc, "gpu", st);
  const P = kindAnchor(cc, "pcore", st);
  const lab = (at: number) => inOut(f, at - 4, 12, b.core + 2, 10);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Glow x={960} y={560} size={1800} color={C.violet} a={0.14} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Chip3D cam={cc} st={st} />
      </svg>
      <ChipLabel {...G} text="GPU" sub="10 cores" color={C.violet} a={lab(b.gpuWord)} dx={140} dy={-170} />
      <ChipLabel {...P} text="CPU" sub="performance + efficiency cores" color={C.pink} a={lab(b.cpuWord)} dx={-200} dy={-150} />
      <div style={{ position: "absolute", left: 110, top: 840, opacity: inOut(f, 10, 16, b.core - 4, 12) }}>
        <Kicker color={C.violet}>Apple silicon</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 60, color: C.ink, marginTop: 12, letterSpacing: "-0.03em" }}>One chip, many minds</div>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ inside one GPU core
const LANES = 32;
const GROUPS = 4;
const CoreDiagram: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.core + 14, { damping: 22, stiffness: 80 });
  const cell = 30;
  const gap = 7;
  const rowGap = 46;
  const W = LANES * cell + (LANES - 1) * gap;
  const x0 = 960 - W / 2 + 100;
  const y0 = 330;
  const rowY = (g: number) => y0 + g * (cell + rowGap);
  const count = Math.round(mix(0, 128, prog(f, b.alus - 4, 26, EASE.out)));
  const squadA = prog(f, b.squads - 4, 16);
  const instrA = prog(f, b.oneInstr - 6, 14);
  const fire = prog(f, b.oneInstr + 6, 12);
  const results = prog(f, b.pixels32 - 4, 14);
  // the row our instruction runs on: pixels along one row of the picture
  const rowColors = new Array(LANES).fill(0).map((_, i) => pixelAt(860 + i * 22, 470));
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.3) }}>
      <div style={{ position: "absolute", left: 110, top: 120 }}>
        <Kicker color={C.violet} at={b.core - 2}>
          Inside one GPU core
        </Kicker>
      </div>
      {/* core outline */}
      <div style={{ position: "absolute", left: x0 - 40, top: y0 - 60, width: W + 80, height: GROUPS * (cell + rowGap) + 50, borderRadius: 24, border: `1px solid ${hexA(C.violet, 0.4)}`, background: "linear-gradient(160deg, rgba(30,24,60,0.55), rgba(10,10,24,0.7))", transform: `scale(${mix(0.94, 1, inP)})` }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {new Array(GROUPS).fill(0).map((_, g) =>
          new Array(LANES).fill(0).map((__, i) => {
            const k = g * LANES + i;
            const appear = prog(f, b.alus - 6 + k * 0.22, 8);
            const active = g === 1;
            const lit = active ? fire * (0.6 + 0.4 * Math.sin(f * 0.5 + i * 0.4)) : squadA * 0.25;
            const x = x0 + i * (cell + gap);
            const y = rowY(g);
            const [r, gg, bb] = rowColors[i];
            return (
              <g key={k} opacity={appear}>
                <rect x={x} y={y} width={cell} height={cell} rx={7} fill={active && results > 0.01 ? `rgb(${r},${gg},${bb})` : hexA(C.violet, 0.18 + 0.6 * lit)} stroke={hexA(C.violet, 0.5 + 0.5 * lit)} strokeWidth={1.4} />
                {active && results > 0.01 && <rect x={x} y={y} width={cell} height={cell} rx={7} fill="none" stroke="#fff" strokeOpacity={0.6 * results} strokeWidth={1.5} />}
              </g>
            );
          }),
        )}
        {/* SIMD group brackets */}
        {new Array(GROUPS).fill(0).map((_, g) => (
          <g key={g} opacity={squadA}>
            <rect x={x0 - 12} y={rowY(g) - 10} width={W + 24} height={cell + 20} rx={12} fill="none" stroke={g === 1 ? C.cyan : hexA(C.violet, 0.55)} strokeWidth={g === 1 ? 2.5 : 1.5} strokeDasharray={g === 1 ? undefined : "6 6"} />
          </g>
        ))}
        {/* broadcast from the instruction to all 32 lanes */}
        {instrA > 0.01 &&
          new Array(LANES).fill(0).map((_, i) => {
            const x = x0 + i * (cell + gap) + cell / 2;
            const yTop = rowY(1) - 10;
            const p = prog(f, b.oneInstr - 2, 14, EASE.inOut);
            return <line key={i} x1={x0 - 70} y1={rowY(1) + cell / 2} x2={mix(x0 - 70, x, p)} y2={mix(rowY(1) + cell / 2, yTop, p)} stroke={C.cyan} strokeOpacity={0.35 * instrA * (1 - fire * 0.7)} strokeWidth={1.5} />;
          })}
      </svg>
      {/* SIMD labels */}
      {new Array(GROUPS).fill(0).map((_, g) => (
        <div key={g} style={{ position: "absolute", left: x0 + W + 30, top: rowY(g) + 4, fontFamily: FONT.mono, fontSize: 20, color: g === 1 ? C.cyan : C.ink3, opacity: squadA, whiteSpace: "nowrap" }}>
          SIMD group {g}
        </div>
      ))}
      {/* the instruction */}
      {instrA > 0.01 && (
        <div style={{ position: "absolute", left: x0 - 310, top: rowY(1) - 22, width: 240, opacity: instrA, transform: `translateX(${(1 - instrA) * -20}px)` }}>
          <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(5,8,18,0.92)", border: `2px solid ${C.cyan}`, boxShadow: `0 0 24px ${hexA(C.cyan, 0.4)}`, fontFamily: FONT.mono, fontSize: 19, color: C.ink, lineHeight: 1.35, whiteSpace: "nowrap" }}>
            <div style={{ color: C.cyan, fontSize: 14, letterSpacing: "0.2em" }}>1 INSTRUCTION</div>
            color = albedo × light
          </div>
        </div>
      )}
      {/* counters */}
      <div style={{ position: "absolute", left: x0 - 40, top: y0 + GROUPS * (cell + rowGap) + 30, display: "flex", gap: 70, alignItems: "baseline" }}>
        <div style={{ opacity: prog(f, b.alus - 4, 14) }}>
          <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 72, color: C.ink, fontVariantNumeric: "tabular-nums", textShadow: `0 0 30px ${hexA(C.violet, 0.6)}` }}>{count}</span>
          <span style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 22, letterSpacing: "0.3em", color: C.violet, marginLeft: 14 }}>ARITHMETIC UNITS</span>
        </div>
        <div style={{ opacity: squadA }}>
          <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 72, color: C.ink }}>4 × 32</span>
          <span style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 22, letterSpacing: "0.3em", color: C.cyan, marginLeft: 14 }}>LANES</span>
        </div>
      </div>
      {results > 0.01 && (
        <div style={{ position: "absolute", left: x0, top: rowY(1) + cell + 14, fontFamily: FONT.mono, fontSize: 20, color: C.cyan, opacity: results }}>↑ 32 different pixels, computed in the same instant</div>
      )}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ 25,000 threads in flight
const Threads: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.threads - 6, { damping: 22, stiffness: 80 });
  const fill = prog(f, b.threads, b.twentyFive - b.threads + 30, EASE.out);
  const ref = useCanvas(
    (ctx, fr) => {
      const spr2 = glowSprite(C.violet, 32);
      const tw = 300;
      const th = 210;
      const gx = 40;
      const gy = 40;
      const X0 = 960 - (4 * tw + 3 * gx) / 2;
      const Y0 = 300;
      ctx.globalCompositeOperation = "lighter";
      for (let core = 0; core < 8; core++) {
        const cx = X0 + (core % 4) * (tw + gx);
        const cy = Y0 + Math.floor(core / 4) * (th + gy);
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(30,24,60,0.6)";
        ctx.strokeStyle = hexA(C.violet, 0.45);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(cx, cy, tw, th, 16);
        ctx.fill();
        ctx.stroke();
        ctx.globalCompositeOperation = "lighter";
        // 3,072 threads per core, drawn as 768 dots of 4 (density cue)
        const n = Math.floor(768 * fill);
        for (let i = 0; i < n; i++) {
          const sx = rnd(`tx${core}-${i}`);
          const sy = rnd(`ty${core}-${i}`);
          const sp = rnd(`tv${core}-${i}`, 0.004, 0.012);
          const x = cx + 10 + ((sx + fr * sp) % 1) * (tw - 20);
          const y = cy + 12 + sy * (th - 24) + Math.sin(fr * 0.08 + i) * 2;
          const hot = rnd(`th${core}-${i}-${Math.floor(fr / 4)}`) > 0.92;
          ctx.globalAlpha = hot ? 0.95 : 0.45;
          ctx.drawImage(spr2, x - 4, y - 4, hot ? 10 : 8, hot ? 10 : 8);
        }
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = "source-over";
    },
    [fill],
  );
  const count = Math.round(mix(0, 24576, fill));
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.3) }}>
      <canvas ref={ref} width={1920} height={1080} style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", left: 110, top: 120 }}>
        <Kicker color={C.violet} at={b.threads - 2}>
          An 8-core GPU
        </Kicker>
      </div>
      <div style={{ position: "absolute", top: 820, width: "100%", textAlign: "center" }}>
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 104, color: C.ink, fontVariantNumeric: "tabular-nums", textShadow: `0 0 50px ${hexA(C.violet, 0.7)}` }}>{count.toLocaleString("en-US")}</div>
        <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 24, letterSpacing: "0.42em", color: C.violet }}>THREADS IN FLIGHT</div>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ Metal
const METAL: Tok[][] = [
  [["let", "k"], [" cmd = queue."], ["makeCommandBuffer", "f"], ["()!"]],
  [["let", "k"], [" enc = cmd."], ["makeRenderCommandEncoder", "f"], ["(descriptor: pass)!"]],
  [["enc."], ["setRenderPipelineState", "f"], ["(pipeline)"]],
  [["enc."], ["setVertexBuffer", "f"], ["(teapot, offset: "], ["0", "n"], [", index: "], ["0", "n"], [")"]],
  [["enc."], ["drawPrimitives", "f"], ["(type: ."], ["triangle", "t"], [", vertexStart: "], ["0", "n"], [", vertexCount: "], ["3", "n"], [")"]],
  [["enc."], ["endEncoding", "f"], ["()"]],
  [["cmd."], ["commit", "f"], ["()  "], ["// hand it to the GPU", "c"]],
];

const MetalPart: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.metal - 6, { damping: 22, stiffness: 90 });
  const bufIn = spr(f, fps, b.buffer - 8, { damping: 18, stiffness: 120 });
  const fly = prog(f, b.hand - 4, 30, EASE.inOut);
  const hl = inOut(f, b.draw - 6, 10, b.buffer + 10, 10);
  const items = ["set pipeline", "set vertices", "draw triangles", "end"];
  const bx = mix(1440, 1600, fly);
  const by = mix(760, 330, fly) - Math.sin(fly * Math.PI) * 60;
  const gpuGlow = prog(f, b.hand + 20, 14);
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.3) }}>
      <div style={{ position: "absolute", left: 110, top: 120 }}>
        <Kicker color={C.cyan} at={b.metal - 2}>
          Metal · Apple’s graphics API
        </Kicker>
      </div>
      <div style={{ position: "absolute", left: 110, top: 220, transform: `translateY(${(1 - inP) * 30}px)` }}>
        <CodeWindow title="Renderer.swift" color={C.cyan} width={1110}>
          <Code lines={METAL} at={b.metalWord - 4} cps={3.2} size={24} highlight={{ line: 4, a: hl, color: C.amber }} />
        </CodeWindow>
      </div>
      {/* GPU target */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g transform="translate(1600 330)">
          <rect x={-120} y={-120} width={240} height={240} rx={26} fill="#11162a" stroke={hexA(C.violet, 0.5 + 0.5 * gpuGlow)} strokeWidth={2} />
          {new Array(36).fill(0).map((_, k) => (
            <rect key={k} x={-96 + (k % 6) * 33} y={-96 + Math.floor(k / 6) * 33} width={26} height={26} rx={4} fill={hexA(C.violet, 0.3 + 0.6 * gpuGlow * (0.5 + 0.5 * Math.sin(f * 0.4 + k)))} />
          ))}
          <text x={0} y={160} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={34} fill={C.ink}>
            GPU
          </text>
        </g>
      </svg>
      <Glow x={1600} y={330} size={600} color={C.violet} a={0.35 * gpuGlow} />
      {/* the command buffer */}
      {bufIn > 0.01 && fly < 0.98 && (
        <div style={{ position: "absolute", left: bx, top: by, transform: `translate(-50%, -50%) scale(${mix(0.7, 1, bufIn) * mix(1, 0.45, fly)})`, opacity: clamp(bufIn * 1.4) * (1 - prog(f, b.hand + 18, 8)) }}>
          <div style={{ width: 300, padding: 16, borderRadius: 18, background: "rgba(8,14,28,0.92)", border: `2px solid ${C.cyan}`, boxShadow: `0 0 40px ${hexA(C.cyan, 0.45)}` }}>
            <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 17, letterSpacing: "0.25em", color: C.cyan, marginBottom: 10 }}>COMMAND BUFFER</div>
            {items.map((t, i) => (
              <div key={t} style={{ marginTop: 8, padding: "8px 12px", borderRadius: 10, fontFamily: FONT.mono, fontSize: 20, color: C.ink, background: i === 2 ? hexA(C.amber, 0.18) : "rgba(255,255,255,0.06)", border: `1px solid ${i === 2 ? hexA(C.amber, 0.6) : "rgba(255,255,255,0.1)"}`, opacity: prog(f, b.pack + i * 6, 10) }}>
                {t}
              </div>
            ))}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ one triangle
const Triangle: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spr(f, fps, b.triangle - 10, { damping: 20, stiffness: 70 });
  const rot = (f - b.what) * 0.6;
  const pts = [0, 1, 2].map((i) => {
    const ang = ((i * 120 - 90 + rot) * Math.PI) / 180;
    return [960 + Math.cos(ang) * 260 * p, 540 + Math.sin(ang) * 230 * p];
  });
  const d = `M${pts.map((q) => q.join(",")).join("L")}Z`;
  const cols = [C.pink, C.cyan, C.amber];
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Glow x={960} y={540} size={1100} color={C.cyan} a={0.18 * p} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d={d} fill={hexA(C.cyan, 0.08)} stroke={C.cyan} strokeWidth={10} strokeOpacity={0.25} strokeLinejoin="round" />
        <path d={d} fill="none" stroke="#c9f7ff" strokeWidth={3} strokeLinejoin="round" />
        {pts.map((q, i) => (
          <g key={i}>
            <circle cx={q[0]} cy={q[1]} r={22} fill={cols[i]} opacity={0.25} />
            <circle cx={q[0]} cy={q[1]} r={9} fill={cols[i]} />
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const chipA = 1 - prog(f, b.core + 18, 12);
  const coreA = inOut(f, b.core + 14, 14, b.threads - 10, 12);
  const thrA = inOut(f, b.threads - 10, 14, b.metal - 10, 12);
  const metA = inOut(f, b.metal - 10, 14, b.what - 8, 12);
  const triA = prog(f, b.what - 10, 14);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      {chipA > 0.01 && <ChipPart b={b} a={chipA} />}
      {coreA > 0.01 && <CoreDiagram b={b} a={coreA} />}
      {thrA > 0.01 && <Threads b={b} a={thrA} />}
      {metA > 0.01 && <MetalPart b={b} a={metA} />}
      {triA > 0.01 && <Triangle b={b} a={triA} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const typing: SfxEvent[] = [];
  for (let t = b.metalWord - 4; t < b.metalWord + 120; t += 9) typing.push({ at: t, name: "key_click", vol: 0.12 });
  return [
    { at: 4, name: "swell", vol: 0.3 },
    { at: b.gpuWord - 6, name: "pop", vol: 0.35 },
    { at: b.cpuWord - 6, name: "pop", vol: 0.3 },
    { at: b.core - 4, name: "whoosh_big", vol: 0.45 },
    { at: b.alus - 4, name: "data", vol: 0.3 },
    { at: b.squads - 4, name: "scan", vol: 0.25 },
    { at: b.oneInstr - 2, name: "zap", vol: 0.3 },
    { at: b.pixels32 - 4, name: "shimmer", vol: 0.3 },
    { at: b.threads - 10, name: "whoosh_soft", vol: 0.35 },
    { at: b.threads, name: "electrons", vol: 0.3 },
    { at: b.twentyFive - 4, name: "chime", vol: 0.22 },
    { at: b.metal - 10, name: "whoosh_soft", vol: 0.3 },
    ...typing,
    { at: b.buffer - 8, name: "pop_hi", vol: 0.3 },
    { at: b.hand - 4, name: "whoosh", vol: 0.4 },
    { at: b.hand + 20, name: "power_up", vol: 0.3 },
    { at: b.what - 10, name: "sweep_up", vol: 0.25 },
    { at: b.triangle - 10, name: "boom_soft", vol: 0.35 },
  ];
};

export const GpuCore: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.violet, hueB: C.cyan, hueC: C.blue, intensity: 0.7 },
};
