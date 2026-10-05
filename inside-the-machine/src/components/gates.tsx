import React from "react";
import { C, FONT, hexA } from "../theme";

export type GateKind = "AND" | "OR" | "XOR" | "NAND" | "NOT";

/** Standard logic-gate symbol, 100×80 box with ports at (0,20),(0,60) → (100|110,40). */
export const GateShape: React.FC<{ kind: GateKind; x: number; y: number; color: string; lit?: number; scale?: number; label?: boolean }> = ({
  kind,
  x,
  y,
  color,
  lit = 0,
  scale = 1,
  label = true,
}) => {
  const fill = hexA(color, 0.08 + lit * 0.22);
  const stroke = color;
  const sw = 3 / scale;
  let body: React.ReactNode;
  if (kind === "AND" || kind === "NAND") body = <path d="M0,0 H50 A40,40 0 0 1 50,80 H0 Z" fill={fill} stroke={stroke} strokeWidth={sw} />;
  else if (kind === "OR" || kind === "XOR")
    body = (
      <>
        <path d="M0,0 Q55,0 95,40 Q55,80 0,80 Q22,40 0,0 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
        {kind === "XOR" && <path d="M-12,0 Q10,40 -12,80" fill="none" stroke={stroke} strokeWidth={sw} />}
      </>
    );
  else body = <path d="M0,0 L80,40 L0,80 Z" fill={fill} stroke={stroke} strokeWidth={sw} />;
  const bubble = kind === "NAND" || kind === "NOT";
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      {lit > 0.05 && <rect x={-20} y={-20} width={140} height={120} rx={30} fill={hexA(color, 0.10 * lit)} />}
      {body}
      {bubble && <circle cx={kind === "NOT" ? 88 : 98} cy={40} r={8} fill={C.bg} stroke={stroke} strokeWidth={sw} />}
      {label && (
        <text x={kind === "NOT" ? 30 : 38} y={48} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={kind === "NAND" ? 17 : 18} fill={C.ink} opacity={0.85}>
          {kind}
        </text>
      )}
    </g>
  );
};

export const TRUTH: Record<Exclude<GateKind, "NOT">, (a: number, b: number) => number> = {
  AND: (a, b) => a & b,
  OR: (a, b) => a | b,
  XOR: (a, b) => a ^ b,
  NAND: (a, b) => 1 - (a & b),
};
