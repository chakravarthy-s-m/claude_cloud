// Shared building blocks for Episode 04 — "Memory".
import React from "react";
import { C, FONT, hexA } from "../../theme";
import { clamp, mix, rnd } from "../../lib/anim";

export { Check, Cross, OK, BAD } from "../ep03/shared";

/** One color per level of the memory hierarchy (used consistently through the episode). */
export const TIER = {
  reg: C.pink,
  l1: C.violet,
  l2: C.blue,
  slc: C.cyan,
  dram: C.teal,
  ssd: C.amber,
} as const;

export type TierKey = keyof typeof TIER;

/** The pyramid, top to bottom. Sizes/latencies: Apple M1 (performance cores), measured / published. */
export const TIERS: { key: TierKey; name: string; size: string; lat: string; ticks: string }[] = [
  { key: "reg", name: "Registers", size: "a few dozen", lat: "instant", ticks: "0" },
  { key: "l1", name: "L1 cache", size: "128 KB per core", lat: "≈ 1 ns", ticks: "3 ticks" },
  { key: "l2", name: "L2 cache", size: "12 MB shared", lat: "≈ 6 ns", ticks: "18 ticks" },
  { key: "slc", name: "System cache", size: "8 MB, whole chip", lat: "≈ 20 ns", ticks: "≈ 60 ticks" },
  { key: "dram", name: "Main memory", size: "8 GB and up", lat: "≈ 100 ns", ticks: "≈ 300 ticks" },
  { key: "ssd", name: "SSD", size: "terabytes", lat: "≈ 60 µs", ticks: "≈ 200,000 ticks" },
];

// ------------------------------------------------------------------ a DRAM cell (1 transistor + 1 capacitor)
/** Schematic DRAM cell: access transistor on the wordline, storage capacitor with a charge "fill". */
export const DramCell: React.FC<{ x: number; y: number; s?: number; charge: number; col?: string; wl?: number; label?: boolean }> = ({ x, y, s = 1, charge, col = TIER.dram, wl = 0, label = false }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {/* bitline (vertical, left) */}
    <line x1={-60} y1={-90} x2={-60} y2={90} stroke={hexA(C.ink, 0.35)} strokeWidth={4} />
    {/* wordline (horizontal, top) */}
    <line x1={-90} y1={-60} x2={70} y2={-60} stroke={wl > 0.05 ? C.amber : hexA(C.ink, 0.35)} strokeWidth={4} style={wl > 0.05 ? { filter: `drop-shadow(0 0 ${8 * wl}px ${C.amber})` } : undefined} />
    {/* transistor: channel + gate */}
    <line x1={-60} y1={0} x2={-20} y2={0} stroke={hexA(C.ink, 0.6)} strokeWidth={4} />
    <rect x={-20} y={-14} width={40} height={28} rx={4} fill={wl > 0.5 ? hexA(C.amber, 0.25) : "#1a2030"} stroke={hexA(C.ink, 0.6)} strokeWidth={3} />
    <line x1={0} y1={-60} x2={0} y2={-14} stroke={wl > 0.05 ? C.amber : hexA(C.ink, 0.5)} strokeWidth={3} />
    <line x1={20} y1={0} x2={50} y2={0} stroke={hexA(C.ink, 0.6)} strokeWidth={4} />
    {/* capacitor: a bucket of charge */}
    <rect x={50} y={-26} width={44} height={70} rx={6} fill="#0c1220" stroke={col} strokeWidth={3} />
    <rect x={53} y={41 - 64 * clamp(charge)} width={38} height={64 * clamp(charge)} rx={4} fill={hexA(col, 0.75)} />
    <line x1={60} y1={58} x2={84} y2={58} stroke={hexA(C.ink, 0.6)} strokeWidth={3} />
    <line x1={64} y1={66} x2={80} y2={66} stroke={hexA(C.ink, 0.6)} strokeWidth={3} />
    {label && (
      <>
        <text x={0} y={42} textAnchor="middle" fontFamily={FONT.mono} fontSize={14} fill={C.ink2}>
          transistor
        </text>
        <text x={72} y={92} textAnchor="middle" fontFamily={FONT.mono} fontSize={14} fill={C.ink2}>
          capacitor
        </text>
      </>
    )}
  </g>
);

// ------------------------------------------------------------------ an SRAM cell (6 transistors)
export const SramCell: React.FC<{ x: number; y: number; s?: number; col?: string; a?: number }> = ({ x, y, s = 1, col = TIER.l1, a = 1 }) => {
  const T = (tx: number, ty: number, k: number) => <rect key={k} x={tx - 14} y={ty - 10} width={28} height={20} rx={4} fill={hexA(col, 0.25)} stroke={col} strokeWidth={2} />;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={a}>
      <rect x={-110} y={-70} width={220} height={140} rx={16} fill="rgba(14,10,30,0.9)" stroke={hexA(col, 0.5)} strokeWidth={2} />
      {/* two cross-coupled inverters (4 transistors) + 2 access transistors */}
      {[T(-40, -30, 0), T(-40, 30, 1), T(40, -30, 2), T(40, 30, 3), T(-85, 0, 4), T(85, 0, 5)]}
      <path d="M-26,-30 C0,-30 0,30 26,30 M-26,30 C0,30 0,-30 26,-30" fill="none" stroke={hexA(col, 0.7)} strokeWidth={2} />
      <line x1={-71} y1={0} x2={-40} y2={0} stroke={hexA(col, 0.6)} strokeWidth={2} />
      <line x1={71} y1={0} x2={40} y2={0} stroke={hexA(col, 0.6)} strokeWidth={2} />
      <text y={60} textAnchor="middle" fontFamily={FONT.mono} fontSize={14} fill={hexA(col, 0.95)}>
        6 transistors · 1 bit
      </text>
    </g>
  );
};

// ------------------------------------------------------------------ cache line: 128 bytes = 16 numbers
export const LINE_NUMS = 16;
/** A cache line drawn as 16 eight-byte slots. `lit` marks slots that have been used (hits). */
export const CacheLineBar: React.FC<{ x: number; y: number; w?: number; h?: number; col?: string; values?: string[]; lit?: number; a?: number; label?: string }> = ({
  x,
  y,
  w = 640,
  h = 54,
  col = TIER.l1,
  values,
  lit = 0,
  a = 1,
  label,
}) => {
  const sw = w / LINE_NUMS;
  return (
    <g transform={`translate(${x} ${y})`} opacity={a}>
      <rect x={-4} y={-4} width={w + 8} height={h + 8} rx={10} fill="rgba(10,10,24,0.9)" stroke={hexA(col, 0.7)} strokeWidth={2} />
      {new Array(LINE_NUMS).fill(0).map((_, i) => {
        const on = clamp(lit - i);
        return (
          <g key={i}>
            <rect x={i * sw + 2} y={2} width={sw - 4} height={h - 4} rx={5} fill={hexA(on > 0.5 ? C.green : col, 0.14 + 0.3 * on)} stroke={hexA(on > 0.5 ? C.green : col, 0.5)} strokeWidth={1} />
            {values && (
              <text x={i * sw + sw / 2} y={h / 2 + 6} textAnchor="middle" fontFamily={FONT.mono} fontSize={Math.min(19, sw * 0.46)} fill={C.ink}>
                {values[i]}
              </text>
            )}
          </g>
        );
      })}
      {label && (
        <text x={0} y={-14} fontFamily={FONT.ui} fontWeight={700} fontSize={15} letterSpacing="0.2em" fill={hexA(col, 0.95)}>
          {label}
        </text>
      )}
    </g>
  );
};

/** Deterministic little numbers to fill memory with. */
export const numAt = (i: number) => String(Math.floor(rnd(`num${i}`) * 90 + 10));

// ------------------------------------------------------------------ address bits
export type Field = { label: string; bits: number; col: string };
/** A binary address split into colored fields (tag | set | offset), MSB first. */
export const AddressBits: React.FC<{ x: number; y: number; value: number; fields: Field[]; cell?: number; a?: number; split?: number }> = ({ x, y, value, fields, cell = 26, a = 1, split = 1 }) => {
  const total = fields.reduce((s, f) => s + f.bits, 0);
  let bit = total - 1;
  let cx = 0;
  const out: React.ReactNode[] = [];
  fields.forEach((fd, fi) => {
    const x0 = cx;
    for (let k = 0; k < fd.bits; k++) {
      const b = Math.floor(value / 2 ** bit) % 2;
      out.push(
        <g key={`${fi}-${k}`}>
          <rect x={cx} y={0} width={cell - 3} height={cell + 10} rx={4} fill={hexA(fd.col, 0.12 + 0.2 * split)} stroke={hexA(fd.col, 0.3 + 0.6 * split)} strokeWidth={1.2} />
          <text x={cx + (cell - 3) / 2} y={cell - 2} textAnchor="middle" fontFamily={FONT.mono} fontSize={cell * 0.62} fill={C.ink}>
            {b}
          </text>
        </g>,
      );
      cx += cell;
      bit--;
    }
    out.push(
      <text key={`l${fi}`} x={(x0 + cx - 3) / 2} y={cell + 40} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={15} letterSpacing="0.15em" fill={hexA(fd.col, split)}>
        {fd.label}
      </text>,
    );
    cx += 12 * split;
  });
  return (
    <g transform={`translate(${x} ${y})`} opacity={a}>
      {out}
    </g>
  );
};

/** Width of an AddressBits block (for centering). */
export const addressWidth = (fields: Field[], cell = 26, split = 1) => fields.reduce((s, f) => s + f.bits * cell, 0) + (fields.length - 1) * 12 * split;

// ------------------------------------------------------------------ simple boxes
/** A labelled rounded block (core, cache, memory…) in SVG. */
export const Block: React.FC<{ x: number; y: number; w: number; h: number; col: string; title: string; sub?: string; glow?: number; a?: number; fill?: number; children?: React.ReactNode }> = ({
  x,
  y,
  w,
  h,
  col,
  title,
  sub,
  glow = 0,
  a = 1,
  fill = 0.08,
  children,
}) => (
  <g opacity={a}>
    <rect x={x} y={y} width={w} height={h} rx={18} fill={hexA(col, fill)} stroke={col} strokeWidth={2.5} style={glow > 0.02 ? { filter: `drop-shadow(0 0 ${18 * glow}px ${hexA(col, 0.8)})` } : undefined} />
    <text x={x + 20} y={y + 36} fontFamily={FONT.display} fontWeight={700} fontSize={26} fill={C.ink}>
      {title}
    </text>
    {sub && (
      <text x={x + 20} y={y + 60} fontFamily={FONT.mono} fontSize={15} fill={hexA(col, 0.95)}>
        {sub}
      </text>
    )}
    {children}
  </g>
);

/** A glowing packet travelling along a straight segment (for requests / data). */
export const Packet: React.FC<{ x0: number; y0: number; x1: number; y1: number; p: number; col: string; label?: string; w?: number }> = ({ x0, y0, x1, y1, p, col, label, w = 70 }) => {
  if (p <= 0 || p >= 1) return null;
  const x = mix(x0, x1, p);
  const y = mix(y0, y1, p);
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-w / 2} y={-15} width={w} height={30} rx={15} fill={hexA(col, 0.3)} stroke={col} strokeWidth={2} style={{ filter: `drop-shadow(0 0 10px ${col})` }} />
      {label && (
        <text y={6} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={14} fill={C.ink}>
          {label}
        </text>
      )}
    </g>
  );
};

// ------------------------------------------------------------------ a bitline on an oscilloscope
/** Voltage of two bitlines during a DRAM read: precharge → a tiny nudge → amplified to full rail. */
export const ScopeLike: React.FC<{ x: number; y: number; w: number; h: number; share: number; amp: number; zoom: number; f: number }> = ({ x, y, w, h, share, amp, zoom }) => {
  const reveal = 0.3 + 0.25 * clamp(share) + 0.45 * clamp(amp);
  const ys = mix(1, 5, zoom); // vertical magnification around the precharge level
  const V = (u: number, d: number) => {
    if (u < 0.3) return 0.5;
    if (u < 0.55) return 0.5 + 0.06 * d * clamp((u - 0.3) / 0.12);
    const a = clamp((u - 0.55) / 0.3);
    const e = a * a * (3 - 2 * a);
    return 0.5 + d * (0.06 + 0.44 * e);
  };
  const toY = (v: number) => {
    const vv = 0.5 + (v - 0.5) * ys;
    return y + 40 + (1 - clamp(vv, -0.05, 1.05)) * (h - 70);
  };
  const path = (d: number) => {
    let s = "";
    for (let u = 0; u <= reveal; u += 0.01) s += `${u === 0 ? "M" : "L"}${(x + 20 + u * (w - 40)).toFixed(1)},${toY(V(u, d)).toFixed(1)}`;
    return s;
  };
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={16} fill="rgba(4,10,12,0.88)" stroke={hexA(C.cyan, 0.45)} strokeWidth={2} />
      <text x={x + 18} y={y + 28} fontFamily={FONT.ui} fontWeight={700} fontSize={15} letterSpacing="0.2em" fill={hexA(C.cyan, 0.9)}>
        BITLINE VOLTAGE{zoom > 0.5 ? " · ZOOMED IN" : ""}
      </text>
      <line x1={x + 20} y1={toY(0.5)} x2={x + w - 20} y2={toY(0.5)} stroke={hexA(C.ink, 0.25)} strokeDasharray="4 6" />
      <path d={path(1)} fill="none" stroke={TIER.dram} strokeWidth={3} />
      <path d={path(-1)} fill="none" stroke={C.rose} strokeWidth={3} />
      <text x={x + w - 24} y={toY(V(1, 1)) - 8} textAnchor="end" fontFamily={FONT.mono} fontSize={15} fill={TIER.dram} opacity={clamp(amp)}>
        1
      </text>
      <text x={x + w - 24} y={toY(V(1, -1)) + 20} textAnchor="end" fontFamily={FONT.mono} fontSize={15} fill={C.rose} opacity={clamp(amp)}>
        0
      </text>
      {zoom > 0.3 && share > 0.5 && amp < 0.3 && (
        <text x={x + w * 0.5} y={toY(0.56) - 14} textAnchor="middle" fontFamily={FONT.mono} fontSize={16} fill={C.ink}>
          the tiny nudge
        </text>
      )}
    </g>
  );
};
