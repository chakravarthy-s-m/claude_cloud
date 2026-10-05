import React from "react";
import { C, FONT, hexA } from "../theme";
import { Cam, Face, V3, box, groundMatrix, prepareFaces, project } from "../lib/proj3d";

export type StackLayer = {
  id: string;
  name: string;
  desc: string;
  color: string;
  z: number;
  /** 0..1 presence */
  a: number;
  /** 0..1 highlight */
  lit?: number;
  tiles?: string[];
};

export const SLAB = { cx: 170, cy: 0, w: 2100, d: 1400, t: 26 };

/** Stack of glass slabs (software layers) drawn bottom → top. */
export const Stack3D: React.FC<{ cam: Cam; layers: StackLayer[]; drop?: number }> = ({ cam, layers, drop = 260 }) => {
  const L = { dir: [-0.4, -0.65, 0.9] as V3, ambient: 0.55, diffuse: 0.55 };
  const sorted = [...layers].sort((a, b) => a.z - b.z);
  return (
    <g>
      {sorted.map((ly) => {
        if (ly.a <= 0.005) return null;
        const zz = ly.z - (1 - ly.a) * drop;
        const lit = ly.lit ?? 0;
        const faces: Face[] = box([SLAB.cx, SLAB.cy, zz], [SLAB.w, SLAB.d, SLAB.t], ly.color, {
          alpha: (0.16 + lit * 0.12) * ly.a,
          top: ly.color,
          topGlow: 0.55 + lit * 0.3,
          glow: 0.7,
          stroke: hexA(ly.color, (0.55 + lit * 0.45) * ly.a),
          strokeWidth: 1.6 + lit * 1.2,
        });
        const drawn = prepareFaces(cam, faces, L);
        const m = groundMatrix(cam, SLAB.cx - SLAB.w / 2, SLAB.cy + SLAB.d / 2, zz + SLAB.t + 0.5);
        const tiles = ly.tiles ?? [];
        const tw = (SLAB.w - 160 - (tiles.length - 1) * 40) / Math.max(1, tiles.length);
        return (
          <g key={ly.id}>
            {drawn.map((f, i) => (
              <path key={i} d={f.d} fill={f.fill} stroke={f.stroke} strokeWidth={f.strokeWidth} strokeLinejoin="round" />
            ))}
            <g transform={m} opacity={ly.a}>
              {/* etched grid on the glass */}
              {new Array(9).fill(0).map((_, i) => (
                <line key={i} x1={(SLAB.w / 9) * (i + 0.5)} y1={30} x2={(SLAB.w / 9) * (i + 0.5)} y2={SLAB.d - 30} stroke={hexA(ly.color, 0.08)} strokeWidth={2} />
              ))}
              {tiles.map((t, i) => (
                <g key={t} transform={`translate(${80 + i * (tw + 40)}, ${SLAB.d / 2 - 170})`}>
                  <rect width={tw} height={340} rx={40} fill={hexA(ly.color, 0.14 + lit * 0.12)} stroke={hexA(ly.color, 0.7)} strokeWidth={4} />
                  <text x={tw / 2} y={200} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={Math.min(110, (tw / Math.max(4, t.length)) * 1.55)} fill={C.ink} opacity={0.92}>
                    {t}
                  </text>
                </g>
              ))}
            </g>
          </g>
        );
      })}
    </g>
  );
};

/** Screen anchor at the right-front corner of a layer, for side labels. */
export const layerAnchor = (cam: Cam, z: number, side: "right" | "left" = "right"): { x: number; y: number } => {
  const x = side === "right" ? SLAB.cx + SLAB.w / 2 : SLAB.cx - SLAB.w / 2;
  const p = project(cam, [x, SLAB.cy - SLAB.d / 2, z + SLAB.t / 2]);
  return { x: p.x, y: p.y };
};

export const SideLabel: React.FC<{ x: number; y: number; name: string; desc: string; color: string; a: number; dx?: number; align?: "left" | "right" }> = ({
  x,
  y,
  name,
  desc,
  color,
  a,
  dx = 90,
  align = "left",
}) => {
  if (a <= 0.01) return null;
  const lx = align === "left" ? x + dx : x - dx;
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: a, overflow: "visible" }}>
        <line x1={x} y1={y} x2={lx + (align === "left" ? -10 : 10)} y2={y} stroke={color} strokeWidth={1.5} strokeDasharray="2 6" />
        <circle cx={x} cy={y} r={5} fill={color} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: align === "left" ? lx : undefined,
          right: align === "right" ? 1920 - lx : undefined,
          top: y - 34,
          opacity: a,
          transform: `translateX(${(1 - a) * (align === "left" ? 30 : -30)}px)`,
          textAlign: align,
        }}
      >
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 38, color: C.ink, letterSpacing: "-0.02em", textShadow: `0 0 24px ${hexA(color, 0.6)}` }}>{name}</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 19, color: hexA(color, 0.95), marginTop: 2 }}>{desc}</div>
      </div>
    </>
  );
};
