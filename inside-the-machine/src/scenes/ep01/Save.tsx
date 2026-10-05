import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { cam, box, prepareFaces, project, type Face, type V3 } from "../../lib/proj3d";
import { Glass, Glow, Kicker, NeonPath, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    cmd: c.v1.from + 14,
    wants: c.v2.from,
    notAllowed: wordAt(c.v2, "aren't allowed"),
    asks: wordAt(c.v2, "asks the kernel"),
    svc: wordAt(c.v3, "one special instruction"),
    reg: wordAt(c.v3, "goes in a register"),
    four: wordAt(c.v3, "four, for write"),
    leap: wordAt(c.v3, "leaps across the wall"),
    checks: c.v4.from,
    fs: wordAt(c.v4, "file system"),
    ctrl: wordAt(c.v4, "storage controller"),
    flash: wordAt(c.v4, "flash memory"),
    nand: c.v5.from,
    layers: wordAt(c.v5, "stacked in layers"),
    cell: c.v6.from,
    force: wordAt(c.v6, "Force electrons"),
    shifts: wordAt(c.v6, "voltage shifts"),
    eight: wordAt(c.v6, "eight levels"),
    three: wordAt(c.v6, "three bits"),
    years: c.v7.from,
    ret: c.v8.from,
    user: wordAt(c.v8, "user mode"),
    carries: wordAt(c.v8, "carries on"),
  };
};
type B = ReturnType<typeof beats>;

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const segA = inOut(f, 80, 14, b.checks - 6, 14);
  const segB = inOut(f, b.checks - 8, 14, b.nand - 4, 14);
  const segC = inOut(f, b.nand - 6, 16, b.cell - 4, 14);
  const segD = inOut(f, b.cell - 6, 16, b.ret - 4, 14);
  const segE = prog(f, b.ret - 6, 16);
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={14}>
      {segA > 0.01 && <Syscall a={segA} b={b} mode="call" />}
      {segB > 0.01 && <Pipeline a={segB} b={b} />}
      {segC > 0.01 && <Nand3D a={segC} b={b} />}
      {segD > 0.01 && <Cell a={segD} b={b} />}
      {segE > 0.01 && <Syscall a={segE} b={b} mode="return" />}
    </SceneShell>
  );
};

// ---------------------------------------------------------------- syscall diagram
const BOX = { x: 840, w: 420 };
const Y = { app: 150, wall: 430, kernel: 560, ssd: 860 };

const KeyCap: React.FC<{ label: string; down: number; x: number }> = ({ label, down, x }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: 430 + down * 12,
      width: 170,
      height: 170,
      borderRadius: 30,
      background: "linear-gradient(160deg, #2a2f40, #161a26)",
      boxShadow: `0 ${18 - down * 12}px 0 #0b0e16, 0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)${down > 0.3 ? `, 0 0 40px ${hexA(C.amber, 0.5 * down)}` : ""}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT.ui,
      fontSize: label.length > 1 ? 40 : 84,
      color: C.ink,
    }}
  >
    {label}
  </div>
);

const Syscall: React.FC<{ a: number; b: B; mode: "call" | "return" }> = ({ a, b, mode }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const call = mode === "call";
  // keys (call mode only)
  const k1 = call ? clamp(spr(f, fps, b.cmd - 6, { damping: 14, stiffness: 400 }) - spr(f, fps, b.cmd + 22, { damping: 14, stiffness: 300 })) : 0;
  const k2 = call ? clamp(spr(f, fps, b.cmd + 2, { damping: 14, stiffness: 400 }) - spr(f, fps, b.cmd + 22, { damping: 14, stiffness: 300 })) : 0;
  const keysA = call ? inOut(f, 84, 10, b.wants - 4, 14) : 0;
  const diag = call ? prog(f, b.wants - 4, 20) : 1;
  // blocked attempt
  const tryP = call ? prog(f, b.wants + 10, b.notAllowed - b.wants - 6, EASE.in) : 0;
  const blocked = call ? inOut(f, b.notAllowed - 2, 4, b.asks, 16) : 0;
  const card = call ? prog(f, b.asks - 2, 16) : 0;
  const codeA = call ? prog(f, b.svc - 8, 18) : 0;
  const tableA = call ? prog(f, b.four - 10, 16) : 0;
  const leap = call ? prog(f, b.leap - 2, 26, EASE.inOut) : 0;
  const kernel = call ? f >= b.leap + 10 : f < b.user;
  // return path
  const back = call ? 0 : prog(f, b.ret + 6, b.user - b.ret, EASE.inOut);
  const saved = call ? 0 : prog(f, b.carries - 6, 16);
  const appCol = C.pink;
  const pkt = (() => {
    if (call) {
      if (tryP > 0 && f < b.notAllowed + 6) return { x: BOX.x + BOX.w + 40, y: mix(Y.app + 110, Y.wall - 16, tryP), col: blocked > 0.1 ? C.rose : appCol };
      if (leap > 0 && leap < 1) return { x: mix(BOX.x + BOX.w / 2, BOX.x + BOX.w / 2, leap), y: mix(Y.app + 110, Y.kernel, leap), col: leap > 0.5 ? C.cyan : appCol };
      return null;
    }
    if (back > 0 && back < 1) return { x: BOX.x + BOX.w / 2, y: mix(Y.kernel, Y.app + 110, back), col: back > 0.5 ? appCol : C.cyan };
    return null;
  })();
  const code = [
    { t: "mov  x0, fd", c: "; which file" },
    { t: "adr  x1, buffer", c: "; what to write" },
    { t: "mov  x2, #2048", c: "; how many bytes" },
    { t: "mov  x16, #4", c: "; syscall 4 = write" },
    { t: "svc  #0x80", c: "; → into the kernel" },
  ];
  return (
    <AbsoluteFill style={{ opacity: a }}>
      {keysA > 0.01 && (
        <AbsoluteFill style={{ opacity: keysA }}>
          <KeyCap label="⌘" down={k1} x={760} />
          <KeyCap label="S" down={k2} x={990} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ opacity: diag }}>
        {/* app */}
        <div style={{ position: "absolute", left: BOX.x, top: Y.app, width: BOX.w }}>
          <Glass color={appCol} style={{ height: 110, display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 28 }} glow={0.6}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 36, color: C.ink }}>{saved > 0.5 ? "Notes.app — Saved ✓" : "Notes.app"}</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 18, color: appCol }}>user mode · EL0</div>
          </Glass>
        </div>
        {/* wall */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <line x1={120} y1={Y.wall} x2={1800} y2={Y.wall} stroke={C.rose} strokeWidth={10} strokeOpacity={0.15 + blocked * 0.3} />
          <line x1={120} y1={Y.wall} x2={1800} y2={Y.wall} stroke={C.rose} strokeWidth={2.5} strokeDasharray="14 10" />
          <text x={1800} y={Y.wall - 16} textAnchor="end" fontFamily={FONT.mono} fontSize={20} fill={C.rose}>
            user ⁄ kernel boundary
          </text>
          {(leap > 0 || back > 0) && (
            <ellipse cx={BOX.x + BOX.w / 2} cy={Y.wall} rx={90 * (call ? inOut(f, b.leap - 6, 8, b.leap + 40, 20) : inOut(f, b.ret, 8, b.user + 20, 20))} ry={18} fill={hexA(C.cyan, 0.25)} stroke={C.cyan} strokeWidth={3} />
          )}
          {blocked > 0.01 && (
            <text x={BOX.x + BOX.w + 40} y={Y.wall + 60} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={30} fill={C.rose} opacity={blocked}>
              ✕ not allowed
            </text>
          )}
          {pkt && <Spark x={pkt.x} y={pkt.y} color={pkt.col} r={12} />}
          {/* direct-path ghost arrow */}
          {call && tryP > 0 && f < b.asks + 10 && <line x1={BOX.x + BOX.w + 40} y1={Y.app + 110} x2={BOX.x + BOX.w + 40} y2={Y.ssd} stroke={hexA(C.ink, 0.2)} strokeWidth={2} strokeDasharray="4 8" />}
        </svg>
        {/* kernel */}
        <div style={{ position: "absolute", left: BOX.x, top: Y.kernel, width: BOX.w }}>
          <Glass color={C.cyan} style={{ height: 110, display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 28 }} glow={kernel ? 1.2 : 0.3}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 36, color: C.ink }}>XNU kernel</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 18, color: C.cyan }}>kernel mode · EL1</div>
          </Glass>
        </div>
        {/* ssd */}
        <div style={{ position: "absolute", left: BOX.x, top: Y.ssd, width: BOX.w }}>
          <Glass color={C.amber} style={{ height: 100, display: "flex", alignItems: "center", paddingLeft: 28, gap: 16 }} glow={0.4}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 36, color: C.ink }}>Storage</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 18, color: C.amber }}>SSD</div>
          </Glass>
        </div>
        {/* CPU mode badge */}
        <div style={{ position: "absolute", left: 1330, top: Y.app + 30, fontFamily: FONT.mono, fontWeight: 700, fontSize: 24, padding: "8px 18px", borderRadius: 999, color: "#05070d", background: kernel ? C.cyan : appCol, boxShadow: `0 0 30px ${kernel ? C.cyan : appCol}` }}>
          CPU: {kernel ? "EL1 · KERNEL" : "EL0 · USER"}
        </div>
        {/* write() card */}
        {card > 0.01 && (
          <div style={{ position: "absolute", left: 1330, top: Y.app + 100, opacity: card * (1 - codeA * 0.0), transform: `translateY(${(1 - card) * 14}px)` }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 30, color: C.ink, background: "rgba(5,8,18,0.85)", border: `1px solid ${hexA(appCol, 0.6)}`, padding: "12px 20px", borderRadius: 14 }}>
              write(fd, buffer, 2048)
            </div>
          </div>
        )}
        {/* assembly */}
        {codeA > 0.01 && (
          <div style={{ position: "absolute", left: 110, top: 200, opacity: codeA, transform: `translateX(${(1 - codeA) * -30}px)` }}>
            <Kicker color={C.cyan}>The system call · ARM64</Kicker>
            <Glass color={C.cyan} style={{ marginTop: 16, width: 690, padding: "22px 26px" }} glow={0.5}>
              {code.map((l, i) => {
                const hl = (i === 3 && f >= b.four - 6) || (i === 4 && f >= b.leap - 4);
                const flash = i === 4 ? inOut(f, b.leap - 4, 3, b.leap + 12, 14) : 0;
                return (
                  <div key={i} style={{ display: "flex", gap: 18, fontFamily: FONT.mono, fontSize: 24, whiteSpace: "nowrap", padding: "7px 10px", borderRadius: 8, background: hl ? hexA(i === 4 ? C.cyan : C.amber, 0.16 + flash * 0.4) : undefined, color: hl ? C.ink : C.ink2 }}>
                    <span style={{ width: 236 }}>{l.t}</span>
                    <span style={{ color: C.ink3, fontSize: 20 }}>{l.c}</span>
                  </div>
                );
              })}
            </Glass>
          </div>
        )}
        {/* syscall table */}
        {tableA > 0.01 && (
          <div style={{ position: "absolute", left: 1330, top: 590, opacity: tableA }}>
            <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 17, letterSpacing: "0.25em", color: C.cyan }}>KERNEL SYSCALL TABLE</div>
            {[
              [1, "exit"],
              [2, "fork"],
              [3, "read"],
              [4, "write"],
              [5, "open"],
              [6, "close"],
            ].map(([n, name]) => (
              <div key={n} style={{ display: "flex", gap: 30, marginTop: 6, width: 300, padding: "4px 14px", borderRadius: 8, fontFamily: FONT.mono, fontSize: 22, color: n === 4 ? "#04131a" : C.ink2, background: n === 4 ? hexA(C.amber, 0.9 * prog(f, b.four - 4, 10)) : "rgba(20,26,46,0.7)" }}>
                <span style={{ width: 30 }}>{n}</span>
                <span>{name}</span>
              </div>
            ))}
          </div>
        )}
        {!call && (
          <div style={{ position: "absolute", left: 110, top: 230, opacity: prog(f, b.ret, 16) }}>
            <Kicker color={C.cyan}>Return</Kicker>
            <div style={{ fontFamily: FONT.mono, fontSize: 30, color: C.ink, marginTop: 14 }}>eret</div>
            <div style={{ fontFamily: FONT.ui, fontSize: 24, color: C.ink2, marginTop: 6, width: 560 }}>restores the saved state and drops back into user mode</div>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- kernel → APFS → controller → flash
const Pipeline: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const nodes = [
    { at: b.checks, title: "Kernel", sub: "checks permissions ✓", col: C.cyan },
    { at: b.fs, title: "APFS", sub: "file system · picks blocks", col: C.violet },
    { at: b.ctrl, title: "Controller", sub: "built into the chip", col: C.green },
    { at: b.flash, title: "Flash", sub: "NAND memory chips", col: C.amber },
  ];
  const x0 = 200;
  const gap = 430;
  const y = 560;
  const flowP = prog(f, b.checks + 6, b.flash - b.checks + 10, EASE.inOut);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 110, top: 160 }}>
        <Kicker color={C.amber}>Into the kernel, out to flash</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <NeonPath d={`M${x0 + 160},${y} L${x0 + gap * 3 + 160},${y}`} color={C.amber} width={2.5} progress={flowP} length={gap * 3} />
        {flowP > 0 && flowP < 1 && <Spark x={mix(x0 + 160, x0 + gap * 3 + 160, flowP)} y={y} color={C.amber} r={12} />}
      </svg>
      {nodes.map((n, i) => {
        const p = prog(f, n.at - 6, 16);
        return (
          <div key={n.title} style={{ position: "absolute", left: x0 + i * gap, top: y - 100, opacity: 0.3 + p * 0.7, transform: `translateY(${(1 - p) * 16}px)` }}>
            <Glass color={n.col} style={{ width: 320, height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }} glow={p}>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 46, color: C.ink }}>{n.title}</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 19, color: n.col, marginTop: 6 }}>{n.sub}</div>
            </Glass>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: x0 + gap - 40, top: y + 140, width: 400, opacity: prog(f, b.fs + 10, 16), fontFamily: FONT.ui, fontSize: 22, color: C.ink2, textAlign: "center" }}>
        copy-on-write: new data goes to fresh blocks, then the pointers flip
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 3D NAND
const Nand3D: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const build = prog(f, b.nand - 4, 50, EASE.out);
  const c = cam({
    yaw: keyframes(f, [[b.nand, -48], [b.cell, -30]]),
    pitch: keyframes(f, [[b.nand, 30], [b.cell, 24]]),
    dist: 5200,
    scale: keyframes(f, [[b.nand, 0.62], [b.cell, 0.7]]),
    target: [0, 0, 200],
    cy: 600,
  });
  const NL = 14;
  const faces: Face[] = [];
  for (let i = 0; i < NL; i++) {
    const vis = clamp(build * NL - i);
    if (vis <= 0) continue;
    const stair = (NL - 1 - i) * 34; // staircase on the left edge
    const w = 1500 - stair;
    faces.push(
      ...box([stair / 2, 0, i * 30 + (1 - vis) * 60], [w, 900, 16], i % 2 ? "#5b6890" : "#4a5578", {
        group: i,
        layer: i,
        alpha: 0.9 * vis,
        top: i % 2 ? "#6c7aa6" : "#58648c",
        stroke: hexA(C.cyan, 0.25 * vis),
        strokeWidth: 1,
      }),
    );
  }
  const drawn = prepareFaces(c, faces, { dir: [-0.4, -0.6, 0.9], ambient: 0.5, diffuse: 0.6 });
  const pill: React.ReactNode[] = [];
  const pillarsA = prog(f, b.layers - 10, 24);
  for (let gx = 0; gx < 9; gx++)
    for (let gy = 0; gy < 5; gy++) {
      const x = -520 + gx * 140;
      const y = -320 + gy * 160;
      const top = project(c, [x, y, NL * 30 + 30]);
      const bot = project(c, [x, y, 0]);
      const k = gx * 5 + gy;
      pill.push(
        <g key={k} opacity={pillarsA}>
          <line x1={bot.x} y1={bot.y} x2={top.x} y2={top.y} stroke={C.amber} strokeWidth={9} strokeOpacity={0.18} />
          <line x1={bot.x} y1={bot.y} x2={top.x} y2={top.y} stroke={C.amber} strokeWidth={2.4} />
          <ellipse cx={top.x} cy={top.y} rx={12} ry={6} fill={C.amber} opacity={0.9} />
          {rnd(`np${k}`) < 0.5 && <Spark x={mix(bot.x, top.x, ((f * 0.02 + rnd(`npp${k}`)) % 1))} y={mix(bot.y, top.y, ((f * 0.02 + rnd(`npp${k}`)) % 1))} color={C.amber} r={4} />}
        </g>,
      );
    }
  const lab = { x: 1460, y: 330 };
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Glow x={960} y={600} size={1500} color={C.amber} a={0.1} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {drawn.map((fc, i) => (
          <path key={i} d={fc.d} fill={fc.fill} stroke={fc.stroke} strokeWidth={fc.strokeWidth} strokeLinejoin="round" />
        ))}
        {pill}
      </svg>
      <div style={{ position: "absolute", left: 110, top: 150 }}>
        <Kicker color={C.amber}>3D NAND flash</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 60, color: C.ink, marginTop: 10, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
          Hundreds of billions
          <br />
          of cells
        </div>
      </div>
      <div style={{ position: "absolute", left: lab.x, top: lab.y - 40, opacity: prog(f, b.layers - 4, 16) }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 36, color: C.ink }}>200+ layers</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 19, color: C.amber }}>each pillar × layer = 1 cell</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the cell
const Cell: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const X = 120;
  const W = 600;
  const L = [
    { name: "control gate", h: 110, col: "#7d88aa" },
    { name: "blocking oxide", h: 46, col: "#2b5d7a" },
    { name: "charge trap", h: 64, col: "#5a3f8f" },
    { name: "tunnel oxide", h: 30, col: "#2b5d7a" },
    { name: "channel", h: 110, col: "#164b48" },
  ];
  let yy = 300;
  const rows = L.map((l) => {
    const r = { ...l, y: yy };
    yy += l.h;
    return r;
  });
  const trapY = rows[2].y;
  const chanY = rows[4].y;
  const program = prog(f, b.force - 4, 80, EASE.inOut);
  const pulse = inOut(f, b.force - 4, 8, b.force + 90, 20);
  const levels = 8;
  const level = Math.round(mix(0, 5, program));
  const trapped = Math.round(mix(0, 34, program));
  const off = prog(f, b.years - 4, 16);
  const chartA = prog(f, b.shifts - 10, 18);
  const levelsA = prog(f, b.eight - 8, 18);
  const bitsA = prog(f, b.three - 6, 14);
  const gx0 = 1060;
  const gw = 760;
  const gy = 680;
  const bell = (i: number) => {
    const cx = gx0 + 40 + (i + 0.5) * ((gw - 80) / levels);
    const sw = (gw - 80) / levels / 2.6;
    let d = "";
    for (let k = -30; k <= 30; k++) {
      const x = cx + (k / 30) * sw * 2.6;
      const yv = gy - 190 * Math.exp(-((x - cx) ** 2) / (2 * sw * sw));
      d += `${k === -30 ? "M" : "L"}${x.toFixed(1)},${yv.toFixed(1)}`;
    }
    return { d, cx };
  };
  return (
    <AbsoluteFill style={{ opacity: a, filter: off > 0.02 ? `saturate(${1 - off * 0.6})` : undefined }}>
      <div style={{ position: "absolute", left: X, top: 150 }}>
        <Kicker color={C.amber}>One flash cell · cross-section</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {rows.map((r) => (
          <g key={r.name}>
            <rect x={X} y={r.y} width={W} height={r.h} fill={r.col} opacity={0.85} />
            <text x={X + W + 20} y={r.y + r.h / 2 + 8} fontFamily={FONT.mono} fontSize={21} fill={C.ink2}>
              {r.name}
            </text>
          </g>
        ))}
        {pulse > 0.01 && (
          <>
            <rect x={X} y={rows[0].y} width={W} height={rows[0].h} fill={C.amber} opacity={pulse * 0.35} />
            <text x={X + 24} y={rows[0].y + 66} fontFamily={FONT.mono} fontWeight={700} fontSize={30} fill={C.ink} opacity={pulse}>
              + high-voltage pulse
            </text>
          </>
        )}
        {/* channel electrons */}
        {new Array(40).fill(0).map((_, i) => {
          const x = X + ((rnd(`cx${i}`) * W + f * 3 * rnd(`cv${i}`, 0.5, 1.5)) % W);
          const y = chanY + 20 + rnd(`cy${i}`) * 70;
          return <Spark key={i} x={x} y={y} color={C.amber} r={5} a={0.85} />;
        })}
        {/* trapped electrons */}
        {new Array(trapped).fill(0).map((_, i) => {
          const tx = X + 40 + ((i * 73) % (W - 80));
          const ty = trapY + 16 + ((i * 29) % 36);
          const born = b.force + (i / 34) * 80;
          const p = prog(f, born - 6, 10, EASE.out);
          const y = mix(chanY + 30, ty, p);
          return <Spark key={`t${i}`} x={tx} y={y} color={C.amber} r={6} a={1} />;
        })}
        {/* tunneling hints */}
        {pulse > 0.2 &&
          new Array(5).fill(0).map((_, i) => {
            const x = X + 120 + i * 130;
            return <path key={i} d={`M${x},${chanY + 4} q14,-24 0,-48 q-14,-24 0,-48`} fill="none" stroke={C.amber} strokeWidth={2} strokeDasharray="4 6" opacity={pulse * 0.7} />;
          })}
        {/* Vt distribution chart */}
        <g opacity={chartA}>
          <line x1={gx0} y1={gy} x2={gx0 + gw} y2={gy} stroke={hexA(C.ink, 0.4)} strokeWidth={2} />
          <text x={gx0 + gw} y={gy + 70} textAnchor="end" fontFamily={FONT.mono} fontSize={19} fill={C.ink3}>
            threshold voltage →
          </text>
          {new Array(levels).fill(0).map((_, i) => {
            const { d, cx } = bell(i);
            const show = i === 0 ? 1 : levelsA;
            const cur = i === level;
            return (
              <g key={i} opacity={show}>
                <path d={d} fill={hexA(cur ? C.amber : C.violet, cur ? 0.35 : 0.12)} stroke={cur ? C.amber : hexA(C.violet, 0.7)} strokeWidth={cur ? 3 : 1.6} />
                <text x={cx} y={gy + 34} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} fill={cur ? C.amber : C.ink2} opacity={bitsA}>
                  {i.toString(2).padStart(3, "0")}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div style={{ position: "absolute", left: gx0, top: 250, opacity: chartA }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 46, color: C.ink }}>
          {levelsA > 0.5 ? (
            <>
              8 levels = <span style={{ color: C.amber }}>3 bits</span>
            </>
          ) : (
            "More electrons → higher voltage"
          )}
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 20, color: C.ink3, marginTop: 8 }}>each level = a different amount of trapped charge</div>
      </div>
      {off > 0.01 && (
        <div style={{ position: "absolute", left: X, top: 880, opacity: off, display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 40, color: C.ink3 }}>⏻ power off</span>
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: C.amber }}>— the electrons stay for years</span>
        </div>
      )}
    </AbsoluteFill>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.cmd - 6, name: "key_click", vol: 0.8 },
    { at: b.cmd + 2, name: "key_click", vol: 0.8 },
    { at: b.wants - 4, name: "whoosh_soft", vol: 0.35 },
    { at: b.notAllowed - 2, name: "thud", vol: 0.6 },
    { at: b.notAllowed, name: "glitch", vol: 0.25 },
    { at: b.asks - 2, name: "pop", vol: 0.3 },
    { at: b.svc - 8, name: "sweep_up", vol: 0.25 },
    { at: b.four - 6, name: "blip_hi", vol: 0.35 },
    { at: b.leap - 4, name: "portal", vol: 0.45 },
    { at: b.leap + 10, name: "pop_hi", vol: 0.3 },
    { at: b.checks - 8, name: "whoosh", vol: 0.35 },
    { at: b.checks, name: "blip", vol: 0.25 },
    { at: b.fs - 4, name: "blip", vol: 0.25 },
    { at: b.ctrl - 4, name: "blip_hi", vol: 0.25 },
    { at: b.flash - 4, name: "data", vol: 0.3 },
    { at: b.nand - 6, name: "whoosh_big", vol: 0.4 },
    { at: b.nand, name: "data_long", vol: 0.25 },
    { at: b.layers - 8, name: "shimmer", vol: 0.25 },
    { at: b.cell - 6, name: "whoosh", vol: 0.35 },
    { at: b.force - 4, name: "power_up", vol: 0.35 },
    { at: b.force, name: "electrons", vol: 0.5 },
    { at: b.force + 4, name: "zap", vol: 0.3 },
    { at: b.eight - 8, name: "pop", vol: 0.3 },
    { at: b.three - 6, name: "chime_lo", vol: 0.25 },
    { at: b.years - 4, name: "power_down", vol: 0.35 },
    { at: b.ret - 6, name: "whoosh_soft", vol: 0.35 },
    { at: b.ret + 6, name: "portal", vol: 0.3 },
    { at: b.carries - 6, name: "chime", vol: 0.3 },
  ];
};

export const Save: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.amber, hueB: C.violet, hueC: C.cyan, intensity: 0.7 },
};
