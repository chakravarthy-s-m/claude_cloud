import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow } from "../../components/core";
import { ElectronStream, glowSprite, useCanvas } from "../../components/fx";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { RGB, SubpixelView, SUN, wallpaper, pixelAt } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    look: c.o1.from,
    still: c.o2.from,
    isnt: wordAt(c.o2, "It isn't"),
    refresh: c.o3.from,
    hz: wordAt(c.o3, "a hundred and twenty"),
    every: wordAt(c.o3, "every pixel"),
    moves: wordAt(c.o4, "anything moves"),
    brandNew: wordAt(c.o4, "brand-new picture"),
    millions: wordAt(c.o4, "six million"),
    ms: wordAt(c.o4, "eight milliseconds"),
    proc: c.o5.from,
    same: wordAt(c.o5, "the same simple math"),
    millions2: wordAt(c.o5, "on millions"),
    once: wordAt(c.o5, "at once"),
    electrons: wordAt(c.o6, "electrons"),
    light: wordAt(c.o6, "back into light"),
    follow: c.o7.from,
    numbers: wordAt(c.o7, "From numbers"),
    toLight: wordAt(c.o7, "to light"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

const TARGET = { x: SUN.x - SUN.r * 0.7071 + 0.5, y: SUN.y - SUN.r * 0.7071 + 0.5 };

// ---------------------------------------------------------------- floating screen
const PW = 1240;
const PH = Math.round(PW / 1.54);

const ScreenCanvas: React.FC<{ scan: number; scanA: number; bright: number }> = ({ scan, scanA, bright }) => {
  const ref = useCanvas(
    (ctx) => {
      const img = wallpaper();
      // object-fit: cover
      const sAspect = PW / PH;
      const sw = img.height * sAspect;
      ctx.globalAlpha = bright;
      ctx.drawImage(img, (img.width - sw) / 2, 0, sw, img.height, 0, 0, PW, PH);
      ctx.globalAlpha = 1;
      if (scanA > 0.01) {
        const y = scan * PH;
        // freshly written rows glow a little, decaying upward
        const g = ctx.createLinearGradient(0, y - 220, 0, y);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(1, `rgba(220,240,255,${0.32 * scanA})`);
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = g;
        ctx.fillRect(0, y - 220, PW, 220);
        ctx.fillStyle = `rgba(230,250,255,${0.95 * scanA})`;
        ctx.fillRect(0, y - 2, PW, 3);
        ctx.globalCompositeOperation = "source-over";
      }
    },
    [scan, scanA, bright],
  );
  return <canvas ref={ref} width={PW} height={PH} style={{ position: "absolute", inset: 0, borderRadius: 18 }} />;
};

const FloatingScreen: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = spr(f, fps, 8, { damping: 30, stiffness: 40 });
  const push = prog(f, b.brandNew - 26, 30, EASE.in);
  const ry = mix(-20, -5, prog(f, 0, b.moves, EASE.inOut)) * (1 - push);
  const rx = mix(9, 3, prog(f, 0, b.moves, EASE.inOut)) * (1 - push);
  const scale = mix(0.82, 0.96, prog(f, 0, b.moves, EASE.inOut)) * mix(1, 1.62, push);
  // refresh: one slow, visible sweep, then faster and faster until it is a shimmer
  // integrate phase so speed changes stay continuous
  let phase = 0;
  for (let t = b.isnt; t < f; t++) phase += 1 / keyframes(t, [[b.isnt, 64], [b.refresh, 44], [b.hz, 14], [b.every, 5]], EASE.inOut);
  const scanOn = f >= b.isnt ? inOut(f, b.isnt - 2, 6, b.moves, 16) : 0;
  const scan = phase % 1;
  const hudA = inOut(f, b.isnt + 6, 24, b.brandNew - 20, 14);
  const frameNo = Math.max(0, Math.floor((f - b.isnt) * mix(1, 4, prog(f, b.refresh, b.hz - b.refresh + 20))));
  const slowA = 1 - prog(f, b.hz - 6, 20); // the sweep is slowed down until "a hundred and twenty"
  // the moving window (anything moves)
  const winP = prog(f, b.moves - 4, 34, EASE.inOut);
  const winA = inOut(f, b.moves - 14, 10, b.brandNew - 10, 10);
  return (
    <AbsoluteFill style={{ opacity: a * clamp(appear * 1.4) }}>
      <Glow x={960} y={600} size={1700} color={C.violet} a={0.18} />
      <div style={{ position: "absolute", left: 960 - 900, top: 860, width: 1800, height: 240, borderRadius: "50%", background: `radial-gradient(50% 50% at 50% 50%, ${hexA("#ff8a6a", 0.16)}, transparent 70%)`, filter: "blur(10px)" }} />
      <AbsoluteFill style={{ perspective: 2200, perspectiveOrigin: "50% 45%" }}>
        <div
          style={{
            position: "absolute",
            left: 960 - PW / 2 - 120 * hudA * (1 - push),
            top: 515 - PH / 2,
            width: PW,
            height: PH,
            transform: `translateY(${(1 - appear) * 60}px) rotateY(${ry}deg) rotateX(${rx}deg) scale(${scale})`,
            transformStyle: "preserve-3d",
          }}
        >
          <div style={{ position: "absolute", inset: -16, borderRadius: 30, background: "linear-gradient(160deg, #1c2133, #07080f 60%)", boxShadow: `0 60px 140px rgba(0,0,0,0.75), 0 0 120px ${hexA("#ff7a8a", 0.18)}`, border: "1px solid rgba(255,255,255,0.08)" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: 18, overflow: "hidden" }}>
            <ScreenCanvas scan={scan} scanA={scanOn} bright={mix(0.2, 1, appear)} />
            {/* a window being dragged */}
            {winA > 0.01 && (
              <div
                style={{
                  position: "absolute",
                  left: mix(150, 560, winP),
                  top: mix(330, 170, winP),
                  width: 380,
                  height: 250,
                  borderRadius: 16,
                  background: "rgba(18,20,34,0.78)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
                  opacity: winA,
                  backdropFilter: undefined,
                }}
              >
                <div style={{ display: "flex", gap: 8, padding: 14 }}>
                  {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                    <span key={c} style={{ width: 11, height: 11, borderRadius: 6, background: c }} />
                  ))}
                </div>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{ margin: "10px 22px", height: 12, borderRadius: 6, width: 300 - i * 52, background: "rgba(255,255,255,0.16)" }} />
                ))}
                {/* cursor holding the title bar */}
                <svg width={40} height={40} style={{ position: "absolute", left: 170, top: 4 }}>
                  <path d="M4,2 L4,30 L11,23 L16,35 L21,33 L16,21 L26,21 Z" fill="#fff" stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
                </svg>
              </div>
            )}
            {/* glass sheen */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 28%, rgba(255,255,255,0) 50%)" }} />
          </div>
        </div>
      </AbsoluteFill>
      {/* refresh HUD */}
      {hudA > 0.01 && (
        <div style={{ position: "absolute", right: 70, top: 410, textAlign: "right", opacity: hudA, fontFamily: FONT.mono, transform: `translateX(${(1 - hudA) * 40}px)` }}>
          <div style={{ fontFamily: FONT.ui, fontSize: 18, fontWeight: 600, letterSpacing: "0.34em", color: hexA(C.cyan, 0.9) }}>REFRESH</div>
          <div style={{ fontSize: 76, fontWeight: 700, color: C.ink, lineHeight: 1.05, fontVariantNumeric: "tabular-nums", textShadow: `0 0 30px ${hexA(C.cyan, 0.5)}` }}>
            120
            <span style={{ fontSize: 34, color: C.ink3, marginLeft: 10 }}>Hz</span>
          </div>
          <div style={{ position: "relative", height: 30, marginTop: 6 }}>
            <div style={{ position: "absolute", right: 0, top: 0, fontSize: 22, color: C.amber, opacity: slowA, whiteSpace: "nowrap" }}>shown in slow motion</div>
            <div style={{ position: "absolute", right: 0, top: 0, fontSize: 22, color: C.ink3, opacity: 1 - slowA, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>frame #{String(frameNo).padStart(6, "0")}</div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- pixels + timer
const PixelsPart: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zp = prog(f, b.brandNew - 6, b.millions - b.brandNew + 30, EASE.inOut);
  const zoom = Math.exp(mix(Math.log(1.05), Math.log(15), zp)) * mix(1, 1.18, prog(f, b.millions + 24, b.proc - b.millions, EASE.linear));
  const cx = mix(960, TARGET.x, Math.min(1, zp * 1.35));
  const cy = mix(540, TARGET.y, Math.min(1, zp * 1.35));
  const countA = spr(f, fps, b.millions - 4, { damping: 22, stiffness: 120 });
  const count = Math.round(mix(0, 5939136, prog(f, b.millions - 4, 40, EASE.out)));
  const msP = prog(f, b.ms - 2, 42, EASE.linear);
  const msA = spr(f, fps, b.ms - 6, { damping: 22, stiffness: 120 });
  const R = 120;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <SubpixelView cx={cx} cy={cy} zoom={zoom} />
      <AbsoluteFill style={{ background: "radial-gradient(70% 70% at 50% 50%, transparent 40%, rgba(2,3,9,0.75) 100%)" }} />
      {countA > 0.01 && (
        <div style={{ position: "absolute", left: 120, top: 640, opacity: clamp(countA * 1.4), transform: `translateY(${(1 - countA) * 30}px)` }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 120, fontWeight: 700, color: C.ink, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", textShadow: `0 0 40px rgba(0,0,0,0.9), 0 0 60px ${hexA(C.pink, 0.5)}` }}>
            {count.toLocaleString("en-US")}
          </div>
          <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 26, letterSpacing: "0.4em", color: C.pink, textShadow: "0 0 20px rgba(0,0,0,0.9)" }}>PIXELS · 3024 × 1964</div>
        </div>
      )}
      {msA > 0.01 && (
        <div style={{ position: "absolute", right: 140, top: 150, width: 2 * R + 60, opacity: clamp(msA * 1.4), transform: `scale(${mix(0.85, 1, msA)})`, textAlign: "center" }}>
          <svg width={2 * R + 60} height={2 * R + 60} style={{ overflow: "visible" }}>
            <circle cx={R + 30} cy={R + 30} r={R} fill="rgba(4,6,14,0.82)" stroke={hexA(C.cyan, 0.2)} strokeWidth={10} />
            <circle
              cx={R + 30}
              cy={R + 30}
              r={R}
              fill="none"
              stroke={C.cyan}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * R * msP} ${2 * Math.PI * R}`}
              transform={`rotate(-90 ${R + 30} ${R + 30})`}
              style={{ filter: `drop-shadow(0 0 10px ${C.cyan})` }}
            />
            <text x={R + 30} y={R + 42} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={64} fill={C.ink}>
              {(8.33 * msP).toFixed(2)}
            </text>
            <text x={R + 30} y={R + 82} textAnchor="middle" fontFamily={FONT.ui} fontWeight={600} fontSize={20} letterSpacing="0.3em" fill={C.cyan}>
              MS
            </text>
          </svg>
          <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 19, letterSpacing: "0.28em", color: C.ink2, marginTop: 8, textShadow: "0 0 16px rgba(0,0,0,0.9)" }}>ONE FRAME @ 120 HZ</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the many-core painter
const COLS = 64;
const ROWS = 36;
const CoresPart: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const pulses = [b.same, b.same + 16, b.millions2, b.millions2 + 14, b.once, b.once + 8, b.once + 16];
  const ref = useCanvas(
    (ctx, fr) => {
      const W = 1920;
      const H = 1080;
      const cw = 30;
      const gap = 6;
      const x0 = W / 2 - (COLS * (cw + gap)) / 2;
      const y0 = H / 2 - (ROWS * (cw + gap)) / 2;
      const spr2 = glowSprite(C.violet, 64);
      const lit = (i: number, j: number) => {
        let v = 0.16 + 0.08 * Math.sin(fr * 0.2 + i * 0.7 + j * 1.3);
        for (const p of pulses) {
          const dt = fr - p;
          if (dt < 0 || dt > 26) continue;
          v = Math.max(v, Math.exp(-dt / 7));
        }
        // the idle "work" twinkle before the first pulse
        if (rnd(`cw${i}-${j}-${Math.floor(fr / 3)}`) > (fr < b.same ? 0.96 : 0.985)) v = Math.max(v, 0.62);
        return v;
      };
      for (let j = 0; j < ROWS; j++) {
        for (let i = 0; i < COLS; i++) {
          const v = lit(i, j);
          const x = x0 + i * (cw + gap);
          const y = y0 + j * (cw + gap);
          ctx.fillStyle = v > 0.5 ? `rgba(${mix(167, 255, v - 0.5) | 0}, ${mix(139, 255, v - 0.5) | 0}, 250, ${0.4 + v * 0.6})` : `rgba(167,139,250,${0.18 + v * 0.8})`;
          ctx.fillRect(x, y, cw, cw);
          if (v > 0.45) {
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = (v - 0.45) * 0.9;
            ctx.drawImage(spr2, x - cw, y - cw, cw * 3, cw * 3);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";
          }
        }
      }
    },
    [b.same],
  );
  const words = [
    { t: "the same math", at: b.same - 2, col: C.violet },
    { t: "on millions of things", at: b.millions2 - 2, col: C.pink },
    { t: "at once", at: b.once - 2, col: C.cyan },
  ];
  const tilt = mix(58, 48, prog(f, b.proc - 10, b.electrons - b.proc, EASE.linear));
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <AbsoluteFill style={{ perspective: 1300, perspectiveOrigin: "50% 30%" }}>
        <AbsoluteFill style={{ transform: `translateY(160px) rotateX(${tilt}deg) scale(1.25)`, transformOrigin: "50% 50%" }}>
          <canvas ref={ref} width={1920} height={1080} style={{ position: "absolute", inset: 0 }} />
        </AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(2,3,9,0.9) 0%, rgba(2,3,9,0.2) 45%, rgba(2,3,9,0) 70%)" }} />
      <div style={{ position: "absolute", top: 150, width: "100%", display: "flex", justifyContent: "center", gap: 34 }}>
        {words.map((w) => {
          const p = spr(f, 30, w.at, { damping: 18, stiffness: 140 });
          return (
            <span
              key={w.t}
              style={{
                fontFamily: FONT.display,
                fontWeight: 700,
                fontSize: 74,
                letterSpacing: "-0.03em",
                color: C.ink,
                opacity: clamp(p * 1.4),
                transform: `translateY(${(1 - p) * 40}px)`,
                filter: `blur(${(1 - clamp(p * 1.2)) * 10}px)`,
                textShadow: `0 0 40px ${hexA(w.col, 0.7)}`,
              }}
            >
              {w.t}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- electrons → light
const LightPart: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dieIn = spr(f, fps, b.electrons - 12, { damping: 22, stiffness: 90 });
  const burst = prog(f, b.light - 4, 50, EASE.out);
  const glowA = prog(f, b.light - 6, 12);
  const ring = prog(f, b.light - 2, 34, EASE.out);
  const rays = 96;
  const S = 200;
  const cx = 1010;
  const cy = 540;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: cx - S / 2 + 8, height: 1080, overflow: "hidden", opacity: 1 - burst * 0.45 }}>
        <ElectronStream start={b.electrons - 40} y={cy} height={250} speed={19} count={440} />
      </div>
      <AbsoluteFill style={{ background: `radial-gradient(60% 60% at ${cx}px ${cy}px, ${hexA("#9cc4ff", 0.22 * glowA * (1 - burst * 0.5))}, transparent 70%)` }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {new Array(rays).fill(0).map((_, i) => {
          const ang = (i / rays) * Math.PI * 2 + rnd(`ra${i}`, -0.03, 0.03);
          if (Math.cos(ang) < -0.55) return null; // keep the electron side clear
          const len = burst * rnd(`rl${i}`, 600, 1500);
          const col = [RGB.r, RGB.g, RGB.b, "#ffffff", "#bcd6ff"][i % 5];
          const w = rnd(`rw${i}`, 2, 7);
          const r0 = S * 0.42;
          return (
            <line
              key={i}
              x1={cx + Math.cos(ang) * r0}
              y1={cy + Math.sin(ang) * r0}
              x2={cx + Math.cos(ang) * (r0 + len)}
              y2={cy + Math.sin(ang) * (r0 + len)}
              stroke={col}
              strokeWidth={w}
              strokeOpacity={0.6 * (1 - burst * 0.55)}
              strokeLinecap="round"
            />
          );
        })}
        {ring > 0.01 && ring < 0.99 && <circle cx={cx} cy={cy} r={mix(S * 0.5, 1300, ring)} fill="none" stroke="#dbe8ff" strokeWidth={mix(18, 2, ring)} strokeOpacity={0.55 * (1 - ring)} />}
        <g transform={`translate(${cx} ${cy}) scale(${mix(0.6, 1, dieIn)})`} opacity={clamp(dieIn * 1.5)}>
          <rect x={-S / 2 - 18} y={-S / 2 - 18} width={S + 36} height={S + 36} rx={26} fill="#0f1422" stroke={hexA(C.amber, 0.55)} strokeWidth={2} />
          <rect x={-S / 2} y={-S / 2} width={S} height={S} rx={14} fill="#1b2336" stroke="rgba(255,255,255,0.14)" />
          <rect x={-S * 0.31} y={-S * 0.31} width={S * 0.62} height={S * 0.62} rx={8} fill={glowA > 0.01 ? `rgba(${mix(40, 225, glowA) | 0}, ${mix(52, 236, glowA) | 0}, 255, 1)` : "#283350"} />
          <path d={`M${-S / 2 - 18},${-S * 0.2} Q${-S * 0.45},${-S * 0.62} ${-S * 0.2},${-S * 0.31}`} fill="none" stroke={C.gold} strokeWidth={3} opacity={0.8} />
          <text x={0} y={S / 2 + 58} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} letterSpacing="0.3em" fill={C.ink3}>
            LED
          </text>
        </g>
      </svg>
      <Glow x={cx} y={cy} size={1200 * (0.3 + glowA)} color={C.blue} a={0.5 * glowA} />
      <Glow x={cx} y={cy} size={520 * (0.4 + glowA)} color="#ffffff" a={0.75 * glowA} />
      <div style={{ position: "absolute", left: 150, top: 330, fontFamily: FONT.ui, fontWeight: 600, fontSize: 26, letterSpacing: "0.38em", color: C.amber, opacity: inOut(f, b.electrons - 6, 12, b.light + 16, 12) }}>ELECTRONS</div>
      <div style={{ position: "absolute", left: cx + 300, top: 330, fontFamily: FONT.ui, fontWeight: 600, fontSize: 26, letterSpacing: "0.38em", color: C.ink, opacity: inOut(f, b.light + 6, 12, b.follow, 12) }}>LIGHT</div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- numbers → light
const NumbersPart: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spr(f, fps, b.follow - 4, { damping: 24, stiffness: 80 });
  const toNums = prog(f, b.numbers - 6, 20);
  const toLight = prog(f, b.toLight - 4, 36, EASE.inOut);
  const W = 1200;
  const H = 675;
  const cols = 10;
  const rows = 9;
  const ref = useCanvas(
    (ctx) => {
      ctx.drawImage(wallpaper(640, 360), 0, 0, W, H);
    },
    [],
  );
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div
        style={{
          position: "absolute",
          left: 960 - W / 2,
          top: 540 - H / 2,
          width: W,
          height: H,
          borderRadius: 14,
          overflow: "hidden",
          opacity: clamp(card * 1.3),
          transform: `scale(${mix(0.7, 1, card) * mix(1, 1.6, toLight)})`,
          boxShadow: `0 40px 120px rgba(0,0,0,0.7), 0 0 ${80 + 300 * toLight}px ${hexA("#ffb38a", 0.25 + 0.5 * toLight)}`,
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 1 - toNums * (1 - toLight) * 0.85 }} />
        {toNums > 0.01 && toLight < 0.99 && (
          <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, opacity: toNums * (1 - toLight) }}>
            {new Array(cols * rows).fill(0).map((_, k) => {
              const i = k % cols;
              const j = Math.floor(k / cols);
              const [r, g, bb] = pixelAt((i + 0.5) * (1920 / cols), (j + 0.5) * (1080 / rows));
              const flick = rnd(`nf${k}-${Math.floor(f / 4)}`) > 0.93;
              const hex = (v: number) => v.toString(16).padStart(2, "0").toUpperCase();
              return (
                <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.mono, fontWeight: 600, fontSize: 28, color: `rgb(${mix(r, 255, 0.5) | 0},${mix(g, 255, 0.5) | 0},${mix(bb, 255, 0.5) | 0})`, textShadow: `0 0 14px rgb(${r},${g},${bb})`, opacity: flick ? 0.45 : 1 }}>
                  {hex(r)}
                  {hex(g)}
                  {hex(bb)}
                </div>
              );
            })}
          </div>
        )}
        <div style={{ position: "absolute", left: 18, top: 14, fontFamily: FONT.mono, fontSize: 16, letterSpacing: "0.2em", color: "rgba(255,255,255,0.8)", opacity: 1 - toLight }}>FRAME 0001</div>
      </div>
      <AbsoluteFill style={{ background: "#fff2ea", opacity: 0.38 * prog(f, b.toLight + 6, 26, EASE.in), mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- scene
const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const aScreen = 1 - prog(f, b.brandNew - 2, 12);
  const aPix = inOut(f, b.brandNew - 8, 10, b.proc - 6, 12);
  const aCores = inOut(f, b.proc - 8, 14, b.electrons - 10, 12);
  const aLight = inOut(f, b.electrons - 14, 12, b.follow - 4, 12);
  const aNums = prog(f, b.follow - 8, 12);
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={10} zoomOut={1.02}>
      {aScreen > 0.01 && <FloatingScreen b={b} a={aScreen} />}
      {aPix > 0.01 && <PixelsPart b={b} a={aPix} />}
      {aCores > 0.01 && <CoresPart b={b} a={aCores} />}
      {aLight > 0.01 && <LightPart b={b} a={aLight} />}
      {aNums > 0.01 && <NumbersPart b={b} a={aNums} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const ticks: SfxEvent[] = [];
  for (let i = 0; i < 16; i++) ticks.push({ at: b.millions - 4 + Math.pow(i / 16, 1.6) * 40, name: "tick", vol: 0.28 });
  return [
    { at: 6, name: "swell", vol: 0.32 },
    { at: 10, name: "hum", vol: 0.18 },
    { at: b.isnt, name: "scan", vol: 0.45 },
    { at: b.refresh + 10, name: "scan", vol: 0.3, rate: 1.5 },
    { at: b.hz - 10, name: "sweep_up", vol: 0.3 },
    { at: b.moves - 4, name: "whoosh_soft", vol: 0.35 },
    { at: b.brandNew - 20, name: "whoosh_big", vol: 0.45 },
    { at: b.brandNew - 2, name: "glitch", vol: 0.25 },
    ...ticks,
    { at: b.ms - 4, name: "clock_tick", vol: 0.45 },
    { at: b.ms + 40, name: "blip_hi", vol: 0.3 },
    { at: b.proc - 8, name: "power_up", vol: 0.35 },
    { at: b.same, name: "pulse", vol: 0.45 },
    { at: b.millions2, name: "pulse", vol: 0.45 },
    { at: b.once, name: "pulse", vol: 0.55 },
    { at: b.once + 8, name: "shimmer", vol: 0.25 },
    { at: b.electrons - 28, name: "electrons", vol: 0.5 },
    { at: b.light - 6, name: "impact", vol: 0.4 },
    { at: b.light - 2, name: "shimmer", vol: 0.35 },
    { at: b.follow - 6, name: "whoosh_soft", vol: 0.3 },
    { at: b.numbers - 4, name: "data_long", vol: 0.3 },
    { at: b.toLight - 14, name: "riser", vol: 0.4 },
  ];
};

export const ColdOpen: SceneModule = {
  Visual,
  sfx,
  hud: false,
  backdrop: { hueA: C.violet, hueB: C.pink, hueC: C.amber, intensity: 0.55, dots: false },
};
