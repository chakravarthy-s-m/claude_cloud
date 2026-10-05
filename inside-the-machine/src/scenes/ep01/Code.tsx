import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glass, Glow, Kicker, NeonPath, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    justCode: wordAt(c.c1, "is just code"),
    what: wordAt(c.c1, "But what is code"),
    swift: wordAt(c.c2, "languages like Swift"),
    func: wordAt(c.c2, "a tiny function"),
    compiler: c.c3.from,
    stepBy: wordAt(c.c3, "step by step"),
    native: wordAt(c.c3, "native language"),
    means: c.c4.from,
    number: wordAt(c.c4, "just a number"),
    thirty: wordAt(c.c4, "thirty-two"),
    job: c.c5.from,
    sf: wordAt(c.c5, "sixty-four-bit"),
    op: wordAt(c.c5, "add a constant"),
    imm: wordAt(c.c5, "twelve bits"),
    regs: wordAt(c.c5, "choose the registers"),
    mem: c.c6.from,
    fetch: wordAt(c.c6, "The core fetches"),
    decoder: wordAt(c.c6, "decoder"),
    wires: wordAt(c.c6, "wires, switching"),
  };
};
type B = ReturnType<typeof beats>;

const BITS = "10110001000000000000010000000000"; // 0xB1000400 — adds x0, x0, #1
const FIELDS = [
  { from: 31, to: 31, label: "sf = 1", sub: "64-bit math", col: C.pink, key: "sf" as const },
  { from: 30, to: 22, label: "ADDS (immediate)", sub: "add a constant · set flags", col: C.amber, key: "op" as const },
  { from: 21, to: 10, label: "imm12 = 1", sub: "the number one", col: C.cyan, key: "imm" as const },
  { from: 9, to: 5, label: "Rn = x0", sub: "read from", col: C.violet, key: "regs" as const },
  { from: 4, to: 0, label: "Rd = x0", sub: "write to", col: C.green, key: "regs" as const },
];

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const segA = inOut(f, 80, 14, b.swift - 10, 14);
  const segB = inOut(f, b.swift - 12, 16, b.means - 2, 14);
  const segC = inOut(f, b.means - 6, 14, b.mem + 4, 16);
  const segD = prog(f, b.mem - 2, 16);
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={14}>
      {segA > 0.01 && <JustCode a={segA} b={b} />}
      {segB > 0.01 && <Compile a={segB} b={b} />}
      {segC > 0.01 && <Bits a={segC} b={b} />}
      {segD > 0.01 && <MemoryDecode a={segD} b={b} />}
    </SceneShell>
  );
};

// ---------------------------------------------------------------- "it's all just code"
const SNIPS = [
  { title: "Kernel", col: C.cyan, lines: ["kern_return_t", "thread_block(…);", "if (irq) aic_ack();", "vm_fault(map, va);", "sched_choose(core);"] },
  { title: "WindowServer", col: C.blue, lines: ["route(event, win);", "composite(layers);", "present(frame);", "focus = front();", "blend(src, dst);"] },
  { title: "Your app", col: C.pink, lines: ["text.insert(\"a\")", "view.setNeedsDisplay()", "save(document)", "let n = x + 1", "draw(glyphs)"] },
];

const JustCode: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const merge = prog(f, b.what - 20, 30, EASE.inOut);
  const q = spr(f, fps, b.what, { damping: 18, stiffness: 100 });
  return (
    <AbsoluteFill style={{ opacity: a }}>
      {SNIPS.map((sn, i) => {
        const p = spr(f, fps, 90 + i * 10, { damping: 18, stiffness: 100 });
        const x = mix(170 + i * 560, 960 - 230, merge);
        const y = mix(300, 420, merge);
        return (
          <div key={sn.title} style={{ position: "absolute", left: x, top: y, opacity: clamp(p * 1.4) * (1 - merge * 0.85), transform: `translateY(${(1 - p) * 40}px) scale(${1 - merge * 0.3})` }}>
            <Glass color={sn.col} style={{ width: 460, height: 330, padding: "24px 28px", overflow: "hidden" }} glow={0.6}>
              <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 18, letterSpacing: "0.25em", color: sn.col }}>{sn.title.toUpperCase()}</div>
              <div style={{ position: "relative", height: 240, overflow: "hidden", marginTop: 12 }}>
                {new Array(9).fill(0).map((_, k) => {
                  const yy = ((k * 36 - f * 1.2) % 324 + 324) % 324 - 18;
                  return (
                    <div key={k} style={{ position: "absolute", top: yy, fontFamily: FONT.mono, fontSize: 22, color: hexA(C.ink, 0.75) }}>
                      {sn.lines[(k + i) % sn.lines.length]}
                    </div>
                  );
                })}
              </div>
            </Glass>
          </div>
        );
      })}
      {q > 0.01 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ opacity: clamp(q * 1.3), transform: `scale(${mix(0.9, 1, q)})`, textAlign: "center" }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 96, color: C.ink, letterSpacing: "-0.04em" }}>
              What <span style={{ color: C.pink }}>is</span> code,
            </div>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 96, color: C.ink, letterSpacing: "-0.04em" }}>to a machine?</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- Swift → ... → ARM64
const SWIFT: [string, string][][] = [
  [["func ", C.pink], ["addOne", C.cyan], ["(_ x: ", C.ink], ["Int", C.violet], [") -> ", C.ink], ["Int", C.violet], [" {", C.ink]],
  [["    return ", C.pink], ["x + ", C.ink], ["1", C.amber]],
  [["}", C.ink]],
];

const Compile: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const typed = Math.floor(Math.max(0, f - b.func + 4) * 1.6);
  const stages = prog(f, b.compiler - 6, 18);
  const stageP = prog(f, b.stepBy - 6, b.native - b.stepBy + 10, EASE.inOut);
  const asmA = prog(f, b.native - 4, 18);
  const editorA = prog(f, b.swift - 10, 16);
  const allChars = SWIFT.flat().map(([t]) => t).join("").length;
  let shown = 0;
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 170, opacity: editorA }}>
        <Kicker color={C.pink}>Swift · what developers write</Kicker>
        <Glass color={C.pink} style={{ marginTop: 18, width: 760, padding: "30px 34px", minHeight: 210 }} glow={0.6}>
          {SWIFT.map((line, li) => (
            <div key={li} style={{ fontFamily: FONT.mono, fontSize: 36, lineHeight: 1.55, whiteSpace: "pre" }}>
              {line.map(([t, col], k) => {
                const start = shown;
                shown += t.length;
                const vis = Math.max(0, Math.min(t.length, typed - start));
                return (
                  <span key={k} style={{ color: col }}>
                    {t.slice(0, vis)}
                  </span>
                );
              })}
              {typed < allChars && li === SWIFT.findIndex((_, i) => SWIFT.slice(0, i + 1).flat().map(([t]) => t).join("").length >= typed) && (
                <span style={{ display: "inline-block", width: 3, height: 40, background: C.ink, verticalAlign: "middle" }} />
              )}
            </div>
          ))}
        </Glass>
      </div>
      {/* compiler stages */}
      <div style={{ position: "absolute", left: 120, top: 560, display: "flex", gap: 18, alignItems: "center", opacity: stages }}>
        {[
          { t: "Swift", c: C.pink },
          { t: "SIL", c: C.violet },
          { t: "LLVM IR", c: C.indigo },
          { t: "ARM64", c: C.cyan },
        ].map((st, i) => {
          const lit = stageP * 4 >= i;
          return (
            <React.Fragment key={st.t}>
              {i > 0 && <span style={{ fontFamily: FONT.mono, fontSize: 30, color: lit ? st.c : C.ink4 }}>→</span>}
              <div style={{ padding: "14px 26px", borderRadius: 16, fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: lit ? C.ink : C.ink3, background: lit ? hexA(st.c, 0.18) : "rgba(20,26,46,0.6)", border: `1.5px solid ${lit ? st.c : hexA(C.ink, 0.15)}`, boxShadow: lit ? `0 0 26px ${hexA(st.c, 0.45)}` : undefined }}>
                {st.t}
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 120, top: 660, opacity: inOut(f, b.stepBy, 16, b.native, 14), fontFamily: FONT.mono, fontSize: 21, color: C.indigo, width: 900 }}>
        %r = call {"{"}i64, i1{"}"} @llvm.sadd.with.overflow.i64(i64 %x, i64 1)
      </div>
      {/* assembly */}
      <div style={{ position: "absolute", left: 1000, top: 170, opacity: asmA, transform: `translateX(${(1 - asmA) * 30}px)` }}>
        <Kicker color={C.cyan}>ARM64 · what the CPU runs</Kicker>
        <Glass color={C.cyan} style={{ marginTop: 18, width: 800, padding: "30px 34px" }} glow={0.8}>
          {[
            ["adds", "x0, x0, #1", "; add 1, set flags"],
            ["b.vs", "overflow", "; Swift traps on overflow"],
            ["ret", "", "; result is in x0"],
          ].map(([op, args, cm], i) => (
            <div key={i} style={{ display: "flex", gap: 20, fontFamily: FONT.mono, fontSize: 34, lineHeight: 1.6, opacity: prog(f, b.native + i * 6, 10), whiteSpace: "nowrap" }}>
              <span style={{ color: C.pink, width: 90 }}>{op}</span>
              <span style={{ color: C.ink, width: 280 }}>{args}</span>
              <span style={{ color: C.ink3, fontSize: 24 }}>{cm}</span>
            </div>
          ))}
        </Glass>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- instruction → 32 bits → fields
const Bits: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const instr = spr(f, fps, b.means, { damping: 18, stiffness: 100 });
  const hex = prog(f, b.number - 6, 18);
  const bitsIn = prog(f, b.thirty - 8, 26);
  const W = 50;
  const X0 = 960 - (32 * W + 7 * 10) / 2;
  const bitX = (i: number) => X0 + i * W + Math.floor(i / 4) * 10;
  const fieldOn = (k: "sf" | "op" | "imm" | "regs") => prog(f, b[k] - 6, 14);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center", opacity: clamp(instr * 1.3) }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 64, color: C.pink }}>adds </span>
        <span style={{ fontFamily: FONT.mono, fontSize: 64, color: C.ink }}>x0, x0, #1</span>
        <div style={{ fontFamily: FONT.ui, fontSize: 26, color: C.ink3, marginTop: 6 }}>“add one to register x0”</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 330, textAlign: "center", opacity: hex, transform: `scale(${mix(0.8, 1, hex)})` }}>
        <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 92, color: C.amber, textShadow: `0 0 40px ${hexA(C.amber, 0.5)}` }}>0xB1000400</span>
      </div>
      {/* bits */}
      {BITS.split("").map((bit, i) => {
        const bi = 31 - i;
        const field = FIELDS.find((fl) => bi <= fl.from && bi >= fl.to)!;
        const fo = fieldOn(field.key);
        const p = prog(f, b.thirty - 8 + i * 0.7, 10);
        const one = bit === "1";
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: bitX(i),
              top: 520,
              width: W - 6,
              height: 74,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT.mono,
              fontWeight: 700,
              fontSize: 32,
              opacity: p * bitsIn,
              transform: `translateY(${(1 - p) * -30}px)`,
              color: one ? "#06080f" : C.ink2,
              background: one ? (fo > 0.1 ? field.col : C.ink) : fo > 0.1 ? hexA(field.col, 0.16) : "rgba(20,26,46,0.85)",
              border: `1.5px solid ${fo > 0.1 ? field.col : hexA(C.ink, 0.18)}`,
              boxShadow: one ? `0 0 ${12 + fo * 18}px ${hexA(fo > 0.1 ? field.col : C.ink, 0.5)}` : undefined,
            }}
          >
            {bit}
          </div>
        );
      })}
      {/* bit index ruler */}
      <div style={{ position: "absolute", left: bitX(0), top: 494, fontFamily: FONT.mono, fontSize: 16, color: C.ink3, opacity: bitsIn }}>31</div>
      <div style={{ position: "absolute", left: bitX(31) + 18, top: 494, fontFamily: FONT.mono, fontSize: 16, color: C.ink3, opacity: bitsIn }}>0</div>
      {/* field brackets */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {FIELDS.map((fl, k) => {
          const x1 = bitX(31 - fl.from);
          const x2 = bitX(31 - fl.to) + W - 6;
          const o = fieldOn(fl.key);
          const y = 616;
          return (
            <g key={k} opacity={o}>
              <path d={`M${x1},${y} L${x1},${y + 16} L${x2},${y + 16} L${x2},${y}`} fill="none" stroke={fl.col} strokeWidth={2.5} />
              <line x1={(x1 + x2) / 2} y1={y + 16} x2={(x1 + x2) / 2} y2={y + 56 + (k % 2) * 60} stroke={fl.col} strokeWidth={1.5} strokeDasharray="3 5" />
            </g>
          );
        })}
      </svg>
      {FIELDS.map((fl, k) => {
        const x1 = bitX(31 - fl.from);
        const x2 = bitX(31 - fl.to) + W - 6;
        const o = fieldOn(fl.key);
        return (
          <div key={k} style={{ position: "absolute", left: (x1 + x2) / 2, top: 676 + (k % 2) * 60, transform: `translateX(-50%) translateY(${(1 - o) * 10}px)`, opacity: o, textAlign: "center", whiteSpace: "nowrap" }}>
            <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 26, color: fl.col }}>{fl.label}</div>
            <div style={{ fontFamily: FONT.ui, fontSize: 20, color: C.ink2 }}>{fl.sub}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- memory + decoder
const MemoryDecode: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const rows = [
    { addr: "0x1_0000_3F80", bytes: ["00", "04", "00", "B1"], asm: "adds x0, x0, #1", hl: true },
    { addr: "0x1_0000_3F84", bytes: ["46", "00", "00", "54"], asm: "b.vs overflow" },
    { addr: "0x1_0000_3F88", bytes: ["C0", "03", "5F", "D6"], asm: "ret" },
  ];
  const memA = prog(f, b.mem, 18);
  const fetchP = prog(f, b.fetch - 4, 30, EASE.inOut);
  const decA = prog(f, b.decoder - 10, 16);
  const wires = prog(f, b.wires - 10, 30);
  const SIGNALS = [
    { t: "ALU op = ADD", on: true },
    { t: "operand B = immediate", on: true },
    { t: "immediate value = 1", on: true },
    { t: "set condition flags", on: true },
    { t: "width = 64-bit", on: true },
    { t: "read register x0", on: true },
    { t: "write register x0", on: true },
    { t: "memory access", on: false },
    { t: "branch", on: false },
    { t: "subtract", on: false },
  ];
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 110, top: 160, opacity: memA }}>
        <Kicker color={C.amber}>In memory · 4 bytes each</Kicker>
        <Glass color={C.amber} style={{ marginTop: 18, width: 760, padding: "22px 26px" }} glow={0.5}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, fontFamily: FONT.mono, fontSize: 25, padding: "10px 12px", borderRadius: 10, background: r.hl ? hexA(C.amber, 0.12 + (1 - fetchP) * 0.1) : undefined, opacity: prog(f, b.mem + i * 5, 10) }}>
              <span style={{ color: C.ink3, width: 200 }}>{r.addr}</span>
              {r.bytes.map((by, k) => (
                <span key={k} style={{ width: 46, textAlign: "center", padding: "4px 0", borderRadius: 8, color: r.hl ? "#170f02" : C.ink2, background: r.hl ? C.amber : "rgba(20,26,46,0.9)" }}>
                  {by}
                </span>
              ))}
              <span style={{ color: C.ink3, fontSize: 20, marginLeft: 8 }}>{r.asm}</span>
            </div>
          ))}
          <div style={{ fontFamily: FONT.ui, fontSize: 20, color: C.ink3, marginTop: 10 }}>stored little-endian: lowest byte first</div>
        </Glass>
      </div>
      {/* fetch spark → decoder */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <NeonPath d="M870,265 C1000,265 1000,560 1060,560" color={C.amber} width={2.4} progress={fetchP} length={520} />
        {fetchP > 0 && fetchP < 1 && <Spark x={mix(870, 1060, fetchP)} y={mix(265, 560, fetchP * fetchP)} color={C.amber} r={10} />}
        {SIGNALS.map((sg, i) => {
          const y = 300 + i * 56;
          const on = sg.on && wires > 0.05;
          const p = clamp(wires * 1.6 - i * 0.06);
          return (
            <g key={i} opacity={decA}>
              <NeonPath d={`M1300,560 C1380,560 1380,${y} 1460,${y} L1520,${y}`} color={on ? C.cyan : C.ink4} width={on ? 2.6 : 1.4} progress={p} length={500} core={on} opacity={on ? 1 : 0.6} />
              {on && p > 0.95 && <circle cx={1520} cy={y} r={6} fill={C.cyanHi} />}
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", left: 1060, top: 470, opacity: decA, transform: `scale(${mix(0.9, 1, decA)})` }}>
        <Glass color={C.cyan} style={{ width: 240, height: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }} glow={0.6 + wires}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 38, color: C.ink }}>Decoder</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 16, color: C.ink3, marginTop: 6 }}>bits → signals</div>
        </Glass>
      </div>
      {SIGNALS.map((sg, i) => (
        <div key={i} style={{ position: "absolute", left: 1540, top: 300 + i * 56 - 15, fontFamily: FONT.mono, fontSize: 21, color: sg.on ? C.ink : C.ink4, opacity: decA * clamp(wires * 1.6 - i * 0.06) }}>
          {sg.on ? "● " : "○ "}
          {sg.t}
        </div>
      ))}
      {wires > 0.5 && <Glow x={1520} y={450} size={600} color={C.cyan} a={0.12} />}
    </AbsoluteFill>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const ev: SfxEvent[] = [
    { at: 86, name: "data_long", vol: 0.2 },
    { at: b.what - 20, name: "whoosh", vol: 0.35 },
    { at: b.what, name: "boom_soft", vol: 0.3 },
    { at: b.swift - 10, name: "whoosh_soft", vol: 0.35 },
    { at: b.compiler - 6, name: "sweep_up", vol: 0.25 },
    { at: b.native - 4, name: "pop_hi", vol: 0.35 },
    { at: b.means, name: "whoosh_soft", vol: 0.3 },
    { at: b.number - 6, name: "pop", vol: 0.35 },
    { at: b.thirty - 8, name: "data", vol: 0.3 },
    { at: b.sf - 6, name: "blip", vol: 0.3 },
    { at: b.op - 6, name: "blip", vol: 0.3 },
    { at: b.imm - 6, name: "blip_hi", vol: 0.3 },
    { at: b.regs - 6, name: "blip_hi", vol: 0.3 },
    { at: b.mem - 2, name: "whoosh_soft", vol: 0.35 },
    { at: b.fetch - 4, name: "sweep_up", vol: 0.25 },
    { at: b.decoder - 6, name: "pop", vol: 0.3 },
    { at: b.wires - 8, name: "data_long", vol: 0.3 },
    { at: b.wires, name: "zap", vol: 0.2 },
  ];
  // typing during the swift code
  for (let i = 0; i < 9; i++) ev.push({ at: b.func - 4 + i * 4, name: "tick", vol: 0.2 });
  return ev;
};

export const Code: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.pink, hueB: C.cyan, hueC: C.amber, intensity: 0.7 },
};

export const _rnd = rnd;
