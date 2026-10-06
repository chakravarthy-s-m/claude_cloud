import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { cam } from "../../lib/proj3d";
import { Chip3D } from "../../components/chip";
import { Glow, Kicker, NeonPath, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { BAD, Check, Cross, OK } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    charge: c.k1.from,
    vm: wordAt(c.k1, "switches on virtual memory"),
    itself: wordAt(c.k1, "giving itself"),
    future: wordAt(c.k1, "every future program"),
    map: wordAt(c.k1, "its own map"),
    cores: c.k2.from,
    oneByOne: wordAt(c.k2, "one by one"),
    sched: wordAt(c.k2, "starts the scheduler"),
    walks: c.k3.from,
    matches: wordAt(c.k3, "matches each piece"),
    driver: wordAt(c.k3, "with a driver"),
    every: c.k3b.from,
    list: wordAt(c.k3b, "a list of approved fingerprints"),
    trust: wordAt(c.k3b, "the trust cache"),
    iboot: wordAt(c.k3b, "that iBoot loaded"),
    first: c.k4.from,
    very: wordAt(c.k4, "very first program"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

// ---------------------------------------------------------------- act 1: virtual memory
const SPACES = [
  { name: "kernel", col: C.violet, x: 180 },
  { name: "program", col: C.pink, x: 420 },
  { name: "program", col: C.cyan, x: 660 },
];
const PHYS = { x: 1240, y: 250, cols: 8, rows: 10, cell: 56 };

const Vm: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const sw = prog(f, b.vm - 2, 10, EASE.out);
  const space = (i: number) => (i === 0 ? prog(f, b.itself - 6, 16) : prog(f, b.future - 4 + (i - 1) * 8, 16));
  const lines = (i: number) => prog(f, (i === 0 ? b.itself + 6 : b.map - 4 + (i - 1) * 6), 22, EASE.inOut);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.violet}>the kernel takes over</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 56, color: C.ink, marginTop: 10, opacity: prog(f, b.vm - 6, 14) }}>Virtual memory: a private map for everyone</div>
      </div>
      {/* MMU switch */}
      <div style={{ position: "absolute", left: 930, top: 300, width: 200, textAlign: "center", opacity: prog(f, b.vm - 12, 12) }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: hexA(C.ink, 0.7) }}>MMU</div>
        <div style={{ margin: "12px auto 0", width: 120, height: 56, borderRadius: 28, background: sw > 0.5 ? hexA(OK, 0.3) : hexA(C.ink, 0.12), border: `2px solid ${sw > 0.5 ? OK : hexA(C.ink, 0.4)}`, position: "relative" }}>
          <div style={{ position: "absolute", top: 6, left: mix(6, 70, sw), width: 40, height: 40, borderRadius: 20, background: sw > 0.5 ? OK : C.ink2, boxShadow: sw > 0.5 ? `0 0 20px ${OK}` : undefined }} />
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 20, color: sw > 0.5 ? OK : C.ink3, marginTop: 10 }}>{sw > 0.5 ? "ON" : "off"}</div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* physical memory */}
        <text x={PHYS.x} y={PHYS.y - 20} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.3em" fill={hexA(C.teal, 0.9)}>
          PHYSICAL MEMORY
        </text>
        {new Array(PHYS.cols * PHYS.rows).fill(0).map((_, i) => {
          const cx = PHYS.x + (i % PHYS.cols) * PHYS.cell;
          const cy = PHYS.y + Math.floor(i / PHYS.cols) * PHYS.cell;
          // which space owns this frame (if any)?
          const owner = SPACES.findIndex((_, si) => rnd(`own${i}`) < 0.18 * (si + 1) && rnd(`own${i}`) >= 0.18 * si);
          const lit = owner >= 0 ? lines(owner) : 0;
          const col = owner >= 0 ? SPACES[owner].col : C.ink;
          return <rect key={i} x={cx} y={cy} width={PHYS.cell - 8} height={PHYS.cell - 8} rx={6} fill={hexA(col, 0.06 + 0.4 * lit)} stroke={hexA(owner >= 0 ? col : C.ink, 0.15 + 0.5 * lit)} strokeWidth={1.2} />;
        })}
        {/* virtual spaces and mappings */}
        {SPACES.map((sp, si) => {
          const p = space(si);
          if (p <= 0) return null;
          const y0 = 330;
          const pages = 9;
          const lp = lines(si);
          return (
            <g key={si} opacity={p}>
              <text x={sp.x + 90} y={y0 - 24} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={18} letterSpacing="0.15em" fill={sp.col}>
                {sp.name.toUpperCase()}
              </text>
              {new Array(pages).fill(0).map((_, k) => {
                const y = y0 + k * 58;
                const used = rnd(`use${si}-${k}`) > 0.35;
                // target physical frame owned by this space
                let target = -1;
                for (let t = 0; t < 80; t++) {
                  const idx = Math.floor(rnd(`tg${si}-${k}-${t}`) * PHYS.cols * PHYS.rows);
                  if (rnd(`own${idx}`) < 0.18 * (si + 1) && rnd(`own${idx}`) >= 0.18 * si) {
                    target = idx;
                    break;
                  }
                }
                const tx = PHYS.x + (target % PHYS.cols) * PHYS.cell + (PHYS.cell - 8) / 2;
                const ty = PHYS.y + Math.floor(target / PHYS.cols) * PHYS.cell + (PHYS.cell - 8) / 2;
                return (
                  <g key={k}>
                    <rect x={sp.x} y={y} width={180} height={48} rx={8} fill={hexA(sp.col, used ? 0.2 : 0.05)} stroke={hexA(sp.col, used ? 0.7 : 0.25)} strokeWidth={1.4} />
                    <text x={sp.x + 14} y={y + 30} fontFamily={FONT.mono} fontSize={15} fill={hexA(C.ink, used ? 0.85 : 0.35)}>
                      0x{(k * 0x4000 + 0x100000000).toString(16)}
                    </text>
                    {used && target >= 0 && lp > 0 && sw > 0.5 && (
                      <path d={`M${sp.x + 180},${y + 24} C${sp.x + 420},${y + 24} ${tx - 200},${ty} ${tx},${ty}`} fill="none" stroke={sp.col} strokeWidth={1.4} opacity={0.5 * lp} strokeDasharray={`${lp * 1400} 1400`} />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", left: 180, top: 880, opacity: prog(f, b.future + 10, 16), fontFamily: FONT.mono, fontSize: 20, color: C.ink2 }}>same addresses, different memory: no program can see another’s</div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 2: cores + scheduler
const CORES = ["p0", "p1", "p2", "p3", "e0", "e1", "e2", "e3", "e4", "e5"];

const Cores: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const c = cam({ yaw: -24, pitch: 50, dist: 2600, scale: 0.36, target: [-120, 60, 0], cx: 500, cy: 600 });
  const lit: Record<string, number> = { p0: 1 };
  CORES.forEach((id, i) => {
    if (i > 0) lit[id] = prog(f, b.oneByOne - 10 + i * 5, 8);
  });
  const schedA = prog(f, b.sched - 6, 16);
  const lanes = ["P0", "P1", "P2", "P3", "E0", "E1"];
  const X0 = 1000;
  const X1 = 1800;
  const NOW = X1 - 60;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.pink}>all hands</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Chip3D cam={c} st={{ power: 0.6, lit, rise: Object.fromEntries(CORES.map((id) => [id, 0.4 * (lit[id] ?? 0)])), frame: f, sparkle: 0.3 }} />
      </svg>
      <div style={{ position: "absolute", left: 200, top: 860, fontFamily: FONT.mono, fontSize: 22, color: C.ink2, opacity: prog(f, b.oneByOne - 6, 14) }}>
        cores awake: <span style={{ color: C.ink, fontWeight: 700 }}>{1 + CORES.slice(1).filter((id) => (lit[id] ?? 0) > 0.5).length}</span> / {CORES.length}
      </div>
      {/* scheduler gantt */}
      <div style={{ position: "absolute", left: X0, top: 250, opacity: schedA, fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: hexA(C.amber, 0.95) }}>THE SCHEDULER · who runs where, and when</div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: schedA }}>
        <defs>
          <clipPath id="gantt">
            <rect x={X0} y={290} width={X1 - X0} height={lanes.length * 74} />
          </clipPath>
        </defs>
        {lanes.map((ln, i) => (
          <g key={ln}>
            <text x={X0 - 16} y={330 + i * 74} textAnchor="end" fontFamily={FONT.mono} fontSize={18} fill={i < 4 ? C.pink : C.teal}>
              {ln}
            </text>
            <line x1={X0} y1={350 + i * 74} x2={X1} y2={350 + i * 74} stroke={hexA(C.ink, 0.08)} />
          </g>
        ))}
        <g clipPath="url(#gantt)">
          {lanes.map((ln, i) =>
            new Array(16).fill(0).map((_, k) => {
              const t0 = b.sched - 4 + k * 13 + rnd(`gt${i}-${k}`, 0, 10);
              if (f < t0) return null;
              const dur = rnd(`gd${i}-${k}`, 8, 22);
              const right = NOW - Math.max(0, f - t0 - dur) * 6;
              const left = NOW - (f - t0) * 6;
              if (right < X0) return null;
              const col = [C.violet, C.cyan, C.amber, C.pink, C.green, C.blue][Math.floor(rnd(`gc${i}-${k}`) * 6)];
              return <rect key={`${i}-${k}`} x={left} y={302 + i * 74} width={Math.max(2, right - left - 4)} height={40} rx={8} fill={hexA(col, 0.45)} stroke={col} strokeWidth={1.2} />;
            }),
          )}
        </g>
        <line x1={NOW} y1={290} x2={NOW} y2={290 + lanes.length * 74} stroke={C.ink} strokeWidth={2} opacity={0.6} />
        <text x={NOW} y={290 + lanes.length * 74 + 28} textAnchor="middle" fontFamily={FONT.mono} fontSize={16} fill={C.ink2}>
          now
        </text>
      </svg>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 3: drivers
const HW = [
  { hw: "nvme", drv: "storage driver", col: C.orange },
  { hw: "display", drv: "display driver", col: C.cyan },
  { hw: "usb", drv: "USB driver", col: C.blue },
  { hw: "audio", drv: "audio driver", col: C.pink },
  { hw: "wifi", drv: "Wi-Fi driver", col: C.green },
  { hw: "keyboard", drv: "keyboard driver", col: C.amber },
];

const Drivers: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const walk = prog(f, b.walks, 40, EASE.inOut);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.cyan}>walk the tree · match the drivers</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <rect x={250} y={520} width={120} height={56} rx={12} fill="rgba(8,18,30,0.95)" stroke={hexA(C.cyan, 0.8)} strokeWidth={2} />
        <text x={310} y={556} textAnchor="middle" fontFamily={FONT.mono} fontSize={24} fill={C.ink}>
          /
        </text>
        {HW.map((h, i) => {
          const y = 250 + i * 110;
          const p = clamp(walk * HW.length - i);
          return (
            <g key={h.hw} opacity={0.25 + 0.75 * p}>
              <path d={`M370,548 C470,548 470,${y + 28} 560,${y + 28}`} fill="none" stroke={hexA(C.cyan, 0.5)} strokeWidth={2} />
              <rect x={560} y={y} width={190} height={56} rx={12} fill="rgba(8,18,30,0.95)" stroke={hexA(h.col, 0.8)} strokeWidth={2} />
              <text x={655} y={y + 36} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} fill={C.ink}>
                {h.hw}
              </text>
              {p > 0 && p < 1 && <Spark x={560} y={y + 28} color={C.cyanHi} r={7} />}
            </g>
          );
        })}
      </svg>
      {HW.map((h, i) => {
        const y = 250 + i * 110;
        const at = b.matches - 6 + i * 9;
        const p = spr(f, fps, at, { damping: 16, stiffness: 150 });
        const x = mix(1500, 790, clamp(p));
        const ok = prog(f, at + 12, 8, EASE.outBack);
        return (
          <div key={h.drv} style={{ position: "absolute", left: x, top: y, height: 56, display: "flex", alignItems: "center", gap: 12, opacity: clamp(p * 2) }}>
            <div style={{ height: 56, display: "flex", alignItems: "center", padding: "0 20px", borderRadius: 12, background: hexA(h.col, 0.16), border: `2px solid ${h.col}`, fontFamily: FONT.ui, fontWeight: 700, fontSize: 22, color: C.ink }}>{h.drv}</div>
            <svg width={40} height={40} style={{ opacity: clamp(ok) }}>
              <Check x={20} y={20} r={16} />
            </svg>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 1320, top: 520, width: 460, opacity: prog(f, b.driver - 4, 14) }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 44, color: C.ink, lineHeight: 1.1 }}>Every device gets its driver</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 18, color: hexA(C.cyan, 0.9), marginTop: 10 }}>matched by name, from the device tree</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 4: the trust cache
const N_TC = 16;
const TC_HASH = (i: number) =>
  new Array(16)
    .fill(0)
    .map((_, k) => Math.floor(rnd(`tc${i}-${k}`) * 16).toString(16))
    .join("");
const MATCH_ROW = 11;

const TrustCache: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const listA = prog(f, b.list - 10, 16);
  const scanP = prog(f, b.list + 10, 40, EASE.inOut);
  const found = prog(f, b.list + 50, 10, EASE.outBack);
  const badA = prog(f, b.trust + 6, 16);
  const badScan = prog(f, b.trust + 14, 34, EASE.inOut);
  const badX = prog(f, b.trust + 48, 10, EASE.outBack);
  const ibA = prog(f, b.iboot - 4, 16);
  const rowY = (i: number) => 260 + i * 40;
  const scanRow = Math.floor(scanP * MATCH_ROW);
  const badRow = Math.floor(badScan * (N_TC - 1));
  const good = TC_HASH(MATCH_ROW);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.gold}>only approved programs</Kicker>
      </div>
      {/* the list */}
      <div style={{ position: "absolute", left: 1080, top: 200, width: 640, opacity: listA }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: hexA(C.gold, 0.95) }}>TRUST CACHE · approved fingerprints</div>
        {ibA > 0.01 && (
          <div style={{ position: "absolute", left: 0, top: N_TC * 40 + 76, display: "flex", alignItems: "center", gap: 8, opacity: ibA }}>
            <svg width={32} height={32}>
              <Check x={16} y={16} r={14} />
            </svg>
            <span style={{ fontFamily: FONT.mono, fontSize: 20, color: OK }}>loaded & checked by iBoot, before the kernel ran</span>
          </div>
        )}
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: listA }}>
        <rect x={1070} y={232} width={660} height={N_TC * 40 + 20} rx={16} fill="rgba(16,14,8,0.85)" stroke={hexA(C.gold, 0.4)} strokeWidth={1.5} />
        {new Array(N_TC).fill(0).map((_, i) => {
          const hit = i === MATCH_ROW && found > 0.5 && f < b.trust + 6;
          const scanning = (f < b.trust + 6 && i === scanRow && scanP < 1) || (f >= b.trust + 14 && i === badRow && badScan < 1);
          return (
            <g key={i}>
              {(hit || scanning) && <rect x={1080} y={rowY(i) - 2} width={640} height={36} rx={8} fill={hit ? hexA(OK, 0.25) : hexA(C.gold, 0.15)} />}
              <text x={1100} y={rowY(i) + 24} fontFamily={FONT.mono} fontSize={22} fill={hit ? OK : hexA(C.ink, 0.75)} letterSpacing="0.06em">
                {TC_HASH(i)}…
              </text>
            </g>
          );
        })}
      </svg>
      {/* the program being checked */}
      <div style={{ position: "absolute", left: 160, top: 300, width: 760, opacity: prog(f, b.every - 6, 14) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "20px 24px", borderRadius: 18, background: "rgba(10,14,28,0.92)", border: `1.5px solid ${hexA(found > 0.5 ? OK : C.ink, 0.5)}` }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, background: `linear-gradient(160deg, ${C.blue}, ${hexA(C.blue, 0.4)})` }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 32, color: C.ink }}>a system program</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 20, color: found > 0.5 ? OK : C.gold, marginTop: 4 }}>{good}…</div>
          </div>
          {found > 0.01 && (
            <svg width={52} height={52} style={{ opacity: clamp(found) }}>
              <Check x={26} y={26} r={22} />
            </svg>
          )}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 20, color: OK, marginTop: 10, opacity: found }}>in the list → allowed to run</div>
        {/* a tampered one */}
        <div style={{ marginTop: 50, display: "flex", alignItems: "center", gap: 20, padding: "20px 24px", borderRadius: 18, background: "rgba(24,10,16,0.92)", border: `1.5px solid ${hexA(BAD, 0.6)}`, opacity: badA }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, background: `linear-gradient(160deg, ${BAD}, ${hexA(BAD, 0.4)})` }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 32, color: C.ink }}>a modified copy</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 20, color: BAD, marginTop: 4 }}>e41c09a7b3f2d865…</div>
          </div>
          {badX > 0.01 && (
            <svg width={52} height={52} style={{ opacity: clamp(badX) }}>
              <Cross x={26} y={26} r={22} />
            </svg>
          )}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 20, color: BAD, marginTop: 10, opacity: badX }}>not in the list → refused</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 5: the first program
const First: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const born = prog(f, b.very - 6, 10, EASE.out);
  const ring = prog(f, b.very - 6, 40, EASE.out);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Glow x={960} y={540} size={900} color={C.green} a={0.3 * born} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {ring > 0 && <circle cx={960} cy={540} r={20 + ring * 420} fill="none" stroke={C.green} strokeWidth={3} opacity={(1 - ring) * 0.8} />}
        {ring > 0 && <circle cx={960} cy={540} r={20 + ring * 260} fill="none" stroke={C.green} strokeWidth={2} opacity={(1 - ring) * 0.6} />}
        <circle cx={960} cy={540} r={30 * born} fill={C.green} style={{ filter: `drop-shadow(0 0 20px ${C.green})` }} />
        <circle cx={960} cy={540} r={12 * born} fill="#eafff5" />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 620, textAlign: "center", opacity: prog(f, b.very + 4, 14) }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 34, color: C.ink, fontWeight: 700 }}>PID 1</div>
        <div style={{ fontFamily: FONT.ui, fontSize: 22, color: hexA(C.green, 0.95), letterSpacing: "0.3em", marginTop: 6 }}>THE FIRST PROGRAM</div>
      </div>
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const a1 = 1 - prog(f, b.cores - 14, 8, EASE.in);
  const a2 = inOut(f, b.cores - 6, 10, b.walks - 14, 8);
  const a3 = inOut(f, b.walks - 6, 10, b.every - 14, 8);
  const a4 = inOut(f, b.every - 6, 10, b.first - 12, 8);
  const a5 = prog(f, b.first - 4, 10);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={10}>
      {a1 > 0.01 && <Vm b={b} a={a1} />}
      {a2 > 0.01 && <Cores b={b} a={a2} />}
      {a3 > 0.01 && <Drivers b={b} a={a3} />}
      {a4 > 0.01 && <TrustCache b={b} a={a4} />}
      {a5 > 0.01 && <First b={b} a={a5} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.vm - 2, name: "pop_hi", vol: 0.4 },
    { at: b.itself + 6, name: "data", vol: 0.25 },
    { at: b.map - 4, name: "data_long", vol: 0.25 },
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({ at: b.oneByOne - 10 + i * 5, name: "tick_hi", vol: 0.2, rate: 0.9 + i * 0.04 })),
    { at: b.sched - 6, name: "swell", vol: 0.25 },
    { at: b.walks, name: "scan", vol: 0.3 },
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ at: b.matches - 6 + i * 9 + 12, name: "blip", vol: 0.25, rate: 1 + i * 0.05 })),
    { at: b.list + 10, name: "scan", vol: 0.3 },
    { at: b.list + 50, name: "chime", vol: 0.3 },
    { at: b.trust + 14, name: "scan", vol: 0.25 },
    { at: b.trust + 48, name: "blip_lo", vol: 0.35 },
    { at: b.very - 6, name: "boom_soft", vol: 0.45 },
    { at: b.very - 4, name: "shimmer", vol: 0.35 },
  ];
};

export const Kernel: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.violet, hueB: C.pink, hueC: C.cyan, intensity: 0.55 },
};
