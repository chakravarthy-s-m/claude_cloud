import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Kicker } from "../../components/core";
import { useCanvas } from "../../components/fx";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { RGB, SubpixelView, SUN, pixelAt, wallpaper } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    close: c.p1.from,
    breaks: wordAt(c.p1, "illusion breaks"),
    grid: c.p2.from,
    pixels: wordAt(c.p2, "called pixels"),
    mbp: wordAt(c.p2, "A fourteen inch"),
    six: wordAt(c.p2, "nearly six million"),
    three: c.p3.from,
    red: wordAt(c.p3, "a red"),
    green: wordAt(c.p3, "a green"),
    blue: wordAt(c.p3, "a blue"),
    side: wordAt(c.p3, "side by side"),
    allUp: c.p4.from,
    white: wordAt(c.p4, "you see white"),
    off: wordAt(c.p4, "Turn them all off"),
    black: wordAt(c.p4, "black"),
    every: c.p5.from,
    mix: wordAt(c.p5, "different mix"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

// a pixel right on the edge of the sun: warm on one side, violet sky on the other
const PX = Math.round(SUN.x - SUN.r * 0.7071);
const PY = Math.round(SUN.y - SUN.r * 0.7071);

// ------------------------------------------------------------------ microscope
const Microscope: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  // zoom path: whole picture → pixel blocks → (zoom out for the spec) → one pixel's subpixels
  const lz = keyframes(
    f,
    [
      [0, Math.log(1.0)],
      [b.close, Math.log(1.08)],
      [b.breaks + 14, Math.log(16)],
      [b.pixels + 20, Math.log(26)],
      [b.three - 10, Math.log(28)],
      [b.red - 2, Math.log(150)],
      [b.side, Math.log(390)],
      [b.end, Math.log(420)],
    ],
    EASE.inOut,
  );
  const zoom = Math.exp(lz);
  const t = clamp((zoom - 1) / 8);
  const sub = prog(f, b.three - 6, b.red - b.three + 10, EASE.inOut);
  const cx = mix(960, PX + 0.5, Math.sqrt(t));
  const cy = mix(540, PY + 0.5, Math.sqrt(t));
  const pixA = inOut(f, b.pixels - 4, 14, b.mbp - 8, 12);
  const box = zoom;
  const labA = (at: number) => prog(f, at - 3, 12) * (1 - prog(f, b.allUp - 16, 12));
  // subpixel labels when one pixel fills the view
  const Z = zoom;
  const sx = (u: number) => 960 + (u - cx) * Z;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <SubpixelView cx={cx} cy={cy} zoom={zoom} sub={sub} />
      <AbsoluteFill style={{ background: "radial-gradient(75% 75% at 50% 50%, transparent 45%, rgba(2,3,9,0.7) 100%)" }} />
      {/* one pixel, outlined */}
      {pixA > 0.01 && (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: pixA }}>
          <rect x={960 - box / 2 - 2} y={540 - box / 2 - 2} width={box + 4} height={box + 4} fill="none" stroke={C.cyan} strokeWidth={4} style={{ filter: `drop-shadow(0 0 8px ${C.cyan})` }} />
          <circle cx={960} cy={540} r={box * mix(0.8, 3.2, (f % 36) / 36)} fill="none" stroke={C.cyan} strokeWidth={2} opacity={1 - (f % 36) / 36} />
          <line x1={960 + box / 2 + 4} y1={540 - box / 2 - 4} x2={1100} y2={400} stroke="#fff" strokeWidth={2.5} />
          <rect x={1096} y={340} width={250} height={72} rx={14} fill="rgba(4,6,14,0.85)" stroke="rgba(255,255,255,0.4)" />
          <text x={1221} y={390} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={44} fill="#fff">
            one pixel
          </text>
        </svg>
      )}
      {/* R / G / B labels, each pointing at its subpixel */}
      {Z > 90 &&
        [
          { at: b.red, u: PX + 1 / 6, col: RGB.r, t: "RED", lx: 700 },
          { at: b.green, u: PX + 0.5, col: RGB.g, t: "GREEN", lx: 960 },
          { at: b.blue, u: PX + 5 / 6, col: RGB.b, t: "BLUE", lx: 1220 },
        ].map((L) => {
          const la = labA(L.at);
          if (la <= 0.01) return null;
          const x = sx(L.u);
          const barTop = 540 + (PY + 0.04 - cy) * Z;
          return (
            <React.Fragment key={L.t}>
              <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: la }}>
                <path d={`M${L.lx},${176} C${L.lx},${(176 + barTop) / 2} ${x},${(176 + barTop) / 2} ${x},${Math.max(200, barTop + 24)}`} fill="none" stroke="#fff" strokeWidth={2.5} strokeDasharray="2 7" strokeLinecap="round" />
                <circle cx={x} cy={Math.max(200, barTop + 24)} r={7} fill="#fff" />
              </svg>
              <div style={{ position: "absolute", left: L.lx, top: 120, transform: `translate(-50%, ${(1 - la) * 20}px)`, opacity: la, padding: "8px 20px", borderRadius: 12, background: "rgba(4,6,14,0.88)", border: `2px solid ${L.col}`, fontFamily: FONT.ui, fontWeight: 700, fontSize: 28, letterSpacing: "0.18em", color: "#fff", boxShadow: `0 0 30px ${L.col}` }}>
                {L.t}
              </div>
            </React.Fragment>
          );
        })}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ the display, with its numbers
const PW = 1100;
const PH = Math.round(PW / 1.54);
const SpecPanel: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useCanvas((ctx) => {
    const img = wallpaper();
    const sw = img.height * 1.54;
    ctx.drawImage(img, (img.width - sw) / 2, 0, sw, img.height, 0, 0, PW, PH);
    // a fine grid suggesting the pixel matrix (schematic: 1 line per 24 px)
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= PW; x += 18) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, PH);
    }
    for (let y = 0; y <= PH; y += 18) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(PW, y + 0.5);
    }
    ctx.stroke();
  }, []);
  const p = spr(f, fps, b.mbp - 12, { damping: 24, stiffness: 90 });
  const dimW = prog(f, b.mbp + 6, 24, EASE.inOut);
  const dimH = prog(f, b.mbp + 16, 24, EASE.inOut);
  const six = spr(f, fps, b.six - 4, { damping: 20, stiffness: 120 });
  const x0 = 960 - PW / 2 - 90;
  const y0 = 520 - PH / 2;
  const count = Math.round(mix(0, 5939136, prog(f, b.six - 4, 36, EASE.out)));
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: x0, top: y0, width: PW, height: PH, borderRadius: 16, overflow: "hidden", transform: `scale(${mix(1.25, 1, p)})`, opacity: clamp(p * 1.3), boxShadow: `0 0 0 14px #0b0e18, 0 0 0 15px rgba(255,255,255,0.1), 0 50px 120px rgba(0,0,0,0.7), 0 0 120px ${hexA(C.pink, 0.15)}` }}>
        <canvas ref={ref} width={PW} height={PH} style={{ position: "absolute", inset: 0 }} />
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {/* width dimension */}
        <g opacity={dimW}>
          <line x1={x0} y1={y0 - 50} x2={x0 + PW * dimW} y2={y0 - 50} stroke={C.pink} strokeWidth={2} />
          <line x1={x0} y1={y0 - 62} x2={x0} y2={y0 - 38} stroke={C.pink} strokeWidth={2} />
          <line x1={x0 + PW} y1={y0 - 62} x2={x0 + PW} y2={y0 - 38} stroke={C.pink} strokeWidth={2} opacity={dimW > 0.98 ? 1 : 0} />
          <rect x={x0 + PW / 2 - 130} y={y0 - 72} width={260} height={44} rx={10} fill="#05060d" />
          <text x={x0 + PW / 2} y={y0 - 41} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={28} fill={C.ink}>
            3,024 px
          </text>
        </g>
        {/* height dimension */}
        <g opacity={dimH}>
          <line x1={x0 + PW + 50} y1={y0} x2={x0 + PW + 50} y2={y0 + PH * dimH} stroke={C.pink} strokeWidth={2} />
          <line x1={x0 + PW + 38} y1={y0} x2={x0 + PW + 62} y2={y0} stroke={C.pink} strokeWidth={2} />
          <line x1={x0 + PW + 38} y1={y0 + PH} x2={x0 + PW + 62} y2={y0 + PH} stroke={C.pink} strokeWidth={2} opacity={dimH > 0.98 ? 1 : 0} />
          <text x={x0 + PW + 74} y={y0 + PH / 2 + 10} fontFamily={FONT.mono} fontWeight={700} fontSize={28} fill={C.ink}>
            1,964 px
          </text>
        </g>
      </svg>
      <div style={{ position: "absolute", left: x0, top: y0 + PH + 40 }}>
        <Kicker color={C.pink} at={b.mbp}>
          14-inch MacBook Pro display
        </Kicker>
      </div>
      {six > 0.01 && (
        <div style={{ position: "absolute", right: 64, top: y0 + PH - 70, textAlign: "right", opacity: clamp(six * 1.4), transform: `translateY(${(1 - six) * 30}px)` }}>
          <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 64, color: C.ink, fontVariantNumeric: "tabular-nums", textShadow: `0 0 40px ${hexA(C.pink, 0.6)}` }}>{count.toLocaleString("en-US")}</div>
          <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 22, letterSpacing: "0.38em", color: C.pink }}>PIXELS</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ one pixel, three lights
type RGBv = [number, number, number];
const SEQ = (b: B): [number, RGBv][] => [
  [b.allUp - 30, pixelAt(PX, PY) as RGBv],
  [b.white - 2, [255, 255, 255]],
  [b.off + 4, [0, 0, 0]],
  [b.every + 6, [255, 146, 60]],
  [b.every + 34, [40, 214, 196]],
  [b.every + 58, [150, 92, 255]],
  [b.every + 80, [255, 64, 160]],
  [b.every + 100, [176, 255, 70]],
  [b.every + 120, [80, 170, 255]],
];
const levels = (f: number, b: B): RGBv => {
  const seq = SEQ(b);
  // each color arrives over ~8 frames, then holds until the next one starts
  const keys: [number, RGBv][] = [];
  seq.forEach(([t, v], i) => {
    const arrive = i === 0 ? t : Math.max(t, seq[i - 1][0] + 2);
    keys.push([arrive, v]);
    const next = seq[i + 1]?.[0];
    if (next !== undefined && next - 8 > arrive) keys.push([next - 8, v]);
  });
  const ch = (k: number) => keyframes(f, keys.map(([t, v]) => [t, v[k]] as [number, number]), EASE.inOut);
  return [ch(0), ch(1), ch(2)];
};

const PixelLab: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [r, g, bl] = levels(f, b);
  const inP = spr(f, fps, b.allUp - 26, { damping: 22, stiffness: 100 });
  const BW = 120;
  const BH = 440;
  const GAP = 18;
  const X = 470;
  const Y = 540 - BH / 2 + 10;
  const bars: { v: number; col: string; t: string }[] = [
    { v: r, col: RGB.r, t: "R" },
    { v: g, col: RGB.g, t: "G" },
    { v: bl, col: RGB.b, t: "B" },
  ];
  const swatch = `rgb(${r | 0}, ${g | 0}, ${bl | 0})`;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * bl) / 255;
  const word = f < b.white - 4 ? "" : f < b.off ? "white" : f < b.every ? "black" : "";
  const wordA = word ? spr(f, fps, word === "white" ? b.white - 4 : b.black - 4, { damping: 18, stiffness: 140 }) : 0;
  // little history of colors mixed so far (p5)
  const hist = SEQ(b).slice(3).filter(([t]) => f >= t + 10);
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.3) }}>
      {/* the pixel (three lights) */}
      <div style={{ position: "absolute", left: X - 40, top: Y - 40, width: 3 * BW + 2 * GAP + 80, height: BH + 80, borderRadius: 24, background: "#05060b", border: "1px solid rgba(255,255,255,0.08)" }} />
      {bars.map((B2, i) => {
        const k = B2.v / 255;
        return (
          <div key={B2.t} style={{ position: "absolute", left: X + i * (BW + GAP), top: Y, width: BW, height: BH }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 10,
                background: `linear-gradient(180deg, ${hexA(B2.col, 0.08 + 0.92 * k)}, ${hexA(B2.col, 0.05 + 0.85 * k)})`,
                boxShadow: k > 0.02 ? `0 0 ${30 + 60 * k}px ${hexA(B2.col, 0.65 * k)}, inset 0 0 30px rgba(255,255,255,${0.25 * k})` : undefined,
                border: `1px solid ${hexA(B2.col, 0.25 + 0.5 * k)}`,
              }}
            />
            <div style={{ position: "absolute", left: 0, right: 0, top: BH + 54, textAlign: "center", fontFamily: FONT.mono, fontSize: 34, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{Math.round(B2.v)}</div>
            <div style={{ position: "absolute", left: 0, right: 0, top: -58, textAlign: "center", fontFamily: FONT.ui, fontSize: 26, fontWeight: 700, letterSpacing: "0.2em", color: B2.col }}>{B2.t}</div>
          </div>
        );
      })}
      {/* "from a distance" — the mixed color */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d={`M${X + 3 * BW + 2 * GAP + 70},540 L1150,540`} stroke={hexA(C.ink, 0.35)} strokeWidth={2} strokeDasharray="4 8" />
        <path d="M1138,528 L1152,540 L1138,552" fill="none" stroke={hexA(C.ink, 0.5)} strokeWidth={2} />
      </svg>
      <div style={{ position: "absolute", left: 1210, top: 540 - 190, width: 380, height: 380, borderRadius: "50%", background: swatch, boxShadow: `0 0 ${60 + 140 * lum}px ${swatch}, inset 0 0 40px rgba(0,0,0,0.25)`, border: "1px solid rgba(255,255,255,0.18)" }} />
      <div style={{ position: "absolute", left: 1210, width: 380, top: 540 + 220, textAlign: "center", fontFamily: FONT.ui, fontWeight: 600, fontSize: 22, letterSpacing: "0.38em", color: C.ink3 }}>WHAT YOU SEE</div>
      {wordA > 0.01 && (
        <div style={{ position: "absolute", left: 1210, width: 380, top: 540 - 40, textAlign: "center", fontFamily: FONT.display, fontWeight: 700, fontSize: 64, color: word === "white" ? "#0a0b12" : C.ink2, opacity: clamp(wordA * 1.3), transform: `scale(${mix(0.8, 1, wordA)})` }}>
          {word}
        </div>
      )}
      {/* palette of mixes */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 920, display: "flex", justifyContent: "center", gap: 22 }}>
        {hist.map(([t, v]) => {
          const p = spr(f, fps, t + 10, { damping: 16, stiffness: 160 });
          return <div key={t} style={{ width: 70, height: 70, borderRadius: 18, background: `rgb(${v[0]},${v[1]},${v[2]})`, boxShadow: `0 0 30px rgba(${v[0]},${v[1]},${v[2]},0.6)`, transform: `scale(${p})` }} />;
        })}
      </div>
      <div style={{ position: "absolute", left: 120, top: 130 }}>
        <Kicker color={C.pink} at={b.allUp - 20}>
          Additive color
        </Kicker>
      </div>
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const micA = (1 - inOut(f, b.mbp - 14, 14, b.three - 16, 14)) * (1 - prog(f, b.allUp - 24, 14));
  const specA = inOut(f, b.mbp - 14, 14, b.three - 16, 14);
  const labA = prog(f, b.allUp - 26, 16);
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={14}>
      {micA > 0.01 && <Microscope b={b} a={micA} />}
      {specA > 0.01 && <SpecPanel b={b} a={specA} />}
      {labA > 0.01 && <PixelLab b={b} a={labA} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.close - 6, name: "whoosh_soft", vol: 0.35 },
    { at: b.breaks - 4, name: "glitch", vol: 0.25 },
    { at: b.pixels - 4, name: "pop", vol: 0.35 },
    { at: b.mbp - 14, name: "whoosh_rev", vol: 0.35 },
    { at: b.mbp + 6, name: "sweep_up", vol: 0.2 },
    { at: b.six - 4, name: "data", vol: 0.3 },
    { at: b.three - 16, name: "whoosh_big", vol: 0.4 },
    { at: b.red - 3, name: "blip", vol: 0.3 },
    { at: b.green - 3, name: "blip", vol: 0.3, rate: 1.12 },
    { at: b.blue - 3, name: "blip", vol: 0.3, rate: 1.26 },
    { at: b.allUp - 24, name: "whoosh_soft", vol: 0.3 },
    { at: b.white - 6, name: "shimmer", vol: 0.35 },
    { at: b.off - 2, name: "power_down", vol: 0.3 },
    { at: b.every + 6, name: "pop", vol: 0.25 },
    { at: b.every + 34, name: "pop_hi", vol: 0.25 },
    { at: b.every + 58, name: "pop", vol: 0.25 },
    { at: b.every + 80, name: "pop_hi", vol: 0.25 },
    { at: b.every + 100, name: "pop", vol: 0.25 },
    { at: b.every + 120, name: "pop_hi", vol: 0.25 },
  ];
};

export const Pixels: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.pink, hueB: C.violet, hueC: C.amber, intensity: 0.7 },
};
