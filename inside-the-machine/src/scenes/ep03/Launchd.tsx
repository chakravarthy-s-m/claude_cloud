import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { wallpaper } from "../ep02/shared";
import { useCanvas } from "../../components/fx";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    pid1: c.d1.from,
    launchd: wordAt(c.d1, "launchd"),
    every: wordAt(c.d1, "Every other program"),
    descendant: wordAt(c.d1, "descendant"),
    reads: c.d2.from,
    files: wordAt(c.d2, "configuration files"),
    starts: wordAt(c.d2, "starts the system"),
    logging: wordAt(c.d2, "logging"),
    networking: wordAt(c.d2, "networking"),
    bluetooth: wordAt(c.d2, "Bluetooth"),
    search: wordAt(c.d2, "search"),
    needed: wordAt(c.d2, "only when they're needed"),
    within: c.d2b.from,
    hundreds: wordAt(c.d2b, "hundreds of processes"),
    before: wordAt(c.d2b, "before you've even logged in"),
    ws: c.d3.from,
    display: wordAt(c.d3, "takes over the display"),
    another: wordAt(c.d3, "Another is the login window"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

const CX = 960;
const CY = 560;
type Svc = { name: string; what?: string; key?: keyof B; demand?: boolean; ang: number; col: string };
const SERVICES: Svc[] = [
  { name: "logd", what: "logging", key: "logging", ang: -18, col: C.cyan },
  { name: "configd", what: "networking", key: "networking", ang: -54, col: C.blue },
  { name: "bluetoothd", what: "Bluetooth", key: "bluetooth", ang: -90, col: C.violet, demand: true },
  { name: "mds", what: "search", key: "search", ang: -126, col: C.amber },
  { name: "notifyd", ang: -162, col: C.teal },
  { name: "powerd", ang: 18, col: C.orange, demand: true },
  { name: "trustd", ang: 54, col: C.gold },
  { name: "coreaudiod", ang: 90, col: C.pink, demand: true },
  { name: "loginwindow", ang: 126, col: C.green },
  { name: "WindowServer", ang: 162, col: C.green },
];
const R1 = { x: 470, y: 300 };

// outer rings: hundreds of anonymous processes
const RINGS = [24, 48, 96, 160, 220];
const OUTER = (() => {
  const out: { x: number; y: number; px: number; py: number; ring: number; i: number }[] = [];
  let prev: { x: number; y: number }[] = SERVICES.map((sv) => ({ x: CX + Math.cos((sv.ang * Math.PI) / 180) * R1.x, y: CY + Math.sin((sv.ang * Math.PI) / 180) * R1.y }));
  RINGS.forEach((n, ri) => {
    const rx = R1.x + 90 + ri * 85;
    const ry = R1.y + 60 + ri * 60;
    const cur: { x: number; y: number }[] = [];
    for (let j = 0; j < n; j++) {
      const a = ((j + 0.5) / n) * Math.PI * 2 + ri * 0.13;
      const x = CX + Math.cos(a) * rx;
      const y = CY + Math.sin(a) * ry;
      // nearest parent in the previous ring
      let best = prev[0];
      let bd = 1e9;
      for (const p of prev) {
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      out.push({ x, y, px: best.x, py: best.y, ring: ri, i: out.length });
      cur.push({ x, y });
    }
    prev = cur;
  });
  return out;
})();

const MiniScreen: React.FC<{ on: number; login: number }> = ({ on, login }) => {
  const W = 440;
  const H = 276;
  const ref = useCanvas((ctx) => {
    ctx.globalAlpha = on;
    ctx.drawImage(wallpaper(), 0, 0, W, H);
    ctx.globalAlpha = 1;
  }, [on]);
  return (
    <div style={{ position: "relative", width: W, height: H, borderRadius: 14, overflow: "hidden", background: "#020306", border: "8px solid #11141e", boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }}>
      <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, filter: login > 0 ? `blur(${6 * login}px)` : undefined }} />
      {login > 0.01 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, opacity: login }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: `linear-gradient(160deg, ${C.pink}, ${C.violet})`, border: "2px solid rgba(255,255,255,0.6)" }} />
          <div style={{ width: 150, height: 24, borderRadius: 12, background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.4)" }} />
        </div>
      )}
    </div>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const b = beats(s);
  const born = spr(f, fps, b.pid1 - 6, { damping: 14, stiffness: 120 });
  const ghost = inOut(f, b.every - 4, 20, b.reads + 10, 20);
  const filesA = inOut(f, b.files - 14, 14, b.starts + 20, 16);
  const nFiles = Math.round(mix(0, 420, prog(f, b.files - 10, b.starts - b.files + 20, EASE.out)));
  const svcAt = (sv: Svc, i: number) => (sv.key ? (b[sv.key] as number) : b.starts + 4 + i * 4);
  const outerP = (ring: number, i: number) => prog(f, b.hundreds - 16 + ring * 7 + rnd(`oo${i}`) * 6, 10);
  const count = Math.round(mix(SERVICES.length + 1, 400, prog(f, b.hundreds - 16, 60, EASE.out)));
  const beforeA = prog(f, b.before - 4, 14);
  const wsHi = prog(f, b.ws - 6, 14);
  const lwHi = prog(f, b.another - 6, 14);
  const dim = Math.max(wsHi, lwHi) * 0.75;
  const scr = prog(f, b.display - 6, 20);
  const lwScr = prog(f, b.another + 6, 16);
  const zoomOut = prog(f, b.within - 10, 30, EASE.inOut) * (1 - prog(f, b.ws - 10, 30, EASE.inOut) * 0.5);
  const sc = mix(1, 0.86, zoomOut);
  return (
    <SceneShell dur={s.durationInFrames} enter={22} exit={14} delay={66}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.green}>{f < b.ws - 6 ? "process number one" : "two very important children"}</Kicker>
      </div>
      <Glow x={CX} y={CY} size={900} color={C.green} a={0.18 * clamp(born)} />
      <AbsoluteFill style={{ transform: `scale(${sc})`, transformOrigin: `${CX}px ${CY}px` }}>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {/* ghost family tree */}
          {ghost > 0.01 &&
            OUTER.filter((_, i) => i % 3 === 0).map((o) => <line key={o.i} x1={o.px} y1={o.py} x2={o.x} y2={o.y} stroke={hexA(C.green, 0.25 * ghost)} strokeWidth={1} />)}
          {/* outer processes */}
          {OUTER.map((o) => {
            const p = outerP(o.ring, o.i);
            if (p <= 0) return null;
            const col = [C.green, C.teal, C.cyan, C.blue, C.violet][o.ring];
            return (
              <g key={o.i} opacity={p * (1 - dim)}>
                <line x1={o.px} y1={o.py} x2={mix(o.px, o.x, p)} y2={mix(o.py, o.y, p)} stroke={hexA(col, 0.3)} strokeWidth={1} />
                <circle cx={o.x} cy={o.y} r={[7, 6, 5, 4, 3.4][o.ring]} fill={hexA(col, 0.7)} />
              </g>
            );
          })}
          {/* services */}
          {SERVICES.map((sv, i) => {
            const at = svcAt(sv, i);
            const p = spr(f, fps, at, { damping: 15, stiffness: 140 });
            if (f < at) return null;
            const a = (sv.ang * Math.PI) / 180;
            const x = CX + Math.cos(a) * R1.x;
            const y = CY + Math.sin(a) * R1.y;
            const special = sv.name === "WindowServer" ? wsHi : sv.name === "loginwindow" ? lwHi : 0;
            // on-demand: dim until a request arrives, then light briefly
            const req = sv.demand ? ((f - b.needed) % 50 + 50) % 50 : 0;
            const demandOn = sv.demand && f > b.needed ? (req < 18 ? 1 : 0.3) : 1;
            const op = clamp(p * 1.5) * (special > 0 ? 1 : 1 - dim) * (sv.demand && f > b.needed ? mix(0.55, 1, demandOn) : 1);
            return (
              <g key={sv.name} opacity={op}>
                <line x1={CX} y1={CY} x2={mix(CX, x, clamp(p))} y2={mix(CY, y, clamp(p))} stroke={hexA(sv.col, 0.5)} strokeWidth={2} strokeDasharray={sv.demand && f > b.needed ? "6 6" : undefined} />
                <g transform={`translate(${x} ${y}) scale(${mix(0.6, 1, clamp(p)) * (1 + special * 0.25)})`}>
                  <rect x={-86} y={-24} width={172} height={48} rx={24} fill={hexA(sv.col, 0.18 + 0.3 * special)} stroke={sv.col} strokeWidth={2 + special * 2} />
                  <text y={7} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={19} fill={C.ink}>
                    {sv.name}
                  </text>
                  {sv.what && (
                    <text y={46} textAnchor="middle" fontFamily={FONT.ui} fontSize={16} fill={hexA(sv.col, 0.95)}>
                      {sv.what}
                    </text>
                  )}
                </g>
                {sv.demand && f > b.needed && req < 10 && <Spark x={mix(CX, x, req / 10)} y={mix(CY, y, req / 10)} color={sv.col} r={6} />}
              </g>
            );
          })}
          {/* launchd */}
          <g transform={`translate(${CX} ${CY}) scale(${clamp(born)})`}>
            <circle r={84} fill="rgba(8,24,18,0.95)" stroke={C.green} strokeWidth={3} />
            <text y={-2} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={28} fill={C.ink}>
              launchd
            </text>
            <text y={30} textAnchor="middle" fontFamily={FONT.mono} fontSize={18} fill={C.green}>
              PID 1
            </text>
          </g>
        </svg>
      </AbsoluteFill>
      {/* config files streaming in */}
      {filesA > 0.01 && (
        <AbsoluteFill style={{ opacity: filesA }}>
          {new Array(14).fill(0).map((_, i) => {
            const p = (((f - b.files) * 0.025 + i / 14) % 1 + 1) % 1;
            const sx = rnd(`fx${i}`, 200, 1720);
            const sy = rnd(`fy${i}`) > 0.5 ? -60 : 1140;
            const x = mix(sx, CX, p * p);
            const y = mix(sy, CY, p * p);
            return (
              <div key={i} style={{ position: "absolute", left: x - 50, top: y - 30, width: 100, height: 60, borderRadius: 8, background: "rgba(14,20,30,0.92)", border: `1px solid ${hexA(C.green, 0.6)}`, opacity: Math.sin(p * Math.PI), transform: `scale(${1 - p * 0.6})` }}>
                {[0, 1, 2].map((k) => (
                  <div key={k} style={{ margin: "8px 10px 0", height: 5, borderRadius: 3, width: 60 - k * 12, background: hexA(C.green, 0.5) }} />
                ))}
              </div>
            );
          })}
          <div style={{ position: "absolute", right: 130, top: 170, textAlign: "right" }}>
            <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: hexA(C.green, 0.95) }}>CONFIGURATION FILES READ</div>
            <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 64, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{nFiles}</div>
          </div>
        </AbsoluteFill>
      )}
      {/* on demand note */}
      <div style={{ position: "absolute", left: 120, bottom: 120, opacity: inOut(f, b.needed - 4, 14, b.within + 6, 12), display: "flex", alignItems: "center", gap: 14 }}>
        <svg width={60} height={14}>
          <line x1={0} y1={7} x2={60} y2={7} stroke={C.violet} strokeWidth={3} strokeDasharray="6 6" />
        </svg>
        <span style={{ fontFamily: FONT.mono, fontSize: 22, color: C.ink2 }}>dashed = started only on demand</span>
      </div>
      {/* process counter */}
      <div style={{ position: "absolute", right: 130, top: 170, textAlign: "right", opacity: inOut(f, b.hundreds - 10, 14, b.ws - 6, 14) }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: hexA(C.green, 0.95) }}>PROCESSES RUNNING</div>
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 72, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{count}</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 20, color: hexA(C.green, 0.9), opacity: beforeA }}>and nobody has logged in yet</div>
      </div>
      {/* the display */}
      {scr > 0.01 && (
        <div style={{ position: "absolute", left: 100, top: 720, opacity: scr, transform: `translateY(${(1 - scr) * 20}px)` }}>
          <MiniScreen on={scr} login={lwScr} />
          <div style={{ marginTop: 12, fontFamily: FONT.mono, fontSize: 18, color: C.green }}>{lwScr > 0.5 ? "loginwindow: asks who you are" : "WindowServer: owns the display"}</div>
        </div>
      )}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.pid1 - 6, name: "pop", vol: 0.4 },
    { at: b.every - 4, name: "shimmer", vol: 0.25 },
    { at: b.files - 10, name: "data_long", vol: 0.3 },
    ...SERVICES.slice(0, 8).map((_, i) => ({ at: b.starts + 4 + i * 4, name: "pop_hi", vol: 0.16, rate: 0.9 + i * 0.05 })),
    { at: b.needed, name: "blip", vol: 0.25 },
    { at: b.hundreds - 16, name: "riser", vol: 0.35 },
    { at: b.hundreds + 10, name: "electrons", vol: 0.3 },
    { at: b.ws - 6, name: "whoosh_soft", vol: 0.3 },
    { at: b.display - 6, name: "power_up", vol: 0.3 },
    { at: b.another + 6, name: "chime", vol: 0.3 },
  ];
};

export const Launchd: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.green, hueB: C.teal, hueC: C.cyan, intensity: 0.5 },
};
