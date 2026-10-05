import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glass, Glow, Kicker, NeonPath, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import { useCanvas } from "../../components/fx";
import type { SceneModule } from "../../components/Episode";
import glyph from "../../data/glyph-a.json";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    wake: wordAt(c.a2, "wakes it up"),
    runloop: wordAt(c.a2, "run loop"),
    field: wordAt(c.a2, "text field"),
    layout: wordAt(c.a3, "keyboard layout"),
    char: wordAt(c.a3, "becomes a character"),
    lower: wordAt(c.a3, "lowercase"),
    uni: wordAt(c.a3, "In Unicode"),
    hex: wordAt(c.a3, "sixty-one"),
    bin: wordAt(c.a3, "In binary"),
    font: wordAt(c.a4, "from a font"),
    curves: wordAt(c.a4, "outline made of curves"),
    pixels: c.a5.from,
    redraw: wordAt(c.a5, "the window is redrawn"),
    gpu: c.a6.from,
    tiles: wordAt(c.a6, "slices the screen"),
    onchip: wordAt(c.a6, "on-chip memory"),
    display: c.a7.from,
    hz: wordAt(c.a7, "a hundred and twenty"),
    sub: wordAt(c.a7, "millions of red"),
    light: wordAt(c.a7, "into light"),
    appears: c.a8.from,
    loop: wordAt(c.a8, "Up through the stack"),
    time: wordAt(c.a8, "a few hundredths"),
  };
};

// glyph geometry → screen
const GS = 0.5; // px per font unit
const GX = 960 - ((82 + 1015) / 2) * GS;
const GY = 560 + ((1132 - 25) / 2) * GS; // baseline position (y flips)
const gTransform = `translate(${GX}, ${GY}) scale(${GS}, ${-GS})`;

/** coverage grid of the glyph, computed in-browser by rasterizing the outline */
const useCoverage = (cols: number, rows: number, x0: number, y0: number, cell: number) =>
  useMemo(() => {
    const cv = document.createElement("canvas");
    const SS = 8;
    cv.width = cols * SS;
    cv.height = rows * SS;
    const g = cv.getContext("2d")!;
    g.fillStyle = "#fff";
    g.setTransform((GS * SS) / cell, 0, 0, (-GS * SS) / cell, ((GX - x0) * SS) / cell, ((GY - y0) * SS) / cell);
    g.fill(new Path2D(glyph.path));
    const data = g.getImageData(0, 0, cv.width, cv.height).data;
    const out: number[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        let sum = 0;
        for (let y = 0; y < SS; y++) for (let x = 0; x < SS; x++) sum += data[((r * SS + y) * cv.width + c * SS + x) * 4 + 3];
        out.push(sum / (SS * SS * 255));
      }
    return out;
  }, [cols, rows, x0, y0, cell]);

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const end = s.durationInFrames;
  const seg1 = inOut(f, 0, 12, b.layout - 18, 16);
  const seg2 = inOut(f, b.layout - 12, 16, b.gpu - 6, 14);
  const seg3 = inOut(f, b.gpu - 8, 16, b.display + 10, 14);
  const seg4 = inOut(f, b.display, 16, b.appears - 4, 14);
  const seg5 = prog(f, b.appears - 6, 16);
  return (
    <SceneShell dur={end} enter={10} exit={14}>
      {seg1 > 0.01 && <WakeRunLoop a={seg1} b={b} />}
      {seg2 > 0.01 && <CharToPixels a={seg2} b={b} />}
      {seg3 > 0.01 && <GpuTiles a={seg3} b={b} />}
      {seg4 > 0.01 && <Scanout a={seg4} b={b} />}
      {seg5 > 0.01 && <Recap a={seg5} b={b} />}
    </SceneShell>
  );
};

type B = ReturnType<typeof beats>;

// ------------------------------------------------------------------ 1. wake up
const NotesWindow: React.FC<{ x: number; y: number; w: number; h: number; typed?: string; focus?: number; caret?: boolean; scale?: number }> = ({ x, y, w, h, typed = "", focus = 0, caret = true, scale = 1 }) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 22,
        background: "rgba(18,20,32,0.95)",
        border: `2px solid ${hexA(C.cyan, 0.15 + focus * 0.6)}`,
        boxShadow: `0 0 ${focus * 50}px ${hexA(C.cyan, 0.45)}, 0 40px 80px rgba(0,0,0,0.5)`,
        transform: `scale(${scale})`,
        transformOrigin: "50% 50%",
      }}
    >
      <div style={{ display: "flex", gap: 9, padding: 18, alignItems: "center" }}>
        <span style={{ width: 14, height: 14, borderRadius: 7, background: "#ff5f57" }} />
        <span style={{ width: 14, height: 14, borderRadius: 7, background: "#febc2e" }} />
        <span style={{ width: 14, height: 14, borderRadius: 7, background: "#28c840" }} />
        <span style={{ marginLeft: 16, fontFamily: FONT.ui, fontSize: 19, color: C.ink2 }}>Notes — untitled</span>
      </div>
      <div style={{ padding: "16px 36px", fontFamily: FONT.ui, fontSize: 46, color: C.ink }}>
        Dear diary, {typed}
        {caret && <span style={{ display: "inline-block", width: 3, height: 48, marginLeft: 3, background: C.cyan, opacity: Math.floor(f / 15) % 2 ? 1 : 0.15, verticalAlign: "middle" }} />}
      </div>
    </div>
  );
};

const WakeRunLoop: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const awake = prog(f, b.wake, 14);
  const cx = 1380;
  const cy = 560;
  const R = 200;
  const stations = [
    { ang: -90, label: "wait for events", col: C.ink3 },
    { ang: 0, label: "handle event", col: C.blue },
    { ang: 90, label: "update state", col: C.violet },
    { ang: 180, label: "draw", col: C.pink },
  ];
  // dot travels: rests at wait (−90°) until wake, then orbits
  const t = Math.max(0, f - b.wake);
  const ang = f < b.wake ? -90 : -90 + Math.min(t * 4.2, 90) + Math.max(0, t - 40) * 6;
  const dx = cx + Math.cos((ang * Math.PI) / 180) * R;
  const dy = cy + Math.sin((ang * Math.PI) / 180) * R;
  const msg = prog(f, b.wake - 16, 18, EASE.in);
  const toField = prog(f, b.field - 4, 22, EASE.inOut);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <NotesWindow x={140} y={250} w={780} h={520} focus={prog(f, b.field + 14, 12)} />
      <div style={{ position: "absolute", left: 140, top: 800, display: "flex", gap: 16, alignItems: "center", fontFamily: FONT.mono, fontSize: 24 }}>
        <span style={{ width: 14, height: 14, borderRadius: 7, background: awake > 0.5 ? C.green : C.ink3, boxShadow: awake > 0.5 ? `0 0 14px ${C.green}` : undefined }} />
        <span style={{ color: C.ink2 }}>main thread</span>
        <span style={{ color: awake > 0.5 ? C.green : C.ink3 }}>{awake > 0.5 ? "running" : "asleep · waiting on a message  z z z"}</span>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={hexA(C.ink, 0.12)} strokeWidth={22} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={hexA(C.blue, 0.3 + awake * 0.4)} strokeWidth={2} strokeDasharray="4 10" />
        {stations.map((st) => {
          const x = cx + Math.cos((st.ang * Math.PI) / 180) * R;
          const y = cy + Math.sin((st.ang * Math.PI) / 180) * R;
          const lx = cx + Math.cos((st.ang * Math.PI) / 180) * (R + 70);
          const ly = cy + Math.sin((st.ang * Math.PI) / 180) * (R + 56);
          return (
            <g key={st.label}>
              <circle cx={x} cy={y} r={12} fill={C.bg} stroke={st.col} strokeWidth={3} />
              <text x={lx} y={ly + 8} textAnchor={st.ang === 0 ? "start" : st.ang === 180 ? "end" : "middle"} fontFamily={FONT.mono} fontSize={22} fill={C.ink2}>
                {st.label}
              </text>
            </g>
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={40} fill={C.ink}>
          Run loop
        </text>
        <text x={cx} y={cy + 30} textAnchor="middle" fontFamily={FONT.mono} fontSize={18} fill={C.ink3}>
          the app's heartbeat
        </text>
        <Spark x={dx} y={dy} color={awake > 0.5 ? C.cyan : C.ink3} r={awake > 0.5 ? 12 : 8} />
        {/* incoming Mach message from the kernel */}
        {msg > 0 && msg < 1 && <Spark x={cx} y={mix(80, cy - R, msg)} color={C.blue} r={11} />}
        {toField > 0 && toField < 1 && <Spark x={mix(cx + R, 700, toField)} y={mix(cy, 430, toField) - Math.sin(toField * Math.PI) * 140} color={C.cyan} r={11} />}
      </svg>
      <div style={{ position: "absolute", left: cx - 150, top: 140, width: 300, textAlign: "center", opacity: inOut(f, b.wake - 20, 10, b.wake + 30, 14), fontFamily: FONT.mono, fontSize: 20, color: C.blue }}>
        kernel → Mach message
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ 2. key → char → bits → outline → pixels
const CharToPixels: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const keyA = spr(f, fps, b.layout - 8, { damping: 18, stiffness: 120 });
  const toChar = spr(f, fps, b.char, { damping: 18, stiffness: 110 });
  const uni = prog(f, b.uni - 4, 16);
  const hexP = prog(f, b.hex - 4, 16);
  const binP = prog(f, b.bin - 4, 14);
  const outline = prog(f, b.font - 10, 24, EASE.inOut); // morph to outline mode
  const draw = prog(f, b.font - 4, 50, EASE.inOut);
  const pts = prog(f, b.curves - 8, 30);
  const pix = prog(f, b.pixels - 4, 70, EASE.inOut);
  const toWindow = prog(f, b.redraw - 6, 30, EASE.inOut);
  const charSide = mix(0, -330, binP) * (1 - outline);
  const cell = 26;
  const cols = 22;
  const rows = 26;
  const x0 = 960 - (cols * cell) / 2;
  const y0 = 560 - (rows * cell) / 2 - 12;
  const cov = useCoverage(cols, rows, x0, y0, cell);
  const bits = "01100001";
  const bitStart = b.bin + 18;
  const bitSpan = Math.max(30, b.c.a3.end - bitStart - 6);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      {/* keycap → character */}
      <div style={{ position: "absolute", left: 200, top: 380, opacity: clamp(keyA * 1.4) * (1 - toChar * 0.7) * (1 - outline), transform: `translateX(${(1 - keyA) * -60 + toChar * -40}px) scale(${1 - toChar * 0.25})` }}>
        <div style={{ width: 200, height: 200, borderRadius: 34, background: "linear-gradient(160deg, #2a2f40, #161a26)", boxShadow: "0 18px 0 #0b0e16, 0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.ui, fontSize: 96, color: C.ink }}>
          A
        </div>
        <div style={{ marginTop: 40, textAlign: "center", fontFamily: FONT.mono, fontSize: 22, color: C.ink3 }}>layout: U.S.</div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d="M440,480 L600,480" stroke={hexA(C.cyan, 0.5 * toChar * (1 - outline) * (1 - binP))} strokeWidth={2} strokeDasharray="6 8" />
      </svg>
      {/* the glyph: one SVG shape, solid → outline (seamless morph) */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: clamp(toChar * 1.5) * (1 - toWindow) }}>
        <defs>
          <filter id="gl-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="18" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g transform={`translate(${charSide * 1.0}, ${-binP * (1 - outline) * 60}) translate(960, 560) scale(${mix(0.6, 1, toChar) * mix(1, 0.78, binP * (1 - outline))}) translate(-960, -560)`}>
          <g transform={gTransform}>
            <path d={glyph.path} fill={C.ink} opacity={1 - outline} filter={outline < 0.5 ? "url(#gl-glow)" : undefined} />
          </g>
        </g>
      </svg>
      {/* code points */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 800, textAlign: "center", transform: `translateX(${charSide}px)`, opacity: (1 - outline) * uni, display: "flex", justifyContent: "center", gap: 40, fontFamily: FONT.mono, fontSize: 52, fontWeight: 600 }}>
        <span style={{ color: C.violet }}>U+0061</span>
        <span style={{ color: C.ink3, opacity: hexP }}>=</span>
        <span style={{ color: C.amber, opacity: hexP, textShadow: `0 0 30px ${hexA(C.amber, 0.5)}` }}>0x61</span>
      </div>
      {/* binary */}
      {binP > 0.01 && outline < 0.99 && (
        <div style={{ position: "absolute", left: 1000, top: 360, opacity: binP * (1 - outline) }}>
          <Kicker color={C.cyan}>In binary</Kicker>
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            {bits.split("").map((bit, i) => {
              const on = prog(f, bitStart + (i / 8) * bitSpan, 6);
              const one = bit === "1";
              return (
                <div
                  key={i}
                  style={{
                    width: 76,
                    height: 108,
                    borderRadius: 16,
                    marginLeft: i === 4 ? 20 : 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT.mono,
                    fontWeight: 700,
                    fontSize: 58,
                    color: one ? "#04131a" : C.ink2,
                    background: one ? hexA(C.cyan, 0.15 + on * 0.85) : `rgba(20,26,46,${0.4 + on * 0.5})`,
                    border: `1.5px solid ${one ? C.cyan : hexA(C.ink, 0.2)}`,
                    boxShadow: one ? `0 0 ${on * 34}px ${hexA(C.cyan, 0.6)}` : undefined,
                    opacity: 0.25 + on * 0.75,
                    transform: `rotateX(${(1 - on) * 80}deg)`,
                  }}
                >
                  {bit}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 18, fontFamily: FONT.ui, fontSize: 24, color: C.ink2 }}>one byte · eight switches, on or off</div>
        </div>
      )}
      {/* outline & control points */}
      {outline > 0.01 && (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: outline * (1 - toWindow) }}>
          {/* pixel grid + coverage */}
          {pix > 0 &&
            cov.map((v, i) => {
              const r = Math.floor(i / cols);
              const c = i % cols;
              const order = (r * cols + c) / (rows * cols);
              const on = clamp((pix - order * 0.85) * 8);
              return (
                <rect
                  key={i}
                  x={x0 + c * cell + 1}
                  y={y0 + r * cell + 1}
                  width={cell - 2}
                  height={cell - 2}
                  rx={3}
                  fill={v > 0.02 ? `rgba(235,242,255,${v * on})` : `rgba(120,140,200,${0.05 * on})`}
                />
              );
            })}
          {pix > 0 && (
            <g opacity={pix}>
              {new Array(cols + 1).fill(0).map((_, i) => (
                <line key={`v${i}`} x1={x0 + i * cell} y1={y0} x2={x0 + i * cell} y2={y0 + rows * cell} stroke={hexA(C.ink, 0.08)} />
              ))}
              {new Array(rows + 1).fill(0).map((_, i) => (
                <line key={`h${i}`} x1={x0} y1={y0 + i * cell} x2={x0 + cols * cell} y2={y0 + i * cell} stroke={hexA(C.ink, 0.08)} />
              ))}
            </g>
          )}
          <g transform={gTransform} opacity={1 - pix * 0.6}>
            <path d={glyph.path} fill={hexA(C.cyan, 0.06 * (1 - pix))} stroke={C.cyan} strokeWidth={6 / GS} strokeDasharray="12000" strokeDashoffset={12000 * (1 - draw)} />
            {pts > 0.01 &&
              glyph.handles.map((h, i) => <line key={`h${i}`} x1={h[0]} y1={h[1]} x2={h[2]} y2={h[3]} stroke={hexA(C.violet, 0.75 * pts)} strokeWidth={2.5 / GS} />)}
            {pts > 0.01 &&
              glyph.off.map((p, i) => <circle key={`o${i}`} cx={p[0]} cy={p[1]} r={(7 / GS) * prog(f, b.curves - 8 + i * 0.6, 8)} fill={C.bg} stroke={C.violet} strokeWidth={3 / GS} />)}
            {pts > 0.01 &&
              glyph.on.map((p, i) => <rect key={`n${i}`} x={p[0] - 7 / GS} y={p[1] - 7 / GS} width={14 / GS} height={14 / GS} fill={C.cyan} opacity={prog(f, b.curves - 8 + i * 0.5, 8)} />)}
          </g>
        </svg>
      )}
      {outline > 0.01 && (
        <div style={{ position: "absolute", left: 120, top: 200, opacity: outline * (1 - toWindow), width: 460 }}>
          <Kicker color={pix > 0.3 ? C.ink : C.cyan}>{pix > 0.3 ? "Rasterize" : "Font outline"}</Kicker>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 54, color: C.ink, marginTop: 12, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            {pix > 0.3 ? "Curves → pixels" : "Points & curves"}
          </div>
          <div style={{ fontFamily: FONT.ui, fontSize: 24, color: C.ink2, marginTop: 14, lineHeight: 1.4 }}>
            {pix > 0.3 ? "Each pixel gets a brightness from how much of it the shape covers — that's antialiasing." : "■ points on the curve   ○ control points that bend it"}
          </div>
        </div>
      )}
      {toWindow > 0.01 && <NotesWindow x={570} y={280} w={780} h={520} typed="a" focus={0.6} scale={mix(1.15, 1, toWindow)} />}
      {toWindow > 0.01 && <AbsoluteFill style={{ opacity: toWindow * 0 }} />}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ 3. GPU tiles
const GpuTiles: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const SW = 1120;
  const SH = 630;
  const SX = 110;
  const SY = 260;
  const TC = 16;
  const TR = 9;
  const tw = SW / TC;
  const th = SH / TR;
  const split = prog(f, b.tiles - 4, 20);
  const work = Math.max(0, f - b.tiles - 10);
  const current = Math.floor(work / 1.6);
  const coresOn = prog(f, b.gpu, 20);
  const mem = prog(f, b.onchip - 6, 16);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: SX, top: 130 }}>
        <Kicker color={C.violet}>GPU · tile-based rendering</Kicker>
      </div>
      {/* the frame being built */}
      <div style={{ position: "absolute", left: SX, top: SY, width: SW, height: SH, borderRadius: 18, overflow: "hidden", background: "linear-gradient(135deg, #1a1446, #3b1d6e 45%, #0f4c6e 80%, #081a33)" }}>
        <div style={{ position: "absolute", left: 120, top: 70, width: 620, height: 420, borderRadius: 16, background: "rgba(18,20,32,0.95)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <div style={{ padding: "50px 30px", fontFamily: FONT.ui, fontSize: 40, color: C.ink }}>Dear diary, a</div>
        </div>
        <div style={{ position: "absolute", left: 640, top: 180, width: 400, height: 330, borderRadius: 16, background: "rgba(30,32,48,0.92)", border: "1px solid rgba(255,255,255,0.12)" }} />
        {/* tiles overlay */}
        <svg width={SW} height={SH} style={{ position: "absolute", inset: 0 }}>
          {new Array(TC * TR).fill(0).map((_, i) => {
            const r = Math.floor(i / TC);
            const c = i % TC;
            // 10 cores chew through tiles in parallel waves
            const order = Math.floor(i / 10);
            const done = order < current / 6;
            const active = Math.abs(order - current / 6) < 0.6;
            return (
              <rect
                key={i}
                x={c * tw + 1}
                y={r * th + 1}
                width={tw - 2}
                height={th - 2}
                fill={active ? hexA(C.violet, 0.55) : done ? "rgba(0,0,0,0)" : `rgba(5,6,14,${0.78 * split})`}
                stroke={hexA(C.violet, (active ? 0.9 : 0.25) * split)}
                strokeWidth={active ? 2 : 1}
              />
            );
          })}
        </svg>
      </div>
      {/* GPU cores + tile memory */}
      <div style={{ position: "absolute", left: 1320, top: 260, opacity: coresOn }}>
        <Glass color={C.violet} style={{ width: 480, padding: 24 }} glow={0.7}>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 18, letterSpacing: "0.25em", color: C.violet }}>GPU CORES</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginTop: 16 }}>
            {new Array(10).fill(0).map((_, i) => {
              const busy = Math.sin(f * 0.6 + i * 1.3) > -0.2 && f > b.tiles;
              return <div key={i} style={{ height: 52, borderRadius: 10, background: busy ? hexA(C.violet, 0.8) : "rgba(30,36,60,0.9)", boxShadow: busy ? `0 0 18px ${hexA(C.violet, 0.7)}` : undefined }} />;
            })}
          </div>
        </Glass>
        <div style={{ marginTop: 26, opacity: mem, transform: `translateY(${(1 - mem) * 16}px)` }}>
          <Glass color={C.amber} style={{ width: 480, padding: 24 }} glow={0.8}>
            <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 18, letterSpacing: "0.25em", color: C.amber }}>TILE MEMORY · ON-CHIP</div>
            <div style={{ display: "flex", gap: 18, alignItems: "center", marginTop: 16 }}>
              <div style={{ width: 120, height: 120, borderRadius: 12, background: "linear-gradient(135deg, #3b1d6e, #0f4c6e)", border: `2px solid ${C.amber}`, boxShadow: `0 0 30px ${hexA(C.amber, 0.5)}`, display: "grid", gridTemplateColumns: "repeat(8, 1fr)" }}>
                {new Array(64).fill(0).map((_, i) => (
                  <div key={i} style={{ background: rnd(`tm${i}-${Math.floor(f / 3)}`) > 0.6 ? hexA("#ffffff", 0.25) : "transparent" }} />
                ))}
              </div>
              <div style={{ fontFamily: FONT.ui, fontSize: 23, color: C.ink2, lineHeight: 1.4 }}>Each tile is shaded in fast memory right next to the cores — far less traffic to RAM.</div>
            </div>
          </Glass>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ 4. scanout + subpixels
const Scanout: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const zoom = prog(f, b.sub - 30, 70, EASE.inOut);
  const scanY = ((f - b.display) * 18) % 760;
  const hzA = prog(f, b.hz - 4, 14);
  const subA = prog(f, b.sub + 10, 24);
  const cols = 30;
  const rows = 22;
  const cell = 36;
  const gx0 = 960 - (cols * cell) / 2;
  const gy0 = 540 - (rows * cell) / 2;
  const cov = useCoverage(cols, rows, 960 - cols * 15, 560 - rows * 17.5, 34);
  const ref = useCanvas(
    (ctx) => {
      ctx.globalCompositeOperation = "lighter";
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const v = cov[r * cols + c];
          const base = 0.08;
          const lv = base + v * 0.92;
          const x = gx0 + c * cell;
          const y = gy0 + r * cell;
          const sw = cell / 3;
          const cols3 = [
            [255, 40, 60],
            [40, 255, 120],
            [50, 110, 255],
          ];
          // wallpaper tint for "off" pixels (a little more blue/violet)
          const tint = [0.35, 0.18, 0.9];
          cols3.forEach((col, k) => {
            const intensity = v > 0.02 ? lv : base * tint[k] * 2.2;
            ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${intensity})`;
            ctx.fillRect(x + k * sw + 1.5, y + 2, sw - 3, cell - 4);
            if (intensity > 0.5) {
              ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${intensity * 0.18})`;
              ctx.fillRect(x + k * sw - 3, y - 2, sw + 6, cell + 4);
            }
          });
        }
      ctx.globalCompositeOperation = "source-over";
    },
    [cov],
  );
  return (
    <AbsoluteFill style={{ opacity: a }}>
      {/* the frame on the panel */}
      <AbsoluteFill style={{ opacity: 1 - subA, transform: `scale(${mix(1, 14, zoom)})`, transformOrigin: "40.5% 46%" }}>
        <div style={{ position: "absolute", left: 360, top: 160, width: 1200, height: 760, borderRadius: 26, overflow: "hidden", background: "linear-gradient(135deg, #1a1446, #3b1d6e 45%, #0f4c6e 80%, #081a33)", border: "10px solid #05060a", boxShadow: "0 40px 100px rgba(0,0,0,0.6)" }}>
          <div style={{ position: "absolute", left: 120, top: 90, width: 640, height: 430, borderRadius: 16, background: "rgba(18,20,32,0.95)" }}>
            <div style={{ padding: "50px 30px", fontFamily: FONT.ui, fontSize: 40, color: C.ink }}>Dear diary, a</div>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: scanY - 40, height: 40, background: `linear-gradient(180deg, transparent, ${hexA("#ffffff", 0.35)})`, opacity: 1 - zoom }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: scanY, height: 2, background: "#ffffff", boxShadow: "0 0 20px #fff", opacity: 1 - zoom }} />
        </div>
      </AbsoluteFill>
      {subA > 0.01 && (
        <AbsoluteFill style={{ opacity: subA, background: "#020206" }}>
          <canvas ref={ref} width={1920} height={1080} style={{ position: "absolute", inset: 0, transform: `scale(${mix(1.25, 1, subA)})` }} />
        </AbsoluteFill>
      )}
      <div style={{ position: "absolute", left: 110, top: 120, opacity: 1 - subA * 0.0 }}>
        <Kicker color={C.cyan}>{subA > 0.5 ? "Subpixels" : "Display engine · scanout"}</Kicker>
        {hzA > 0.01 && subA < 0.5 && (
          <div style={{ fontFamily: FONT.mono, fontSize: 64, fontWeight: 700, color: C.ink, marginTop: 10, opacity: hzA * (1 - subA * 2), textShadow: `0 0 30px ${hexA(C.cyan, 0.6)}` }}>
            120 Hz <span style={{ fontSize: 28, color: C.ink3 }}>· a new frame every 8.3 ms</span>
          </div>
        )}
        {subA > 0.5 && <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 56, color: C.ink, marginTop: 10 }}>Numbers → light</div>}
      </div>
      {subA > 0.5 && (
        <div style={{ position: "absolute", right: 110, bottom: 130, textAlign: "right", fontFamily: FONT.ui, fontSize: 24, color: C.ink2, opacity: subA }}>
          <span style={{ color: "#ff4d6a" }}>■</span> red · <span style={{ color: "#3dff8a" }}>■</span> green · <span style={{ color: "#4d7dff" }}>■</span> blue
          <br />each pixel mixes three tiny lights
        </div>
      )}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ 5. recap loop
const Recap: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spr(f, fps, b.appears + 4, { damping: 12, stiffness: 200 });
  const loopP = prog(f, b.loop - 4, 60, EASE.inOut);
  const timeA = prog(f, b.time - 6, 16);
  const L = [
    { y: 250, label: "App", col: C.pink },
    { y: 370, label: "WindowServer", col: C.blue },
    { y: 490, label: "Kernel", col: C.cyan },
    { y: 610, label: "Hardware", col: C.green },
  ];
  const X = 1420;
  const up = `M${X - 120},${700} L${X - 120},${230}`;
  const down = `M${X + 120},${230} L${X + 120},${700}`;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 130, top: 300 }}>
        <div style={{ position: "relative", width: 780, height: 520, transform: `scale(${mix(0.96, 1, pop)})` }}>
          <NotesWindow x={0} y={0} w={780} h={520} typed="a" focus={0.4} />
          <Glow x={490} y={130} size={360} color={C.cyan} a={0.5 * (1 - prog(f, b.appears + 4, 40))} />
        </div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {L.map((l) => (
          <g key={l.label}>
            <rect x={X - 200} y={l.y - 36} width={400} height={72} rx={18} fill={hexA(l.col, 0.1)} stroke={hexA(l.col, 0.6)} />
            <text x={X} y={l.y + 10} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={30} fill={C.ink}>
              {l.label}
            </text>
          </g>
        ))}
        <NeonPath d={up} color={C.cyan} width={3} progress={clamp(loopP * 2)} length={470} />
        <NeonPath d={`M${X - 120},${230} Q${X},${150} ${X + 120},${230}`} color={C.violet} width={3} progress={clamp(loopP * 2 - 0.9) * 1.1} length={300} />
        <NeonPath d={down} color={C.pink} width={3} progress={clamp(loopP * 2 - 1.05)} length={470} />
        <text x={X - 140} y={760} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} fill={C.cyan} opacity={loopP}>
          key event ↑
        </text>
        <text x={X + 140} y={760} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} fill={C.pink} opacity={clamp(loopP * 2 - 1)}>
          ↓ pixels
        </text>
      </svg>
      <div style={{ position: "absolute", left: X - 260, width: 520, top: 820, textAlign: "center", opacity: timeA }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 64, fontWeight: 700, color: C.ink, textShadow: `0 0 30px ${hexA(C.cyan, 0.6)}` }}>≈ 0.03 s</span>
        <div style={{ fontFamily: FONT.ui, fontSize: 22, color: C.ink3, marginTop: 4 }}>a few hundredths of a second, end to end</div>
      </div>
    </AbsoluteFill>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.wake - 16, name: "blip_lo", vol: 0.3 },
    { at: b.wake, name: "power_up", vol: 0.25 },
    { at: b.runloop, name: "whoosh_soft", vol: 0.3 },
    { at: b.field, name: "blip", vol: 0.3 },
    { at: b.layout - 8, name: "key_click", vol: 0.6 },
    { at: b.char, name: "whoosh", vol: 0.35 },
    { at: b.char + 4, name: "pop", vol: 0.35 },
    { at: b.uni - 2, name: "blip", vol: 0.3 },
    { at: b.hex - 2, name: "blip_hi", vol: 0.3 },
    ...("01100001".split("").map((_, i) => ({ at: b.bin + 18 + (i / 8) * Math.max(30, b.c.a3.end - b.bin - 24), name: "tick_hi", vol: 0.35 }))),
    { at: b.font - 8, name: "sweep_up", vol: 0.25 },
    { at: b.curves - 6, name: "data", vol: 0.25 },
    { at: b.pixels - 2, name: "data_long", vol: 0.3 },
    { at: b.redraw - 4, name: "whoosh_soft", vol: 0.35 },
    { at: b.gpu - 8, name: "whoosh", vol: 0.4 },
    { at: b.tiles, name: "scan", vol: 0.3 },
    { at: b.onchip - 6, name: "pop", vol: 0.3 },
    { at: b.display, name: "sweep_down", vol: 0.25 },
    { at: b.hz - 4, name: "blip_hi", vol: 0.3 },
    { at: b.sub - 30, name: "whoosh_big", vol: 0.45 },
    { at: b.sub + 10, name: "shimmer", vol: 0.35 },
    { at: b.appears, name: "key_click", vol: 0.7 },
    { at: b.appears + 4, name: "chime", vol: 0.35 },
    { at: b.loop - 4, name: "sweep_up", vol: 0.3 },
    { at: b.time - 6, name: "pop_hi", vol: 0.3 },
  ];
};

export const AppDraw: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.cyan, hueB: C.violet, hueC: C.pink, intensity: 0.75 },
};
