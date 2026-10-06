import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Kicker } from "../../components/core";
import { useCanvas } from "../../components/fx";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { wallpaper } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    timing: c.v1.from,
    back: wordAt(c.v1, "hidden back buffer"),
    front: wordAt(c.v1, "the front one"),
    ready: c.v2.from,
    swap: wordAt(c.v2, "the two swap"),
    sync: wordAt(c.v2, "in sync"),
    wrong: c.v3.from,
    torn: wordAt(c.v3, "torn image"),
    half: wordAt(c.v3, "half old"),
    pro: c.v4.from,
    adapts: wordAt(c.v4, "adapts"),
    hz120: wordAt(c.v4, "a hundred and twenty hertz"),
    slowing: wordAt(c.v4, "slowing down"),
    power: wordAt(c.v4, "save power"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

// The picture "moves": each new frame pans the wallpaper a little further.
const FW = 560;
const FH = 315;
const FrameView: React.FC<{ n: number; w?: number; h?: number; tear?: { y: number; n2: number } }> = ({ n, w = FW, h = FH, tear }) => {
  const ref = useCanvas(
    (ctx) => {
      const img = wallpaper(960, 540);
      const pan = (k: number) => 60 + ((k * 46) % 360);
      const draw = (k: number, y0: number, y1: number) => {
        const sx = pan(k);
        const sw = 960 - 380;
        const sh = sw * (h / w);
        const sy = 70;
        ctx.drawImage(img, sx, sy + (y0 / h) * sh, sw, ((y1 - y0) / h) * sh, 0, y0, w, y1 - y0);
      };
      if (tear) {
        draw(n, 0, tear.y);
        draw(tear.n2, tear.y, h);
      } else {
        draw(n, 0, h);
      }
    },
    [n, w, h, tear?.y, tear?.n2],
  );
  return <canvas ref={ref} width={w} height={h} style={{ position: "absolute", inset: 0 }} />;
};

// ------------------------------------------------------------------ double buffering
const BufferCard: React.FC<{ x: number; y: number; xL: number; xR: number; n: number; paint: number; painting: boolean }> = ({ x, y, xL, xR, n, paint, painting }) => {
  const isFront = x > (xL + xR) / 2;
  const col = isFront ? C.cyan : C.violet;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: FW, height: FH }}>
      <div style={{ position: "absolute", inset: -3, borderRadius: 16, border: `2px solid ${col}`, boxShadow: `0 0 30px ${hexA(col, 0.4)}` }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 14, overflow: "hidden", background: "#0b0e1c" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(painting ? paint : 1) * 100}%`, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: FW, height: FH }}>
            <FrameView n={n} />
          </div>
        </div>
        {painting && paint < 1 && <div style={{ position: "absolute", left: `${paint * 100}%`, top: 0, bottom: 0, width: 3, background: "#fff", boxShadow: "0 0 16px #fff" }} />}
      </div>
      <div style={{ position: "absolute", top: -52, left: 0, fontFamily: FONT.ui, fontWeight: 700, fontSize: 24, letterSpacing: "0.22em", color: col }}>{isFront ? "FRONT BUFFER" : "BACK BUFFER"}</div>
      <div style={{ position: "absolute", top: FH + 14, left: 0, fontFamily: FONT.mono, fontSize: 22, color: C.ink2 }}>{isFront ? `frame ${n} · on screen` : painting && paint < 1 ? `frame ${n} · GPU painting…` : `frame ${n} · ready`}</div>
    </div>
  );
};

const Buffers: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // refresh ticks are slowed way down so you can watch them (in reality: every 8.3 ms)
  const P = 54;
  const D = 14; // swap animation length
  const swaps = [b.swap - 2, b.swap - 2 + P, b.swap - 2 + 2 * P];
  const done = swaps.filter((t) => f >= t + D).length;
  const cur = swaps.find((t) => f >= t && f < t + D);
  const sw = cur !== undefined ? EASE.inOut(clamp((f - cur) / D)) : 0;
  const frontN = 40 + done;
  const backN = frontN + 1;
  const lastSwapEnd = done > 0 ? swaps[done - 1] + D : b.back - 24;
  const paint = clamp((f - lastSwapEnd - 4) / (P * 0.62));
  const xL = 300;
  const xR = 1060;
  const y = 330;
  const lift = Math.sin(sw * Math.PI) * 60;
  const cardIn = spr(f, fps, b.timing, { damping: 22, stiffness: 90 });
  const tickA = prog(f, b.timing + 8, 14);
  return (
    <AbsoluteFill style={{ opacity: a * clamp(cardIn * 1.4) }}>
      <div style={{ position: "absolute", left: 110, top: 112 }}>
        <Kicker color={C.blue} at={b.timing}>
          Double buffering
        </Kicker>
      </div>
      {/* back buffer: painted, then crosses over to the front */}
      <BufferCard x={mix(xL, xR, sw)} y={y - lift} xL={xL} xR={xR} n={backN} paint={paint} painting={cur === undefined} />
      {/* front buffer: on screen, then recycled */}
      <BufferCard x={mix(xR, xL, sw)} y={y + lift} xL={xL} xR={xR} n={frontN} paint={1} painting={false} />
      {/* refresh ticks */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: tickA }}>
        <line x1={200} y1={860} x2={1720} y2={860} stroke={hexA(C.ink, 0.25)} strokeWidth={2} />
        {new Array(12).fill(0).map((_, k) => {
          const tt = swaps[0] - P * 3 + k * P;
          const x = 960 + (tt - f) * 6;
          if (x < 180 || x > 1740) return null;
          const hit = Math.abs(f - tt) < 5;
          return (
            <g key={k}>
              <line x1={x} y1={835} x2={x} y2={885} stroke={hit ? "#fff" : C.blue} strokeWidth={hit ? 4 : 2} />
              <circle cx={x} cy={860} r={hit ? 10 : 5} fill={hit ? "#fff" : C.blue} />
            </g>
          );
        })}
        <line x1={960} y1={820} x2={960} y2={900} stroke={hexA(C.amber, 0.7)} strokeWidth={2} strokeDasharray="4 6" />
      </svg>
      <div style={{ position: "absolute", left: 200, top: 905, fontFamily: FONT.mono, fontSize: 22, color: C.ink3, opacity: tickA }}>display refresh ticks · slowed down (really every 8.3 ms)</div>
      <div style={{ position: "absolute", left: 960 - 60, top: 790, width: 120, textAlign: "center", fontFamily: FONT.ui, fontWeight: 700, fontSize: 18, letterSpacing: "0.2em", color: C.amber, opacity: tickA }}>NOW</div>
      {cur !== undefined && (
        <div style={{ position: "absolute", top: 470, width: "100%", textAlign: "center", fontFamily: FONT.display, fontWeight: 700, fontSize: 64, color: "#fff", opacity: Math.sin(sw * Math.PI), textShadow: `0 0 40px ${C.blue}` }}>swap!</div>
      )}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ tearing
const Tear: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.wrong - 6, { damping: 22, stiffness: 90 });
  const W = 1120;
  const H = 630;
  const tearY = Math.round(H * 0.47);
  const torn = prog(f, b.torn - 8, 10);
  const halfA = prog(f, b.half - 6, 14);
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.4) }}>
      <div style={{ position: "absolute", left: 110, top: 112 }}>
        <Kicker color={C.rose} at={b.wrong - 4}>
          Without sync
        </Kicker>
      </div>
      <div style={{ position: "absolute", left: 960 - W / 2, top: 220, width: W, height: H, borderRadius: 16, overflow: "hidden", boxShadow: "0 0 0 14px #0b0e18, 0 40px 120px rgba(0,0,0,0.6)" }}>
        <FrameView n={torn > 0.5 ? 41 : 40} w={W} h={H} tear={torn > 0.5 ? { y: tearY, n2: 46 } : undefined} />
        {torn > 0.5 && <div style={{ position: "absolute", left: 0, right: 0, top: tearY - 1, height: 3, background: C.rose, boxShadow: `0 0 18px ${C.rose}`, opacity: 0.85 }} />}
      </div>
      {halfA > 0.01 && (
        <>
          <div style={{ position: "absolute", left: 960 + W / 2 + 30, top: 220 + tearY / 2 - 20, fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: C.ink, opacity: halfA }}>old frame</div>
          <div style={{ position: "absolute", left: 960 + W / 2 + 30, top: 220 + tearY + (H - tearY) / 2 - 20, fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: C.rose, opacity: prog(f, b.half + 10, 14) }}>new frame</div>
        </>
      )}
      <div style={{ position: "absolute", left: 960 - W / 2 - 230, top: 220 + tearY - 22, fontFamily: FONT.ui, fontWeight: 800, fontSize: 30, letterSpacing: "0.2em", color: C.rose, opacity: torn }}>TEAR →</div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ ProMotion
const ProMotion: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, b.pro - 6, { damping: 22, stiffness: 90 });
  const X0 = 260;
  const X1 = 1660;
  const Y120 = 420;
  const YLOW = 760;
  // activity timeline: scrolling (120 Hz) → still (lower) → a quick flick → still
  const segs: [number, number, boolean][] = [
    [0, 0.34, true],
    [0.34, 0.62, false],
    [0.62, 0.74, true],
    [0.74, 1, false],
  ];
  const yAt = (u: number) => {
    let y = YLOW;
    for (const [s0, s1, moving] of segs) {
      if (u >= s0 && u < s1) {
        if (moving) y = Y120;
        else {
          // step down gradually after motion stops
          const t = (u - s0) / 0.12;
          y = mix(Y120, YLOW, clamp(Math.floor(t * 4) / 4));
        }
      }
    }
    return y;
  };
  const draw = prog(f, b.adapts - 10, b.end - b.adapts - 10, EASE.linear);
  let d = "";
  const N = 300;
  for (let k = 0; k <= N * draw; k++) {
    const u = k / N;
    const x = mix(X0, X1, u);
    d += `${k ? "L" : "M"}${x.toFixed(1)},${yAt(u).toFixed(1)}`;
  }
  const uNow = draw;
  const yNow = yAt(Math.min(0.999, uNow));
  const moving = segs.some(([s0, s1, m]) => m && uNow >= s0 && uNow < s1);
  const hzLabel = yNow <= Y120 + 1 ? "120 Hz" : moving ? "120 Hz" : "lower";
  return (
    <AbsoluteFill style={{ opacity: a * clamp(inP * 1.4) }}>
      <div style={{ position: "absolute", left: 110, top: 112 }}>
        <Kicker color={C.blue} at={b.pro - 4}>
          ProMotion · adaptive refresh
        </Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* activity lane */}
        {segs.map(([s0, s1, m], i) => (
          <rect key={i} x={mix(X0, X1, s0)} y={300} width={mix(X0, X1, s1) - mix(X0, X1, s0) - 4} height={34} rx={8} fill={m ? hexA(C.pink, 0.45) : "rgba(255,255,255,0.06)"} stroke={m ? C.pink : "rgba(255,255,255,0.12)"} />
        ))}
        {segs.map(([s0, s1, m], i) => (
          <text key={`t${i}`} x={(mix(X0, X1, s0) + mix(X0, X1, s1)) / 2} y={324} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={19} fill={m ? "#fff" : C.ink3}>
            {m ? "scrolling" : "nothing changes"}
          </text>
        ))}
        {/* axes */}
        <line x1={X0} y1={Y120} x2={X1} y2={Y120} stroke={hexA(C.ink, 0.15)} strokeDasharray="4 8" />
        <line x1={X0} y1={YLOW + 40} x2={X1} y2={YLOW + 40} stroke={hexA(C.ink, 0.2)} />
        <text x={X0 - 20} y={Y120 + 8} textAnchor="end" fontFamily={FONT.mono} fontSize={24} fill={C.ink}>
          120 Hz
        </text>
        <text x={X0 - 20} y={YLOW + 8} textAnchor="end" fontFamily={FONT.mono} fontSize={24} fill={C.ink3}>
          lower
        </text>
        <path d={d} fill="none" stroke={C.cyan} strokeWidth={10} strokeOpacity={0.2} strokeLinejoin="round" />
        <path d={d} fill="none" stroke={C.cyan} strokeWidth={3.5} strokeLinejoin="round" />
        {draw > 0.002 && <circle cx={mix(X0, X1, uNow)} cy={yNow} r={10} fill="#fff" style={{ filter: `drop-shadow(0 0 10px ${C.cyan})` }} />}
      </svg>
      <div style={{ position: "absolute", right: 140, top: 160, textAlign: "right" }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 20, letterSpacing: "0.3em", color: C.cyan }}>REFRESH RATE</div>
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 64, color: C.ink, textShadow: `0 0 30px ${hexA(C.cyan, 0.5)}` }}>{hzLabel}</div>
      </div>
      <div style={{ position: "absolute", left: X0, top: YLOW + 70, fontFamily: FONT.display, fontWeight: 700, fontSize: 42, color: C.ink, opacity: prog(f, b.power - 6, 14) }}>
        Fewer refreshes when idle = <span style={{ color: C.green }}>less power</span>
      </div>
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const bufA = 1 - prog(f, b.wrong - 12, 14);
  const tearA = inOut(f, b.wrong - 10, 14, b.pro - 10, 12);
  const proA = prog(f, b.pro - 10, 14);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      {bufA > 0.01 && <Buffers b={b} a={bufA} />}
      {tearA > 0.01 && <Tear b={b} a={tearA} />}
      {proA > 0.01 && <ProMotion b={b} a={proA} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const P = 54;
  const swaps = [b.swap - 2, b.swap - 2 + P, b.swap - 2 + 2 * P];
  const ticks: SfxEvent[] = [];
  for (let k = 0; k < 7; k++) {
    const tt = swaps[0] - P * 3 + k * P;
    if (tt > 10 && tt < b.wrong - 12) ticks.push({ at: tt, name: "clock_tick", vol: 0.35 });
  }
  return [
    { at: b.timing, name: "whoosh_soft", vol: 0.3 },
    { at: b.back - 4, name: "typing", vol: 0.2 },
    ...ticks,
    ...swaps.filter((t) => t < b.wrong - 12).map((t) => ({ at: t, name: "whoosh", vol: 0.3 })),
    { at: b.wrong - 12, name: "whoosh_soft", vol: 0.3 },
    { at: b.torn - 8, name: "glitch", vol: 0.45 },
    { at: b.half - 6, name: "blip_lo", vol: 0.3 },
    { at: b.pro - 10, name: "whoosh_soft", vol: 0.3 },
    { at: b.adapts - 6, name: "sweep_up", vol: 0.25 },
    { at: b.slowing - 4, name: "sweep_down", vol: 0.3 },
    { at: b.power - 6, name: "chime_lo", vol: 0.25 },
  ];
};

export const Vsync: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.blue, hueB: C.cyan, hueC: C.rose, intensity: 0.6 },
};
