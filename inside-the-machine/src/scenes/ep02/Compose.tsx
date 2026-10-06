import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
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
    notOne: c.w1.from,
    every: wordAt(c.w1, "Every app"),
    separately: wordAt(c.w1, "separately"),
    ws: c.w2.from,
    wsWord: wordAt(c.w2, "Window Server"),
    stacks: wordAt(c.w2, "stacks them"),
    shadows: wordAt(c.w2, "shadows"),
    transparency: wordAt(c.w2, "transparency"),
    blur: wordAt(c.w2, "blur"),
    final: wordAt(c.w2, "one final frame"),
    mem: c.w3.from,
    unified: wordAt(c.w3, "unified memory"),
    copy: wordAt(c.w3, "nobody has to copy"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

const DW = 1280;
const DH = 800;
/** desktop-local point → screen, once the stack has collapsed (scale 0.92 about the center) */
const toScr = (lx: number, ly: number) => ({ x: 960 + (lx - DW / 2) * 0.92, y: 560 + (ly - DH / 2) * 0.92 });

const blurCache = new Map<string, HTMLCanvasElement>();
const wallBlur = (r: number) => {
  const key = `${r}`;
  const hit = blurCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = DW;
  c.height = DH;
  const g = c.getContext("2d")!;
  g.filter = `blur(${r}px)`;
  g.drawImage(wallpaper(), -40, -40, DW + 80, DH + 80);
  blurCache.set(key, c);
  return c;
};

const CanvasImg: React.FC<{ draw: (ctx: CanvasRenderingContext2D) => void; w: number; h: number; style?: React.CSSProperties }> = ({ draw, w, h, style }) => {
  const ref = useCanvas(draw, []);
  return <canvas ref={ref} width={w} height={h} style={{ position: "absolute", inset: 0, ...style }} />;
};

/** Frosted glass: a pre-blurred slice of the wallpaper behind (x, y). */
const Frost: React.FC<{ x: number; y: number; w: number; h: number; tint?: number; radius?: number }> = ({ x, y, w, h, tint = 0.16, radius = 0 }) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: radius }}>
    <CanvasImg w={w} h={h} draw={(ctx) => ctx.drawImage(wallBlur(18), x, y, w, h, 0, 0, w, h)} />
    <div style={{ position: "absolute", inset: 0, background: `rgba(255,255,255,${tint})` }} />
  </div>
);

type Layer = { key: string; x: number; y: number; w: number; h: number; label: string; col: string; z: number };
const LAYERS: Layer[] = [
  { key: "wall", x: 0, y: 0, w: DW, h: DH, label: "desktop picture", col: C.violet, z: 0 },
  { key: "photo", x: 110, y: 120, w: 600, h: 400, label: "photo app", col: C.pink, z: 1 },
  { key: "editor", x: 560, y: 250, w: 560, h: 390, label: "text editor", col: C.cyan, z: 2 },
  { key: "player", x: 880, y: 70, w: 310, h: 140, label: "music player", col: C.amber, z: 3 },
  { key: "dock", x: DW / 2 - 300, y: DH - 96, w: 600, h: 78, label: "dock", col: C.green, z: 4 },
  { key: "menu", x: 0, y: 0, w: DW, h: 30, label: "menu bar", col: C.blue, z: 5 },
];

const Chrome: React.FC = () => (
  <div style={{ position: "absolute", left: 14, top: 12, display: "flex", gap: 8 }}>
    {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
      <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
    ))}
  </div>
);

const LayerContent: React.FC<{ L: Layer; fx: number }> = ({ L, fx }) => {
  const shadow = fx > 0.01 ? `0 ${30 * fx}px ${70 * fx}px rgba(0,0,0,${0.55 * fx}), 0 0 0 1px rgba(255,255,255,0.12)` : "0 0 0 1px rgba(255,255,255,0.12)";
  switch (L.key) {
    case "wall":
      return <CanvasImg w={DW} h={DH} draw={(ctx) => ctx.drawImage(wallpaper(), 0, 0, DW, DH)} />;
    case "photo":
      return (
        <div style={{ position: "absolute", inset: 0, borderRadius: 14, overflow: "hidden", background: "#11141f", boxShadow: shadow }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 38, background: "#1b1f2e" }} />
          <Chrome />
          <div style={{ position: "absolute", left: 0, right: 0, top: 38, bottom: 0 }}>
            <CanvasImg w={600} h={362} draw={(ctx) => ctx.drawImage(teapotCanvas(600, 362, { bg: [20, 24, 40, 255], dist: 7 }), 0, 0)} />
          </div>
        </div>
      );
    case "editor":
      return (
        <div style={{ position: "absolute", inset: 0, borderRadius: 14, overflow: "hidden", background: "rgba(24,26,38,0.96)", boxShadow: shadow }}>
          {/* frosted sidebar */}
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 150, opacity: 1 }}>
            <Frost x={L.x} y={L.y} w={150} h={L.h} tint={0.1} />
            <div style={{ position: "absolute", inset: 0, background: `rgba(24,26,38,${0.55 * (1 - fx)})` }} />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ position: "absolute", left: 18, top: 56 + i * 30, width: 100 - i * 12, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.35)" }} />
            ))}
          </div>
          <Chrome />
          {new Array(9).fill(0).map((_, i) => (
            <div key={i} style={{ position: "absolute", left: 180, top: 60 + i * 34, width: 340 - ((i * 67) % 160), height: 12, borderRadius: 6, background: i === 0 ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.18)" }} />
          ))}
        </div>
      );
    case "player":
      return (
        <div style={{ position: "absolute", inset: 0, borderRadius: 18, overflow: "hidden", boxShadow: shadow }}>
          <Frost x={L.x} y={L.y} w={L.w} h={L.h} tint={0.14} />
          <div style={{ position: "absolute", left: 16, top: 18, width: 104, height: 104, borderRadius: 12, background: `linear-gradient(135deg, ${C.amber}, ${C.pink})` }} />
          <div style={{ position: "absolute", left: 138, top: 34, width: 140, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.75)" }} />
          <div style={{ position: "absolute", left: 138, top: 58, width: 90, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.4)" }} />
          <div style={{ position: "absolute", left: 138, top: 98, width: 150, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.25)" }}>
            <div style={{ width: "40%", height: "100%", borderRadius: 3, background: "#fff" }} />
          </div>
        </div>
      );
    case "dock":
      return (
        <div style={{ position: "absolute", inset: 0, borderRadius: 22, overflow: "hidden", boxShadow: shadow }}>
          <Frost x={L.x} y={L.y} w={L.w} h={L.h} tint={0.18} radius={22} />
          {[C.pink, C.cyan, C.violet, C.amber, C.green, C.blue, C.rose, C.teal].map((c, i) => (
            <div key={i} style={{ position: "absolute", left: 18 + i * 72, top: 11, width: 56, height: 56, borderRadius: 14, background: `linear-gradient(160deg, ${c}, ${hexA(c, 0.6)})` }} />
          ))}
        </div>
      );
    case "menu":
      return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <Frost x={L.x} y={L.y} w={L.w} h={L.h} tint={0.12} />
          <div style={{ position: "absolute", left: 18, top: 9, width: 12, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.9)" }} />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ position: "absolute", left: 50 + i * 70, top: 11, width: 50, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.7)" }} />
          ))}
          <div style={{ position: "absolute", right: 20, top: 11, width: 90, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.7)" }} />
        </div>
      );
    default:
      return null;
  }
};

// ------------------------------------------------------------------ exploded desktop → composited frame
const Stack: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, 40, { damping: 26, stiffness: 50 });
  const explode = prog(f, b.every - 10, 50, EASE.inOut) * (1 - prog(f, b.stacks - 6, 46, EASE.inOut));
  const flat = prog(f, b.stacks - 6, 46, EASE.inOut);
  const fx = prog(f, b.shadows - 8, 30);
  const rx = mix(26, 0, flat) * mix(0.3, 1, inP);
  const ry = mix(-30, 0, flat) * mix(0.3, 1, inP);
  const rz = mix(6, 0, flat);
  const sc = mix(mix(0.74, 0.6, explode), 0.92, flat);
  const flash = inOut(f, b.stacks + 34, 6, b.stacks + 42, 18);
  const wsA = inOut(f, b.wsWord - 6, 14, b.final + 30, 14);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Glow x={960} y={560} size={1700} color={C.blue} a={0.14} />
      <AbsoluteFill style={{ perspective: 2600, perspectiveOrigin: "50% 40%" }}>
        <div
          style={{
            position: "absolute",
            left: 960 - DW / 2,
            top: 560 - DH / 2 + 70 * explode,
            width: DW,
            height: DH,
            transformStyle: "preserve-3d",
            transform: `scale(${sc}) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
            opacity: clamp(inP * 1.4),
          }}
        >
          {LAYERS.map((L) => {
            const z = L.z * 120 * explode;
            const lab = explode * prog(f, b.every - 6 + L.z * 6, 12);
            return (
              <div key={L.key} style={{ position: "absolute", left: L.x, top: L.y, width: L.w, height: L.h, transform: `translateZ(${z}px)`, transformStyle: "preserve-3d" }}>
                <LayerContent L={L} fx={fx} />
                {/* layer outline + owner label while exploded */}
                {explode > 0.01 && <div style={{ position: "absolute", inset: -3, borderRadius: L.key === "wall" || L.key === "menu" ? 0 : 16, border: `2px solid ${hexA(L.col, 0.8 * explode)}`, boxShadow: `0 0 30px ${hexA(L.col, 0.35 * explode)}` }} />}
                {lab > 0.01 && (
                  <div style={{ position: "absolute", left: 0, top: L.key === "menu" ? -62 : -64, padding: "6px 16px", borderRadius: 12, background: "rgba(5,7,16,0.85)", border: `2px solid ${L.col}`, fontFamily: FONT.ui, fontWeight: 700, fontSize: 36, color: C.ink, opacity: lab, whiteSpace: "nowrap" }}>
                    {L.label}
                  </div>
                )}
              </div>
            );
          })}
          {/* cursor */}
          <svg width={40} height={44} style={{ position: "absolute", left: 760, top: 520, transform: `translateZ(${6 * 120 * explode}px)` }}>
            <path d="M4,2 L4,32 L12,24 L17,37 L22,35 L17,23 L28,23 Z" fill="#fff" stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
          </svg>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#ffffff", opacity: 0.12 * flash, mixBlendMode: "screen" }} />
      {/* titles */}
      <div style={{ position: "absolute", left: 110, top: 880, opacity: inOut(f, b.notOne - 4, 16, b.ws - 4, 12) }}>
        <Kicker color={C.blue} at={b.notOne - 4}>
          Not one picture
        </Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 56, color: C.ink, marginTop: 10, letterSpacing: "-0.03em" }}>Every app paints its own windows</div>
      </div>
      {wsA > 0.01 && (
        <div style={{ position: "absolute", top: 104, width: "100%", textAlign: "center", opacity: wsA }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 16, padding: "12px 28px", borderRadius: 999, background: "rgba(6,10,24,0.85)", border: `1px solid ${C.blue}`, boxShadow: `0 0 40px ${hexA(C.blue, 0.4)}`, fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: C.ink }}>
            <svg width={34} height={34}>
              <rect x={3} y={9} width={20} height={16} rx={3} fill="none" stroke={C.blue} strokeWidth={2.5} />
              <rect x={11} y={3} width={20} height={16} rx={3} fill={hexA(C.blue, 0.4)} stroke={C.blue} strokeWidth={2.5} />
            </svg>
            WindowServer
            <span style={{ fontFamily: FONT.mono, fontSize: 22, color: C.blue, fontWeight: 500 }}>compositor</span>
          </span>
        </div>
      )}
      {/* effect callouts */}
      {[
        { t: "shadows", at: b.shadows, ...toScr(330, 556), col: C.pink },
        { t: "transparency", at: b.transparency, ...toScr(640, 690), col: C.green },
        { t: "blur", at: b.blur, ...toScr(635, 470), col: C.cyan },
      ].map((c) => {
        const p = spr(f, fps, c.at - 6, { damping: 16, stiffness: 160 }) * (1 - prog(f, b.mem - 14, 12));
        if (p <= 0.01) return null;
        return (
          <div key={c.t} style={{ position: "absolute", left: c.x, top: c.y, transform: `translate(-50%, -50%) scale(${p})`, padding: "8px 18px", borderRadius: 999, background: c.col, color: "#05060d", fontFamily: FONT.ui, fontWeight: 800, fontSize: 26, boxShadow: `0 0 30px ${hexA(c.col, 0.7)}`, whiteSpace: "nowrap" }}>
            {c.t}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ shared memory, no copies
const Shared: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.mem - 6, { damping: 22, stiffness: 90 });
  const memA = spr(f, fps, b.unified - 6, { damping: 20, stiffness: 110 });
  const noCopy = spr(f, fps, b.copy - 4, { damping: 16, stiffness: 150 });
  const nodes = [
    { t: "Your apps", sub: "paint windows", x: 420, y: 330, col: C.pink },
    { t: "WindowServer", sub: "composites", x: 960, y: 230, col: C.blue },
    { t: "GPU", sub: "draws & blends", x: 1500, y: 330, col: C.violet },
  ];
  const mx = 960;
  const my = 700;
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.4) }}>
      <div style={{ position: "absolute", left: 110, top: 120 }}>
        <Kicker color={C.teal} at={b.mem - 4}>
          One pool of memory
        </Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {nodes.map((n, i) => {
          const p = prog(f, b.unified - 4 + i * 5, 18, EASE.inOut);
          const x2 = mix(n.x, mx + (i - 1) * 150, p);
          const y2 = mix(n.y + 60, my - 110, p);
          return (
            <g key={n.t}>
              <path d={`M${n.x},${n.y + 60} L${x2},${y2}`} stroke={n.col} strokeWidth={3} strokeOpacity={0.8} />
              {p > 0.98 && <circle cx={x2} cy={y2} r={7} fill={n.col} />}
            </g>
          );
        })}
      </svg>
      {nodes.map((n, i) => {
        const p = spr(f, fps, b.mem + i * 6, { damping: 18, stiffness: 120 });
        return (
          <div key={n.t} style={{ position: "absolute", left: n.x, top: n.y, transform: `translate(-50%, -50%) scale(${mix(0.8, 1, p)})`, opacity: clamp(p * 1.4), padding: "16px 30px", borderRadius: 18, background: "rgba(8,10,22,0.9)", border: `2px solid ${n.col}`, boxShadow: `0 0 34px ${hexA(n.col, 0.35)}`, textAlign: "center", whiteSpace: "nowrap" }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 36, color: C.ink }}>{n.t}</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 19, color: n.col }}>{n.sub}</div>
          </div>
        );
      })}
      {/* unified memory with the window buffers inside */}
      <div style={{ position: "absolute", left: mx - 420, top: my - 110, width: 840, height: 250, borderRadius: 26, border: `2px solid ${C.teal}`, background: "linear-gradient(160deg, rgba(10,44,44,0.6), rgba(6,12,18,0.85))", boxShadow: `0 0 60px ${hexA(C.teal, 0.25 * memA)}`, opacity: clamp(memA * 1.4), transform: `scale(${mix(0.9, 1, memA)})` }}>
        <div style={{ position: "absolute", left: 26, top: 18, fontFamily: FONT.display, fontWeight: 700, fontSize: 32, color: C.ink }}>Unified memory</div>
        <div style={{ position: "absolute", left: 26, right: 26, top: 80, bottom: 26, display: "flex", gap: 18 }}>
          {[C.violet, C.pink, C.cyan, C.amber, C.green].map((c, i) => (
            <div key={i} style={{ flex: 1, borderRadius: 10, border: `1px solid ${hexA(c, 0.8)}`, background: `linear-gradient(160deg, ${hexA(c, 0.4)}, ${hexA(c, 0.1)})`, display: "flex", alignItems: "flex-end", padding: 8, fontFamily: FONT.mono, fontSize: 15, color: C.ink2 }}>
              {["desktop", "photo app", "editor", "player", "dock"][i]}
            </div>
          ))}
        </div>
      </div>
      {noCopy > 0.01 && (
        <div style={{ position: "absolute", left: mx + 470, top: my - 40, opacity: clamp(noCopy * 1.4), transform: `scale(${noCopy})`, display: "flex", alignItems: "center", gap: 14 }}>
          <svg width={70} height={70}>
            <circle cx={35} cy={35} r={30} fill="none" stroke={C.rose} strokeWidth={4} />
            <path d="M22,22 L48,48 M48,22 L22,48" stroke={C.rose} strokeWidth={5} strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: C.ink }}>no copies</span>
        </div>
      )}
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const stackA = 1 - prog(f, b.mem - 12, 14);
  const memA = prog(f, b.mem - 10, 14);
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={14}>
      {stackA > 0.01 && <Stack b={b} a={stackA} />}
      {memA > 0.01 && <Shared b={b} a={memA} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: 40, name: "swell", vol: 0.25 },
    { at: b.every - 10, name: "whoosh", vol: 0.4 },
    { at: b.every + 4, name: "pop", vol: 0.25 },
    { at: b.every + 10, name: "pop", vol: 0.25, rate: 1.1 },
    { at: b.every + 16, name: "pop", vol: 0.25, rate: 1.2 },
    { at: b.wsWord - 6, name: "blip_hi", vol: 0.3 },
    { at: b.stacks - 6, name: "whoosh_rev", vol: 0.4 },
    { at: b.stacks + 34, name: "impact", vol: 0.3 },
    { at: b.shadows - 6, name: "pop", vol: 0.28 },
    { at: b.transparency - 6, name: "pop_hi", vol: 0.28 },
    { at: b.blur - 6, name: "pop", vol: 0.28, rate: 1.2 },
    { at: b.mem - 12, name: "whoosh_soft", vol: 0.3 },
    { at: b.unified - 4, name: "data", vol: 0.3 },
    { at: b.copy - 4, name: "thud", vol: 0.3 },
  ];
};

export const Compose: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.blue, hueB: C.violet, hueC: C.teal, intensity: 0.65 },
};
