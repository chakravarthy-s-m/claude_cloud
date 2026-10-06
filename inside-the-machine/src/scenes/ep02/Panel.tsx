import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { box, cam, planeMatrix, prepareFaces, project, type Cam } from "../../lib/proj3d";
import { Glow, Kicker } from "../../components/core";
import { useCanvas } from "../../components/fx";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { RGB, wallpaper } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    what: c.pa1.from,
    apart: wordAt(c.pa1, "take the display apart"),
    backlight: wordAt(c.pa2, "a backlight"),
    pol1: wordAt(c.pa2, "a polarizing filter"),
    glass: wordAt(c.pa2, "A sheet of glass"),
    lc: wordAt(c.pa2, "liquid crystal"),
    cf: wordAt(c.pa2, "Color filters"),
    pol2: wordAt(c.pa2, "a second polarizer"),
    one: c.pa3.from,
    eighteen: wordAt(c.pa3, "nearly eighteen million"),
    charges: wordAt(c.pa3, "charges a tiny capacitor"),
    holds: wordAt(c.pa3, "holds its brightness"),
    next: wordAt(c.pa3, "next refresh"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

const PW = 1000;
const PD = 640;
const T = 12;

type LayerDef = { key: string; name: string; sub: string; col: string; at: (b: B) => number; base: string };
const LAYERS: LayerDef[] = [
  { key: "bl", name: "Backlight", sub: "thousands of tiny LEDs", col: C.amber, at: (b) => b.backlight, base: "#141a2a" },
  { key: "p1", name: "Polarizer", sub: "passes one direction of light", col: C.ink2, at: (b) => b.pol1, base: "#1a2030" },
  { key: "tft", name: "Transistor glass", sub: "one switch per subpixel", col: C.cyan, at: (b) => b.glass, base: "#0f1a26" },
  { key: "lc", name: "Liquid crystal", sub: "a few micrometres thin", col: C.violet, at: (b) => b.lc, base: "#16122a" },
  { key: "cf", name: "Color filters", sub: "red · green · blue", col: C.pink, at: (b) => b.cf, base: "#0d0d16" },
  { key: "p2", name: "Polarizer", sub: "turned 90°", col: C.ink2, at: (b) => b.pol2, base: "#1a2030" },
];

const Overlay: React.FC<{ k: string; f: number; lit: number }> = ({ k, f, lit }) => {
  switch (k) {
    case "bl":
      return (
        <g>
          {new Array(16 * 10).fill(0).map((_, i) => {
            const x = 40 + (i % 16) * 61;
            const y = 40 + Math.floor(i / 16) * 62;
            const tw = 0.75 + 0.25 * Math.sin(f * 0.1 + i);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={20} fill="url(#ledglow)" opacity={lit * tw} />
                <circle cx={x} cy={y} r={5} fill={lit > 0.1 ? "#eaf2ff" : "#3a4258"} />
              </g>
            );
          })}
        </g>
      );
    case "p1":
    case "p2": {
      const vert = k === "p2";
      return (
        <g stroke="rgba(220,230,255,0.28)" strokeWidth={2}>
          {new Array(vert ? 71 : 45).fill(0).map((_, i) => (vert ? <line key={i} x1={i * 14 + 6} y1={0} x2={i * 14 + 6} y2={PD} /> : <line key={i} x1={0} y1={i * 14 + 6} x2={PW} y2={i * 14 + 6} />))}
        </g>
      );
    }
    case "tft":
      return (
        <g>
          {new Array(16).fill(0).map((_, j) => (
            <line key={`g${j}`} x1={0} y1={20 + j * 40} x2={PW} y2={20 + j * 40} stroke={hexA(C.amber, 0.55)} strokeWidth={2} />
          ))}
          {new Array(25).fill(0).map((_, i) => (
            <line key={`d${i}`} x1={20 + i * 40} y1={0} x2={20 + i * 40} y2={PD} stroke={hexA(C.cyan, 0.45)} strokeWidth={2} />
          ))}
          {new Array(25 * 16).fill(0).map((_, i) => (
            <rect key={i} x={20 + (i % 25) * 40 - 5} y={20 + Math.floor(i / 25) * 40 - 5} width={10} height={10} fill={C.cyan} opacity={0.85} />
          ))}
        </g>
      );
    case "lc":
      return (
        <g stroke={hexA(C.purple, 0.85)} strokeWidth={4} strokeLinecap="round">
          {new Array(40 * 26).fill(0).map((_, i) => {
            const x = 14 + (i % 40) * 24.6 + rnd(`lcx${i}`, -3, 3);
            const y = 14 + Math.floor(i / 40) * 24.4 + rnd(`lcy${i}`, -3, 3);
            const a = 0.2 + rnd(`lca${i}`, -0.15, 0.15);
            return <line key={i} x1={x - Math.cos(a) * 8} y1={y - Math.sin(a) * 8} x2={x + Math.cos(a) * 8} y2={y + Math.sin(a) * 8} />;
          })}
        </g>
      );
    case "cf":
      return (
        <g>
          {new Array(84).fill(0).map((_, i) => (
            <rect key={i} x={i * 12 + 1} y={0} width={10} height={PD} fill={[RGB.r, RGB.g, RGB.b][i % 3]} opacity={0.75} />
          ))}
          {new Array(32).fill(0).map((_, j) => (
            <rect key={`h${j}`} x={0} y={j * 20} width={PW} height={3} fill="#05060b" />
          ))}
        </g>
      );
    default:
      return null;
  }
};

const Stack: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, 0, { damping: 24, stiffness: 70 });
  const explode = prog(f, b.apart - 10, 46, EASE.inOut);
  const c: Cam = cam({
    yaw: keyframes(f, [[0, -40], [b.apart, -28], [b.pol2 + 30, -20]]),
    pitch: keyframes(f, [[0, 44], [b.apart, 36], [b.pol2 + 30, 32]]),
    dist: 4200,
    scale: keyframes(f, [[0, 0.62], [b.apart, 0.6], [b.pol2 + 30, 0.62]]) * mix(0.9, 1, inP),
    target: [0, 0, mix(0, 380, explode)],
    cx: 860,
    cy: 560,
  });
  const gap = 150 * explode;
  const imgA = 1 - prog(f, b.apart - 10, 24);
  const blLit = prog(f, b.backlight - 6, 14);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Glow x={860} y={560} size={1500} color={C.amber} a={0.1 + 0.12 * blLit} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="ledglow">
            <stop offset="0" stopColor="#ffffff" stopOpacity={0.95} />
            <stop offset="0.35" stopColor="#bcd4ff" stopOpacity={0.5} />
            <stop offset="1" stopColor="#7aa2ff" stopOpacity={0} />
          </radialGradient>
        </defs>
        {LAYERS.map((L, k) => {
          const z = k * (T + gap);
          const glassy = k === 0 ? 1 : mix(1, L.key === "p1" || L.key === "p2" ? 0.28 : 0.5, explode);
          const faces = prepareFaces(c, box([0, 0, z], [PW, PD, T], L.base, { top: L.base, alpha: glassy, stroke: hexA(L.col, 0.35 + 0.45 * explode), strokeWidth: 1.6 }));
          const m = planeMatrix(c, [-PW / 2, PD / 2, z + T + 0.5], [1, 0, 0], [0, -1, 0]);
          const on = prog(f, L.at(b) - 6, 14);
          return (
            <g key={L.key}>
              {faces.map((fc, i) => (
                <path key={i} d={fc.d} fill={fc.fill} stroke={fc.stroke} strokeWidth={fc.strokeWidth} />
              ))}
              <g transform={m} opacity={k === 0 ? 1 : mix(0.35, 1, Math.max(on, 1 - explode))}>
                <Overlay k={L.key} f={f} lit={k === 0 ? Math.max(blLit, 1 - explode) : 1} />
              </g>
            </g>
          );
        })}
        {/* assembled: the panel shows the picture */}
        {imgA > 0.01 && (
          <g transform={planeMatrix(c, [-PW / 2, PD / 2, LAYERS.length * T + 1], [1, 0, 0], [0, -1, 0])} opacity={imgA}>
            <foreignObject width={PW} height={PD}>
              <ImgCanvas />
            </foreignObject>
          </g>
        )}
      </svg>
      {/* labels */}
      {LAYERS.map((L, k) => {
        const z = k * (T + gap);
        const p = project(c, [PW / 2, -PD / 2, z + T]);
        const la = prog(f, L.at(b) - 6, 14) * explode;
        if (la <= 0.01) return null;
        return (
          <div key={L.key + k} style={{ position: "absolute", left: p.x + 40, top: p.y - 30, opacity: la, transform: `translateX(${(1 - la) * 20}px)`, whiteSpace: "nowrap" }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: C.ink }}>
              <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 6, background: L.col, marginRight: 12, boxShadow: `0 0 10px ${L.col}` }} />
              {L.name}
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 18, color: hexA(L.col, 0.95), marginLeft: 24 }}>{L.sub}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 110, top: 112, opacity: inOut(f, 4, 16, b.one - 10, 12) }}>
        <Kicker color={C.amber}>Liquid Retina XDR · LCD + mini-LED</Kicker>
      </div>
    </AbsoluteFill>
  );
};

const ImgCanvas: React.FC = () => {
  const ref = useCanvas((ctx) => {
    const img = wallpaper(960, 540);
    const sw = 540 * (PW / PD);
    ctx.drawImage(img, (960 - sw) / 2, 0, sw, 540, 0, 0, PW, PD);
  }, []);
  return <canvas ref={ref} width={PW} height={PD} style={{ display: "block" }} />;
};

// ------------------------------------------------------------------ one subpixel: transistor + capacitor
const Cell: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.one - 8, { damping: 22, stiffness: 90 });
  // two refreshes: select pulses
  const pulses = [b.charges - 10, b.next + 6];
  const P = 22;
  const gate = pulses.some((t) => f >= t && f < t + P) ? 1 : 0;
  const gateGlow = Math.max(...pulses.map((t) => inOut(f, t, 4, t + P - 4, 6)));
  // capacitor voltage: charges during the first pulse, holds, (re)charges a new level on the next
  const v1 = 0.78;
  const v2 = 0.52;
  const V = f < pulses[0] ? 0.15 : f < pulses[0] + P ? mix(0.15, v1, EASE.out(clamp((f - pulses[0]) / (P - 4)))) : f < pulses[1] ? v1 - (f - pulses[0] - P) * 0.0004 : mix(v1 - (pulses[1] - pulses[0] - P) * 0.0004, v2, EASE.out(clamp((f - pulses[1]) / (P - 4))));
  const count = Math.round(mix(0, 17817408, prog(f, b.eighteen - 6, 40, EASE.out)));
  // charge dots flowing down the data line into the pixel while the gate is open
  const dots = new Array(8).fill(0).map((_, k) => ((f * 0.06 + k / 8) % 1));
  const X = 560;
  const Y = 360;
  const sub = RGB.g;
  const graphW = 560;
  const graphH = 160;
  const gx0 = 1180;
  const gy0 = 720;
  // voltage history polyline
  let d = "";
  for (let t = b.one; t <= f; t += 2) {
    const vt = t < pulses[0] ? 0.15 : t < pulses[0] + P ? mix(0.15, v1, EASE.out(clamp((t - pulses[0]) / (P - 4)))) : t < pulses[1] ? v1 - (t - pulses[0] - P) * 0.0004 : mix(v1 - (pulses[1] - pulses[0] - P) * 0.0004, v2, EASE.out(clamp((t - pulses[1]) / (P - 4))));
    const x = gx0 + ((t - b.one) / (b.end - b.one)) * graphW;
    d += `${d ? "L" : "M"}${x.toFixed(1)},${(gy0 + graphH - vt * graphH).toFixed(1)}`;
  }
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.4) }}>
      <div style={{ position: "absolute", left: 110, top: 112 }}>
        <Kicker color={C.cyan} at={b.one - 6}>
          One subpixel up close
        </Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* gate (row) line */}
        <line x1={X - 300} y1={Y} x2={X + 520} y2={Y} stroke={gate ? C.amber : hexA(C.amber, 0.45)} strokeWidth={gate ? 7 : 4} style={{ filter: gate ? `drop-shadow(0 0 10px ${C.amber})` : undefined }} />
        <text x={X - 300} y={Y - 18} fontFamily={FONT.mono} fontSize={22} fill={C.amber}>
          row (gate) line
        </text>
        {/* data (column) line */}
        <line x1={X - 160} y1={Y - 120} x2={X - 160} y2={Y + 520} stroke={hexA(C.cyan, 0.8)} strokeWidth={4} />
        <text x={X - 176} y={Y + 500} textAnchor="end" fontFamily={FONT.mono} fontSize={22} fill={C.cyan}>
          column (data) line
        </text>
        {/* transistor at the crossing */}
        <g transform={`translate(${X - 100} ${Y + 70})`}>
          <rect x={-46} y={-34} width={92} height={68} rx={12} fill={gate ? hexA(C.green, 0.35) : "#121a2a"} stroke={gate ? C.green : hexA(C.green, 0.5)} strokeWidth={2.5} style={{ filter: gate ? `drop-shadow(0 0 14px ${C.green})` : undefined }} />
          <text x={0} y={8} textAnchor="middle" fontFamily={FONT.ui} fontWeight={800} fontSize={22} fill={C.ink}>
            TFT
          </text>
          <line x1={0} y1={-34} x2={0} y2={-70} stroke={hexA(C.amber, 0.8)} strokeWidth={3} />
          <line x1={-46} y1={0} x2={-60} y2={0} stroke={hexA(C.cyan, 0.8)} strokeWidth={3} />
          <line x1={46} y1={0} x2={80} y2={0} stroke={hexA(C.cyan, 0.8)} strokeWidth={3} />
        </g>
        {/* pixel electrode (the subpixel) */}
        <rect x={X - 20} y={Y + 40} width={300} height={380} rx={14} fill={hexA(sub, 0.08 + 0.75 * V)} stroke={hexA(sub, 0.8)} strokeWidth={2} style={{ filter: `drop-shadow(0 0 ${30 * V}px ${hexA(sub, 0.8)})` }} />
        <text x={X + 130} y={Y + 440 + 34} textAnchor="middle" fontFamily={FONT.mono} fontSize={22} fill={C.ink2}>
          pixel electrode
        </text>
        {/* storage capacitor */}
        <g transform={`translate(${X + 380} ${Y + 230})`}>
          <line x1={-100} y1={0} x2={-12} y2={0} stroke={hexA(C.cyan, 0.7)} strokeWidth={3} />
          <line x1={-12} y1={-40} x2={-12} y2={40} stroke={C.ink} strokeWidth={6} />
          <line x1={12} y1={-40} x2={12} y2={40} stroke={C.ink} strokeWidth={6} />
          <line x1={12} y1={0} x2={60} y2={0} stroke={hexA(C.ink, 0.5)} strokeWidth={3} />
          {/* charge level */}
          <rect x={-40} y={60} width={80} height={14} rx={7} fill="rgba(255,255,255,0.08)" />
          <rect x={-40} y={60} width={80 * V} height={14} rx={7} fill={C.cyan} />
          <text x={0} y={110} textAnchor="middle" fontFamily={FONT.mono} fontSize={22} fill={C.cyan}>
            storage capacitor
          </text>
        </g>
        {/* charge flowing while the gate is open */}
        {gate > 0 &&
          dots.map((t, k) => {
            const yy = mix(Y - 110, Y + 70, t);
            const along = t > 0.85;
            return <circle key={k} cx={along ? mix(X - 160, X - 40, (t - 0.85) / 0.15) : X - 160} cy={along ? Y + 70 : yy} r={6} fill={C.cyanHi} opacity={gateGlow} />;
          })}
        {/* voltage graph */}
        <rect x={gx0 - 20} y={gy0 - 50} width={graphW + 40} height={graphH + 90} rx={16} fill="rgba(6,9,20,0.75)" stroke="rgba(255,255,255,0.1)" />
        <text x={gx0} y={gy0 - 18} fontFamily={FONT.ui} fontWeight={700} fontSize={20} letterSpacing="0.2em" fill={C.ink3}>
          PIXEL VOLTAGE
        </text>
        <line x1={gx0} y1={gy0 + graphH} x2={gx0 + graphW} y2={gy0 + graphH} stroke="rgba(255,255,255,0.2)" />
        <path d={d} fill="none" stroke={C.cyan} strokeWidth={3} />
        {pulses.map((t, k) => {
          const x = gx0 + ((t - b.one) / (b.end - b.one)) * graphW;
          return f >= t ? (
            <g key={k}>
              <line x1={x} y1={gy0} x2={x} y2={gy0 + graphH} stroke={hexA(C.amber, 0.5)} strokeDasharray="3 5" />
              <text x={x + 6} y={gy0 + 14} fontFamily={FONT.mono} fontSize={16} fill={C.amber}>
                refresh
              </text>
            </g>
          ) : null;
        })}
        {f > b.holds && f < b.next + 6 && (
          <text x={gx0 + graphW / 2} y={gy0 + graphH + 30} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} fill={C.green} opacity={prog(f, b.holds - 4, 12)}>
            ← held until the next refresh →
          </text>
        )}
      </svg>
      <div style={{ position: "absolute", left: gx0 - 20, top: 250, opacity: prog(f, b.eighteen - 6, 14) }}>
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 84, color: C.ink, fontVariantNumeric: "tabular-nums", textShadow: `0 0 40px ${hexA(C.cyan, 0.6)}` }}>{count.toLocaleString("en-US")}</div>
        <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 22, letterSpacing: "0.35em", color: C.cyan }}>TRANSISTORS · 3024 × 1964 × 3</div>
      </div>
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const stA = 1 - prog(f, b.one - 12, 14);
  const cellA = prog(f, b.one - 10, 14);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      {stA > 0.01 && <Stack b={b} a={stA} />}
      {cellA > 0.01 && <Cell b={b} a={cellA} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: 6, name: "swell", vol: 0.25 },
    { at: b.apart - 10, name: "whoosh_big", vol: 0.45 },
    { at: b.apart + 20, name: "thud", vol: 0.25 },
    { at: b.backlight - 6, name: "power_up", vol: 0.3 },
    { at: b.pol1 - 6, name: "pop", vol: 0.28 },
    { at: b.glass - 6, name: "pop", vol: 0.28, rate: 1.06 },
    { at: b.lc - 6, name: "pop", vol: 0.28, rate: 1.12 },
    { at: b.cf - 6, name: "pop_hi", vol: 0.28 },
    { at: b.pol2 - 6, name: "pop", vol: 0.28, rate: 1.2 },
    { at: b.one - 12, name: "whoosh_soft", vol: 0.3 },
    { at: b.eighteen - 6, name: "data", vol: 0.3 },
    { at: b.charges - 10, name: "zap", vol: 0.35 },
    { at: b.holds - 4, name: "hum", vol: 0.2 },
    { at: b.next + 6, name: "zap", vol: 0.3 },
  ];
};

export const Panel: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.amber, hueB: C.violet, hueC: C.cyan, intensity: 0.55 },
};
