// Shared building blocks for Episode 03 — "Power On".
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { clamp, mix, prog, spr } from "../../lib/anim";
import { useCanvas } from "../../components/fx";
import { wallpaper } from "../ep02/shared";

// Real SHA-256 digests (computed offline) of an illustrative "bootloader" payload,
// and of the same payload with exactly one bit flipped ('e' 01100101 → 'd' 01100100).
export const PAYLOAD = "LLB: low-level bootloader, stage 1 (illustrative payload)";
export const PAYLOAD_FLIP_AT = 10;
export const HASH_A = "224b298ee989b4fe91fd0297ae2482b173de7efbcc585cfab9f95a50333dafe1";
export const HASH_B = "24673996f6d462900529e2591ece8aba9bd6f690333dbd8847deaeed8dfe8cd4";

export const OK = C.green;
export const BAD = C.rose;

// ------------------------------------------------------------------ icons
export const Check: React.FC<{ x: number; y: number; r?: number; a?: number; col?: string }> = ({ x, y, r = 22, a = 1, col = OK }) => (
  <g transform={`translate(${x} ${y})`} opacity={a}>
    <circle r={r} fill={hexA(col, 0.18)} stroke={col} strokeWidth={r * 0.12} />
    <path d={`M${-r * 0.45},${r * 0.02} L${-r * 0.12},${r * 0.34} L${r * 0.5},${-r * 0.32}`} fill="none" stroke={col} strokeWidth={r * 0.16} strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

export const Cross: React.FC<{ x: number; y: number; r?: number; a?: number; col?: string }> = ({ x, y, r = 22, a = 1, col = BAD }) => (
  <g transform={`translate(${x} ${y})`} opacity={a}>
    <circle r={r} fill={hexA(col, 0.18)} stroke={col} strokeWidth={r * 0.12} />
    <path d={`M${-r * 0.36},${-r * 0.36} L${r * 0.36},${r * 0.36} M${r * 0.36},${-r * 0.36} L${-r * 0.36},${r * 0.36}`} stroke={col} strokeWidth={r * 0.16} strokeLinecap="round" />
  </g>
);

/** IEC power symbol (⏻) drawn as strokes. */
export const PowerSymbol: React.FC<{ x: number; y: number; r?: number; col?: string; glow?: number; width?: number }> = ({ x, y, r = 60, col = C.ink, glow = 0, width }) => {
  const w = width ?? r * 0.2;
  return (
    <g transform={`translate(${x} ${y})`} style={glow > 0.01 ? { filter: `drop-shadow(0 0 ${20 * glow}px ${col})` } : undefined}>
      <path d={`M${-r * 0.62},${-r * 0.5} A${r * 0.8},${r * 0.8} 0 1 0 ${r * 0.62},${-r * 0.5}`} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" />
      <line x1={0} y1={-r * 0.95} x2={0} y2={-r * 0.1} stroke={col} strokeWidth={w} strokeLinecap="round" />
    </g>
  );
};

/** A key (for public/private keys). */
export const KeyIcon: React.FC<{ x: number; y: number; s?: number; col?: string; glow?: number; rot?: number }> = ({ x, y, s = 1, col = C.gold, glow = 0, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} style={glow > 0.01 ? { filter: `drop-shadow(0 0 ${16 * glow}px ${col})` } : undefined}>
    <circle cx={-34} cy={0} r={22} fill="none" stroke={col} strokeWidth={9} />
    <rect x={-12} y={-5} width={66} height={10} rx={4} fill={col} />
    <rect x={34} y={5} width={8} height={16} rx={2} fill={col} />
    <rect x={46} y={5} width={8} height={11} rx={2} fill={col} />
  </g>
);

/** A wax-seal style badge. */
export const SealBadge: React.FC<{ x: number; y: number; r?: number; col?: string; label?: string; broken?: number }> = ({ x, y, r = 46, col = C.gold, label = "SIGNED", broken = 0 }) => {
  const teeth = 18;
  let d = "";
  for (let i = 0; i <= teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 ? r * 0.86 : r;
    d += `${i ? "L" : "M"}${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`;
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={d + "Z"} fill={hexA(col, 0.22)} stroke={col} strokeWidth={3} />
      <circle r={r * 0.62} fill="none" stroke={col} strokeWidth={2} strokeDasharray="4 4" />
      <text y={6} textAnchor="middle" fontFamily={FONT.ui} fontWeight={800} fontSize={r * 0.3} letterSpacing="0.08em" fill={col}>
        {label}
      </text>
      {broken > 0.01 && <path d={`M${-r * 0.2},${-r} L${r * 0.1},${-r * 0.2} L${-r * 0.15},${r * 0.15} L${r * 0.2},${r}`} fill="none" stroke={BAD} strokeWidth={5} strokeLinecap="round" opacity={broken} />}
    </g>
  );
};

// ------------------------------------------------------------------ the chain of trust
export type LinkItem = { label: string; sub?: string; at: number; col?: string; fail?: boolean };

/** A row of chain links; each link "locks in" with a check when verified. */
export const ChainRow: React.FC<{ items: LinkItem[]; x0: number; x1: number; y: number; a?: number; size?: number }> = ({ items, x0, x1, y, a = 1, size = 1 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = items.length;
  const step = n > 1 ? (x1 - x0) / (n - 1) : 0;
  const LW = 150 * size;
  const LH = 84 * size;
  return (
    <g opacity={a}>
      {items.map((it, i) => {
        const x = x0 + i * step;
        const p = spr(f, fps, it.at, { damping: 18, stiffness: 140 });
        const col = it.fail ? BAD : it.col ?? OK;
        const on = clamp(p);
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${mix(0.85, 1, on)})`} opacity={0.25 + 0.75 * on}>
            {/* the link (a rounded capsule) */}
            <rect x={-LW / 2} y={-LH / 2} width={LW} height={LH} rx={LH / 2} fill={hexA(col, 0.06 + 0.12 * on)} stroke={on > 0.5 ? col : hexA(C.ink, 0.25)} strokeWidth={6 * size} />
            <rect x={-LW / 2 + 16 * size} y={-LH / 2 + 16 * size} width={LW - 32 * size} height={LH - 32 * size} rx={(LH - 32 * size) / 2} fill="none" stroke={hexA(col, 0.25 * on)} strokeWidth={2} />
            <text y={6 * size} textAnchor="middle" fontFamily={FONT.ui} fontWeight={800} fontSize={20 * size} fill={C.ink}>
              {it.label}
            </text>
            {it.sub && (
              <text y={LH / 2 + 30 * size} textAnchor="middle" fontFamily={FONT.mono} fontSize={15 * size} fill={hexA(col, 0.9)}>
                {it.sub}
              </text>
            )}
            {on > 0.6 && (it.fail ? <Cross x={LW / 2 - 6} y={-LH / 2 + 4} r={16 * size} /> : <Check x={LW / 2 - 6} y={-LH / 2 + 4} r={16 * size} col={col} />)}
          </g>
        );
      })}
    </g>
  );
};

// ------------------------------------------------------------------ cards
export const StageCard: React.FC<{ title: string; sub?: string; col: string; w?: number; state?: "idle" | "ok" | "fail" | "busy"; children?: React.ReactNode; style?: React.CSSProperties }> = ({
  title,
  sub,
  col,
  w = 300,
  state = "idle",
  children,
  style,
}) => (
  <div
    style={{
      width: w,
      padding: "18px 22px",
      borderRadius: 20,
      background: "linear-gradient(160deg, rgba(20,26,46,0.92), rgba(8,10,22,0.94))",
      border: `2px solid ${state === "fail" ? BAD : state === "ok" ? OK : hexA(col, 0.7)}`,
      boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${hexA(state === "fail" ? BAD : col, 0.25)}`,
      ...style,
    }}
  >
    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: C.ink }}>{title}</div>
    {sub && <div style={{ fontFamily: FONT.mono, fontSize: 17, color: hexA(col, 0.95), marginTop: 4 }}>{sub}</div>}
    {children}
  </div>
);

// ------------------------------------------------------------------ desktop
/** A generic, unbranded desktop: wallpaper, menu bar, a window, and a Dock. */
export const Desktop: React.FC<{ w: number; h: number; reveal?: number; dockA?: number; menuA?: number; winA?: number }> = ({ w, h, reveal = 1, dockA = 1, menuA = 1, winA = 1 }) => {
  const ref = useCanvas((ctx) => ctx.drawImage(wallpaper(), 0, 0, w, h), [w, h]);
  const s = w / 1280;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: reveal }}>
      <canvas ref={ref} width={w} height={h} style={{ position: "absolute", inset: 0 }} />
      {/* menu bar */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 30 * s, background: "rgba(20,16,40,0.45)", opacity: menuA, transform: `translateY(${(1 - menuA) * -30 * s}px)` }}>
        <div style={{ position: "absolute", left: 18 * s, top: 9 * s, width: 12 * s, height: 12 * s, borderRadius: 6 * s, background: "rgba(255,255,255,0.9)" }} />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ position: "absolute", left: (50 + i * 66) * s, top: 11 * s, width: (i === 0 ? 56 : 44) * s, height: 8 * s, borderRadius: 4 * s, background: i === 0 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)" }} />
        ))}
        <div style={{ position: "absolute", right: 20 * s, top: 11 * s, width: 110 * s, height: 8 * s, borderRadius: 4 * s, background: "rgba(255,255,255,0.7)" }} />
      </div>
      {/* a file-browser window */}
      <div style={{ position: "absolute", left: 180 * s, top: 130 * s, width: 560 * s, height: 360 * s, borderRadius: 14 * s, background: "rgba(24,26,40,0.94)", boxShadow: `0 ${30 * s}px ${70 * s}px rgba(0,0,0,0.55)`, border: "1px solid rgba(255,255,255,0.14)", opacity: winA, transform: `scale(${mix(0.9, 1, winA)})` }}>
        <div style={{ display: "flex", gap: 8 * s, padding: 14 * s }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} style={{ width: 12 * s, height: 12 * s, borderRadius: 6 * s, background: c }} />
          ))}
        </div>
        <div style={{ position: "absolute", left: 0, top: 44 * s, bottom: 0, width: 140 * s, background: "rgba(255,255,255,0.05)" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ margin: `${14 * s}px ${16 * s}px`, height: 9 * s, width: (90 - i * 8) * s, borderRadius: 5 * s, background: "rgba(255,255,255,0.3)" }} />
          ))}
        </div>
        <div style={{ position: "absolute", left: 160 * s, top: 60 * s, right: 20 * s, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 * s }}>
          {[C.blue, C.violet, C.pink, C.amber, C.teal, C.green, C.cyan, C.rose].map((c, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * s }}>
              <div style={{ width: 64 * s, height: 52 * s, borderRadius: 10 * s, background: `linear-gradient(160deg, ${c}, ${hexA(c, 0.55)})` }} />
              <div style={{ width: 56 * s, height: 7 * s, borderRadius: 4 * s, background: "rgba(255,255,255,0.3)" }} />
            </div>
          ))}
        </div>
      </div>
      {/* dock */}
      <div style={{ position: "absolute", left: w / 2 - 300 * s, top: h - 92 * s, width: 600 * s, height: 76 * s, borderRadius: 22 * s, background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.22)", opacity: dockA, transform: `translateY(${(1 - dockA) * 90 * s}px)` }}>
        {[C.pink, C.cyan, C.violet, C.amber, C.green, C.blue, C.rose, C.teal].map((c, i) => (
          <div key={i} style={{ position: "absolute", left: (18 + i * 72) * s, top: 10 * s, width: 56 * s, height: 56 * s, borderRadius: 14 * s, background: `linear-gradient(160deg, ${c}, ${hexA(c, 0.6)})` }} />
        ))}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ misc
/** A labelled oscilloscope panel frame (grid + title). */
export const ScopeFrame: React.FC<{ x: number; y: number; w: number; h: number; title: string; col?: string; a?: number; children?: React.ReactNode }> = ({ x, y, w, h, title, col = C.green, a = 1, children }) => (
  <g transform={`translate(${x} ${y})`} opacity={a}>
    <rect width={w} height={h} rx={18} fill="rgba(4,10,8,0.85)" stroke={hexA(col, 0.45)} strokeWidth={2} />
    {new Array(11).fill(0).map((_, i) => (
      <line key={`v${i}`} x1={(w / 10) * i} y1={0} x2={(w / 10) * i} y2={h} stroke={hexA(col, i === 5 ? 0.16 : 0.07)} />
    ))}
    {new Array(7).fill(0).map((_, j) => (
      <line key={`h${j}`} x1={0} y1={(h / 6) * j} x2={w} y2={(h / 6) * j} stroke={hexA(col, j === 3 ? 0.16 : 0.07)} />
    ))}
    <text x={18} y={30} fontFamily={FONT.ui} fontWeight={700} fontSize={18} letterSpacing="0.2em" fill={hexA(col, 0.85)}>
      {title}
    </text>
    {children}
  </g>
);

/** Small helper: fades a value in at `at` over `d` frames. */
export const useIn = (at: number, d = 14) => {
  const f = useCurrentFrame();
  return prog(f, at, d);
};
