import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker, NeonPath, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { BAD, Check, OK, SealBadge } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    hands: c.i1.from,
    iboot: wordAt(c.i1, "iBoot"),
    belongs: wordAt(c.i1, "which belongs"),
    version: wordAt(c.i1, "the version of macOS"),
    map: c.i2.from,
    tree: wordAt(c.i2, "called the device tree"),
    kernel: wordAt(c.i2, "and the kernel itself"),
    checking: wordAt(c.i2, "checking every signature"),
    sep: c.i3.from,
    own: wordAt(c.i3, "its own operating system"),
    rom: wordAt(c.i3, "from its own Boot ROM"),
    walled: wordAt(c.i3, "walled off"),
    seal: c.i4.from,
    checksSeal: wordAt(c.i4, "checks the seal"),
    jumps: wordAt(c.i4, "jumps into the kernel"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

// ---------------------------------------------------------------- act 1: the handover
const Handover: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pass = prog(f, b.hands + 6, 30, EASE.inOut);
  const ib = spr(f, fps, b.iboot - 6, { damping: 16, stiffness: 120 });
  const diskA = prog(f, b.belongs - 8, 18);
  const pick = prog(f, b.version - 4, 18);
  const OS = [
    { name: "macOS", ver: "version A", y: 640 },
    { name: "macOS", ver: "version B", y: 800 },
  ];
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.blue}>the handover</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <NeonPath d="M560,330 C760,250 900,250 1100,330" color={C.cyan} width={3} progress={pass} length={620} />
        {pass > 0.02 && pass < 0.98 && (() => {
          const t = pass;
          const x = (1 - t) ** 3 * 560 + 3 * (1 - t) ** 2 * t * 760 + 3 * (1 - t) * t * t * 900 + t ** 3 * 1100;
          const y = (1 - t) ** 3 * 330 + 3 * (1 - t) ** 2 * t * 250 + 3 * (1 - t) * t * t * 250 + t ** 3 * 330;
          return <Spark x={x} y={y} color={C.cyanHi} r={12} />;
        })()}
      </svg>
      {/* LLB */}
      <div style={{ position: "absolute", left: 300, top: 270, width: 260, padding: "18px 22px", borderRadius: 18, background: "rgba(8,14,30,0.92)", border: `2px solid ${hexA(C.cyan, 0.8)}`, opacity: 1 - 0.5 * pass }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 34, color: C.ink }}>LLB</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 16, color: C.cyan }}>{pass > 0.9 ? "done · handed over" : "handing over…"}</div>
      </div>
      {/* iBoot */}
      <div style={{ position: "absolute", left: 1100, top: 240, width: 420, padding: "22px 26px", borderRadius: 22, background: "rgba(10,16,36,0.95)", border: `2px solid ${C.blue}`, boxShadow: `0 0 ${50 * clamp(ib)}px ${hexA(C.blue, 0.4)}`, transform: `scale(${mix(0.85, 1, clamp(ib))})`, opacity: clamp(ib * 1.4) }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 52, color: C.ink }}>iBoot</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 18, color: C.blue }}>the main bootloader · signature ✓</div>
      </div>
      {/* the disk: each macOS install carries its own iBoot */}
      <div style={{ position: "absolute", left: 300, top: 560, width: 1320, height: 400, borderRadius: 26, border: `1.5px solid ${hexA(C.ink, 0.25)}`, background: "rgba(10,12,22,0.6)", opacity: diskA }}>
        <div style={{ position: "absolute", left: 24, top: 18, fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: hexA(C.ink, 0.6) }}>INTERNAL SSD</div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: diskA }}>
        {OS.map((o, i) => {
          const active = i === 0;
          const hi = active ? pick : 0;
          const y = o.y - 40;
          return (
            <g key={i} opacity={active ? 1 : mix(1, 0.4, pick)}>
              {/* preboot slot with its iBoot */}
              <rect x={360} y={y} width={300} height={110} rx={16} fill={hexA(C.blue, 0.08 + 0.18 * hi)} stroke={hexA(C.blue, 0.4 + 0.6 * hi)} strokeWidth={2} />
              <text x={380} y={y + 34} fontFamily={FONT.ui} fontWeight={700} fontSize={15} letterSpacing="0.2em" fill={hexA(C.ink, 0.6)}>
                PREBOOT
              </text>
              <text x={380} y={y + 76} fontFamily={FONT.display} fontWeight={700} fontSize={32} fill={C.ink}>
                iBoot
              </text>
              <text x={500} y={y + 76} fontFamily={FONT.mono} fontSize={18} fill={C.blue}>
                {o.ver}
              </text>
              {/* paired macOS */}
              <line x1={660} y1={y + 55} x2={800} y2={y + 55} stroke={hexA(C.blue, 0.4 + 0.6 * hi)} strokeWidth={3} strokeDasharray="8 6" />
              <rect x={800} y={y} width={760} height={110} rx={16} fill={hexA(C.violet, 0.06 + 0.12 * hi)} stroke={hexA(C.violet, 0.35 + 0.5 * hi)} strokeWidth={2} />
              <text x={830} y={y + 68} fontFamily={FONT.display} fontWeight={700} fontSize={34} fill={C.ink}>
                {o.name}
              </text>
              <text x={980} y={y + 68} fontFamily={FONT.mono} fontSize={20} fill={hexA(C.violet, 0.95)}>
                {o.ver}
              </text>
              <text x={1530} y={y + 68} textAnchor="end" fontFamily={FONT.mono} fontSize={18} fill={hexA(C.ink, 0.5)}>
                {active ? (pick > 0.5 ? "▶ starting this one" : "") : ""}
              </text>
            </g>
          );
        })}
        <text x={730} y={1000 - 40} textAnchor="middle" fontFamily={FONT.mono} fontSize={17} fill={hexA(C.blue, 0.85 * pick)}>
          each iBoot is paired with its own macOS
        </text>
      </svg>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 2: device tree + kernel + checks
type DTNode = { id: string; label: string; parent?: string; x: number; y: number };
const DT: DTNode[] = [
  { id: "root", label: "/", x: 200, y: 560 },
  { id: "cpus", label: "cpus", parent: "root", x: 380, y: 330 },
  { id: "mem", label: "memory", parent: "root", x: 380, y: 470 },
  { id: "io", label: "arm-io", parent: "root", x: 380, y: 650 },
  { id: "chosen", label: "chosen", parent: "root", x: 380, y: 820 },
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ id: `cpu${i}`, label: `cpu${i}`, parent: "cpus", x: 560 + (i % 4) * 92, y: 270 + Math.floor(i / 4) * 64 })),
  ...["nvme", "display", "usb", "i2c", "uart", "audio", "gpu", "wifi"].map((n, i) => ({ id: n, label: n, parent: "io", x: 560 + (i % 4) * 100, y: 600 + Math.floor(i / 4) * 64 })),
];

const LOADED = [
  { name: "device tree", sub: "the hardware map", col: C.cyan },
  { name: "kernel", sub: "the kernel collection", col: C.violet },
  { name: "trust cache", sub: "approved fingerprints", col: C.gold },
  { name: "firmware", sub: "for more helpers", col: C.orange },
];

const Loads: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grow = (n: DTNode, i: number) => prog(f, b.map + 6 + i * 3, 14);
  const kernelP = prog(f, b.kernel - 4, 50, EASE.inOut);
  const cardAt = [b.tree + 10, b.kernel + 6, b.checking - 6, b.checking + 10];
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.blue}>iBoot loads</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {DT.map((n, i) => {
          const p = grow(n, i);
          if (p <= 0) return null;
          const par = DT.find((x) => x.id === n.parent);
          return (
            <g key={n.id} opacity={p}>
              {par && <path d={`M${par.x + 30},${par.y} C${(par.x + n.x) / 2},${par.y} ${(par.x + n.x) / 2},${n.y} ${n.x - 36},${n.y}`} fill="none" stroke={hexA(C.cyan, 0.4)} strokeWidth={2} />}
              <rect x={n.x - 40} y={n.y - 20} width={80} height={40} rx={10} fill="rgba(8,18,30,0.95)" stroke={hexA(C.cyan, 0.75)} strokeWidth={1.5} />
              <text x={n.x} y={n.y + 6} textAnchor="middle" fontFamily={FONT.mono} fontSize={n.id === "root" ? 22 : 15} fill={C.ink}>
                {n.label}
              </text>
            </g>
          );
        })}
        <text x={200} y={500} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={hexA(C.cyan, 0.9 * prog(f, b.tree - 4, 14))}>
          DEVICE TREE
        </text>
      </svg>
      {/* loaded items with signature checks */}
      <div style={{ position: "absolute", left: 1100, top: 230, width: 680 }}>
        {LOADED.map((it, i) => {
          const at = cardAt[i];
          const p = spr(f, fps, at, { damping: 18, stiffness: 140 });
          const ck = prog(f, Math.max(at + 16, b.checking + i * 6), 10, EASE.outBack);
          const isK = it.name === "kernel";
          return (
            <div key={it.name} style={{ marginBottom: 22, padding: "18px 22px", borderRadius: 18, background: "rgba(10,14,28,0.92)", border: `1.5px solid ${hexA(it.col, 0.7)}`, opacity: clamp(p * 1.5), transform: `translateX(${(1 - clamp(p)) * 60}px)`, display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: isK ? 40 : 32, color: C.ink }}>{it.name}</div>
                <div style={{ fontFamily: FONT.mono, fontSize: 17, color: it.col }}>{it.sub}</div>
                {isK && (
                  <div style={{ marginTop: 10, height: 8, borderRadius: 4, background: hexA(C.ink, 0.1) }}>
                    <div style={{ width: `${kernelP * 100}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${C.violet}, ${C.pink})` }} />
                  </div>
                )}
              </div>
              <svg width={48} height={48} style={{ opacity: clamp(ck) }}>
                <Check x={24} y={24} r={20} />
              </svg>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 3: the Secure Enclave, walled off
const hexPath = (cx: number, cy: number, r: number) =>
  new Array(6)
    .fill(0)
    .map((_, i) => {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      return `${i ? "L" : "M"}${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
    })
    .join("") + "Z";

const Enclave: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const wall = prog(f, b.walled - 10, 30, EASE.inOut);
  const romA = prog(f, b.rom - 6, 14);
  const osA = prog(f, b.own - 4, 16);
  const ok1 = prog(f, b.rom + 14, 10, EASE.outBack);
  const cx = 1240;
  const cy = 560;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.lime}>meanwhile: the Secure Enclave</Kicker>
      </div>
      {/* outside world: the main chain keeps going */}
      <div style={{ position: "absolute", left: 140, top: 380, width: 520 }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: hexA(C.ink, 0.6) }}>MAIN PROCESSOR</div>
        {["Boot ROM", "LLB", "iBoot", "…"].map((t, i) => (
          <div key={t} style={{ marginTop: 14, padding: "12px 18px", borderRadius: 14, border: `1.5px solid ${hexA(C.blue, 0.5)}`, background: "rgba(10,14,28,0.8)", fontFamily: FONT.display, fontWeight: 700, fontSize: 26, color: C.ink, width: 300 - i * 10 }}>
            {t}
          </div>
        ))}
      </div>
      <Glow x={cx} y={cy} size={900} color={C.lime} a={0.12 + 0.12 * wall} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* the wall: hex cells */}
        {new Array(36).fill(0).map((_, i) => {
          const ang = (i / 36) * Math.PI * 2;
          const r = 330;
          const p = clamp(wall * 1.4 - (i % 9) * 0.05);
          return <path key={i} d={hexPath(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.86, 34)} fill={hexA(C.lime, 0.08 * p)} stroke={hexA(C.lime, 0.7 * p)} strokeWidth={2} />;
        })}
        {/* sealed chamber */}
        <circle cx={cx} cy={cy} r={260} fill="rgba(10,20,8,0.75)" stroke={hexA(C.lime, 0.5)} strokeWidth={2} />
        <text x={cx} y={cy - 190} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={18} letterSpacing="0.3em" fill={C.lime}>
          SECURE ENCLAVE
        </text>
        {/* its own chain */}
        <g opacity={romA}>
          <rect x={cx - 210} y={cy - 70} width={170} height={110} rx={16} fill={hexA(C.lime, 0.1)} stroke={C.lime} strokeWidth={2} />
          <text x={cx - 125} y={cy - 10} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={26} fill={C.ink}>
            its own
          </text>
          <text x={cx - 125} y={cy + 22} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={26} fill={C.ink}>
            Boot ROM
          </text>
        </g>
        <g opacity={osA}>
          <rect x={cx + 40} y={cy - 70} width={170} height={110} rx={16} fill={hexA(C.lime, 0.1)} stroke={C.lime} strokeWidth={2} />
          <text x={cx + 125} y={cy - 10} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={26} fill={C.ink}>
            its own
          </text>
          <text x={cx + 125} y={cy + 22} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={26} fill={C.ink}>
            OS
          </text>
        </g>
        <NeonPath d={`M${cx - 40},${cy - 15} L${cx + 40},${cy - 15}`} color={C.lime} width={3} progress={prog(f, b.rom + 4, 12)} length={80} />
        {ok1 > 0.01 && <Check x={cx + 210} y={cy - 70} r={18} a={clamp(ok1)} />}
        {/* probes from outside bounce off the wall */}
        {wall > 0.5 &&
          [0, 1, 2].map((k) => {
            const t = ((f - b.walled) / 24 - k * 0.33) % 1;
            if (t < 0) return null;
            const p = t < 0.5 ? t * 2 : 1 - (t - 0.5) * 2;
            const x = mix(760, cx - 380, p);
            const y = 420 + k * 120;
            return <Spark key={k} x={x} y={y} color={BAD} r={7} a={0.9} />;
          })}
      </svg>
      <div style={{ position: "absolute", left: cx - 200, top: cy + 300, width: 400, textAlign: "center", fontFamily: FONT.mono, fontSize: 18, color: hexA(C.lime, 0.9), opacity: wall }}>
        walled off · keys never leave
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 4: the seal, then the jump
const Jump: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const sealA = prog(f, b.seal - 6, 16);
  const ring = prog(f, b.checksSeal - 2, 30, EASE.inOut);
  const ok = prog(f, b.checksSeal + 30, 10, EASE.outBack);
  const warp = prog(f, b.jumps - 6, b.end - b.jumps + 6, EASE.in);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110, opacity: 1 - warp }}>
        <Kicker color={C.gold}>last check</Kicker>
      </div>
      {/* warp streaks */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {warp > 0 &&
          new Array(120).fill(0).map((_, i) => {
            const ang = rnd(`wa${i}`, 0, Math.PI * 2);
            const r0 = rnd(`wr${i}`, 40, 700);
            const sp = rnd(`ws${i}`, 0.5, 1.5);
            const r1 = r0 + warp * warp * 1600 * sp;
            const r2 = r0 + warp * warp * 1600 * sp + 40 + warp * 380 * sp;
            const col = [C.violet, C.cyan, C.pink, "#ffffff"][i % 4];
            return (
              <line
                key={i}
                x1={960 + Math.cos(ang) * r1}
                y1={540 + Math.sin(ang) * r1}
                x2={960 + Math.cos(ang) * r2}
                y2={540 + Math.sin(ang) * r2}
                stroke={col}
                strokeWidth={1 + warp * 3}
                opacity={clamp(warp * 3) * 0.8}
                strokeLinecap="round"
              />
            );
          })}
      </svg>
      <AbsoluteFill style={{ transform: `scale(${1 + warp * warp * 6})`, opacity: 1 - clamp(warp * 1.6) }}>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <g opacity={sealA}>
            <circle cx={960} cy={500} r={170} fill="none" stroke={hexA(C.gold, 0.15)} strokeWidth={14} />
            <circle cx={960} cy={500} r={170} fill="none" stroke={C.gold} strokeWidth={6} strokeDasharray={`${ring * 1068} 1068`} transform="rotate(-90 960 500)" strokeLinecap="round" />
            <SealBadge x={960} y={500} r={120} col={C.gold} label="SEALED" />
          </g>
          {ok > 0.01 && <Check x={1120} y={360} r={34} a={clamp(ok)} />}
        </svg>
        <div style={{ position: "absolute", left: 0, right: 0, top: 720, textAlign: "center", opacity: sealA }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 48, color: C.ink }}>the system volume’s seal</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 20, color: hexA(C.gold, 0.9), marginTop: 6 }}>{ok > 0.5 ? "intact ✓ · jumping into the kernel" : "checking…"}</div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#e6dcff", opacity: prog(f, b.end - 10, 10) * 0.4, mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const a1 = 1 - prog(f, b.map - 8, 14, EASE.in);
  const a2 = inOut(f, b.map - 8, 14, b.sep - 8, 12);
  const a3 = inOut(f, b.sep - 8, 12, b.seal - 8, 12);
  const a4 = prog(f, b.seal - 8, 12);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={0}>
      {a1 > 0.01 && <Handover b={b} a={a1} />}
      {a2 > 0.01 && <Loads b={b} a={a2} />}
      {a3 > 0.01 && <Enclave b={b} a={a3} />}
      {a4 > 0.01 && <Jump b={b} a={a4} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.hands + 6, name: "whoosh", vol: 0.35 },
    { at: b.iboot - 6, name: "pop", vol: 0.35 },
    { at: b.version - 4, name: "blip_hi", vol: 0.3 },
    { at: b.map + 6, name: "data_long", vol: 0.25 },
    { at: b.kernel - 4, name: "data", vol: 0.3 },
    { at: b.checking, name: "tick_hi", vol: 0.3 },
    { at: b.checking + 6, name: "tick_hi", vol: 0.3, rate: 1.06 },
    { at: b.checking + 12, name: "tick_hi", vol: 0.3, rate: 1.12 },
    { at: b.checking + 18, name: "tick_hi", vol: 0.3, rate: 1.18 },
    { at: b.own - 4, name: "shimmer", vol: 0.25 },
    { at: b.walled - 10, name: "portal", vol: 0.35 },
    { at: b.walled + 10, name: "bounce", vol: 0.2 },
    { at: b.checksSeal - 2, name: "scan", vol: 0.35 },
    { at: b.checksSeal + 30, name: "chime", vol: 0.35 },
    { at: b.jumps - 6, name: "riser", vol: 0.45 },
    { at: b.jumps + 4, name: "whoosh_big", vol: 0.5 },
  ];
};

export const Iboot: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.blue, hueB: C.cyan, hueC: C.lime, intensity: 0.55 },
};
