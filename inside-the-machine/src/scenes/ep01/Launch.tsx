import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glass, Glow, Kicker, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    open: wordAt(c.l1, "let's open an app"),
    click: wordAt(c.l1, "open an app") + 12,
    process: wordAt(c.l2, "creates a new process"),
    private: wordAt(c.l2, "private world"),
    vas: c.l3.from,
    vast: wordAt(c.l3, "vast map"),
    phys: c.l4.from,
    mmu: wordAt(c.l4, "MMU"),
    page: wordAt(c.l4, "page by page"),
    kb16: wordAt(c.l4, "sixteen kilobytes"),
    notIn: c.l5.from,
    fault: wordAt(c.l5, "page fault"),
    load: wordAt(c.l5, "loads that page"),
    carries: wordAt(c.l5, "carries on"),
    sched: c.l6.from,
    urgent: wordAt(c.l6, "Urgent work"),
    bg: wordAt(c.l6, "Background chores"),
    switches: c.l7.from,
    hundreds: wordAt(c.l7, "hundreds of programs"),
  };
};

type B = ReturnType<typeof beats>;

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const segA = inOut(f, 80, 14, b.vas - 8, 14);
  const segB = inOut(f, b.vas - 10, 16, b.sched - 8, 14);
  const segC = prog(f, b.sched - 10, 16);
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={14}>
      {segA > 0.01 && <DockAndProcess a={segA} b={b} />}
      {segB > 0.01 && <VirtualMemory a={segB} b={b} />}
      {segC > 0.01 && <Scheduler a={segC} b={b} />}
    </SceneShell>
  );
};

// ---------------------------------------------------------------- A. dock click → process
const ICONS = [
  { col: [C.blue, C.cyan], glyph: "◎" },
  { col: [C.pink, C.rose], glyph: "♪" },
  { col: [C.amber, C.orange], glyph: "✎" },
  { col: [C.violet, C.indigo], glyph: "✦" },
  { col: [C.green, C.teal], glyph: "▶" },
  { col: [C.rose, C.amber], glyph: "◐" },
  { col: [C.indigo, C.blue], glyph: "⌘" },
];
const TARGET = 3;

const DockAndProcess: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dockIn = spr(f, fps, 86, { damping: 20, stiffness: 90 });
  const cur = prog(f, b.open - 10, 26, EASE.inOut);
  const clicked = f >= b.click;
  const bounceT = f - b.click;
  const bounce = clicked && bounceT < 50 ? Math.abs(Math.sin((bounceT / 25) * Math.PI)) * 46 * (1 - bounceT / 60) : 0;
  const deskOut = prog(f, b.process - 20, 24, EASE.inOut);
  const proc = spr(f, fps, b.process - 4, { damping: 18, stiffness: 90 });
  const priv = prog(f, b.private - 6, 24);
  const dockX = 960 - (ICONS.length * 120) / 2;
  const tx = dockX + TARGET * 120 + 50;
  const ty = 900;
  const cx = mix(1500, tx + 12, cur);
  const cy = mix(560, ty + 20, cur);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <AbsoluteFill style={{ opacity: 1 - deskOut * 0.85, transform: `scale(${1 - deskOut * 0.08})`, filter: deskOut > 0.05 ? `blur(${deskOut * 6}px)` : undefined }}>
        <div style={{ position: "absolute", left: 160, top: 120, right: 160, bottom: 60, borderRadius: 30, background: "linear-gradient(135deg, #1a1446, #3b1d6e 45%, #0f4c6e 80%, #081a33)", opacity: 0.55 }} />
        <div style={{ position: "absolute", left: dockX - 20, top: 860 + (1 - dockIn) * 120, width: ICONS.length * 120 + 40, height: 130, borderRadius: 34, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.2)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} />
        {ICONS.map((ic, i) => {
          const hov = i === TARGET ? prog(f, b.open + 8, 10) : 0;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: dockX + i * 120 + 10,
                top: 873 + (1 - dockIn) * 120 - (i === TARGET ? bounce : 0) - hov * 12,
                width: 100,
                height: 100,
                borderRadius: 26,
                background: `linear-gradient(145deg, ${ic.col[0]}, ${ic.col[1]})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 50,
                color: "rgba(255,255,255,0.92)",
                boxShadow: `0 10px 24px rgba(0,0,0,0.45)${i === TARGET && clicked ? `, 0 0 40px ${hexA(ic.col[0], 0.8)}` : ""}`,
                transform: `scale(${1 + hov * 0.18})`,
              }}
            >
              {ic.glyph}
            </div>
          );
        })}
        {clicked && <div style={{ position: "absolute", left: tx + 2, top: 990, width: 8, height: 8, borderRadius: 4, background: C.ink, opacity: 0.8 }} />}
        {/* cursor */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <path d={`M${cx},${cy} l0,40 l11,-10 l8,18 l7,-3 l-8,-18 l15,0 Z`} fill="#fff" stroke="#000" strokeWidth={1.5} transform={`scale(${clicked && bounceT < 6 ? 0.92 : 1})`} style={{ transformOrigin: `${cx}px ${cy}px` }} />
        </svg>
        <div style={{ position: "absolute", left: 110, top: 160, opacity: inOut(f, 90, 16, b.process - 20, 14) }}>
          <Kicker color={C.violet}>Scenario 2</Kicker>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 64, color: C.ink, marginTop: 12, letterSpacing: "-0.03em" }}>Open an app</div>
        </div>
      </AbsoluteFill>
      {/* the new process */}
      {proc > 0.01 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <Glow x={960} y={540} size={1000 * proc} color={C.violet} a={0.25 + priv * 0.2} />
          <div style={{ position: "absolute", width: 860 * (1 + priv * 0.12), height: 860 * (1 + priv * 0.12), borderRadius: "50%", border: `2px solid ${hexA(C.violet, 0.5 * priv)}`, boxShadow: `0 0 80px ${hexA(C.violet, 0.4 * priv)}, inset 0 0 80px ${hexA(C.violet, 0.25 * priv)}` }} />
          <div style={{ transform: `scale(${mix(0.6, 1, proc)})`, opacity: clamp(proc * 1.3) }}>
            <Glass color={C.violet} style={{ width: 700, padding: "30px 36px" }} glow={1}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 18, letterSpacing: "0.3em", color: C.violet }}>NEW PROCESS</div>
                <div style={{ fontFamily: FONT.mono, fontSize: 20, color: C.ink3 }}>PID 4127</div>
              </div>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 56, color: C.ink, marginTop: 6 }}>Studio.app</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 22 }}>
                {[
                  ["Address space", "its own memory map"],
                  ["Threads", "main + workers"],
                  ["Open files", "descriptors"],
                  ["Mach ports", "message mailboxes"],
                ].map(([k, v], i) => {
                  const p = prog(f, b.process + 8 + i * 6, 14);
                  return (
                    <div key={k} style={{ padding: "14px 18px", borderRadius: 14, background: hexA(C.violet, 0.1), border: `1px solid ${hexA(C.violet, 0.4)}`, opacity: p, transform: `translateY(${(1 - p) * 14}px)` }}>
                      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 26, color: C.ink }}>{k}</div>
                      <div style={{ fontFamily: FONT.mono, fontSize: 17, color: C.ink3, marginTop: 2 }}>{v}</div>
                    </div>
                  );
                })}
              </div>
            </Glass>
          </div>
          <div style={{ position: "absolute", top: 120, fontFamily: FONT.mono, fontSize: 22, color: C.cyan, opacity: proc }}>XNU · posix_spawn()</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- B. virtual memory
const VA = { x: 150, y: 170, w: 300, h: 800 };
const RAM = { x: 1160, y: 230, cols: 10, rows: 9, cell: 62 };
const MMU = { x: 690, y: 470, w: 280, h: 160 };
const SSD = { x: 1260, y: 880, w: 420, h: 110 };

const owner = (i: number) => {
  const r = rnd(`own${i}`);
  if (r < 0.18) return C.pink;
  if (r < 0.32) return C.amber;
  if (r < 0.44) return C.green;
  if (r < 0.56) return C.blue;
  if (r < 0.66) return C.indigo;
  return null; // free
};

const MAPPED: { va: number; frame: number }[] = [
  { va: 1, frame: 13 },
  { va: 2, frame: 47 },
  { va: 5, frame: 22 },
  { va: 8, frame: 71 },
  { va: 9, frame: 38 },
  { va: 13, frame: 64 },
];
const FAULT_VA = 3;
const FAULT_FRAME = 55;
const VA_PAGES = 16;

const VirtualMemory: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const vasIn = prog(f, b.vas - 6, 30, EASE.out);
  const ramIn = prog(f, b.phys - 4, 30);
  const mmuIn = prog(f, b.mmu - 6, 18);
  const maps = prog(f, b.page - 6, 40, EASE.inOut);
  const kbA = prog(f, b.kb16 - 6, 16);
  const ghost = prog(f, b.notIn - 4, 20);
  const pcP = prog(f, b.notIn + 10, b.fault - b.notIn - 10, EASE.inOut);
  const fault = inOut(f, b.fault - 2, 4, b.load + 10, 20);
  const loadP = prog(f, b.load, 36, EASE.inOut);
  const mapped = f >= b.load + 36;
  const ok = prog(f, b.carries - 4, 14);
  const pageY = (i: number) => VA.y + VA.h - 60 - i * 44;
  const frameXY = (i: number) => ({ x: RAM.x + (i % RAM.cols) * RAM.cell + RAM.cell / 2, y: RAM.y + Math.floor(i / RAM.cols) * RAM.cell + RAM.cell / 2 });
  const curve = (x1: number, y1: number, x2: number, y2: number) => `M${x1},${y1} C${x1 + 240},${y1} ${x2 - 300},${y2} ${x2},${y2}`;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      {/* virtual address space column */}
      <div style={{ position: "absolute", left: VA.x, top: VA.y - 70, opacity: vasIn }}>
        <Kicker color={C.violet}>Virtual address space</Kicker>
      </div>
      <div style={{ position: "absolute", left: VA.x, top: VA.y, width: VA.w, height: VA.h * vasIn, borderRadius: 20, overflow: "hidden", background: "rgba(14,18,34,0.85)", border: `1px solid ${hexA(C.violet, 0.4)}` }}>
        {[
          { y: 0, h: 70, label: "stack", col: C.pink },
          { y: 120, h: 90, label: "shared libraries", col: C.blue },
          { y: 330, h: 50, label: "heap", col: C.amber },
          { y: 640, h: 40, label: "__DATA", col: C.green },
          { y: 690, h: 90, label: "__TEXT · code", col: C.violet },
        ].map((r) => (
          <div key={r.label} style={{ position: "absolute", left: 0, right: 0, top: r.y, height: r.h, background: hexA(r.col, 0.18), borderTop: `1px solid ${hexA(r.col, 0.5)}`, borderBottom: `1px solid ${hexA(r.col, 0.5)}`, display: "flex", alignItems: "center", paddingLeft: 16, fontFamily: FONT.mono, fontSize: 18, color: C.ink2 }}>
            {r.label}
          </div>
        ))}
        <div style={{ position: "absolute", left: 0, right: 0, top: 400, textAlign: "center", fontFamily: FONT.ui, fontSize: 20, color: C.ink3, opacity: prog(f, b.vast, 20) }}>
          · · · vast, mostly empty · · ·
        </div>
      </div>
      <div style={{ position: "absolute", left: VA.x + VA.w + 14, top: VA.y - 4, fontFamily: FONT.mono, fontSize: 15, color: C.ink3, opacity: vasIn }}>0x7FFF…</div>
      <div style={{ position: "absolute", left: VA.x + VA.w + 14, top: VA.y + VA.h - 18, fontFamily: FONT.mono, fontSize: 15, color: C.ink3, opacity: vasIn }}>0x0000…</div>

      {/* physical RAM */}
      <div style={{ position: "absolute", left: RAM.x, top: RAM.y - 70, opacity: ramIn }}>
        <Kicker color={C.green}>Physical memory · shared by everyone</Kicker>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {new Array(RAM.cols * RAM.rows).fill(0).map((_, i) => {
          const { x, y } = frameXY(i);
          const own = owner(i);
          const mine = MAPPED.some((m) => m.frame === i) || (i === FAULT_FRAME && mapped);
          const p = prog(f, b.phys + (i % 13) * 1.2, 12) * ramIn;
          return (
            <rect
              key={i}
              x={x - RAM.cell / 2 + 3}
              y={y - RAM.cell / 2 + 3}
              width={RAM.cell - 6}
              height={RAM.cell - 6}
              rx={8}
              opacity={p}
              fill={mine && maps > 0.5 ? hexA(C.violet, 0.75) : own ? hexA(own, 0.35) : "rgba(30,36,60,0.6)"}
              stroke={mine && maps > 0.5 ? C.violet : own ? hexA(own, 0.6) : hexA(C.ink, 0.1)}
              strokeWidth={mine ? 2 : 1}
            />
          );
        })}
        {/* mappings */}
        {MAPPED.map((m, i) => {
          const fr = frameXY(m.frame);
          const p = clamp(maps * 1.6 - i * 0.12);
          return p > 0 ? <path key={i} d={curve(VA.x + VA.w, pageY(m.va), fr.x - RAM.cell / 2, fr.y)} fill="none" stroke={hexA(C.violet, 0.65)} strokeWidth={2} strokeDasharray="1400" strokeDashoffset={1400 * (1 - p)} /> : null;
        })}
        {/* VA pages ticks */}
        {new Array(VA_PAGES).fill(0).map((_, i) => {
          const isMapped = MAPPED.some((m) => m.va === i) || (i === FAULT_VA && mapped);
          const isFault = i === FAULT_VA;
          return (
            <rect
              key={`p${i}`}
              x={VA.x + VA.w - 70}
              y={pageY(i) - 16}
              width={56}
              height={32}
              rx={6}
              opacity={maps}
              fill={isMapped ? hexA(C.violet, 0.7) : "transparent"}
              stroke={isFault && fault > 0.05 ? C.rose : isMapped ? C.violet : hexA(C.ink, 0.35)}
              strokeWidth={isFault && fault > 0.05 ? 3 : 1.4}
              strokeDasharray={isMapped ? undefined : `${4 + ghost * 0},5`}
            />
          );
        })}
        {/* new mapping after the fault */}
        {mapped && (
          <path d={curve(VA.x + VA.w, pageY(FAULT_VA), frameXY(FAULT_FRAME).x - RAM.cell / 2, frameXY(FAULT_FRAME).y)} fill="none" stroke={C.cyan} strokeWidth={3} strokeDasharray="1400" strokeDashoffset={1400 * (1 - prog(f, b.load + 36, 18))} />
        )}
        {/* program counter touching the missing page */}
        {pcP > 0 && f < b.load + 60 && (
          <g>
            <path d={`M${VA.x - 40},${mix(pageY(8), pageY(FAULT_VA), pcP)} l26,0`} stroke={C.ink} strokeWidth={3} />
            <text x={VA.x - 48} y={mix(pageY(8), pageY(FAULT_VA), pcP) + 7} textAnchor="end" fontFamily={FONT.mono} fontSize={18} fill={C.ink}>
              PC
            </text>
          </g>
        )}
        {/* page flying from SSD */}
        {loadP > 0 && loadP < 1 && <Spark x={mix(SSD.x + 120, frameXY(FAULT_FRAME).x, loadP)} y={mix(SSD.y, frameXY(FAULT_FRAME).y, loadP) - Math.sin(loadP * Math.PI) * 120} color={C.cyan} r={12} />}
      </svg>
      {/* MMU */}
      <div style={{ position: "absolute", left: MMU.x, top: MMU.y, opacity: mmuIn, transform: `scale(${mix(0.9, 1, mmuIn)})` }}>
        <Glass color={fault > 0.05 ? C.rose : C.violet} style={{ width: MMU.w, height: MMU.h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }} glow={0.8 + fault}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 52, color: C.ink }}>MMU</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 17, color: C.ink3 }}>virtual → physical</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 17, color: C.ink3 }}>via page tables + TLB</div>
        </Glass>
      </div>
      {fault > 0.01 && (
        <div style={{ position: "absolute", left: MMU.x - 40, top: MMU.y - 90, width: MMU.w + 80, textAlign: "center", opacity: fault, transform: `scale(${mix(1.3, 1, prog(f, b.fault - 2, 8))})` }}>
          <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 40, color: C.rose, textShadow: `0 0 30px ${C.rose}` }}>PAGE FAULT</span>
        </div>
      )}
      {/* 16 KB tag */}
      <div style={{ position: "absolute", left: VA.x + VA.w - 90, top: pageY(5) - 70, opacity: kbA * (1 - ghost), fontFamily: FONT.mono, fontSize: 22, color: C.violet, background: "rgba(5,8,18,0.85)", padding: "6px 12px", borderRadius: 10, border: `1px solid ${hexA(C.violet, 0.6)}` }}>
        1 page = 16 KB
      </div>
      {/* SSD */}
      <div style={{ position: "absolute", left: SSD.x, top: SSD.y - 40, opacity: prog(f, b.notIn + 20, 20) }}>
        <Glass color={C.amber} style={{ width: SSD.w, height: SSD.h, display: "flex", alignItems: "center", gap: 18, padding: "0 26px" }} glow={0.4 + (loadP > 0 && loadP < 1 ? 0.8 : 0)}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: C.ink }}>SSD</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 18, color: C.ink3 }}>the app's code lives here until needed</div>
        </Glass>
      </div>
      {ok > 0.01 && (
        <div style={{ position: "absolute", left: VA.x - 20, top: VA.y + VA.h + 18, opacity: ok, fontFamily: FONT.mono, fontSize: 24, color: C.green }}>
          ✓ resumed — none the wiser
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- C. scheduler
const LANES = [
  ...[0, 1, 2, 3].map((i) => ({ id: `P${i}`, kind: "P" as const })),
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ id: `E${i}`, kind: "E" as const })),
];
const LX = 300;
const LW = 1200;

const Scheduler: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const inP = prog(f, b.sched - 8, 24);
  const urgent = prog(f, b.urgent - 4, 16);
  const bg = prog(f, b.bg - 4, 16);
  const fast = prog(f, b.switches, 50, EASE.in);
  const zoomOut = prog(f, b.hundreds - 10, 40, EASE.inOut);
  const speed = mix(5, 26, fast);
  // integrate position for smooth acceleration
  const t0 = b.sched;
  const dt = Math.max(0, f - t0);
  const travel = dt * 5 + Math.max(0, f - b.switches) * Math.max(0, f - b.switches) * 0.21;
  const switches = Math.round(mix(0, 4800, prog(f, b.switches, 60, EASE.out)) + (f > b.switches ? (f % 7) * 13 : 0));
  return (
    <AbsoluteFill style={{ opacity: a * inP }}>
      <div style={{ position: "absolute", left: 110, top: 120 }}>
        <Kicker color={C.violet}>The scheduler</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 56, color: C.ink, marginTop: 10, letterSpacing: "-0.03em" }}>Which thread runs where?</div>
      </div>
      <AbsoluteFill style={{ transform: `scale(${1 - zoomOut * 0.35})`, transformOrigin: "55% 55%" }}>
        {LANES.map((ln, li) => {
          const y = 330 + li * 62 + (ln.kind === "E" ? 40 : 0);
          const isP = ln.kind === "P";
          const col = isP ? C.pink : C.teal;
          return (
            <div key={ln.id}>
              <div style={{ position: "absolute", left: LX - 120, top: y + 8, width: 100, textAlign: "right", fontFamily: FONT.mono, fontSize: 20, color: hexA(col, 0.9) }}>{ln.id}-core</div>
              <div style={{ position: "absolute", left: LX, top: y, width: LW, height: 46, borderRadius: 12, background: hexA(col, 0.06), border: `1px solid ${hexA(col, 0.25)}`, overflow: "hidden" }}>
                {new Array(24).fill(0).map((_, k) => {
                  const gap = rnd(`gap${ln.id}`, 230, 260) * mix(1, 0.35, fast);
                  const period = 24 * gap;
                  const len = rnd(`len${ln.id}${k}`, 60, 220) * mix(1, 0.25, fast);
                  const start = k * gap + (isP ? 0 : 40);
                  const x = LW - ((((travel * (1 + li * 0.02) - start) % period) + period) % period) + (f < b.sched + 30 ? 0 : 0);
                  if (travel * (1 + li * 0.02) < start) return null;
                  if (x > LW || x + len < 0) return null;
                  const qos = isP ? (rnd(`q${ln.id}${k}`) < 0.75 ? C.pink : C.magenta) : rnd(`q${ln.id}${k}`) < 0.7 ? C.teal : C.green;
                  const hue = fast > 0.4 ? [C.pink, C.violet, C.cyan, C.amber, C.teal, C.blue][(k + li) % 6] : qos;
                  return (
                    <div key={k} style={{ position: "absolute", left: x, top: 6, width: len, height: 34, borderRadius: 8, background: hexA(hue, 0.75), boxShadow: `0 0 14px ${hexA(hue, 0.5)}` }} />
                  );
                })}
              </div>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: LX + LW + 30, top: 340, opacity: urgent, width: 220 }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: C.pink }}>Performance</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 17, color: C.ink2, marginTop: 4 }}>QoS: user-interactive</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 17, color: C.ink3 }}>“respond to you, now”</div>
        </div>
        <div style={{ position: "absolute", left: LX + LW + 30, top: 640, opacity: bg, width: 220 }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: C.teal }}>Efficiency</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 17, color: C.ink2, marginTop: 4 }}>QoS: background</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 17, color: C.ink3 }}>backups, indexing, sync</div>
        </div>
      </AbsoluteFill>
      {f > b.switches - 4 && (
        <div style={{ position: "absolute", right: 120, top: 130, textAlign: "right", opacity: prog(f, b.switches - 4, 14) }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 70, fontWeight: 700, color: C.ink, textShadow: `0 0 30px ${hexA(C.violet, 0.6)}`, fontVariantNumeric: "tabular-nums" }}>{switches.toLocaleString("en-US")}</div>
          <div style={{ fontFamily: FONT.ui, fontSize: 20, letterSpacing: "0.3em", fontWeight: 600, color: C.violet }}>CONTEXT SWITCHES / SEC</div>
        </div>
      )}
      {zoomOut > 0.01 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 100, textAlign: "center", opacity: zoomOut }}>
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 60, color: C.ink }}>
            Hundreds of programs. <span style={{ color: C.violet }}>All “at once.”</span>
          </span>
        </div>
      )}
      {speed < 0 && <Spark x={0} y={0} color={C.ink} />}
    </AbsoluteFill>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const ev: SfxEvent[] = [
    { at: 86, name: "whoosh_soft", vol: 0.35 },
    { at: b.click - 2, name: "mouse_click", vol: 0.8 },
    { at: b.click + 2, name: "pop", vol: 0.3 },
    { at: b.process - 6, name: "whoosh", vol: 0.4 },
    { at: b.process, name: "power_up", vol: 0.3 },
    { at: b.private - 6, name: "swell", vol: 0.25 },
    { at: b.vas - 8, name: "whoosh_big", vol: 0.4 },
    { at: b.phys, name: "data", vol: 0.25 },
    { at: b.mmu - 6, name: "pop", vol: 0.35 },
    { at: b.page - 4, name: "sweep_up", vol: 0.25 },
    { at: b.kb16 - 4, name: "blip", vol: 0.3 },
    { at: b.notIn + 10, name: "tick", vol: 0.3 },
    { at: b.fault - 2, name: "alarm", vol: 0.35 },
    { at: b.fault - 2, name: "glitch", vol: 0.3 },
    { at: b.load, name: "whoosh", vol: 0.35 },
    { at: b.load + 36, name: "blip_hi", vol: 0.35 },
    { at: b.carries - 4, name: "chime_lo", vol: 0.25 },
    { at: b.sched - 10, name: "whoosh_big", vol: 0.4 },
    { at: b.urgent - 4, name: "pop", vol: 0.3 },
    { at: b.bg - 4, name: "pop", vol: 0.3 },
    { at: b.switches, name: "riser", vol: 0.3 },
    { at: b.switches + 6, name: "data_long", vol: 0.3 },
    { at: b.hundreds - 8, name: "shimmer", vol: 0.3 },
  ];
  for (let i = 0; i < 10; i++) ev.push({ at: b.switches + 10 + i * 6, name: "tick", vol: 0.15 });
  return ev;
};

export const Launch: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.violet, hueB: C.indigo, hueC: C.teal, intensity: 0.75 },
};
