import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker } from "../../components/core";
import { glowSprite, useCanvas } from "../../components/fx";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { RGB, wallpaper, wallpaperData } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    itself: c.b1.from,
    leds: wordAt(c.b1, "thousands of tiny LEDs"),
    zones: wordAt(c.b1, "grouped into zones"),
    dim: wordAt(c.b1, "dim independently"),
    dark: c.b2.from,
    highlights: wordAt(c.b2, "highlights"),
    nits: wordAt(c.b2, "sixteen hundred nits"),
    inside: c.b3.from,
    electrons: wordAt(c.b3, "it's electrons"),
    junction: wordAt(c.b3, "across a junction"),
    holes: wordAt(c.b3, "fall into holes"),
    photon: wordAt(c.b3, "releases a photon"),
    size: c.b4.from,
    gap: wordAt(c.b4, "the band gap"),
    color: wordAt(c.b4, "sets the light's color"),
    blue: wordAt(c.b4, "These are blue LEDs"),
    gan: wordAt(c.b4, "gallium nitride"),
    nobel: wordAt(c.b4, "Nobel Prize"),
    coating: c.b5.from,
    redgreen: wordAt(c.b5, "red and green"),
    white: wordAt(c.b5, "they make white"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

// ------------------------------------------------------------------ local dimming
const ZX = 32;
const ZY = 18;
let ZONES: Float32Array | null = null;
/** Per-zone backlight level = brightest pixel in the zone (what local dimming needs). */
const zones = () => {
  if (ZONES) return ZONES;
  const W = 192;
  const H = 108;
  const d = wallpaperData(W, H);
  const z = new Float32Array(ZX * ZY);
  for (let j = 0; j < ZY; j++)
    for (let i = 0; i < ZX; i++) {
      let m = 0;
      for (let y = 0; y < 6; y++)
        for (let x = 0; x < 6; x++) {
          const q = ((j * 6 + y) * W + (i * 6 + x)) * 4;
          m = Math.max(m, Math.max(d[q], d[q + 1], d[q + 2]) / 255);
        }
      z[j * ZX + i] = m;
    }
  ZONES = z;
  return z;
};

const LocalDimming: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const W = 1440;
  const H = 810;
  const wipe = keyframes(f, [[b.leds - 10, 0], [b.leds + 30, 1], [b.dark + 10, 1], [b.dark + 70, 0.5]], EASE.inOut); // fraction showing the LED layer
  const dimP = prog(f, b.dim - 10, 30, EASE.inOut); // before: all zones equally on
  const hdr = prog(f, b.highlights - 6, 30, EASE.inOut);
  const ref = useCanvas(
    (ctx, fr) => {
      const z = zones();
      const sprW = glowSprite("#9cc2ff", 64);
      ctx.clearRect(0, 0, W, H);
      const cut = W * wipe;
      // the picture (right of the cut)
      ctx.save();
      ctx.beginPath();
      ctx.rect(cut, 0, W - cut, H);
      ctx.clip();
      ctx.drawImage(wallpaper(), 0, 0, W, H);
      // HDR highlight: the sun area blazes brighter
      if (hdr > 0.01) {
        const g = ctx.createRadialGradient(W * 0.62, H * 0.54, 0, W * 0.62, H * 0.54, H * 0.35);
        g.addColorStop(0, `rgba(255,250,225,${0.55 * hdr})`);
        g.addColorStop(1, "rgba(255,240,200,0)");
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.restore();
      // the LED backlight (left of the cut)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, cut, H);
      ctx.clip();
      ctx.fillStyle = "#04050b";
      ctx.fillRect(0, 0, cut, H);
      const zw = W / ZX;
      const zh = H / ZY;
      ctx.globalCompositeOperation = "lighter";
      for (let j = 0; j < ZY; j++)
        for (let i = 0; i < ZX; i++) {
          let v = mix(0.55, z[j * ZX + i], dimP);
          const sun = Math.hypot((i + 0.5) / ZX - 0.62, ((j + 0.5) / ZY - 0.54) * 0.56);
          if (sun < 0.14) v = Math.min(1.6, v + hdr * 0.6 * (1 - sun / 0.14));
          v = v * v;
          const x = i * zw;
          const y = j * zh;
          ctx.globalAlpha = Math.min(1, 0.85 * v);
          ctx.drawImage(sprW, x - zw * 0.6, y - zh * 0.6, zw * 2.2, zh * 2.2);
          // the tiny LEDs inside each zone
          ctx.globalAlpha = Math.min(1, 0.25 + v);
          ctx.fillStyle = v > 0.05 ? "#e9f1ff" : "#2a3146";
          for (let k = 0; k < 4; k++) ctx.fillRect(x + zw * (0.25 + 0.5 * (k % 2)) - 2, y + zh * (0.25 + 0.5 * Math.floor(k / 2)) - 2, 4, 4);
        }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      // zone grid
      ctx.strokeStyle = "rgba(160,180,255,0.12)";
      ctx.beginPath();
      for (let i = 0; i <= ZX; i++) {
        ctx.moveTo(i * zw, 0);
        ctx.lineTo(i * zw, H);
      }
      for (let j = 0; j <= ZY; j++) {
        ctx.moveTo(0, j * zh);
        ctx.lineTo(W, j * zh);
      }
      ctx.stroke();
      ctx.restore();
      // the cut line
      if (wipe > 0.002 && wipe < 0.998) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(cut - 1.5, 0, 3, H);
      }
      void fr;
    },
    [wipe, dimP, hdr],
  );
  const inP = spr(f, fps, b.itself - 6, { damping: 24, stiffness: 80 });
  const nits = Math.round(mix(0, 1600, prog(f, b.nits - 8, 34, EASE.out)));
  const nitsA = prog(f, b.highlights - 4, 14);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 960 - W / 2 - 100, top: 112, opacity: clamp(inP * 1.4) }}>
        <Kicker color={C.amber} at={b.itself}>
          Mini-LED backlight · local dimming
        </Kicker>
      </div>
      <div style={{ position: "absolute", left: 960 - W / 2 - 100, top: 170, width: W, height: H, borderRadius: 14, overflow: "hidden", transform: `scale(${mix(0.94, 1, inP)})`, opacity: clamp(inP * 1.4), boxShadow: "0 40px 120px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.12)" }}>
        <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0 }} />
      </div>
      {wipe > 0.2 && (
        <div style={{ position: "absolute", left: 960 - W / 2 - 80, top: 170 + H + 14, fontFamily: FONT.mono, fontSize: 22, color: C.ink2, opacity: clamp((wipe - 0.2) * 3) }}>
          ← LED zones behind the picture {dimP > 0.5 ? "· each zone dims on its own" : ""}
        </div>
      )}
      {/* nits meter */}
      <div style={{ position: "absolute", right: 70, top: 200, width: 150, opacity: nitsA, textAlign: "center" }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 18, letterSpacing: "0.25em", color: C.amber }}>BRIGHTNESS</div>
        <div style={{ position: "relative", margin: "14px auto 0", width: 30, height: 500, borderRadius: 15, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${(nits / 1600) * 100}%`, background: "linear-gradient(0deg, #ffb347, #fff6d8)", boxShadow: "0 0 24px #ffd28a" }} />
        </div>
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 40, color: C.ink, marginTop: 14, fontVariantNumeric: "tabular-nums" }}>{nits.toLocaleString("en-US")}</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 20, color: C.ink3 }}>nits · peak HDR</div>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ inside an LED: the p–n junction
const Junction: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.inside - 6, { damping: 22, stiffness: 90 });
  const X0 = 360;
  const X1 = 1560;
  const XM = 960;
  const Y0 = 420;
  const Y1 = 760;
  const flow = prog(f, b.junction - 10, 20);
  const recombine = prog(f, b.holes - 10, 16);
  const N = 26;
  const t = f - b.junction + 10;
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.4) }}>
      <div style={{ position: "absolute", left: 110, top: 112 }}>
        <Kicker color={C.amber} at={b.inside - 6}>
          Inside one LED
        </Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="nside" x1="0" x2="1">
            <stop offset="0" stopColor="#1b1530" />
            <stop offset="1" stopColor="#241a3e" />
          </linearGradient>
          <linearGradient id="pside" x1="0" x2="1">
            <stop offset="0" stopColor="#10243a" />
            <stop offset="1" stopColor="#0d1b2e" />
          </linearGradient>
        </defs>
        <rect x={X0} y={Y0} width={XM - X0} height={Y1 - Y0} rx={16} fill="url(#nside)" stroke={hexA(C.amber, 0.5)} strokeWidth={2} />
        <rect x={XM} y={Y0} width={X1 - XM} height={Y1 - Y0} rx={16} fill="url(#pside)" stroke={hexA(C.cyan, 0.5)} strokeWidth={2} />
        <rect x={XM - 40} y={Y0} width={80} height={Y1 - Y0} fill={hexA("#ffffff", 0.05)} />
        <line x1={XM} y1={Y0} x2={XM} y2={Y1} stroke={hexA(C.ink, 0.4)} strokeDasharray="6 8" strokeWidth={2} />
        <text x={(X0 + XM) / 2} y={Y0 - 22} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={32} fill={C.amber}>
          n-type: spare electrons
        </text>
        <text x={(XM + X1) / 2} y={Y0 - 22} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={32} fill={C.cyan}>
          p-type: “holes”
        </text>
        <text x={XM} y={Y1 + 44} textAnchor="middle" fontFamily={FONT.mono} fontSize={24} fill={C.ink2}>
          junction
        </text>
        {/* holes (p side) */}
        {new Array(N).fill(0).map((_, i) => {
          const hx = mix(XM + 60, X1 - 40, rnd(`hx${i}`)) - flow * ((t * 0.9 + rnd(`hv${i}`) * 300) % 380) * 0.35;
          const hy = mix(Y0 + 30, Y1 - 30, rnd(`hy${i}`));
          return <circle key={`h${i}`} cx={Math.max(XM + 10, hx)} cy={hy} r={13} fill="none" stroke={C.cyan} strokeWidth={3} opacity={0.85} />;
        })}
        {/* electrons streaming across; some recombine at the junction and emit photons */}
        {new Array(N).fill(0).map((_, i) => {
          const sp = rnd(`ev${i}`, 2.2, 3.4);
          const cyc = 520;
          const ph = ((t * sp + rnd(`eo${i}`) * cyc) % cyc + cyc) % cyc;
          const x = mix(X0 + 30, XM - 30, rnd(`ex${i}`)) + flow * ph;
          const y = mix(Y0 + 30, Y1 - 30, rnd(`ey${i}`)) + Math.sin(t * 0.1 + i) * 6;
          const crossed = x > XM - 10;
          const age = (x - XM + 10) / sp;
          if (crossed && recombine > 0.5) {
            // recombination flash + photon
            if (age < 26) {
              const k = age / 26;
              return (
                <g key={`e${i}`}>
                  <circle cx={XM + 10} cy={y} r={16 + 30 * k} fill={hexA(C.blue, 0.5 * (1 - k))} />
                  <path d={`M${XM + 10},${y} ${new Array(10).fill(0).map((__, s) => `L${XM + 10 + s * 6 * (1 + k * 6) * 0.25},${y - s * 26 * k - Math.sin(s * 1.6) * 8}`).join(" ")}`} fill="none" stroke="#7fb2ff" strokeWidth={3} opacity={1 - k * 0.6} />
                  <circle cx={XM + 10 + 9 * 6 * (1 + k * 6) * 0.25} cy={y - 9 * 26 * k} r={7} fill="#cfe1ff" opacity={1 - k * 0.5} />
                </g>
              );
            }
            return null;
          }
          return <circle key={`e${i}`} cx={Math.min(x, XM + 30)} cy={y} r={10} fill={C.amber} style={{ filter: `drop-shadow(0 0 6px ${C.amber})` }} />;
        })}
      </svg>
      <div style={{ position: "absolute", left: XM - 260, top: 230, width: 520, textAlign: "center", fontFamily: FONT.display, fontWeight: 700, fontSize: 44, color: C.ink, opacity: prog(f, b.photon - 6, 14) }}>
        electron + hole → <span style={{ color: "#8fb8ff", textShadow: "0 0 30px #5b8cff" }}>photon</span>
      </div>
      <Glow x={XM} y={590} size={600} color={C.blue} a={0.25 * recombine} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ band gap → color, GaN, Nobel
const BandGap: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.size - 6, { damping: 22, stiffness: 90 });
  const fall = prog(f, b.gap - 4, 24, EASE.in);
  const colA = prog(f, b.color - 6, 16);
  const ganA = spr(f, fps, b.gan - 6, { damping: 18, stiffness: 120 });
  const nobelA = spr(f, fps, b.nobel - 6, { damping: 18, stiffness: 110 });
  const CB = 360;
  const VB = 640;
  const x = 520;
  // spectrum bar
  const SX0 = 1080;
  const SX1 = 1780;
  const wl = (nm: number) => mix(SX0, SX1, (nm - 380) / (750 - 380));
  const spec = (nm: number) => {
    // rough visible-spectrum color
    const t = (nm - 380) / 370;
    const stops: [number, string][] = [
      [0, "#6b2bd6"],
      [0.18, "#2c55ff"],
      [0.32, "#1fb6ff"],
      [0.45, "#22e07a"],
      [0.6, "#e6f23a"],
      [0.72, "#ffb020"],
      [0.85, "#ff4a2a"],
      [1, "#b0141a"],
    ];
    return stops.reduce((acc, [s, c]) => (t >= s ? c : acc), stops[0][1]);
  };
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.4) }}>
      <div style={{ position: "absolute", left: 110, top: 112 }}>
        <Kicker color={C.blue} at={b.size - 6}>
          Band gap = color
        </Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* bands */}
        <rect x={160} y={CB - 70} width={640} height={70} rx={12} fill={hexA(C.amber, 0.16)} stroke={hexA(C.amber, 0.6)} />
        <text x={180} y={CB - 26} fontFamily={FONT.mono} fontSize={24} fill={C.amber}>
          conduction band
        </text>
        <rect x={160} y={VB} width={640} height={70} rx={12} fill={hexA(C.cyan, 0.14)} stroke={hexA(C.cyan, 0.6)} />
        <text x={180} y={VB + 44} fontFamily={FONT.mono} fontSize={24} fill={C.cyan}>
          valence band
        </text>
        {/* gap bracket */}
        <line x1={830} y1={CB} x2={830} y2={VB} stroke={C.ink} strokeWidth={2} />
        <line x1={818} y1={CB} x2={842} y2={CB} stroke={C.ink} strokeWidth={2} />
        <line x1={818} y1={VB} x2={842} y2={VB} stroke={C.ink} strokeWidth={2} />
        <text x={850} y={(CB + VB) / 2 + 10} fontFamily={FONT.display} fontWeight={700} fontSize={34} fill={C.ink} opacity={prog(f, b.gap - 6, 14)}>
          band gap
        </text>
        {/* the hole waiting below */}
        <circle cx={x} cy={VB + 35} r={16} fill="none" stroke={C.cyan} strokeWidth={3} opacity={1 - prog(f, b.gap + 20, 6)} />
        {/* the electron falls */}
        <circle cx={x} cy={mix(CB - 35, VB + 35, fall)} r={14} fill={C.amber} style={{ filter: `drop-shadow(0 0 8px ${C.amber})` }} />
        {fall > 0.98 && (
          <g opacity={prog(f, b.gap + 20, 10)}>
            <path d={`M${x + 20},${(CB + VB) / 2} ${new Array(24).fill(0).map((_, s) => `L${x + 20 + s * 12},${(CB + VB) / 2 - Math.sin(s * 1.1 + f * 0.4) * 16}`).join(" ")}`} fill="none" stroke="#5b8cff" strokeWidth={4} style={{ filter: "drop-shadow(0 0 8px #5b8cff)" }} />
            <text x={x + 120} y={(CB + VB) / 2 - 40} fontFamily={FONT.mono} fontSize={24} fill="#a9c6ff">
              photon ≈ 450 nm
            </text>
          </g>
        )}
        {/* spectrum: gap size picks the color */}
        <g opacity={colA}>
          {new Array(74).fill(0).map((_, i) => {
            const nm = 380 + i * 5;
            return <rect key={i} x={wl(nm)} y={420} width={(SX1 - SX0) / 74 + 0.5} height={60} fill={spec(nm)} />;
          })}
          <text x={SX0} y={404} fontFamily={FONT.mono} fontSize={20} fill={C.ink3}>
            bigger gap → bluer
          </text>
          <text x={SX1} y={404} textAnchor="end" fontFamily={FONT.mono} fontSize={20} fill={C.ink3}>
            smaller gap → redder
          </text>
          <g transform={`translate(${wl(450)} 0)`}>
            <path d="M0,500 L-14,524 L14,524 Z" fill="#fff" />
            <text x={0} y={556} textAnchor="middle" fontFamily={FONT.mono} fontSize={22} fill={C.ink}>
              blue
            </text>
          </g>
        </g>
      </svg>
      {ganA > 0.01 && (
        <div style={{ position: "absolute", left: 1080, top: 620, opacity: clamp(ganA * 1.4), transform: `translateY(${(1 - ganA) * 20}px)` }}>
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 46, color: C.ink }}>Gallium nitride</span>
          <span style={{ fontFamily: FONT.mono, fontSize: 30, color: "#8fb8ff", marginLeft: 16 }}>GaN</span>
        </div>
      )}
      {nobelA > 0.01 && (
        <div style={{ position: "absolute", left: 1080, top: 720, display: "flex", alignItems: "center", gap: 22, opacity: clamp(nobelA * 1.4), transform: `scale(${mix(0.9, 1, nobelA)})`, transformOrigin: "0 50%" }}>
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #fff2c2, #e2a93b 55%, #8a5a12)", boxShadow: "0 0 40px rgba(245,198,107,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.display, fontWeight: 800, fontSize: 30, color: "#5a3a06" }}>2014</div>
          <div>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 36, color: C.gold }}>Nobel Prize in Physics</div>
            <div style={{ fontFamily: FONT.ui, fontSize: 24, color: C.ink2, marginTop: 4 }}>Akasaki · Amano · Nakamura — efficient blue LEDs</div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ blue → white
const Coating: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.coating - 6, { damping: 22, stiffness: 90 });
  const conv = prog(f, b.redgreen - 8, 24);
  const white = prog(f, b.white - 8, 24);
  const t = f - b.coating;
  const ledX = 520;
  const ledY = 760;
  const photons = new Array(30).fill(0).map((_, i) => {
    const ang = -Math.PI / 2 + rnd(`pa${i}`, -0.7, 0.7);
    const sp = rnd(`ps${i}`, 4, 7);
    const life = ((t * sp + rnd(`po${i}`) * 400) % 400) / 400;
    const r = life * 420;
    const kind = conv > 0.5 && r > 120 ? (i % 3 === 0 ? "b" : i % 3 === 1 ? "g" : "r") : "b";
    return { x: ledX + Math.cos(ang) * r, y: ledY - 60 + Math.sin(ang) * r, kind, a: 1 - life };
  });
  // spectrum chart
  const GX0 = 1000;
  const GX1 = 1760;
  const GY = 760;
  const GH = 360;
  const curve = (w: number) => {
    const g = (mu: number, sd: number, h: number) => h * Math.exp(-((w - mu) ** 2) / (2 * sd * sd));
    return g(450, 11, 1) * mix(1, 0.75, conv) + conv * (g(535, 16, 0.62) + g(630, 9, 0.7));
  };
  let d = "";
  for (let w = 380; w <= 750; w += 3) {
    const x = mix(GX0, GX1, (w - 380) / 370);
    d += `${d ? "L" : "M"}${x.toFixed(1)},${(GY - curve(w) * GH).toFixed(1)}`;
  }
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.4) }}>
      <div style={{ position: "absolute", left: 110, top: 112 }}>
        <Kicker color={C.green} at={b.coating - 6}>
          Blue in, white out
        </Kicker>
      </div>
      <Glow x={ledX} y={ledY - 180} size={900 * (0.5 + white)} color="#ffffff" a={0.35 * white} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* LED + coating */}
        <rect x={ledX - 70} y={ledY - 40} width={140} height={60} rx={10} fill="#1b2336" stroke={hexA(C.blue, 0.8)} strokeWidth={2} />
        <rect x={ledX - 52} y={ledY - 30} width={104} height={30} rx={6} fill="#6f9dff" style={{ filter: "drop-shadow(0 0 14px #5b8cff)" }} />
        <path d={`M${ledX - 230},${ledY - 150} Q${ledX},${ledY - 260} ${ledX + 230},${ledY - 150}`} fill="none" stroke={hexA("#ffe9a8", 0.35 + 0.5 * conv)} strokeWidth={34} strokeLinecap="round" />
        <text x={ledX} y={ledY - 270} textAnchor="middle" fontFamily={FONT.mono} fontSize={22} fill={C.ink2} opacity={prog(f, b.coating + 10, 14)}>
          phosphor / quantum-dot coating
        </text>
        {photons.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={7} fill={p.kind === "b" ? "#5b8cff" : p.kind === "g" ? RGB.g : RGB.r} opacity={p.a} style={{ filter: `drop-shadow(0 0 6px ${p.kind === "b" ? "#5b8cff" : p.kind === "g" ? RGB.g : RGB.r})` }} />
        ))}
        {/* spectrum */}
        <line x1={GX0} y1={GY} x2={GX1} y2={GY} stroke="rgba(255,255,255,0.3)" />
        <path d={`${d}L${GX1},${GY}L${GX0},${GY}Z`} fill={white > 0.5 ? "rgba(255,255,255,0.12)" : hexA(C.blue, 0.12)} />
        <path d={d} fill="none" stroke={white > 0.5 ? "#ffffff" : "#8fb8ff"} strokeWidth={4} />
        <text x={GX0} y={GY + 36} fontFamily={FONT.mono} fontSize={20} fill={C.ink3}>
          400 nm
        </text>
        <text x={GX1} y={GY + 36} textAnchor="end" fontFamily={FONT.mono} fontSize={20} fill={C.ink3}>
          700 nm
        </text>
        <text x={GX0} y={GY - GH - 30} fontFamily={FONT.ui} fontWeight={700} fontSize={20} letterSpacing="0.25em" fill={C.ink3}>
          SPECTRUM
        </text>
      </svg>
      {white > 0.01 && (
        <div style={{ position: "absolute", left: GX0, top: GY + 60, fontFamily: FONT.display, fontWeight: 700, fontSize: 48, color: C.ink, opacity: white }}>
          <span style={{ color: "#8fb8ff" }}>blue</span> + <span style={{ color: RGB.g }}>green</span> + <span style={{ color: RGB.r }}>red</span> = white
        </div>
      )}
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const ldA = 1 - prog(f, b.inside - 12, 14);
  const jA = inOut(f, b.inside - 10, 14, b.size - 10, 12);
  const bgA = inOut(f, b.size - 10, 14, b.coating - 10, 12);
  const coA = prog(f, b.coating - 10, 14);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      {ldA > 0.01 && <LocalDimming b={b} a={ldA} />}
      {jA > 0.01 && <Junction b={b} a={jA} />}
      {bgA > 0.01 && <BandGap b={b} a={bgA} />}
      {coA > 0.01 && <Coating b={b} a={coA} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.leds - 10, name: "whoosh", vol: 0.35 },
    { at: b.leds, name: "shimmer", vol: 0.3 },
    { at: b.dim - 10, name: "sweep_down", vol: 0.3 },
    { at: b.highlights - 6, name: "swell", vol: 0.35 },
    { at: b.nits - 8, name: "riser", vol: 0.3 },
    { at: b.nits + 26, name: "impact", vol: 0.3 },
    { at: b.inside - 12, name: "whoosh_big", vol: 0.4 },
    { at: b.electrons - 4, name: "electrons", vol: 0.45 },
    { at: b.holes - 6, name: "pop", vol: 0.3 },
    { at: b.photon - 6, name: "shimmer", vol: 0.35 },
    { at: b.size - 10, name: "whoosh_soft", vol: 0.3 },
    { at: b.gap - 4, name: "sweep_down", vol: 0.3 },
    { at: b.gap + 20, name: "zap", vol: 0.3 },
    { at: b.color - 6, name: "chime", vol: 0.22 },
    { at: b.gan - 6, name: "pop", vol: 0.3 },
    { at: b.nobel - 6, name: "chime_lo", vol: 0.35 },
    { at: b.coating - 10, name: "whoosh_soft", vol: 0.3 },
    { at: b.redgreen - 8, name: "pop_hi", vol: 0.3 },
    { at: b.white - 8, name: "shimmer", vol: 0.4 },
  ];
};

export const Backlight: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.amber, hueB: C.blue, hueC: C.pink, intensity: 0.6 },
};
