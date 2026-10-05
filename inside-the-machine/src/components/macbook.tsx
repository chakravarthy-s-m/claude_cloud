import React from "react";
import { C, hexA } from "../theme";
import { Cam, Face, V3, box, extrude, pbox, planeMatrix, prepareFaces, roundRect } from "../lib/proj3d";
import { Keyboard3D } from "./keyboard";

export type MacState = {
  /** 0 = assembled, 1 = top case lifted away */
  explode: number;
  /** lid presence 0..1 (fades/lifts away while exploding) */
  lid: number;
  /** 0..1 SoC glow */
  socGlow: number;
  /** screen brightness 0..1 */
  screen: number;
};

const BASE = { w: 1560, d: 1100, t: 24 };
const TOP_T = 6;
const HINGE_Y = BASE.d / 2;
const TILT = 16; // degrees back from vertical
export const SOC_POS: V3 = [0, 300, BASE.t + 6];

const D2R = Math.PI / 180;

export const MacBook3D: React.FC<{ cam: Cam; st: MacState; frame: number; press?: Record<string, number>; glow?: Record<string, number> }> = ({ cam, st, frame, press, glow }) => {
  const L = { dir: [-0.4, -0.7, 0.85] as V3, ambient: 0.48, diffuse: 0.62 };
  const ex = st.explode;
  const lift = ex * ex * 2400;
  const ghost = Math.min(1, ex * 1.3);

  // ---------- bottom case + internals
  const bottom: Face[] = [
    ...extrude(roundRect(0, 0, BASE.w, BASE.d, 64, 6), 0, BASE.t, "#2a3040", { topColor: "#1a2030", topGlow: 1.0, group: 0, layer: 0, stroke: "rgba(200,210,255,0.12)", strokeWidth: 1 }),
  ];
  const internals: Face[] = [];
  let g = 10;
  if (ex > 0.02) {
    // battery cells
    for (const [x, y] of [[-390, -170], [0, -170], [390, -170]] as [number, number][]) {
      internals.push(...box([x, y, BASE.t], [360, 560, 10], "#2c3447", { group: g++, layer: 1, top: "#38425a", stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }));
    }
    // logic board
    internals.push(...box([0, 300, BASE.t], [640, 330, 5], "#0f241d", { group: g++, layer: 1, top: "#123026", stroke: hexA(C.green, 0.5), strokeWidth: 1.2 }));
    // small components
    for (let i = 0; i < 14; i++) {
      const x = -280 + (i % 7) * 90 + (i > 6 ? 30 : 0);
      const y = i > 6 ? 200 : 420;
      if (Math.abs(x) < 110) continue;
      internals.push(...box([x, y, BASE.t + 5], [46, 30, 6], "#1b2333", { group: g++, layer: 2, top: "#2c3650" }));
    }
    // SoC package + memory
    internals.push(...box([SOC_POS[0], SOC_POS[1], BASE.t + 5], [170, 130, 8], "#1a2030", { group: g++, layer: 2, top: "#232c40", stroke: hexA(C.gold, 0.5), strokeWidth: 1 }));
    internals.push(
      ...box([SOC_POS[0] - 18, SOC_POS[1], BASE.t + 13], [96, 96, 4], "#121722", {
        group: g++,
        layer: 3,
        top: st.socGlow > 0.02 ? C.cyan : "#1b2232",
        topGlow: 0.5 + st.socGlow * 0.9,
        stroke: hexA(C.cyan, 0.4 + 0.6 * st.socGlow),
        strokeWidth: 1.4,
      }),
    );
    for (const y of [SOC_POS[1] - 30, SOC_POS[1] + 30]) {
      internals.push(...box([SOC_POS[0] + 58, y, BASE.t + 13], [36, 50, 5], "#2a3245", { group: g++, layer: 3, top: "#3a4560" }));
    }
    // speakers
    for (const x of [-700, 700]) internals.push(...box([x, -60, BASE.t], [90, 760, 8], "#1c2230", { group: g++, layer: 1, top: "#283044" }));
  }

  // ---------- top case (lifts away)
  const topCase = extrude(roundRect(0, 0, BASE.w - 4, BASE.d - 4, 62, 6), BASE.t + lift, TOP_T, "#2b3142", {
    topColor: "#1c2130",
    topGlow: 1.05,
    group: 100,
    alpha: 1 - ghost,
    stroke: ghost > 0.05 ? hexA(C.cyan, 0.35 * ghost) : "rgba(200,210,255,0.10)",
    strokeWidth: 1,
  });
  const trackpad = extrude(roundRect(0, -335, 640, 390, 26, 4), BASE.t + TOP_T + lift, 0.8, "#232838", {
    topGlow: 1.12,
    group: 101,
    alpha: 1 - ghost,
    stroke: "rgba(200,210,255,0.12)",
    strokeWidth: 1,
  });

  // ---------- lid
  const tilt = TILT + (1 - st.lid) * 40;
  const D: V3 = [0, Math.sin(tilt * D2R), Math.cos(tilt * D2R)];
  const N: V3 = [0, -Math.cos(tilt * D2R), Math.sin(tilt * D2R)];
  const LH = 1010;
  const lidLift = (1 - st.lid) * 900;
  const lo: V3 = [-BASE.w / 2 + 2, HINGE_Y - 8, BASE.t + 2 + lidLift];
  const lid = st.lid > 0.02 ? pbox(lo, [BASE.w - 4, 0, 0], [D[0] * LH, D[1] * LH, D[2] * LH], [-N[0] * 14, -N[1] * 14, -N[2] * 14], "#2b3142", { group: 200, alpha: st.lid, stroke: "rgba(200,210,255,0.10)", strokeWidth: 1 }) : [];

  const drawnBottom = prepareFaces(cam, [...bottom, ...internals], L);
  const drawnTop = prepareFaces(cam, [...topCase, ...trackpad], L);
  const drawnLid = prepareFaces(cam, lid, L);

  // screen plane mapping (top-left of display area, u → right, v → down)
  const inset = 22;
  const top: V3 = [lo[0] + inset, lo[1] + D[1] * (LH - inset), lo[2] + D[2] * (LH - inset)];
  const sm = planeMatrix(cam, [top[0] + N[0] * 0.5, top[1] + N[1] * 0.5, top[2] + N[2] * 0.5], [1, 0, 0], [-D[0], -D[1], -D[2]]);
  const SW = BASE.w - 4 - inset * 2;
  const SH = LH - inset * 2 - 40;
  const lidFacingViewer = drawnLid.some((f) => f.normal[1] < -0.5);

  return (
    <g>
      {drawnBottom.map((f, i) => (
        <path key={`b${i}`} d={f.d} fill={f.fill} stroke={f.stroke} strokeWidth={f.strokeWidth} strokeLinejoin="round" />
      ))}
      {drawnTop.map((f, i) => (
        <path key={`t${i}`} d={f.d} fill={f.fill} stroke={f.stroke} strokeWidth={f.strokeWidth} strokeLinejoin="round" />
      ))}
      <g opacity={1 - ghost}>
        <Keyboard3D cam={cam} deck={false} offset={[0, 168, BASE.t + TOP_T + lift]} height={9} backlight={0.12} letters={0.85} press={press} glow={glow} />
      </g>
      {drawnLid.map((f, i) => (
        <path key={`l${i}`} d={f.d} fill={f.fill} stroke={f.stroke} strokeWidth={f.strokeWidth} strokeLinejoin="round" />
      ))}
      {st.lid > 0.02 && lidFacingViewer && (
        <g transform={sm} opacity={st.lid}>
          <Screen w={SW} h={SH} frame={frame} bright={st.screen} />
        </g>
      )}
    </g>
  );
};

/** A sleek, generic desktop (no real Apple artwork). */
export const Screen: React.FC<{ w: number; h: number; frame: number; bright: number }> = ({ w, h, frame, bright }) => {
  const t = frame / 30;
  return (
    <g>
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a1446" />
          <stop offset="45%" stopColor="#3b1d6e" />
          <stop offset="75%" stopColor="#0f4c6e" />
          <stop offset="100%" stopColor="#081a33" />
        </linearGradient>
        <radialGradient id="wallGlow" cx="0.3" cy="0.7" r="0.6">
          <stop offset="0%" stopColor={hexA(C.pink, 0.55)} />
          <stop offset="100%" stopColor={hexA(C.pink, 0)} />
        </radialGradient>
        <clipPath id="scr">
          <rect width={w} height={h} rx={10} />
        </clipPath>
      </defs>
      <rect x={-12} y={-12} width={w + 24} height={h + 64} rx={18} fill="#05060a" />
      <g clipPath="url(#scr)" opacity={bright}>
        <rect width={w} height={h} fill="url(#wall)" />
        <circle cx={w * (0.3 + 0.05 * Math.sin(t * 0.3))} cy={h * 0.7} r={h * 0.8} fill="url(#wallGlow)" />
        {/* menu bar */}
        <rect width={w} height={26} fill="rgba(10,10,20,0.35)" />
        <circle cx={24} cy={13} r={6} fill="rgba(255,255,255,0.8)" />
        {/* window: text editor */}
        <g transform={`translate(${w * 0.16}, ${h * 0.16})`}>
          <rect width={w * 0.44} height={h * 0.56} rx={14} fill="rgba(22,24,36,0.92)" stroke="rgba(255,255,255,0.12)" />
          <circle cx={22} cy={20} r={6} fill="#ff5f57" />
          <circle cx={42} cy={20} r={6} fill="#febc2e" />
          <circle cx={62} cy={20} r={6} fill="#28c840" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={30} y={60 + i * 34} width={w * 0.44 - 60 - ((i * 53) % 140)} height={12} rx={6} fill="rgba(255,255,255,0.14)" />
          ))}
        </g>
        {/* second window */}
        <g transform={`translate(${w * 0.52}, ${h * 0.3})`}>
          <rect width={w * 0.34} height={h * 0.46} rx={14} fill="rgba(30,32,48,0.9)" stroke="rgba(255,255,255,0.12)" />
          <rect x={20} y={46} width={w * 0.34 - 40} height={h * 0.46 - 70} rx={10} fill="url(#wall)" opacity={0.7} />
        </g>
        {/* dock */}
        <rect x={w / 2 - 260} y={h - 76} width={520} height={62} rx={20} fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.2)" />
        {[C.pink, C.cyan, C.violet, C.amber, C.green, C.blue, C.rose].map((c, i) => (
          <rect key={i} x={w / 2 - 240 + i * 70} y={h - 68} width={50} height={46} rx={12} fill={c} opacity={0.85} />
        ))}
      </g>
    </g>
  );
};
