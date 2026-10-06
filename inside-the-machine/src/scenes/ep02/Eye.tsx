import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker } from "../../components/core";
import { useCanvas } from "../../components/fx";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { RGB, wallpaper } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    crosses: c.e1.from,
    lens: wordAt(c.e1, "your lens"),
    retina: wordAt(c.e1, "your retina"),
    there: c.e2.from,
    cones: wordAt(c.e2, "cone cells"),
    red: wordAt(c.e2, "red"),
    green: wordAt(c.e2, "green"),
    blue: wordAt(c.e2, "and blue"),
    brain: c.e3.from,
    compares: wordAt(c.e3, "compares their signals"),
    sensation: wordAt(c.e3, "sensation of color"),
    fool: wordAt(c.e3, "fool you"),
    millions: wordAt(c.e3, "seeing millions"),
    next: c.e4.from,
    arrives: wordAt(c.e4, "next frame arrives"),
    stitches: wordAt(c.e4, "stitches them"),
    smooth: wordAt(c.e4, "smooth, continuous motion"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

// ------------------------------------------------------------------ screen → lens → retina
const Optics: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, 30, { damping: 24, stiffness: 60 });
  const rays = prog(f, b.crosses - 6, b.lens - b.crosses + 10, EASE.inOut);
  const focus = prog(f, b.lens - 4, b.retina - b.lens + 10, EASE.inOut);
  const ex = 1240;
  const ey = 540;
  const R = 300;
  const lensX = ex - R + 70;
  const retinaX = ex + R - 18;
  const scr = { x: 150, y: 290, w: 300, h: 500 };
  const ref = useCanvas((ctx) => {
    const img = wallpaper(480, 270);
    ctx.drawImage(img, 120, 0, 152, 270, 0, 0, scr.w, scr.h);
  }, []);
  // rays from three points on the screen: top (red-ish), middle, bottom
  const srcs = [
    { y: scr.y + 70, col: "#ffb38a" },
    { y: scr.y + scr.h / 2, col: "#fff2c8" },
    { y: scr.y + scr.h - 70, col: "#b89cff" },
  ];
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.4) }}>
      <div style={{ position: "absolute", left: scr.x - 14, top: scr.y - 14, width: scr.w + 28, height: scr.h + 28, borderRadius: 22, background: "#0b0e18", boxShadow: "0 0 80px rgba(255,170,120,0.25)" }} />
      <canvas ref={ref} width={scr.w} height={scr.h} style={{ position: "absolute", left: scr.x, top: scr.y, borderRadius: 10 }} />
      <Glow x={scr.x + scr.w / 2} y={ey} size={700} color="#ffb38a" a={0.12} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="eyeball" cx="0.45" cy="0.45" r="0.6">
            <stop offset="0" stopColor="#1a2238" />
            <stop offset="1" stopColor="#0b0f1d" />
          </radialGradient>
        </defs>
        {/* eyeball */}
        <circle cx={ex} cy={ey} r={R} fill="url(#eyeball)" stroke={hexA(C.ink, 0.35)} strokeWidth={3} />
        {/* retina (back wall) */}
        <path d={`M${ex + R * Math.cos(-1.05)},${ey + R * Math.sin(-1.05)} A${R - 2},${R - 2} 0 0 1 ${ex + R * Math.cos(1.05)},${ey + R * Math.sin(1.05)}`} fill="none" stroke={C.pink} strokeWidth={10} strokeOpacity={0.7} strokeLinecap="round" />
        {/* cornea bulge */}
        <path d={`M${ex - R * 0.82},${ey - 150} Q${ex - R - 70},${ey} ${ex - R * 0.82},${ey + 150}`} fill={hexA(C.cyan, 0.06)} stroke={hexA(C.cyan, 0.6)} strokeWidth={3} />
        {/* iris */}
        <line x1={lensX - 20} y1={ey - 150} x2={lensX - 20} y2={ey - 58} stroke={C.teal} strokeWidth={10} strokeLinecap="round" />
        <line x1={lensX - 20} y1={ey + 58} x2={lensX - 20} y2={ey + 150} stroke={C.teal} strokeWidth={10} strokeLinecap="round" />
        {/* lens */}
        <ellipse cx={lensX} cy={ey} rx={34} ry={86} fill={hexA("#cfe8ff", 0.16)} stroke={hexA("#cfe8ff", 0.8)} strokeWidth={2.5} />
        {/* optic nerve */}
        <path d={`M${ex + R - 10},${ey + 30} C${ex + R + 80},${ey + 40} ${ex + R + 120},${ey + 90} ${ex + R + 200},${ey + 110}`} fill="none" stroke={hexA(C.amber, 0.5)} strokeWidth={14} strokeLinecap="round" />
        {/* rays: screen → lens → focused (and flipped) on the retina */}
        {srcs.map((sr, i) => {
          const tgtY = ey - (sr.y - ey) * 0.32;
          const p1 = rays;
          const x1 = mix(scr.x + scr.w, lensX, p1);
          return (
            <g key={i}>
              {[-38, 0, 38].map((spread, k) => {
                const ly = ey + (sr.y - ey) * 0.18 + spread;
                return (
                  <g key={k}>
                    <path d={`M${scr.x + scr.w},${sr.y} L${x1},${mix(sr.y, ly, p1)}`} stroke={sr.col} strokeOpacity={0.45} strokeWidth={2.5} fill="none" />
                    {focus > 0.01 && <path d={`M${lensX},${ly} L${mix(lensX, retinaX, focus)},${mix(ly, tgtY, focus)}`} stroke={sr.col} strokeOpacity={0.7} strokeWidth={2.5} fill="none" />}
                  </g>
                );
              })}
              {focus > 0.95 && <circle cx={retinaX} cy={tgtY} r={10} fill={sr.col} style={{ filter: `drop-shadow(0 0 10px ${sr.col})` }} />}
            </g>
          );
        })}
        <text x={lensX} y={ey - 110} textAnchor="middle" fontFamily={FONT.mono} fontSize={24} fill={C.ink2} opacity={prog(f, b.lens - 4, 12)}>
          lens
        </text>
        <text x={retinaX + 30} y={ey - 230} fontFamily={FONT.mono} fontSize={24} fill={C.pink} opacity={prog(f, b.retina - 4, 12)}>
          retina
        </text>
      </svg>
      <div style={{ position: "absolute", left: 110, top: 112, opacity: prog(f, b.crosses, 14) }}>
        <Kicker color={C.green}>From screen to retina</Kicker>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ cones: three kinds of light sensor
const CONES: { x: number; y: number; k: 0 | 1 | 2 }[] = [];
for (let j = 0; j < 9; j++)
  for (let i = 0; i < 15; i++) {
    const r = rnd(`cone${i}-${j}`);
    CONES.push({ x: i * 54 + (j % 2) * 27, y: j * 47, k: r < 0.08 ? 2 : r < 0.42 ? 1 : 0 }); // L most common, S rare
  }
const CONE_COL = [RGB.r, RGB.g, RGB.b];

const Cones: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.there - 18, { damping: 22, stiffness: 90 });
  const show = [prog(f, b.red - 6, 14), prog(f, b.green - 6, 14), prog(f, b.blue - 6, 14)];
  const chartA = prog(f, b.there - 8, 18);
  // stimulus: the warm sunset pixel → strong L, medium M, weak S
  const resp = [0.95, 0.55, 0.12];
  const compare = prog(f, b.compares - 6, 20);
  const GX0 = 1060;
  const GX1 = 1780;
  const GY = 520;
  const GH = 280;
  const curve = (nm: number, mu: number, sd: number) => Math.exp(-((nm - mu) ** 2) / (2 * sd * sd));
  const path = (mu: number, sd: number) => {
    let d = "";
    for (let nm = 390; nm <= 700; nm += 4) {
      const x = mix(GX0, GX1, (nm - 390) / 310);
      d += `${d ? "L" : "M"}${x.toFixed(1)},${(GY - curve(nm, mu, sd) * GH).toFixed(1)}`;
    }
    return d;
  };
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.4) }}>
      <div style={{ position: "absolute", left: 110, top: 112 }}>
        <Kicker color={C.green} at={b.there - 4}>
          Three kinds of cone cells
        </Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g transform="translate(150 300)">
          {CONES.map((c, i) => {
            const on = show[c.k];
            const fire = compare > 0 ? resp[c.k] * (0.6 + 0.4 * Math.sin(f * 0.6 + i)) : 0;
            const col = CONE_COL[c.k];
            return (
              <g key={i} transform={`translate(${c.x} ${c.y})`}>
                <circle r={20} fill={on > 0.5 ? hexA(col, 0.18 + 0.6 * fire) : "rgba(255,255,255,0.06)"} stroke={on > 0.5 ? col : "rgba(255,255,255,0.15)"} strokeWidth={2} opacity={0.4 + 0.6 * Math.max(on, 0.3)} />
                {fire > 0.3 && <circle r={26 + 6 * fire} fill="none" stroke={col} strokeOpacity={0.4 * fire} strokeWidth={2} />}
              </g>
            );
          })}
        </g>
        {/* sensitivity curves */}
        <g opacity={chartA}>
          <line x1={GX0} y1={GY} x2={GX1} y2={GY} stroke="rgba(255,255,255,0.3)" />
          {[
            { mu: 440, sd: 24, col: RGB.b, k: 2, t: "short" },
            { mu: 535, sd: 38, col: RGB.g, k: 1, t: "medium" },
            { mu: 565, sd: 42, col: RGB.r, k: 0, t: "long" },
          ].map((c) => (
            <g key={c.t} opacity={0.3 + 0.7 * show[c.k]}>
              <path d={path(c.mu, c.sd)} fill={hexA(c.col, 0.1)} stroke={c.col} strokeWidth={4} />
              <text x={mix(GX0, GX1, (c.mu - 390) / 310)} y={GY - GH - 16} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} fill={c.col}>
                {c.t}
              </text>
            </g>
          ))}
          <text x={GX0} y={GY + 34} fontFamily={FONT.mono} fontSize={20} fill={C.ink3}>
            400 nm
          </text>
          <text x={GX1} y={GY + 34} textAnchor="end" fontFamily={FONT.mono} fontSize={20} fill={C.ink3}>
            700 nm
          </text>
          <text x={GX0} y={GY - GH - 56} fontFamily={FONT.ui} fontWeight={700} fontSize={20} letterSpacing="0.25em" fill={C.ink3}>
            CONE SENSITIVITY (APPROX.)
          </text>
        </g>
      </svg>
      {/* brain compares → color */}
      {compare > 0.01 && (
        <div style={{ position: "absolute", left: 1060, top: 640, opacity: compare, display: "flex", alignItems: "center", gap: 30 }}>
          {resp.map((r, k) => (
            <div key={k} style={{ width: 40, height: 160, borderRadius: 10, background: "rgba(255,255,255,0.06)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${r * 100 * compare}%`, background: CONE_COL[k], boxShadow: `0 0 16px ${CONE_COL[k]}` }} />
            </div>
          ))}
          <div style={{ fontFamily: FONT.mono, fontSize: 40, color: C.ink3 }}>→</div>
          <div style={{ width: 150, height: 150, borderRadius: "50%", background: "#ff9a5c", boxShadow: "0 0 70px #ff9a5c", opacity: prog(f, b.sensation - 6, 16) }} />
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: C.ink, opacity: prog(f, b.sensation - 6, 16), width: 260, lineHeight: 1.15 }}>
            “sunset orange”
            <div style={{ fontFamily: FONT.mono, fontSize: 18, color: C.ink3, fontWeight: 400, marginTop: 6 }}>made in your brain</div>
          </div>
        </div>
      )}
      {prog(f, b.millions - 6, 14) > 0.01 && (
        <div style={{ position: "absolute", left: 150, top: 790, fontFamily: FONT.display, fontWeight: 700, fontSize: 46, color: C.ink, opacity: prog(f, b.millions - 6, 14) }}>
          3 tiny lights → <span style={{ color: C.amber }}>millions</span> of colors
        </div>
      )}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ frames → motion
const Motion: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.next - 6, { damping: 22, stiffness: 90 });
  const stitch = prog(f, b.stitches - 6, 40, EASE.inOut);
  const W = 400;
  const H = 225;
  const n = Math.min(6, Math.max(1, Math.floor((f - b.next + 10) / 14)));
  const sunX = (k: number) => 300 + k * 90;
  const smoothK = (f - b.stitches) * 0.12;
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.4) }}>
      <div style={{ position: "absolute", left: 110, top: 112 }}>
        <Kicker color={C.green} at={b.next - 4}>
          One frame after another
        </Kicker>
      </div>
      {/* discrete frames arriving */}
      <div style={{ position: "absolute", left: 150, top: 250, opacity: 1 - stitch }}>
        {new Array(n).fill(0).map((_, k) => (
          <div key={k} style={{ position: "absolute", left: k * 46, top: k * 34, width: W, height: H, borderRadius: 12, overflow: "hidden", border: "2px solid rgba(255,255,255,0.4)", boxShadow: "0 20px 50px rgba(0,0,0,0.6)", background: "#0b0e1c" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #16195a, #b23a8a 70%, #ffab5e)" }} />
            <div style={{ position: "absolute", left: (sunX(k) / 1040) * W - 34, top: 100, width: 68, height: 68, borderRadius: "50%", background: "#ffd36e", boxShadow: "0 0 30px #ffb347" }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 70, background: "#1c1342" }} />
            <div style={{ position: "absolute", left: 10, top: 8, fontFamily: FONT.mono, fontSize: 16, color: "#fff" }}>frame {k + 1} · +{(k * 8.3).toFixed(1)} ms</div>
          </div>
        ))}
      </div>
      {/* … stitched into smooth motion */}
      <div style={{ position: "absolute", left: 960 - 520 + 200, top: 250, width: 1040, height: 585, borderRadius: 18, overflow: "hidden", opacity: stitch, border: "1px solid rgba(255,255,255,0.18)", boxShadow: "0 40px 120px rgba(0,0,0,0.6)" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #060a26 0%, #4b1f7e 45%, #b23a8a 75%, #ffab5e 100%)" }} />
        {new Array(6).fill(0).map((_, k) => {
          const x = 120 + ((smoothK * 60 - k * 9) % 900 + 900) % 900;
          return <div key={k} style={{ position: "absolute", left: x, top: 230 + Math.sin(x / 300) * 30, width: 150, height: 150, borderRadius: "50%", background: "#ffd36e", opacity: k === 0 ? 1 : 0.14 / k, boxShadow: k === 0 ? "0 0 80px #ffb347" : undefined }} />;
        })}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 170, background: "linear-gradient(180deg, #1c1342, #060816)" }} />
      </div>
      <div style={{ position: "absolute", left: 960 - 520 + 200, top: 860, fontFamily: FONT.display, fontWeight: 700, fontSize: 46, color: C.ink, opacity: prog(f, b.smooth - 6, 14) }}>
        ≈ 8 ms apart → <span style={{ color: C.green }}>smooth motion</span>
      </div>
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const oA = 1 - prog(f, b.there - 14, 14, EASE.inOut);
  const cA = inOut(f, b.there - 14, 14, b.next - 10, 12);
  const mA = prog(f, b.next - 10, 14);
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={14}>
      {oA > 0.01 && <Optics b={b} a={oA} />}
      {cA > 0.01 && <Cones b={b} a={cA} />}
      {mA > 0.01 && <Motion b={b} a={mA} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: 30, name: "swell", vol: 0.3 },
    { at: b.crosses - 6, name: "sweep_up", vol: 0.25 },
    { at: b.lens - 4, name: "shimmer", vol: 0.25 },
    { at: b.retina - 4, name: "pop", vol: 0.3 },
    { at: b.there - 12, name: "whoosh_soft", vol: 0.3 },
    { at: b.red - 6, name: "blip", vol: 0.3 },
    { at: b.green - 6, name: "blip", vol: 0.3, rate: 1.12 },
    { at: b.blue - 6, name: "blip", vol: 0.3, rate: 1.26 },
    { at: b.compares - 6, name: "pulse", vol: 0.35 },
    { at: b.sensation - 6, name: "chime", vol: 0.25 },
    { at: b.millions - 6, name: "shimmer", vol: 0.3 },
    { at: b.next - 10, name: "whoosh_soft", vol: 0.3 },
    { at: b.arrives - 4, name: "tick", vol: 0.3 },
    { at: b.arrives + 10, name: "tick", vol: 0.3 },
    { at: b.arrives + 24, name: "tick", vol: 0.3 },
    { at: b.stitches - 6, name: "whoosh", vol: 0.3 },
    { at: b.smooth - 6, name: "swell", vol: 0.3 },
  ];
};

export const Eye: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.green, hueB: C.pink, hueC: C.amber, intensity: 0.6 },
};
