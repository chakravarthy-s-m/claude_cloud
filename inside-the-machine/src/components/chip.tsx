import React from "react";
import { C, FONT, hexA } from "../theme";
import { Cam, Face, V3, box, planeMatrix, prepareFaces, project } from "../lib/proj3d";
import { rnd } from "../lib/anim";

export type BlockKind = "pcore" | "pl2" | "ecore" | "el2" | "gpu" | "slc" | "npu" | "media" | "display" | "secure" | "storage" | "io" | "phy" | "fabric";

export type Block = { id: string; kind: BlockKind; x: number; y: number; w: number; h: number };

export const KIND_COLOR: Record<BlockKind, string> = {
  pcore: C.pink,
  pl2: C.rose,
  ecore: C.teal,
  el2: C.green,
  gpu: C.violet,
  slc: C.indigo,
  npu: C.amber,
  media: C.blue,
  display: C.cyan,
  secure: C.lime,
  storage: C.orange,
  io: C.blue,
  phy: C.gold,
  fabric: "#7c86a6",
};

const grid = (prefix: string, kind: BlockKind, x0: number, y0: number, cols: number, rows: number, w: number, h: number, gap: number): Block[] => {
  const out: Block[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push({ id: `${prefix}${r * cols + c}`, kind, x: x0 + c * (w + gap) + w / 2, y: y0 - r * (h + gap) - h / 2, w, h });
  return out;
};

// Illustrative floorplan in the spirit of an M-series SoC (not a real die shot).
export const BLOCKS: Block[] = [
  ...grid("p", "pcore", -585, 432, 2, 2, 165, 148, 10),
  { id: "pl2", kind: "pl2", x: -170, y: 275, w: 112, h: 306 },
  ...grid("e", "ecore", -585, 100, 3, 2, 108, 118, 7),
  { id: "el2", kind: "el2", x: -170, y: -22, w: 112, h: 243 },
  ...grid("g", "gpu", -92, 432, 5, 2, 92, 148, 8),
  { id: "slc", kind: "slc", x: 156, y: 42, w: 496, h: 110 },
  ...grid("n", "npu", -92, -42, 4, 4, 58, 86, 6),
  { id: "media", kind: "media", x: 300, y: -108, w: 196, h: 116 },
  { id: "display", kind: "display", x: 300, y: -246, w: 196, h: 116 },
  { id: "secure", kind: "secure", x: 492, y: -108, w: 150, h: 116 },
  { id: "storage", kind: "storage", x: 492, y: -246, w: 150, h: 116 },
  { id: "io", kind: "io", x: 395, y: -383, w: 400, h: 96 },
  { id: "phy", kind: "phy", x: 560, y: 208, w: 64, h: 460 },
  { id: "fabric", kind: "fabric", x: -345, y: -300, w: 470, h: 290 },
];

export const DIE = { w: 1240, h: 940, z: 16, t: 8 };
export const PKG = { x: 170, w: 1800, h: 1160, t: 16 };
export const MEM = [
  { id: "mem0", x: 840, y: 250, w: 300, h: 420 },
  { id: "mem1", x: 840, y: -250, w: 300, h: 420 },
];

export type ChipState = {
  /** block id or kind → rise 0..1 */
  rise?: Record<string, number>;
  /** block id or kind → highlight 0..1 */
  lit?: Record<string, number>;
  /** 0..1 overall power (dims when off) */
  power?: number;
  memRise?: number;
  memLit?: number;
  sparkle?: number;
  frame?: number;
  /** show substrate/package */
  pkg?: boolean;
  /** scale factor for the whole chip in world units */
  s?: number;
  origin?: V3;
};

const val = (m: Record<string, number> | undefined, b: Block) => Math.max(m?.[b.id] ?? 0, m?.[b.kind] ?? 0);

export const ChipDefs: React.FC = () => (
  <defs>
    <pattern id="pat-sram" width="6" height="6" patternUnits="userSpaceOnUse">
      <rect width="6" height="6" fill="transparent" />
      <rect y="0" width="6" height="2.2" fill="rgba(255,255,255,0.10)" />
    </pattern>
    <pattern id="pat-logic" width="14" height="14" patternUnits="userSpaceOnUse">
      <rect x="1" y="2" width="5" height="3" fill="rgba(255,255,255,0.09)" />
      <rect x="8" y="1" width="4" height="6" fill="rgba(255,255,255,0.06)" />
      <rect x="2" y="8" width="9" height="2" fill="rgba(255,255,255,0.08)" />
      <rect x="10" y="10" width="3" height="3" fill="rgba(255,255,255,0.1)" />
    </pattern>
    <pattern id="pat-grid" width="10" height="10" patternUnits="userSpaceOnUse">
      <path d="M0 0H10M0 0V10" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
    </pattern>
    <linearGradient id="die-sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor={hexA(C.cyan, 0.10)} />
      <stop offset="45%" stopColor={hexA(C.violet, 0.06)} />
      <stop offset="70%" stopColor={hexA(C.amber, 0.05)} />
      <stop offset="100%" stopColor={hexA(C.pink, 0.08)} />
    </linearGradient>
  </defs>
);

const patternFor = (k: BlockKind) =>
  k === "pl2" || k === "el2" || k === "slc" ? "url(#pat-sram)" : k === "gpu" || k === "npu" ? "url(#pat-grid)" : "url(#pat-logic)";

/** Renders the SoC package as flat-shaded 3D with optional rising, glowing blocks. */
export const Chip3D: React.FC<{ cam: Cam; st?: ChipState }> = ({ cam, st = {} }) => {
  const s = st.s ?? 1;
  const o = st.origin ?? [0, 0, 0];
  const power = st.power ?? 1;
  const P = (x: number, y: number, z: number): V3 => [o[0] + x * s, o[1] + y * s, o[2] + z * s];
  const faces: Face[] = [];
  let g = 0;
  const L = { dir: [-0.4, -0.65, 0.9] as V3, ambient: 0.5, diffuse: 0.6 };

  if (st.pkg !== false) {
    faces.push(...box(P(PKG.x, 0, 0), [PKG.w * s, PKG.h * s, PKG.t * s], "#161d2b", { group: g++, layer: 0, top: "#1b2334", stroke: hexA(C.gold, 0.3), strokeWidth: 1 }));
    for (const m of MEM) {
      const rise = st.memRise ?? 0;
      const lit = st.memLit ?? 0;
      faces.push(
        ...box(P(m.x, m.y, PKG.t + rise * 50), [m.w * s, m.h * s, 22 * s], "#262e40", {
          group: g++,
          layer: 1,
          top: lit * power > 0.01 ? C.teal : "#2e374d",
          topGlow: lit * power > 0.01 ? 0.5 + lit * power * 0.9 : 1.05,
          stroke: lit * power > 0.01 ? hexA(C.teal, lit * power) : "rgba(255,255,255,0.12)",
          strokeWidth: 1.2,
        }),
      );
    }
  }
  faces.push(...box(P(0, 0, PKG.t), [DIE.w * s, DIE.h * s, DIE.t * s], "#141a28", { group: g++, layer: 1, top: "#1a2132", stroke: "rgba(160,180,255,0.28)", strokeWidth: 1.2 }));
  const dieTop = PKG.t + DIE.t;

  const blockGroups: { b: Block; group: number; h: number; lit: number }[] = [];
  for (const b of BLOCKS) {
    const rise = val(st.rise, b);
    const lit = val(st.lit, b) * power;
    const h = 2 + rise * (b.kind === "fabric" ? 10 : 70);
    const col = KIND_COLOR[b.kind];
    const base = lit > 0.01 ? col : "#273049";
    const group = g++;
    blockGroups.push({ b, group, h, lit });
    faces.push(
      ...box(P(b.x, b.y, dieTop), [b.w * s - 2, b.h * s - 2, h * s], base, {
        group,
        layer: 2,
        top: lit > 0.01 ? col : "#2a3452",
        topGlow: lit > 0.01 ? 0.55 + lit * 0.75 : 1.0 + 0.2 * power,
        sideAlpha: 1,
        glow: lit > 0.01 ? 0.55 + 0.4 * lit : 0.95,
        stroke: lit > 0.01 ? hexA(col, 0.9) : `rgba(170,190,255,${0.16 + 0.12 * power})`,
        strokeWidth: lit > 0.01 ? 1.4 : 0.8,
      }),
    );
  }
  const drawn = prepareFaces(cam, faces, L);

  // overlays drawn right after each block's top face
  const groupOf = new Map(blockGroups.map((x) => [x.group, x]));
  const out: React.ReactNode[] = [];
  let lastGroup = -999;
  const flushOverlay = (grp: number) => {
    const bg = groupOf.get(grp);
    if (!bg) return;
    const { b, h, lit } = bg;
    const m = planeMatrix(cam, P(b.x - b.w / 2 + 1, b.y + b.h / 2 - 1, dieTop + h + 0.2), [s, 0, 0], [0, -s, 0]);
    out.push(
      <g key={`ov${b.id}`} transform={m}>
        <rect width={b.w - 2} height={b.h - 2} fill={patternFor(b.kind)} opacity={0.8 + lit * 0.2} />
      </g>,
    );
  };
  drawn.forEach((f, i) => {
    if (f.group !== lastGroup) {
      flushOverlay(lastGroup);
      lastGroup = f.group ?? -1;
    }
    out.push(<path key={i} d={f.d} fill={f.fill} stroke={f.stroke} strokeWidth={f.strokeWidth} strokeLinejoin="round" />);
  });
  flushOverlay(lastGroup);

  // die sheen
  const sheen = planeMatrix(cam, P(-DIE.w / 2, DIE.h / 2, dieTop + 0.5), [s, 0, 0], [0, -s, 0]);

  // sparkles (transistors switching)
  const sparkles: React.ReactNode[] = [];
  if ((st.sparkle ?? 0) > 0.01) {
    const fr = st.frame ?? 0;
    for (let i = 0; i < 160; i++) {
      const x = rnd(`spx${i}`, -DIE.w / 2 + 20, DIE.w / 2 - 20);
      const y = rnd(`spy${i}`, -DIE.h / 2 + 20, DIE.h / 2 - 20);
      const ph = Math.sin(fr * rnd(`spf${i}`, 0.2, 0.7) + i * 1.7);
      if (ph < 0.6) continue;
      const p = project(cam, P(x, y, dieTop + 4));
      const r = (ph - 0.6) * 9 * p.k * Math.max(0.6, cam.scale);
      sparkles.push(<circle key={i} cx={p.x} cy={p.y} r={r} fill={i % 3 ? C.cyanHi : "#ffffff"} opacity={(st.sparkle ?? 0) * 0.9} />);
    }
  }

  return (
    <g>
      <ChipDefs />
      {out}
      <g transform={sheen}>
        <rect width={DIE.w} height={DIE.h} fill="url(#die-sheen)" opacity={0.5 * power} />
      </g>
      {sparkles}
    </g>
  );
};

/** Screen-space anchor of a block's (raised) top center. */
export const blockAnchor = (cam: Cam, id: string, st: ChipState = {}, lift = 0) => {
  const s = st.s ?? 1;
  const o = st.origin ?? [0, 0, 0];
  const b = BLOCKS.find((x) => x.id === id || x.kind === id)!;
  const rise = Math.max(st.rise?.[b.id] ?? 0, st.rise?.[b.kind] ?? 0);
  const z = PKG.t + DIE.t + 2 + rise * 70 + lift;
  return project(cam, [o[0] + b.x * s, o[1] + b.y * s, o[2] + z * s]);
};

/** Union bounds anchor for a group of blocks (by kind). */
export const kindAnchor = (cam: Cam, kind: BlockKind, st: ChipState = {}, lift = 0) => {
  const s = st.s ?? 1;
  const o = st.origin ?? [0, 0, 0];
  const bs = BLOCKS.filter((b) => b.kind === kind);
  const x = bs.reduce((a, b) => a + b.x, 0) / bs.length;
  const y = bs.reduce((a, b) => a + b.y, 0) / bs.length;
  const rise = st.rise?.[kind] ?? 0;
  return project(cam, [o[0] + x * s, o[1] + y * s, o[2] + (PKG.t + DIE.t + 2 + rise * 70 + lift) * s]);
};

export const memAnchor = (cam: Cam, st: ChipState = {}, lift = 0) => {
  const s = st.s ?? 1;
  const o = st.origin ?? [0, 0, 0];
  return project(cam, [o[0] + 840 * s, o[1], o[2] + (PKG.t + 22 + (st.memRise ?? 0) * 50 + lift) * s]);
};

export const ChipLabel: React.FC<{ x: number; y: number; text: string; sub?: string; color: string; a: number; dx?: number; dy?: number }> = ({
  x,
  y,
  text,
  sub,
  color,
  a,
  dx = 0,
  dy = -140,
}) => {
  if (a <= 0.01) return null;
  const lx = x + dx;
  const ly = y + dy;
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: a, overflow: "visible" }}>
        <line x1={x} y1={y} x2={lx} y2={ly + 28} stroke={color} strokeWidth={1.6} strokeDasharray="3 5" />
        <circle cx={x} cy={y} r={5} fill={color} />
        <circle cx={x} cy={y} r={12} fill={color} opacity={0.25} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: lx,
          top: ly,
          transform: `translate(-50%, -100%) translateY(${(1 - a) * 14}px)`,
          opacity: a,
          padding: "10px 18px",
          borderRadius: 14,
          background: "rgba(6,9,20,0.86)",
          border: `1px solid ${hexA(color, 0.6)}`,
          boxShadow: `0 0 30px ${hexA(color, 0.3)}`,
          whiteSpace: "nowrap",
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: C.ink, letterSpacing: "-0.01em" }}>{text}</div>
        {sub && <div style={{ fontFamily: FONT.mono, fontSize: 17, color: hexA(color, 0.95), marginTop: 2 }}>{sub}</div>}
      </div>
    </>
  );
};
