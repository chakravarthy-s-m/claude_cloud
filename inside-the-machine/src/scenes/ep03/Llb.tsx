import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { cam } from "../../lib/proj3d";
import { Chip3D, ChipLabel, blockAnchor, kindAnchor, memAnchor, type ChipState } from "../../components/chip";
import { Glow, Kicker, NeonPath, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { BAD, Check, OK, SealBadge } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    l1: c.l1.from,
    scratch: wordAt(c.l1, "tiny scratchpad"),
    inside: wordAt(c.l1, "inside the chip"),
    notReady: wordAt(c.l1, "isn't ready yet"),
    fw: c.l2.from,
    helpers: wordAt(c.l2, "helper processors"),
    storage: wordAt(c.l2, "storage"),
    display: wordAt(c.l2, "display"),
    power: wordAt(c.l2, "power management"),
    tb: wordAt(c.l2, "Thunderbolt"),
    train: c.l3.from,
    patterns: wordAt(c.l3, "test patterns"),
    timing: wordAt(c.l3, "fine-tuning"),
    clean: wordAt(c.l3, "arrives cleanly"),
    policy: c.l4.from,
    file: wordAt(c.l4, "a small file"),
    sep: wordAt(c.l4, "signed by the Secure Enclave"),
    settings: wordAt(c.l4, "security settings"),
    only: c.l5.from,
    linux: wordAt(c.l5, "like Linux"),
    lower: wordAt(c.l5, "lower the security"),
    recovery: wordAt(c.l5, "from recovery"),
    password: wordAt(c.l5, "with your password"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

// ---------------------------------------------------------------- act 1+2: scratchpad & helpers
const HELPERS = [
  { key: "storage" as const, name: "STORAGE", block: "storage", col: C.orange, dx: 360, dy: -170 },
  { key: "display" as const, name: "DISPLAY", block: "display", col: C.cyan, dx: 420, dy: 60 },
  { key: "power" as const, name: "POWER MANAGEMENT", block: "fabric", col: C.amber, dx: -330, dy: -60 },
  { key: "tb" as const, name: "THUNDERBOLT", block: "io", col: C.blue, dx: 60, dy: 250 },
];

const OnChip: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = prog(f, 0, b.train - 10, EASE.inOut);
  const c = cam({ yaw: mix(-30, -14, t), pitch: mix(56, 48, t), dist: 2600, scale: mix(0.6, 0.66, t), target: [160, -40, 0], cy: 560 });
  const sram = prog(f, b.scratch - 6, 20);
  const memWarn = inOut(f, b.notReady - 8, 14, b.storage - 10, 12);
  const lit: Record<string, number> = { slc: sram };
  const verified: Record<string, number> = {};
  HELPERS.forEach((h) => {
    const at = b[h.key];
    verified[h.block] = prog(f, at + 10, 16);
    lit[h.block] = Math.max(lit[h.block] ?? 0, prog(f, at + 10, 16));
  });
  const st: ChipState = { power: 0.45 + 0.3 * sram, lit, rise: { slc: 0.35 * sram, ...Object.fromEntries(HELPERS.map((h) => [h.block, 0.3 * (verified[h.block] ?? 0)])) }, memLit: 0, frame: f, sparkle: 0.2 * sram };
  const slcA = kindAnchor(c, "slc", st, 20);
  const memA = memAnchor(c, st, 10);
  // the LLB lands in the scratchpad
  const drop = spr(f, fps, b.scratch + 2, { damping: 15, stiffness: 120 });
  const llbY = mix(slcA.y - 300, slcA.y - 60, clamp(drop));
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.cyan}>{f < b.fw - 8 ? "step one: a scratchpad" : "step two: wake the helpers"}</Kicker>
      </div>
      <Glow x={slcA.x} y={slcA.y} size={600} color={C.indigo} a={0.25 * sram} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Chip3D cam={c} st={st} />
        {/* firmware packages flying in to each helper */}
        {HELPERS.map((h) => {
          const at = b[h.key];
          const p = prog(f, at - 8, 18, EASE.inOut);
          if (p <= 0 || p >= 1) return null;
          const an = blockAnchor(c, h.block, st, 10);
          const x = mix(slcA.x, an.x, p);
          const y = mix(slcA.y, an.y, p) - Math.sin(p * Math.PI) * 120;
          return <Spark key={h.key} x={x} y={y} color={h.col} r={9} />;
        })}
      </svg>
      {/* LLB card dropping into SRAM */}
      {drop > 0.01 && f < b.fw + 30 && (
        <div style={{ position: "absolute", left: slcA.x - 90, top: llbY - 40, width: 180, opacity: clamp(drop * 2) * (1 - prog(f, b.fw + 10, 16)), textAlign: "center", padding: "10px 0", borderRadius: 14, background: "rgba(8,14,30,0.92)", border: `2px solid ${C.cyan}`, boxShadow: `0 0 30px ${hexA(C.cyan, 0.4)}` }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 28, color: C.ink }}>LLB</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 14, color: C.cyan }}>running here</div>
        </div>
      )}
      <ChipLabel x={slcA.x - 120} y={slcA.y} text="On-chip SRAM" sub="a tiny, instant scratchpad" color={C.indigo} a={inOut(f, b.inside - 6, 16, b.fw - 6, 12)} dx={-260} dy={-170} />
      {/* main memory: not ready */}
      {memWarn > 0.01 && (
        <div style={{ position: "absolute", left: memA.x + 30, top: memA.y - 160, opacity: memWarn, padding: "12px 18px", borderRadius: 14, background: "rgba(30,10,16,0.9)", border: `1.5px solid ${hexA(BAD, 0.8)}` }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 26, color: C.ink }}>Main memory (DRAM)</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 16, color: BAD }}>✕ not ready yet: untrained</div>
        </div>
      )}
      {/* helper labels */}
      {HELPERS.map((h) => {
        const at = b[h.key];
        const an = blockAnchor(c, h.block, st, 14);
        const la = inOut(f, at - 4, 14, b.train - 14, 12);
        const v = prog(f, at + 10, 10, EASE.outBack);
        if (la <= 0.01) return null;
        return (
          <React.Fragment key={h.key}>
            <ChipLabel x={an.x} y={an.y} text={h.name} sub="firmware verified" color={h.col} a={la} dx={h.dx} dy={h.dy} />
            {v > 0.01 && (
              <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
                <Check x={an.x + h.dx} y={an.y + h.dy - 84} r={16} a={clamp(v) * la} />
              </svg>
            )}
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 3: DRAM training (eye diagram)
const EYE = { x: 560, y: 300, w: 800, h: 460 };
const NTR = 70;

const Training: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const tune = prog(f, b.timing - 10, b.clean - b.timing + 16, EASE.inOut);
  const jitter = mix(0.38, 0.06, tune);
  const skew = mix(0.42, 0, tune); // sample point offset (fraction of UI)
  const noise = mix(0.3, 0.05, tune);
  const UI = EYE.w / 2;
  const mid = EYE.y + EYE.h / 2;
  const amp = EYE.h * 0.36;
  const done = prog(f, b.clean + 4, 12, EASE.outBack);
  const errors = Math.max(0, Math.round(mix(37, 0, Math.pow(tune, 1.4))));
  // each trace: a random 3-bit pattern drawn across 2 unit intervals, with jitter
  const traces: string[] = [];
  const frameSeed = Math.floor(f / 2);
  for (let i = 0; i < NTR; i++) {
    const bits = [rnd(`b0${i}-${frameSeed}`) > 0.5 ? 1 : -1, rnd(`b1${i}-${frameSeed}`) > 0.5 ? 1 : -1, rnd(`b2${i}-${frameSeed}`) > 0.5 ? 1 : -1];
    const j1 = (rnd(`j1${i}-${frameSeed}`) - 0.5) * jitter * UI;
    const j2 = (rnd(`j2${i}-${frameSeed}`) - 0.5) * jitter * UI;
    const n = (rnd(`n${i}-${frameSeed}`) - 0.5) * noise * amp;
    let d = "";
    for (let x = 0; x <= EYE.w; x += 8) {
      const t1 = (x - (UI * 0.5 + j1)) / (UI * 0.16);
      const t2 = (x - (UI * 1.5 + j2)) / (UI * 0.16);
      const s1 = 1 / (1 + Math.exp(-t1));
      const s2 = 1 / (1 + Math.exp(-t2));
      const v = bits[0] * (1 - s1) + bits[1] * (s1 - s2) + bits[2] * s2;
      const y = mid - (v * amp + n);
      d += `${x === 0 ? "M" : "L"}${(EYE.x + x).toFixed(1)},${y.toFixed(1)}`;
    }
    traces.push(d);
  }
  const sampleX = EYE.x + UI + skew * UI;
  const lanesA = prog(f, b.patterns - 10, 16);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.teal}>step three: train the memory</Kicker>
      </div>
      {/* SoC ↔ DRAM with flying test patterns */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g opacity={lanesA}>
          <rect x={120} y={830} width={220} height={120} rx={16} fill="#121624" stroke={hexA(C.ink, 0.35)} strokeWidth={2} />
          <text x={230} y={900} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={30} fill={C.ink}>
            SoC
          </text>
          <rect x={1580} y={830} width={220} height={120} rx={16} fill="#162026" stroke={hexA(C.teal, 0.7)} strokeWidth={2} />
          <text x={1690} y={900} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={30} fill={C.ink}>
            DRAM
          </text>
          {[0, 1, 2, 3].map((k) => (
            <line key={k} x1={340} y1={850 + k * 26} x2={1580} y2={850 + k * 26} stroke={hexA(C.teal, 0.18)} strokeWidth={3} />
          ))}
          {new Array(18).fill(0).map((_, i) => {
            const k = i % 4;
            const dir = i % 2 ? 1 : -1;
            const p = (((f * 0.012 * (1 + k * 0.1) + i / 18) % 1) + 1) % 1;
            const x = dir > 0 ? mix(360, 1560, p) : mix(1560, 360, p);
            const bit = rnd(`tp${i}`) > 0.5 ? "1" : "0";
            const bad = tune < 0.95 && rnd(`bad${i}-${Math.floor(f / 12)}`) < 0.5 * (1 - tune);
            return (
              <text key={i} x={x} y={856 + k * 26} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={20} fill={bad ? BAD : "#9ff7ea"} opacity={Math.sin(p * Math.PI)}>
                {bit}
              </text>
            );
          })}
        </g>
        {/* eye diagram */}
        <rect x={EYE.x - 20} y={EYE.y - 50} width={EYE.w + 40} height={EYE.h + 80} rx={20} fill="rgba(4,12,14,0.88)" stroke={hexA(C.teal, 0.45)} strokeWidth={2} />
        <text x={EYE.x} y={EYE.y - 18} fontFamily={FONT.ui} fontWeight={700} fontSize={18} letterSpacing="0.25em" fill={hexA(C.teal, 0.9)}>
          THE EYE · every bit, overlaid
        </text>
        <g style={{ mixBlendMode: "screen" }}>
          {traces.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={C.teal} strokeWidth={1.6} opacity={0.18} />
          ))}
        </g>
        {/* sample point */}
        <line x1={sampleX} y1={EYE.y} x2={sampleX} y2={EYE.y + EYE.h} stroke={done > 0.5 ? OK : C.amber} strokeWidth={2.5} strokeDasharray="6 6" />
        <line x1={EYE.x} y1={mid} x2={EYE.x + EYE.w} y2={mid} stroke={hexA(C.ink, 0.25)} strokeWidth={1.5} strokeDasharray="4 6" />
        <circle cx={sampleX} cy={mid} r={14} fill="none" stroke={done > 0.5 ? OK : C.amber} strokeWidth={3} />
        <circle cx={sampleX} cy={mid} r={4} fill={done > 0.5 ? OK : C.amber} />
        <text x={sampleX + 20} y={EYE.y + 28} fontFamily={FONT.mono} fontSize={16} fill={done > 0.5 ? OK : C.amber}>
          sample here
        </text>
      </svg>
      {/* readouts */}
      <div style={{ position: "absolute", left: EYE.x + EYE.w + 50, top: EYE.y + 20, width: 340 }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: hexA(C.teal, 0.9) }}>TIMING DELAY</div>
        <div style={{ marginTop: 10, height: 10, borderRadius: 5, background: hexA(C.ink, 0.1), position: "relative" }}>
          <div style={{ position: "absolute", left: `${mix(8, 50, tune)}%`, top: -7, width: 24, height: 24, marginLeft: -12, borderRadius: 12, background: C.teal, boxShadow: `0 0 14px ${C.teal}` }} />
        </div>
        <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: hexA(C.teal, 0.9), marginTop: 40 }}>BIT ERRORS</div>
        <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 64, color: errors > 0 ? BAD : OK, fontVariantNumeric: "tabular-nums" }}>{errors}</div>
        {done > 0.01 && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12, opacity: clamp(done) }}>
            <svg width={40} height={40}>
              <Check x={20} y={20} r={18} />
            </svg>
            <span style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 22, letterSpacing: "0.2em", color: OK }}>TRAINED</span>
          </div>
        )}
      </div>
      <div style={{ position: "absolute", left: 120, top: EYE.y + 60, width: 380, opacity: prog(f, b.train, 16) }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 44, color: C.ink, lineHeight: 1.1 }}>{tune < 0.5 ? "Eye closed: bits blur together" : "Eye open: every bit lands cleanly"}</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 18, color: C.ink2, marginTop: 12 }}>picoseconds matter at these speeds</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 4+5: boot policy & security modes
const MODES = [
  { name: "Full Security", sub: "only the newest signed macOS", col: OK },
  { name: "Reduced Security", sub: "older signed macOS, some extras", col: C.amber },
  { name: "Permissive Security", sub: "your own kernels · other OSes", col: BAD },
];

const Policy: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const docA = spr(f, fps, b.policy, { damping: 18, stiffness: 100 });
  const sealA = prog(f, b.sep - 2, 12, EASE.outBack);
  const scan = prog(f, b.policy + 20, 50, EASE.inOut);
  const readOk = prog(f, b.settings + 10, 12, EASE.outBack);
  const toSlider = prog(f, b.only - 8, 24, EASE.inOut);
  const recA = prog(f, b.recovery - 8, 14);
  const typed = Math.floor(clamp((f - b.recovery - 4) / 22) * 10);
  const unlocked = f > b.password - 2;
  const slide = prog(f, b.password, 22, EASE.inOut);
  const tryMove = f > b.lower && f < b.recovery ? Math.sin((f - b.lower) * 0.9) * 0.08 * (1 - prog(f, b.recovery - 10, 10)) : 0;
  const level = clamp(mix(0, 2, slide) + Math.max(0, tryMove), 0, 2);
  const linuxA = prog(f, b.linux - 4, 16);
  const docX = mix(960, 520, toSlider);
  const docS = mix(1, 0.72, toSlider);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.cyan}>step four: read the boot policy</Kicker>
      </div>
      {/* the policy document */}
      <div style={{ position: "absolute", left: docX - 280, top: 230, width: 560, transform: `scale(${mix(0.85, 1, clamp(docA)) * docS})`, transformOrigin: "50% 0", opacity: clamp(docA * 1.5) }}>
        <div style={{ position: "relative", padding: "26px 30px", borderRadius: 22, background: "linear-gradient(170deg, rgba(20,28,44,0.96), rgba(10,14,26,0.96))", border: `1.5px solid ${hexA(C.cyan, 0.5)}`, boxShadow: "0 40px 80px rgba(0,0,0,0.5)" }}>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: hexA(C.cyan, 0.9) }}>BOOT POLICY</div>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 36, color: C.ink, marginTop: 6 }}>for this macOS install</div>
          {[
            ["security mode", MODES[Math.round(level)].name, MODES[Math.round(level)].col],
            ["boot", Math.round(level) === 2 ? "custom kernels allowed" : "Apple-signed only", C.ink2],
            ["system volume", "sealed", C.ink2],
          ].map(([k, v, col], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginTop: 18, fontFamily: FONT.mono, fontSize: 23 }}>
              <span style={{ color: C.ink3 }}>{k}</span>
              <span style={{ color: col as string, fontWeight: 700 }}>{v}</span>
            </div>
          ))}
          {scan > 0 && scan < 1 && <div style={{ position: "absolute", left: 10, right: 10, top: 20 + scan * 220, height: 3, background: C.cyan, boxShadow: `0 0 16px ${C.cyan}` }} />}
          <svg width={140} height={140} style={{ position: "absolute", right: -84, bottom: -96, overflow: "visible" }}>
            <g transform={`translate(70 70) scale(${clamp(sealA)}) rotate(-12) translate(-70 -70)`} opacity={clamp(sealA)}>
              <SealBadge x={70} y={70} r={58} col={C.lime} label="ENCLAVE" />
            </g>
          </svg>
        </div>
        {sealA > 0.01 && toSlider < 0.5 && (
          <div style={{ marginTop: 26, textAlign: "right", fontFamily: FONT.mono, fontSize: 18, color: hexA(C.lime, 0.95), opacity: clamp(sealA) * (1 - toSlider * 2) }}>signed by the Secure Enclave</div>
        )}
        {readOk > 0.01 && toSlider < 0.5 && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, opacity: clamp(readOk) * (1 - toSlider * 2) }}>
            <svg width={36} height={36}>
              <Check x={18} y={18} r={16} />
            </svg>
            <span style={{ fontFamily: FONT.mono, fontSize: 18, color: OK }}>signature good · settings applied</span>
          </div>
        )}
      </div>
      {/* the security slider */}
      {toSlider > 0.01 && (
        <div style={{ position: "absolute", left: 980, top: 250, width: 780, opacity: toSlider }}>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: hexA(C.ink, 0.7) }}>SECURITY SETTING</div>
          <div style={{ position: "relative", marginTop: 30, height: 360 }}>
            <div style={{ position: "absolute", left: 28, top: 20, bottom: 20, width: 6, borderRadius: 3, background: `linear-gradient(180deg, ${OK}, ${C.amber}, ${BAD})`, opacity: 0.6 }} />
            {MODES.map((m, i) => (
              <div key={i} style={{ position: "absolute", left: 80, top: i * 150, opacity: Math.abs(level - i) < 0.5 ? 1 : 0.45 }}>
                <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 36, color: C.ink }}>{m.name}</div>
                <div style={{ fontFamily: FONT.mono, fontSize: 18, color: m.col }}>{m.sub}</div>
              </div>
            ))}
            <div style={{ position: "absolute", left: 31 - 20, top: 22 + level * 150 - 20, width: 40, height: 40, borderRadius: 20, background: MODES[Math.round(level)].col, boxShadow: `0 0 24px ${MODES[Math.round(level)].col}` }} />
          </div>
          {/* lock & password (from recovery) */}
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 16, opacity: recA, padding: "16px 20px", borderRadius: 16, background: "rgba(12,14,24,0.9)", border: `1.5px solid ${hexA(unlocked ? OK : C.ink, 0.35)}` }}>
            <svg width={34} height={40}>
              <rect x={3} y={16} width={28} height={22} rx={5} fill={unlocked ? OK : C.ink2} />
              <path d={unlocked ? "M9,16 V10 a8,8 0 0 1 16,0" : "M9,16 V10 a8,8 0 0 1 16,0 V16"} fill="none" stroke={unlocked ? OK : C.ink2} strokeWidth={4} />
            </svg>
            <div>
              <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 18, color: C.ink }}>Recovery · startup security</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 24, color: C.ink2, letterSpacing: "0.2em", marginTop: 4 }}>
                {"●".repeat(typed)}
                <span style={{ opacity: f % 30 < 15 && !unlocked ? 1 : 0 }}>|</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* other operating systems */}
      {linuxA > 0.01 && (
        <div style={{ position: "absolute", left: 1460, top: 572, opacity: linuxA, display: "flex", flexDirection: "row", alignItems: "center", gap: 14 }}>
          <div style={{ padding: "12px 20px", borderRadius: 14, background: "rgba(10,12,22,0.9)", border: `1.5px dashed ${hexA(C.ink, 0.5)}`, fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: C.ink }}>Linux?</div>
          <span style={{ fontFamily: FONT.mono, fontSize: 18, color: slide > 0.9 ? OK : C.ink3 }}>{slide > 0.9 ? "allowed: you chose this" : "needs your permission"}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const a1 = 1 - prog(f, b.train - 16, 10, EASE.in);
  const a2 = inOut(f, b.train - 6, 12, b.policy - 16, 10);
  const a3 = prog(f, b.policy - 6, 12);
  return (
    <SceneShell dur={s.durationInFrames} enter={22} exit={14} delay={66}>
      {a1 > 0.01 && <OnChip b={b} a={a1} />}
      {a2 > 0.01 && <Training b={b} a={a2} />}
      {a3 > 0.01 && <Policy b={b} a={a3} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.scratch + 2, name: "pop", vol: 0.4 },
    { at: b.notReady - 6, name: "blip_lo", vol: 0.3 },
    { at: b.storage - 8, name: "whoosh_soft", vol: 0.2 },
    { at: b.storage + 10, name: "tick_hi", vol: 0.3 },
    { at: b.display + 10, name: "tick_hi", vol: 0.3, rate: 1.05 },
    { at: b.power + 10, name: "tick_hi", vol: 0.3, rate: 1.1 },
    { at: b.tb + 10, name: "tick_hi", vol: 0.3, rate: 1.15 },
    { at: b.patterns - 6, name: "data_long", vol: 0.3 },
    { at: b.timing - 6, name: "sweep_up", vol: 0.25 },
    { at: b.clean + 4, name: "chime", vol: 0.35 },
    { at: b.policy, name: "whoosh_soft", vol: 0.3 },
    { at: b.policy + 20, name: "scan", vol: 0.3 },
    { at: b.sep - 2, name: "impact", vol: 0.4 },
    { at: b.settings + 10, name: "blip_hi", vol: 0.3 },
    { at: b.password, name: "typing", vol: 0.35 },
    { at: b.password + 34, name: "pop_hi", vol: 0.35 },
    { at: b.password + 36, name: "sweep_down", vol: 0.3 },
  ];
};

export const Llb: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.cyan, hueB: C.indigo, hueC: C.teal, intensity: 0.55 },
};
