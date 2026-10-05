import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { cam, project, type V3 } from "../../lib/proj3d";
import { Keyboard3D, KEYS, findKey, keyCenter } from "../../components/keyboard";
import { ElectronStream, LayerFlythrough, TransistorField } from "../../components/fx";
import { Glow, NeonPath, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    press: wordAt(c.o1, "press") + 3,
    mm: wordAt(c.o2, "one millimeter"),
    chain: wordAt(c.o3, "chain reaction"),
    layers: c.o4.from - 8,
    trans: c.o5.from - 6,
    elec: c.o6.from - 6,
    journey: c.o7.from - 4,
    dive: wordAt(c.o7, "All the way down") + 4,
  };
};

// Manhattan "traces" racing away from the A key across the deck.
const TRACES: V3[][] = (() => {
  const a = keyCenter(findKey("A"));
  const out: V3[][] = [];
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0.4], [-1, -0.4], [0.5, 1], [-0.5, -1],
  ];
  dirs.forEach(([dx, dy], i) => {
    const pts: V3[] = [[a[0], a[1], 1]];
    let x = a[0];
    let y = a[1];
    for (let s = 0; s < 6; s++) {
      const horizontal = (s + i) % 2 === 0;
      const len = 120 + ((i * 37 + s * 53) % 140);
      if (horizontal) x += Math.sign(dx || 1) * len * (Math.abs(dx) > 0 ? 1 : 0.4);
      else y += Math.sign(dy || 1) * len * (Math.abs(dy) > 0 ? 1 : 0.4);
      pts.push([x, y, 1]);
    }
    out.push(pts);
  });
  return out;
})();

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const b = beats(s);
  const A = keyCenter(findKey("A"));

  // ---------------- keyboard phase
  const kbOut = prog(f, b.layers - 4, 14, EASE.in);
  const fadeIn = prog(f, 0, 50, EASE.inOut);
  const down = spr(f, fps, b.press - 5, { damping: 14, stiffness: 420, mass: 0.6 });
  const up = spr(f, fps, b.press + 14, { damping: 12, stiffness: 260 });
  const press = clamp(down - up * 0.85);
  const flash = prog(f, b.press - 1, 3) * (1 - prog(f, b.press + 2, 40, EASE.out));
  const aGlow = clamp(flash * 1.4 + prog(f, b.press, 20) * 0.55);

  const rise = prog(f, b.chain - 70, 120, EASE.inOut);
  const c = cam({
    yaw: keyframes(f, [[0, -34], [b.press, -26], [b.chain, -18], [b.layers, -8]]),
    pitch: mix(keyframes(f, [[0, 16], [b.press, 21], [b.chain - 70, 26]]), 62, rise),
    dist: mix(900, 2600, rise),
    scale: mix(keyframes(f, [[0, 2.15], [b.press, 2.45], [b.mm + 30, 2.85], [b.chain - 70, 2.9]]), 0.92, rise) * (1 + kbOut * 1.6),
    target: [mix(A[0] + 30, 0, rise), mix(A[1] - 40, 40, rise), 8],
    cx: 960,
    cy: mix(600, 560, rise),
  });

  // backlight wave radiating from A after the chain reaction
  const glow: Record<string, number> = { A: aGlow };
  const waveT = f - b.chain;
  if (waveT > 0) {
    for (const k of KEYS) {
      const kc = keyCenter(k);
      const d = Math.hypot(kc[0] - A[0], kc[1] - A[1]) / 100;
      const w = Math.exp(-Math.pow((waveT * 0.55 - d) / 1.6, 2));
      glow[k.label] = Math.max(glow[k.label] ?? 0, w * 0.75);
    }
  }

  // shockwave rings on the deck
  const ring = (start: number, maxR: number) => {
    const p = prog(f, start, 34, EASE.out);
    if (p <= 0 || p >= 1) return null;
    const pts: string[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const sp = project(c, [A[0] + Math.cos(a) * maxR * p, A[1] + Math.sin(a) * maxR * p, 1]);
      pts.push(`${i ? "L" : "M"}${sp.x.toFixed(1)},${sp.y.toFixed(1)}`);
    }
    return <path d={pts.join("") + "Z"} fill="none" stroke={C.cyan} strokeWidth={3 * (1 - p) + 0.5} strokeOpacity={(1 - p) * 0.9} />;
  };

  // dimension callout for "one millimeter"
  const top = project(c, [A[0] + 50, A[1] - 42, 14]);
  const bot = project(c, [A[0] + 50, A[1] - 42, 14 - 9]);
  const callP = inOut(f, b.mm - 8, 14, b.chain - 30, 14);

  // slow-motion timer
  const timerP = inOut(f, b.c.o3.from - 6, 16, b.layers - 6, 10);
  const ms = f < b.chain ? mix(0, 0.4, prog(f, b.c.o3.from, b.chain - b.c.o3.from, EASE.linear)) : mix(0.4, 3.2, prog(f, b.chain, b.layers - b.chain, EASE.in));

  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={10}>
      {/* --------- keyboard world --------- */}
      {kbOut < 1 && (
        <AbsoluteFill style={{ opacity: fadeIn * (1 - kbOut), filter: kbOut > 0.05 ? `blur(${kbOut * 16}px)` : undefined }}>
          <Glow x={960} y={600} size={1400} color={C.indigo} a={0.18} />
          {(() => {
            const ap = project(c, [A[0], A[1], 10]);
            return (
              <>
                <Glow x={ap.x} y={ap.y} size={420 * ap.k * c.scale * (1 + flash)} color={C.cyan} a={0.55 * flash + 0.22 * aGlow * (1 - rise)} />
                <Glow x={ap.x} y={ap.y} size={160 * ap.k * c.scale} color={"#e8fbff"} a={0.7 * flash} />
              </>
            );
          })()}
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            {TRACES.map((tr, i) => {
              const p = prog(f, b.chain + (i % 4) * 3, 26, EASE.out);
              if (p <= 0) return null;
              const pts = tr.map((pt) => project(c, pt));
              let len = 0;
              for (let j = 1; j < pts.length; j++) len += Math.hypot(pts[j].x - pts[j - 1].x, pts[j].y - pts[j - 1].y);
              const d = pts.map((pt, j) => `${j ? "L" : "M"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join("");
              // head position
              let target = len * p;
              let hx = pts[0].x;
              let hy = pts[0].y;
              for (let j = 1; j < pts.length; j++) {
                const L = Math.hypot(pts[j].x - pts[j - 1].x, pts[j].y - pts[j - 1].y);
                if (target <= L) {
                  hx = pts[j - 1].x + ((pts[j].x - pts[j - 1].x) * target) / L;
                  hy = pts[j - 1].y + ((pts[j].y - pts[j - 1].y) * target) / L;
                  break;
                }
                target -= L;
                hx = pts[j].x;
                hy = pts[j].y;
              }
              const col = [C.cyan, C.violet, C.pink, C.cyan][i % 4];
              return (
                <g key={i}>
                  <NeonPath d={d} color={col} width={2.2} progress={p} length={len} />
                  {p < 1 && <Spark x={hx} y={hy} color={col} r={6} />}
                </g>
              );
            })}
            <Keyboard3D cam={c} press={{ A: press }} glow={glow} backlight={0.28 + rise * 0.2} focus={[A[0], A[1], 0]} focusRadius={mix(700, 1600, rise)} />
            {ring(b.press, 520)}
            {ring(b.press + 8, 380)}
          </svg>
          {/* 1 mm callout */}
          {callP > 0.01 && (
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: callP }}>
              <line x1={top.x + 40} y1={top.y} x2={top.x + 40} y2={bot.y} stroke={C.cyan} strokeWidth={2} />
              <line x1={top.x + 28} y1={top.y} x2={top.x + 52} y2={top.y} stroke={C.cyan} strokeWidth={2} />
              <line x1={top.x + 28} y1={bot.y} x2={top.x + 52} y2={bot.y} stroke={C.cyan} strokeWidth={2} />
              <path d={`M${top.x + 52},${(top.y + bot.y) / 2} L${top.x + 150},${(top.y + bot.y) / 2 - 150} L${top.x + 230},${(top.y + bot.y) / 2 - 150}`} fill="none" stroke={hexA(C.cyan, 0.7)} strokeWidth={1.5} />
              <rect x={top.x + 236} y={(top.y + bot.y) / 2 - 222} width={250} height={118} rx={16} fill="rgba(5,8,18,0.82)" stroke={hexA(C.cyan, 0.45)} />
              <text x={top.x + 258} y={(top.y + bot.y) / 2 - 156} fontFamily={FONT.mono} fontSize={52} fontWeight={600} fill={C.ink}>
                ≈ 1 mm
              </text>
              <text x={top.x + 260} y={(top.y + bot.y) / 2 - 122} fontFamily={FONT.ui} fontSize={19} fontWeight={600} letterSpacing="0.24em" fill={hexA(C.cyan, 0.9)}>
                KEY TRAVEL
              </text>
            </svg>
          )}
          {/* slow-motion timer */}
          {timerP > 0.01 && (
            <div style={{ position: "absolute", top: 90, left: 110, opacity: timerP }}>
              <div style={{ fontFamily: FONT.ui, fontSize: 18, letterSpacing: "0.4em", color: hexA(C.cyan, 0.85), fontWeight: 600 }}>TIME SINCE KEYPRESS</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 72, color: C.ink, fontWeight: 600, textShadow: `0 0 30px ${hexA(C.cyan, 0.5)}`, fontVariantNumeric: "tabular-nums" }}>
                {ms.toFixed(3)} <span style={{ fontSize: 40, color: C.ink3 }}>ms</span>
              </div>
            </div>
          )}
        </AbsoluteFill>
      )}

      {/* --------- montage: layers of software --------- */}
      {f >= b.layers - 6 && f < b.trans + 10 && (
        <AbsoluteFill style={{ opacity: inOut(f, b.layers - 6, 10, b.trans - 4, 12) }}>
          <LayerFlythrough
            start={b.layers - 10}
            spacing={18}
            speed={1.0}
            layers={[
              { label: "YOUR APP", sub: "Swift · AppKit · SwiftUI", color: C.pink },
              { label: "FRAMEWORKS", sub: "Core Animation · Metal · Core Text", color: C.violet },
              { label: "WINDOWSERVER", sub: "events · windows · compositing", color: C.blue },
              { label: "XNU KERNEL", sub: "Mach · BSD · I/O Kit", color: C.cyan },
              { label: "DRIVERS", sub: "HID · display · storage", color: C.teal },
            ]}
          />
          <MontageLabel text="Layers of software" at={b.layers + 6} color={C.violet} />
        </AbsoluteFill>
      )}

      {/* --------- montage: billions of transistors --------- */}
      {f >= b.trans - 6 && f < b.elec + 10 && (
        <AbsoluteFill style={{ opacity: inOut(f, b.trans - 6, 12, b.elec - 4, 12) }}>
          <TransistorField start={b.trans - 6} dur={b.elec - b.trans + 10} zoom={[1.0, 2.6]} />
          <AbsoluteFill style={{ background: "radial-gradient(70% 60% at 50% 50%, transparent 30%, rgba(2,3,9,0.85) 100%)" }} />
          <MontageLabel text="Billions of transistors" at={b.trans + 4} color={C.cyan} sub="switching billions of times per second" />
        </AbsoluteFill>
      )}

      {/* --------- montage: electrons --------- */}
      {f >= b.elec - 6 && f < b.journey + 16 && (
        <AbsoluteFill style={{ opacity: inOut(f, b.elec - 6, 12, b.journey, 14) }}>
          <ElectronStream start={b.elec - 30} count={480} height={300} speed={16} />
          <MontageLabel text="A flow of electrons" at={b.elec + 4} color={C.amber} />
        </AbsoluteFill>
      )}

      {/* --------- the journey ahead --------- */}
      {f >= b.journey - 2 && <JourneyGauge start={b.journey} dive={b.dive} />}
    </SceneShell>
  );
};

const MontageLabel: React.FC<{ text: string; at: number; color: string; sub?: string }> = ({ text, at, color, sub }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spr(f, fps, at, { damping: 20, stiffness: 120 });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 420, paddingTop: 220, textAlign: "center", opacity: clamp(p * 1.3), background: "linear-gradient(180deg, transparent, rgba(2,3,9,0.88) 55%)" }}>
      <div style={{ transform: `translateY(${(1 - p) * 30}px)` }}>
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 76, letterSpacing: "-0.03em", color: C.ink, textShadow: `0 0 40px ${hexA(color, 0.7)}` }}>{text}</div>
      {sub && <div style={{ fontFamily: FONT.ui, fontSize: 26, letterSpacing: "0.2em", textTransform: "uppercase", color: hexA(color, 0.9), marginTop: 8 }}>{sub}</div>}
      </div>
    </div>
  );
};

const LEVELS = [
  { label: "YOU", color: C.ink },
  { label: "APPS", color: C.pink },
  { label: "FRAMEWORKS", color: C.violet },
  { label: "KERNEL", color: C.cyan },
  { label: "SILICON", color: C.green },
  { label: "LOGIC GATES", color: C.lime },
  { label: "TRANSISTORS", color: C.orange },
  { label: "ELECTRONS", color: C.amber },
];

/** The vertical "depth gauge" for the whole episode, drawn top to bottom. */
const JourneyGauge: React.FC<{ start: number; dive: number }> = ({ start, dive }) => {
  const f = useCurrentFrame();
  const top = 150;
  const step = 105;
  const x = 960;
  const draw = prog(f, start, 40, EASE.inOut);
  const diveP = prog(f, dive, 22, EASE.in);
  const flash = prog(f, dive + 18, 6) * (1 - prog(f, dive + 24, 20));
  const markerY = top + mix(0, step * (LEVELS.length - 1), diveP);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="gauge" gradientUnits="userSpaceOnUse" x1={x} y1={top} x2={x} y2={top + step * (LEVELS.length - 1)}>
            {LEVELS.map((L, i) => (
              <stop key={i} offset={`${(i / (LEVELS.length - 1)) * 100}%`} stopColor={L.color} />
            ))}
          </linearGradient>
        </defs>
        <line x1={x} y1={top} x2={x} y2={top + step * (LEVELS.length - 1) * draw} stroke="url(#gauge)" strokeWidth={3} />
        <line x1={x} y1={top} x2={x} y2={top + step * (LEVELS.length - 1) * draw} stroke="url(#gauge)" strokeWidth={14} strokeOpacity={0.15} />
        {LEVELS.map((L, i) => {
          const p = prog(f, start + 4 + i * 4, 14);
          const lit = diveP * (LEVELS.length - 1) >= i - 0.2 ? 1 : 0.35;
          return (
            <g key={i} opacity={p}>
              <circle cx={x} cy={top + i * step} r={9} fill={C.bg} stroke={L.color} strokeWidth={3} />
              <text
                x={i % 2 ? x + 40 : x - 40}
                y={top + i * step + 12}
                textAnchor={i % 2 ? "start" : "end"}
                fontFamily={FONT.display}
                fontWeight={700}
                fontSize={36}
                letterSpacing="0.06em"
                fill={L.color}
                opacity={lit}
              >
                {L.label}
              </text>
            </g>
          );
        })}
        {f >= dive - 2 && <Spark x={x} y={markerY} color={C.ink} r={10} />}
      </svg>
      <AbsoluteFill style={{ background: "#dff6ff", opacity: flash * 0.45, mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: 0, name: "swell", vol: 0.25 },
    { at: b.press - 2, name: "key_click", vol: 1.0 },
    { at: b.press - 1, name: "pulse", vol: 0.7 },
    { at: b.press + 2, name: "shimmer", vol: 0.22 },
    { at: b.mm - 8, name: "pop", vol: 0.35 },
    { at: b.chain - 78, name: "riser", vol: 0.45 },
    { at: b.chain, name: "zap", vol: 0.55 },
    { at: b.chain + 2, name: "whoosh", vol: 0.5 },
    { at: b.chain + 4, name: "data", vol: 0.3 },
    { at: b.layers - 6, name: "whoosh_big", vol: 0.55 },
    { at: b.layers + 22, name: "whoosh_soft", vol: 0.4 },
    { at: b.layers + 48, name: "whoosh_soft", vol: 0.4 },
    { at: b.layers + 74, name: "whoosh_soft", vol: 0.4 },
    { at: b.trans - 4, name: "glitch", vol: 0.35 },
    { at: b.trans, name: "data_long", vol: 0.35 },
    { at: b.elec - 4, name: "electrons", vol: 0.55 },
    { at: b.elec - 2, name: "hum", vol: 0.25 },
    { at: b.journey, name: "sweep_up", vol: 0.35 },
    { at: b.dive - 4, name: "sweep_down", vol: 0.5 },
    { at: b.dive + 16, name: "riser", vol: 0.0 },
  ];
};

export const ColdOpen: SceneModule = {
  Visual,
  sfx,
  hud: false,
  backdrop: { hueA: C.indigo, hueB: C.violet, hueC: C.cyan, intensity: 0.55, dots: false },
};
