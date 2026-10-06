import React from "react";
import { C, FONT } from "../theme";
import { Cam, Face, V3, extrude, groundMatrix, prepareFaces, project, roundRect } from "../lib/proj3d";

export type KeyDef = { id: string; label: string; x: number; w: number; row: number; h: number; col: number };

// MacBook-style ANSI layout, in key units (14.5 units wide).
const ROWS: [string, number][][] = [
  [["esc", 1.5], ["F1", 1], ["F2", 1], ["F3", 1], ["F4", 1], ["F5", 1], ["F6", 1], ["F7", 1], ["F8", 1], ["F9", 1], ["F10", 1], ["F11", 1], ["F12", 1], ["●", 1]],
  [["`", 1], ["1", 1], ["2", 1], ["3", 1], ["4", 1], ["5", 1], ["6", 1], ["7", 1], ["8", 1], ["9", 1], ["0", 1], ["-", 1], ["=", 1], ["delete", 1.5]],
  [["tab", 1.5], ["Q", 1], ["W", 1], ["E", 1], ["R", 1], ["T", 1], ["Y", 1], ["U", 1], ["I", 1], ["O", 1], ["P", 1], ["[", 1], ["]", 1], ["\\", 1]],
  [["caps", 1.8], ["A", 1], ["S", 1], ["D", 1], ["F", 1], ["G", 1], ["H", 1], ["J", 1], ["K", 1], ["L", 1], [";", 1], ["'", 1], ["return", 1.7]],
  [["shift", 2.3], ["Z", 1], ["X", 1], ["C", 1], ["V", 1], ["B", 1], ["N", 1], ["M", 1], [",", 1], [".", 1], ["/", 1], ["shift ", 2.2]],
  [["fn", 1], ["control", 1], ["option", 1], ["⌘", 1.25], ["", 5], ["⌘ ", 1.25], ["option ", 1], ["◀", 1], ["▲▼", 1], ["▶", 1]],
];

export const KEYS: KeyDef[] = ROWS.flatMap((row, r) => {
  let x = 0;
  return row.map(([label, w], col) => {
    const k: KeyDef = { id: `${r}:${col}`, label: label.trim(), x, w, row: r, h: r === 0 ? 0.55 : 1, col };
    x += w;
    return k;
  });
});

export const findKey = (label: string) => KEYS.find((k) => k.label === label)!;

export const PITCH = 100; // world units per key unit
export const KB_W = 14.5 * PITCH;

/** World-space center of a key (top surface at z = keyHeight). */
export const keyCenter = (k: KeyDef): V3 => {
  const rowY = [0, 0.78, 1.78, 2.78, 3.78, 4.78][k.row];
  return [(k.x + k.w / 2) * PITCH - KB_W / 2, -(rowY + (k.row === 0 ? 0.275 : 0.5)) * PITCH + 2.9 * PITCH, 0];
};

export type KeyboardProps = {
  cam: Cam;
  press?: Record<string, number>; // label → 0..1
  glow?: Record<string, number>; // label → 0..1 (cyan underglow)
  tint?: Record<string, string>;
  keyColor?: string;
  letters?: number; // letter opacity
  backlight?: number;
  filter?: (k: KeyDef) => boolean;
  ghost?: number; // 0..1 fade keys to wireframe
  height?: number;
  /** world point the "lens" focuses on; keys fall off into darkness away from it */
  focus?: V3;
  focusRadius?: number;
  deck?: boolean;
  /** world-space translation of the whole keyboard */
  offset?: V3;
  /** underglow color for `glow` (default cyan) */
  glowColor?: string;
};

const TRAVEL = 9;

export const Keyboard3D: React.FC<KeyboardProps> = ({
  cam,
  press = {},
  glow = {},
  tint = {},
  keyColor = "#191c27",
  letters = 1,
  backlight = 0.35,
  filter,
  ghost = 0,
  height = 14,
  focus,
  focusRadius = 900,
  deck = true,
  offset = [0, 0, 0],
  glowColor = C.cyan,
}) => {
  const ug = `kb-under-${glowColor.replace("#", "")}`;
  const keys = KEYS.filter((k) => (filter ? filter(k) : true));
  const kc = (k: KeyDef): V3 => {
    const c = keyCenter(k);
    return [c[0] + offset[0], c[1] + offset[1], c[2] + offset[2]];
  };
  // sort keys far → near by projected depth of center
  const withDepth = keys
    .map((k) => {
      const c = kc(k);
      return { k, c, depth: project(cam, c).depth };
    })
    .sort((a, b) => b.depth - a.depth);

  const deckFaces = deck
    ? prepareFaces(cam, extrude(roundRect(offset[0], 25 + offset[1], KB_W + 260, 760, 46, 8), offset[2] - 10, 8, "#0d0f17", { inset: 4, topGlow: 1.25, group: -1 }), {
        dir: [-0.35, -0.75, 0.9],
        ambient: 0.55,
        diffuse: 0.5,
      })
    : [];
  return (
    <g>
      {deckFaces.map((f, i) => (
        <path key={`d${i}`} d={f.d} fill={f.fill} stroke={i === deckFaces.length - 1 ? "rgba(190,205,255,0.10)" : "rgba(190,205,255,0.05)"} strokeWidth={1} />
      ))}
      <defs>
        <radialGradient id={ug}>
          <stop offset="0%" stopColor={glowColor} stopOpacity={0.9} />
          <stop offset="45%" stopColor={glowColor} stopOpacity={0.25} />
          <stop offset="100%" stopColor={glowColor} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="kb-back">
          <stop offset="0%" stopColor="#9fb4ff" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#9fb4ff" stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* underglow / backlight on the deck */}
      {keys.map((k) => {
        const g = glow[k.label] ?? 0;
        const c = kc(k);
        const m = groundMatrix(cam, c[0], c[1], c[2] + 0.5);
        return (
          <g key={`g${k.id}`} transform={m}>
            {backlight > 0 && <ellipse cx={0} cy={0} rx={k.w * PITCH * 0.62} ry={k.h * PITCH * 0.62} fill="url(#kb-back)" opacity={backlight} />}
            {g > 0 && <ellipse cx={0} cy={0} rx={k.w * PITCH * 1.6} ry={k.h * PITCH * 1.6} fill={`url(#${ug})`} opacity={g} />}
          </g>
        );
      })}
      {withDepth.map(({ k, c }) => {
        const p = press[k.label] ?? 0;
        const z0 = c[2] - p * TRAVEL;
        const outline = roundRect(c[0], c[1], k.w * PITCH - 16, k.h * PITCH - 16, 11, 4);
        const color = tint[k.label] ?? keyColor;
        const fd = focus ? Math.hypot(c[0] - focus[0], c[1] - focus[1]) / focusRadius : 0;
        const fog = focus ? 1 - 0.62 * Math.min(1, fd * fd) : 1;
        const faces: Face[] = extrude(outline, z0, height, color, {
          inset: 3.5,
          topColor: color,
          topGlow: 1.22,
          glow: fog,
          stroke: ghost > 0 ? C.cyan : "rgba(255,255,255,0.035)",
          strokeWidth: ghost > 0 ? 1.2 : 0.8,
          alpha: 1 - ghost * 0.92,
        });
        faces[0] = { ...faces[0], stroke: ghost > 0 ? C.cyan : `rgba(220,228,255,${0.16 * fog})`, strokeWidth: 1.1 };
        const drawn = prepareFaces(cam, faces, { dir: [-0.35, -0.75, 0.9], ambient: 0.5, diffuse: 0.62 });
        const top = z0 + height;
        const m = groundMatrix(cam, c[0], c[1], top + 0.2);
        const g = glow[k.label] ?? 0;
        const fs = k.label.length > 2 ? 15 : k.row === 0 ? 15 : 30;
        return (
          <g key={k.id}>
            {drawn.map((f, i) => (
              <path
                key={i}
                d={f.d}
                fill={f.fill}
                stroke={f.stroke}
                strokeWidth={f.strokeWidth}
                strokeOpacity={ghost > 0 ? 0.6 * ghost : 1}
                strokeLinejoin="round"
              />
            ))}
            {letters > 0 && k.label && (
              <text
                transform={m}
                x={k.label.length > 2 ? -k.w * PITCH * 0.5 + 22 : 0}
                y={k.label.length > 2 ? k.h * PITCH * 0.5 - 24 : 10}
                textAnchor={k.label.length > 2 ? "start" : "middle"}
                fontFamily={FONT.ui}
                fontWeight={500}
                fontSize={fs}
                fill={g > 0.05 ? mixC(g) : "#dfe5f5"}
                opacity={letters * (1 - ghost * 0.4) * fog}
              >
                {k.label}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};

const mixC = (g: number) => {
  const a = [201, 209, 234];
  const b = [143, 243, 255];
  const m = (i: number) => Math.round(a[i] + (b[i] - a[i]) * Math.min(1, g));
  return `rgb(${m(0)}, ${m(1)}, ${m(2)})`;
};
