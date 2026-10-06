import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { cam, planeMatrix, project, type V3 } from "../../lib/proj3d";
import { Glow, Kicker } from "../../components/core";
import { useCanvas } from "../../components/fx";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { wallpaper } from "./shared";
import { teapotCanvas } from "./raster";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    trick: wordAt(c.ti1, "clever trick"),
    split: wordAt(c.ti1, "split the screen"),
    say: wordAt(c.ti1, "thirty-two by thirty-two"),
    oneAt: wordAt(c.ti1, "one at a time"),
    before: c.ti2.from,
    visible: wordAt(c.ti2, "actually visible"),
    skips: wordAt(c.ti2, "skips everything hidden"),
    fast: c.ti3.from,
    memWord: wordAt(c.ti3, "fast memory"),
    writes: wordAt(c.ti3, "writes each finished tile"),
    once: wordAt(c.ti3, "just once"),
    name: c.ti4.from,
    less: wordAt(c.ti4, "Less work"),
    traffic: wordAt(c.ti4, "less memory traffic"),
    power: wordAt(c.ti4, "less power"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

// ------------------------------------------------------------------ the frame, cut into tiles
const BW = 1360;
const BH = 765;
const TX = 60; // 1920 / 32
const TY = 34; // ceil(1080 / 32)
let SCENE_CANVAS: HTMLCanvasElement | null = null;
const sceneCanvas = () => {
  if (SCENE_CANVAS) return SCENE_CANVAS;
  const c = document.createElement("canvas");
  c.width = 960;
  c.height = 540;
  const g = c.getContext("2d")!;
  g.drawImage(wallpaper(960, 540), 0, 0);
  g.fillStyle = "rgba(4,6,16,0.35)";
  g.fillRect(0, 0, 960, 540);
  g.drawImage(teapotCanvas(960, 540, { dist: 7.4 }), 0, 0);
  SCENE_CANVAS = c;
  return c;
};

const TiledFrame: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const gridA = prog(f, b.split - 4, 20);
  const sweep = prog(f, b.say + 24, b.fast - b.say - 50, EASE.linear);
  const done = Math.floor(sweep * TX * TY);
  const shrink = prog(f, b.before - 16, 30, EASE.inOut);
  const ref = useCanvas(
    (ctx) => {
      ctx.clearRect(0, 0, BW, BH);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(sceneCanvas(), 0, 0, BW, BH);
      const tw = BW / TX;
      const th = (BH / 1080) * 32;
      if (sweep > 0) {
        // unprocessed tiles are dimmed; processed ones are revealed
        ctx.fillStyle = "rgba(3,4,10,0.72)";
        for (let k = done; k < TX * TY; k++) {
          const i = k % TX;
          const j = Math.floor(k / TX);
          ctx.fillRect(i * tw, j * th, tw + 0.5, th + 0.5);
        }
        if (done < TX * TY) {
          const i = done % TX;
          const j = Math.floor(done / TX);
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2.5;
          ctx.strokeRect(i * tw, j * th, tw, th);
        }
      }
      if (gridA > 0) {
        ctx.strokeStyle = `rgba(143,243,255,${0.28 * gridA})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= TX; i++) {
          ctx.moveTo(i * tw + 0.5, 0);
          ctx.lineTo(i * tw + 0.5, BH);
        }
        for (let j = 0; j <= TY; j++) {
          ctx.moveTo(0, j * th + 0.5);
          ctx.lineTo(BW, j * th + 0.5);
        }
        ctx.stroke();
      }
    },
    [gridA, done],
  );
  const inP = spr(f, fps, 6, { damping: 24, stiffness: 80 });
  const scale = mix(1, 0.5, shrink);
  const left = mix(960 - BW / 2, 90, shrink);
  const top = mix(165, 330, shrink);
  const sayA = spr(f, fps, b.say - 4, { damping: 18, stiffness: 140 });
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 960 - BW / 2, top: 112, opacity: 1 - shrink }}>
        <Kicker color={C.cyan} at={4}>
          Apple GPUs · tile-based rendering
        </Kicker>
      </div>
      <div style={{ position: "absolute", left, top, width: BW, height: BH, transformOrigin: "0 0", transform: `scale(${scale * mix(0.94, 1, inP)})`, borderRadius: 14, overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.12)", opacity: clamp(inP * 1.4) }}>
        <canvas ref={ref} width={BW} height={BH} style={{ position: "absolute", inset: 0 }} />
      </div>
      {sayA > 0.01 && shrink < 0.99 && (
        <div style={{ position: "absolute", right: 960 - BW / 2, top: 165 + BH + 16, opacity: clamp(sayA * 1.4) * (1 - shrink), display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, border: "2.5px solid #fff", borderRadius: 4, boxShadow: "0 0 18px rgba(255,255,255,0.5)" }} />
          <span style={{ fontFamily: FONT.mono, fontSize: 30, color: C.ink }}>1 tile = 32 × 32 px</span>
        </div>
      )}
      {sweep > 0 && (
        <div style={{ position: "absolute", left: mix(960 - BW / 2, 90, shrink), top: mix(165 + BH + 20, 330 + BH * 0.5 + 14, shrink), opacity: 1 - shrink * 0.2, transform: `scale(${mix(1, 0.8, shrink)})`, transformOrigin: "0 0", fontFamily: FONT.mono, fontSize: 28, color: C.ink2, fontVariantNumeric: "tabular-nums" }}>
          tile <span style={{ color: C.ink, fontWeight: 700 }}>{Math.min(TX * TY, done + 1).toLocaleString("en-US")}</span> of {(TX * TY).toLocaleString("en-US")} · one at a time
        </div>
      )}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ inside one tile: hidden surface removal
const N = 32;
type Tri = { pts: [number, number][]; col: string; name: string };
const LAYERS: Tri[] = [
  { pts: [[-4, 30], [30, 34], [20, -6]], col: "#7c6cf0", name: "far surface" },
  { pts: [[2, 4], [31, 12], [8, 31]], col: "#f5b041", name: "middle surface" },
  { pts: [[14, 9], [30, 26], [6, 22]], col: "#f472b6", name: "near surface" },
];
const inside = (t: Tri, x: number, y: number) => {
  const [a, b, c] = t.pts;
  const s1 = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
  const s2 = (c[0] - b[0]) * (y - b[1]) - (c[1] - b[1]) * (x - b[0]);
  const s3 = (a[0] - c[0]) * (y - c[1]) - (a[1] - c[1]) * (x - c[0]);
  return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
};
const COVER: boolean[][] = LAYERS.map((t) => {
  const out: boolean[] = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) out.push(inside(t, i + 0.5, j + 0.5));
  return out;
});
// visible = covered and no nearer layer covers the same pixel
const VISIBLE: boolean[][] = COVER.map((cv, k) => cv.map((on, p) => on && !COVER.slice(k + 1).some((n) => n[p])));
const FRAGMENTS = COVER.reduce((s, cv) => s + cv.filter(Boolean).length, 0);
const SHADED = VISIBLE.reduce((s, cv) => s + cv.filter(Boolean).length, 0);

const cellsPath = (mask: boolean[], pad = 0.08) => {
  let d = "";
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue;
    const i = p % N;
    const j = Math.floor(p / N);
    d += `M${i + pad},${j + pad}h${1 - 2 * pad}v${1 - 2 * pad}h${-(1 - 2 * pad)}Z`;
  }
  return d;
};
const PATHS = COVER.map((cv, k) => ({ all: cellsPath(cv), vis: cellsPath(VISIBLE[k]), hidden: cellsPath(cv.map((on, p) => on && !VISIBLE[k][p])) }));

const TileStack: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.before - 12, { damping: 22, stiffness: 80 });
  const explode = prog(f, b.before - 8, 30, EASE.inOut) * (1 - prog(f, b.skips + 34, 30, EASE.inOut));
  const hsr = prog(f, b.visible - 6, 26, EASE.inOut);
  const c = cam({ yaw: mix(-28, -18, explode), pitch: mix(62, 40, explode), dist: 3000, scale: 15, cx: 1260, cy: 560, target: [0, 0, 6 * explode] });
  const S = 1;
  const layerZ = (k: number) => k * 11 * explode;
  const frag = Math.round(mix(FRAGMENTS, SHADED, hsr));
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.4) }}>
      <div style={{ position: "absolute", left: 90, top: 110 }}>
        <Kicker color={C.amber} at={b.before - 6}>
          One tile · hidden surface removal
        </Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {LAYERS.map((L, k) => {
          const z = layerZ(k);
          const m = planeMatrix(c, [-N / 2, N / 2, z], [S, 0, 0], [0, -S, 0]);
          const corners: V3[] = [
            [-N / 2, N / 2, z],
            [N / 2, N / 2, z],
            [N / 2, -N / 2, z],
            [-N / 2, -N / 2, z],
          ];
          const pc = corners.map((p) => project(c, p));
          return (
            <g key={k}>
              <path d={`M${pc.map((p) => `${p.x},${p.y}`).join("L")}Z`} fill={hexA("#0b0f22", 0.5 * explode + 0.05)} stroke={hexA(L.col, 0.55)} strokeWidth={1.5} />
              <g transform={m}>
                <path d={PATHS[k].vis} fill={L.col} />
                <path d={PATHS[k].hidden} fill={L.col} fillOpacity={1 - hsr * 0.92} stroke={L.col} strokeOpacity={hsr * 0.7} strokeWidth={0.06} />
              </g>
            </g>
          );
        })}
      </svg>
      {/* layer labels while exploded */}
      {LAYERS.map((L, k) => {
        const p = project(c, [N / 2, N / 2, layerZ(k)]);
        return (
          <div key={L.name} style={{ position: "absolute", left: p.x + 24, top: p.y - 16, fontFamily: FONT.ui, fontWeight: 600, fontSize: 22, color: L.col, opacity: explode * prog(f, b.before + k * 8, 12), whiteSpace: "nowrap" }}>
            {L.name}
          </div>
        );
      })}
      {/* counters */}
      <div style={{ position: "absolute", left: 90, top: 760, opacity: prog(f, b.visible - 10, 14) }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 26, color: C.ink2 }}>pixel fragments to shade</div>
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 84, color: C.ink, fontVariantNumeric: "tabular-nums", textShadow: `0 0 30px ${hexA(C.amber, 0.5)}` }}>
          {frag.toLocaleString("en-US")}
          {hsr > 0.98 && <span style={{ fontSize: 30, color: C.green, marginLeft: 16 }}>−{Math.round((1 - SHADED / FRAGMENTS) * 100)}% work</span>}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ fast on-chip memory, one write
const OnChip: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.fast - 8, { damping: 22, stiffness: 90 });
  const loop = prog(f, b.memWord - 6, 14);
  const write = prog(f, b.writes - 4, 34, EASE.inOut);
  const onceA = prog(f, b.once - 6, 14);
  const gx = 520;
  const gy = 560;
  const mx = 1460;
  // packets looping inside the GPU between cores and tile memory
  const pk = new Array(10).fill(0).map((_, i) => {
    const t = ((f * 0.025 + i / 10) % 1 + 1) % 1;
    const ang = t * Math.PI * 2;
    return { x: gx + Math.cos(ang) * 170, y: gy + Math.sin(ang) * 95 };
  });
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.4) }}>
      <div style={{ position: "absolute", left: 90, top: 110 }}>
        <Kicker color={C.cyan} at={b.fast - 6}>
          Fast on-chip tile memory
        </Kicker>
      </div>
      <Glow x={gx} y={gy} size={900} color={C.violet} a={0.18} />
      {/* GPU */}
      <div style={{ position: "absolute", left: gx - 330, top: gy - 230, width: 660, height: 460, borderRadius: 28, border: `2px solid ${hexA(C.violet, 0.6)}`, background: "linear-gradient(160deg, rgba(40,30,80,0.55), rgba(12,12,28,0.8))" }} />
      <div style={{ position: "absolute", left: gx - 300, top: gy - 210, fontFamily: FONT.display, fontWeight: 700, fontSize: 36, color: C.ink }}>GPU</div>
      <div style={{ position: "absolute", left: gx - 300, top: gy - 40, width: 200, height: 80, borderRadius: 14, background: hexA(C.violet, 0.3), border: `1px solid ${hexA(C.violet, 0.8)}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.ui, fontWeight: 700, fontSize: 22, color: C.ink }}>shader cores</div>
      <div style={{ position: "absolute", left: gx + 100, top: gy - 40, width: 200, height: 80, borderRadius: 14, background: hexA(C.cyan, 0.22 + 0.2 * loop), border: `1px solid ${C.cyan}`, boxShadow: `0 0 ${30 * loop}px ${hexA(C.cyan, 0.6)}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.ui, fontWeight: 700, fontSize: 22, color: C.ink }}>tile memory</div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <ellipse cx={gx} cy={gy} rx={170} ry={95} fill="none" stroke={hexA(C.cyan, 0.35 * loop)} strokeWidth={2} strokeDasharray="6 8" />
        {loop > 0.01 && pk.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={6} fill={C.cyanHi} opacity={loop} />)}
        {/* one write out to memory */}
        <path d={`M${gx + 330},${gy} L${mx - 170},${gy}`} stroke={hexA(C.amber, 0.25)} strokeWidth={3} />
        {write > 0.01 && write < 0.99 && (
          <g transform={`translate(${mix(gx + 300, mx - 190, write)} ${gy})`}>
            <rect x={-26} y={-26} width={52} height={52} rx={6} fill={C.amber} stroke="#fff" strokeWidth={2} />
            <text x={0} y={-40} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} fill={C.ink}>
              finished tile
            </text>
          </g>
        )}
      </svg>
      <div style={{ position: "absolute", left: gx - 300, top: gy + 120, fontFamily: FONT.mono, fontSize: 22, color: C.ink2, opacity: loop }}>all the shading happens here · on-chip, fast</div>
      {/* unified memory */}
      <div style={{ position: "absolute", left: mx - 170, top: gy - 200, width: 340, height: 400, borderRadius: 24, border: `2px solid ${hexA(C.teal, 0.6)}`, background: "linear-gradient(160deg, rgba(10,40,40,0.5), rgba(8,14,20,0.8))" }}>
        <div style={{ padding: 22, fontFamily: FONT.display, fontWeight: 700, fontSize: 32, color: C.ink }}>Unified memory</div>
        <div style={{ position: "absolute", left: 30, right: 30, bottom: 30, top: 100, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
          {new Array(36).fill(0).map((_, k) => (
            <div key={k} style={{ borderRadius: 4, background: k < Math.floor(write * 3) ? C.amber : "rgba(45,212,191,0.14)" }} />
          ))}
        </div>
      </div>
      {onceA > 0.01 && (
        <div style={{ position: "absolute", left: mx - 170, top: gy + 230, width: 340, textAlign: "center", fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: C.amber, opacity: onceA, textShadow: `0 0 30px ${hexA(C.amber, 0.6)}` }}>written once</div>
      )}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ the name + payoff
const Payoff: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spr(f, fps, b.name - 4, { damping: 20, stiffness: 110 });
  const bars = [
    { t: "work", at: b.less, col: C.amber, to: 0.42 },
    { t: "memory traffic", at: b.traffic, col: C.cyan, to: 0.3 },
    { t: "power", at: b.power, col: C.green, to: 0.38 },
  ];
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", top: 210, width: "100%", textAlign: "center", opacity: clamp(t * 1.4), transform: `translateY(${(1 - t) * 30}px)` }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 24, letterSpacing: "0.45em", color: C.cyan }}>TBDR</div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 92, letterSpacing: "-0.035em", color: C.ink, marginTop: 10 }}>
          Tile-Based <span style={{ color: C.cyan }}>Deferred</span> Rendering
        </div>
      </div>
      <div style={{ position: "absolute", left: 960 - 520, top: 520, width: 1040 }}>
        {bars.map((bar) => {
          const p = prog(f, bar.at - 6, 26, EASE.inOut);
          const on = prog(f, bar.at - 8, 10);
          return (
            <div key={bar.t} style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 34, opacity: on }}>
              <div style={{ width: 300, textAlign: "right", fontFamily: FONT.display, fontWeight: 700, fontSize: 38, color: C.ink }}>less {bar.t}</div>
              <div style={{ flex: 1, height: 26, borderRadius: 13, background: "rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${mix(100, bar.to * 100, p)}%`, background: bar.col, boxShadow: `0 0 20px ${bar.col}`, borderRadius: 13 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", bottom: 90, width: "100%", textAlign: "center", fontFamily: FONT.mono, fontSize: 20, color: C.ink3, opacity: prog(f, b.power + 10, 16) }}>illustrative — actual savings depend on the scene</div>
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const frameA = 1 - prog(f, b.fast - 14, 14);
  const stackA = inOut(f, b.before - 14, 14, b.fast - 14, 14);
  const chipA = inOut(f, b.fast - 12, 14, b.name - 10, 12);
  const payA = prog(f, b.name - 10, 14);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      {frameA > 0.01 && <TiledFrame b={b} a={frameA} />}
      {stackA > 0.01 && <TileStack b={b} a={stackA} />}
      {chipA > 0.01 && <OnChip b={b} a={chipA} />}
      {payA > 0.01 && <Payoff b={b} a={payA} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const ticks: SfxEvent[] = [];
  for (let k = 0; k < 22; k++) ticks.push({ at: b.oneAt - 10 + k * 9, name: "tick", vol: 0.16 });
  return [
    { at: b.trick - 6, name: "shimmer", vol: 0.25 },
    { at: b.split - 4, name: "scan", vol: 0.35 },
    { at: b.say - 4, name: "pop", vol: 0.3 },
    ...ticks,
    { at: b.before - 12, name: "whoosh", vol: 0.35 },
    { at: b.visible - 6, name: "sweep_down", vol: 0.3 },
    { at: b.skips - 2, name: "glitch", vol: 0.2 },
    { at: b.skips + 34, name: "thud", vol: 0.3 },
    { at: b.fast - 12, name: "whoosh_soft", vol: 0.3 },
    { at: b.memWord - 6, name: "hum", vol: 0.25 },
    { at: b.writes - 4, name: "whoosh", vol: 0.3 },
    { at: b.once - 6, name: "chime", vol: 0.25 },
    { at: b.name - 10, name: "boom_soft", vol: 0.35 },
    { at: b.less - 6, name: "sweep_down", vol: 0.22 },
    { at: b.traffic - 6, name: "sweep_down", vol: 0.22, rate: 1.1 },
    { at: b.power - 6, name: "sweep_down", vol: 0.22, rate: 1.2 },
  ];
};

export const Tiles: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.cyan, hueB: C.amber, hueC: C.violet, intensity: 0.6 },
};
