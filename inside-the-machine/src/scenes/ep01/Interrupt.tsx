import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glass, Glow, Kicker, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";

const ASM = [
  "ldr    q0, [x1, #16]",
  "ldr    q1, [x2, #16]",
  "fmla   v2.4s, v0.4s, v1.4s",
  "add    x1, x1, #32",
  "subs   x3, x3, #1",
  "b.ne   decode_loop",
  "str    q2, [x4], #16",
  "ldp    x5, x6, [sp, #32]",
  "mul    x7, x5, x6",
  "cbz    x7, done",
];

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    bang: wordAt(c.i1, "exactly") - 4,
    drops: wordAt(c.i2, "drops"),
    saves: wordAt(c.i2, "saves its place"),
    mode: wordAt(c.i2, "switches into kernel mode"),
    jump: wordAt(c.i2, "jumps"),
    vector: wordAt(c.i2, "exception vector"),
    control: c.i3.from,
    drivers: c.i4.from,
    four: wordAt(c.i4, "turn number four"),
    event: wordAt(c.i4, "into an event"),
    up: c.i5.from,
    front: wordAt(c.i5, "which window is in front"),
    sends: wordAt(c.i5, "sends the key"),
  };
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const b = beats(s);
  const end = s.durationInFrames;

  const phase1 = inOut(f, 0, 14, b.drivers - 14, 16);
  const phase2 = inOut(f, b.drivers - 10, 16, b.up + 30, 16);
  const phase3 = prog(f, b.up + 20, 20);

  // glitch shake at the interrupt
  const bang = inOut(f, b.bang, 2, b.bang + 10, 10);
  const shakeX = bang * (rnd(`sx${f}`) - 0.5) * 26;
  const shakeY = bang * (rnd(`sy${f}`) - 0.5) * 14;

  const frozen = f >= b.drops;
  const kernel = f >= b.mode;
  const scroll = frozen ? b.drops * 0.22 : f * 0.22;

  const savedP = prog(f, b.saves, 26, EASE.inOut);
  const modeP = spr(f, fps, b.mode, { damping: 14, stiffness: 160 });
  const vecA = prog(f, b.jump - 8, 18);
  const vecHL = prog(f, b.vector - 6, 12);
  const ctrlP = spr(f, fps, b.control, { damping: 18, stiffness: 120 });

  const userCol = C.pink;
  const kerCol = C.cyan;

  return (
    <SceneShell dur={end} enter={10} exit={12}>
      {/* ---------------- phase 1: the core gets interrupted ---------------- */}
      {phase1 > 0.01 && (
        <AbsoluteFill style={{ opacity: phase1 }}>
          <div style={{ position: "absolute", left: 100, top: 170, transform: `translate(${shakeX}px, ${shakeY}px)` }}>
            <Glass color={kernel ? kerCol : userCol} style={{ width: 760, height: 760 }} glow={0.6}>
              <div style={{ position: "absolute", left: 34, top: 28, right: 34, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 22, letterSpacing: "0.22em", color: C.ink2 }}>PERFORMANCE CORE 2</div>
                <div
                  style={{
                    fontFamily: FONT.mono,
                    fontWeight: 700,
                    fontSize: 22,
                    padding: "6px 16px",
                    borderRadius: 999,
                    color: "#05070d",
                    background: kernel ? kerCol : userCol,
                    boxShadow: `0 0 ${20 + modeP * 30}px ${kernel ? kerCol : userCol}`,
                    transform: `scale(${kernel ? mix(1.4, 1, modeP) : 1})`,
                  }}
                >
                  {kernel ? "EL1 · KERNEL" : "EL0 · USER"}
                </div>
              </div>
              <div style={{ position: "absolute", left: 34, top: 78, fontFamily: FONT.mono, fontSize: 20, color: kernel ? kerCol : userCol }}>
                {kernel ? "running: XNU interrupt handler" : "running: Music app"}
              </div>
              {/* instruction stream */}
              <div style={{ position: "absolute", left: 34, right: 34, top: 130, bottom: 30, overflow: "hidden", borderRadius: 14, background: "rgba(3,5,12,0.6)", border: `1px solid ${hexA(C.ink, 0.08)}` }}>
                {new Array(26).fill(0).map((_, i) => {
                  const idx = Math.floor(scroll) + i;
                  const y = (i - (scroll % 1)) * 44 + 16;
                  const line = kernel && i > 12 ? ["mrs    x0, ESR_EL1", "stp    x0, x1, [sp, #-16]!", "bl     aic_handle_irq", "ldr    x2, [x19, #0x48]", "blr    x2"][(idx + i) % 5] : ASM[idx % ASM.length];
                  const isPc = i === 12;
                  return (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: y,
                        height: 40,
                        display: "flex",
                        alignItems: "center",
                        gap: 22,
                        paddingLeft: 18,
                        fontFamily: FONT.mono,
                        fontSize: 22,
                        color: isPc ? C.ink : hexA(C.ink, frozen ? 0.25 : 0.55),
                        background: isPc ? hexA(kernel ? kerCol : frozen ? C.rose : userCol, 0.18) : undefined,
                        borderLeft: isPc ? `3px solid ${kernel ? kerCol : frozen ? C.rose : userCol}` : "3px solid transparent",
                        filter: frozen && !isPc ? "grayscale(1)" : undefined,
                      }}
                    >
                      <span style={{ color: C.ink3, width: 170 }}>{`0x1_0000_${(0x4a00 + idx * 4).toString(16).toUpperCase()}`}</span>
                      {line}
                    </div>
                  );
                })}
              </div>
            </Glass>
          </div>
          {/* INTERRUPT banner */}
          {f >= b.bang && (
            <div
              style={{
                position: "absolute",
                left: 100,
                top: 470,
                width: 760,
                textAlign: "center",
                opacity: inOut(f, b.bang, 2, b.saves - 4, 12),
                transform: `scale(${mix(1.6, 1, prog(f, b.bang, 8, EASE.out))})`,
              }}
            >
              <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 104, letterSpacing: "0.06em", color: C.rose, textShadow: `0 0 50px ${C.rose}, ${bang * 6}px 0 0 ${hexA(C.cyan, 0.7)}, ${-bang * 6}px 0 0 ${hexA(C.amber, 0.7)}` }}>
                INTERRUPT
              </span>
            </div>
          )}
          {/* registers → saved state */}
          <div style={{ position: "absolute", left: 920, top: 170, opacity: prog(f, b.saves - 10, 16) }}>
            <Kicker color={C.amber}>Save its place</Kicker>
            <div style={{ display: "flex", gap: 26, marginTop: 18 }}>
              <RegBox title="LIVE" rows={[["PC", "0x1_0000_4A28"], ["PSTATE", "EL0 · flags"], ["SP", "0x16F_E3A0"]]} color={userCol} a={1 - savedP * 0.55} />
              <RegBox title="SAVED" rows={[["ELR_EL1", savedP > 0.3 ? "0x1_0000_4A28" : "—"], ["SPSR_EL1", savedP > 0.6 ? "EL0 · flags" : "—"], ["regs", savedP > 0.9 ? "→ kernel stack" : "—"]]} color={C.amber} a={0.4 + savedP * 0.6} />
            </div>
            {savedP > 0 && savedP < 1 && (
              <svg width={600} height={200} style={{ position: "absolute", left: 0, top: 60, overflow: "visible" }}>
                <Spark x={mix(150, 470, savedP)} y={mix(70, 70, savedP) + Math.sin(savedP * Math.PI) * -40} color={C.amber} r={8} />
              </svg>
            )}
          </div>
          {/* exception vector table */}
          <div style={{ position: "absolute", left: 920, top: 470, opacity: vecA, transform: `translateY(${(1 - vecA) * 20}px)` }}>
            <Kicker color={kerCol}>Jump to a fixed address</Kicker>
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(4, 210px)", gap: 8 }}>
              {["Sync", "IRQ", "FIQ", "SError"].map((t) => (
                <div key={t} style={{ fontFamily: FONT.mono, fontSize: 16, color: C.ink3, textAlign: "center" }}>
                  {t}
                </div>
              ))}
              {[0, 1, 2, 3].map((g) =>
                [0, 1, 2, 3].map((k) => {
                  const off = g * 0x200 + k * 0x80;
                  const hit = g === 2 && k === 1;
                  return (
                    <div
                      key={`${g}${k}`}
                      style={{
                        height: 54,
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: FONT.mono,
                        fontSize: 20,
                        color: hit && vecHL > 0.5 ? "#04131a" : C.ink2,
                        background: hit ? hexA(kerCol, 0.1 + vecHL * 0.85) : "rgba(20,26,46,0.85)",
                        border: `1px solid ${hit ? kerCol : hexA(C.ink, 0.12)}`,
                        boxShadow: hit ? `0 0 ${vecHL * 40}px ${hexA(kerCol, 0.7)}` : undefined,
                      }}
                    >
                      +0x{off.toString(16).toUpperCase().padStart(3, "0")}
                    </div>
                  );
                }),
              )}
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 20, color: kerCol, marginTop: 14, opacity: vecHL }}>PC ← VBAR_EL1 + 0x480 · IRQ from user code</div>
          </div>
          {/* kernel in control */}
          {ctrlP > 0.01 && (
            <div style={{ position: "absolute", left: 920, right: 100, bottom: 90, display: "flex", alignItems: "center", gap: 24, opacity: clamp(ctrlP * 1.4), transform: `translateY(${(1 - ctrlP) * 20}px)` }}>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 56, color: C.ink }}>
                Kernel in control <span style={{ color: kerCol }}>· within µs</span>
              </div>
            </div>
          )}
        </AbsoluteFill>
      )}

      {/* ---------------- phase 2: driver turns bytes into an event ---------------- */}
      {phase2 > 0.01 && <DriverPhase a={phase2} start={b.drivers} four={b.four} event={b.event} up={b.up} />}

      {/* ---------------- phase 3: WindowServer routes the key ---------------- */}
      {phase3 > 0.01 && <WindowPhase a={phase3} start={b.up} front={b.front} sends={b.sends} />}
      {bang > 0.05 && <AbsoluteFill style={{ background: hexA(C.rose, bang * 0.18) }} />}
    </SceneShell>
  );
};

const RegBox: React.FC<{ title: string; rows: [string, string][]; color: string; a: number }> = ({ title, rows, color, a }) => (
  <Glass color={color} style={{ width: 380, padding: "18px 22px", opacity: a }}>
    <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.25em", color }}>{title}</div>
    {rows.map(([k, v]) => (
      <div key={k} style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: FONT.mono, fontSize: 21 }}>
        <span style={{ color: C.ink3 }}>{k}</span>
        <span style={{ color: C.ink }}>{v}</span>
      </div>
    ))}
  </Glass>
);

const DriverPhase: React.FC<{ a: number; start: number; four: number; event: number; up: number }> = ({ a, start, four, event, up }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inP = spr(f, fps, start, { damping: 20, stiffness: 100 });
  const flow = prog(f, four - 6, 30, EASE.inOut);
  const card = spr(f, fps, event, { damping: 16, stiffness: 120 });
  const fly = prog(f, up + 4, 24, EASE.in);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 150 }}>
        <Kicker color={C.cyan}>I/O Kit · HID driver</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 64, color: C.ink, marginTop: 12, letterSpacing: "-0.03em" }}>Bytes become meaning</div>
      </div>
      {/* bytes */}
      <div style={{ position: "absolute", left: 120, top: 560, display: "flex", gap: 8, opacity: clamp(inP * 1.3), transform: `translateX(${(1 - inP) * -40}px)` }}>
        {["00", "00", "04", "00", "00", "00", "00", "00"].map((v, i) => (
          <div key={i} style={{ width: 58, height: 70, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.mono, fontWeight: 700, fontSize: 28, color: i === 2 ? "#170f02" : C.ink2, background: i === 2 ? C.amber : "rgba(20,26,46,0.9)", border: `1px solid ${hexA(C.ink, 0.15)}` }}>
            {v}
          </div>
        ))}
      </div>
      {/* driver box */}
      <div style={{ position: "absolute", left: 760, top: 510, opacity: clamp(inP * 1.3) }}>
        <Glass color={C.cyan} style={{ width: 360, height: 170, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }} glow={0.4 + flow}>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 18, letterSpacing: "0.25em", color: C.cyan }}>KERNEL DRIVER</div>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: C.ink, marginTop: 6 }}>I/O Kit HID</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 18, color: C.ink3, marginTop: 6 }}>usage 0x04 → key A</div>
        </Glass>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d="M600,595 L760,595" stroke={hexA(C.amber, 0.6)} strokeWidth={2} strokeDasharray="6 8" />
        <path d="M1120,595 L1280,595" stroke={hexA(C.cyan, 0.6)} strokeWidth={2} strokeDasharray="6 8" />
        {flow > 0 && flow < 1 && <Spark x={mix(600, 1280, flow)} y={595} color={flow < 0.5 ? C.amber : C.cyan} r={10} />}
      </svg>
      {/* event card */}
      <div style={{ position: "absolute", left: 1290, top: 440, opacity: clamp(card * 1.4) * (1 - fly), transform: `translate(${fly * 120}px, ${fly * -420}px) scale(${mix(0.85, 1, card) * (1 - fly * 0.6)})` }}>
        <Glass color={C.blue} style={{ width: 500, padding: "26px 30px" }} glow={0.9}>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 18, letterSpacing: "0.25em", color: C.blue }}>KEY EVENT</div>
          {[
            ["type", "keyDown"],
            ["key", "A"],
            ["keycode", "0  (kVK_ANSI_A)"],
            ["timestamp", "12:04:31.512"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontFamily: FONT.mono, fontSize: 25 }}>
              <span style={{ color: C.ink3 }}>{k}</span>
              <span style={{ color: C.ink }}>{v}</span>
            </div>
          ))}
        </Glass>
      </div>
    </AbsoluteFill>
  );
};

const WindowPhase: React.FC<{ a: number; start: number; front: number; sends: number }> = ({ a, start, front, sends }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ws = spr(f, fps, start + 14, { damping: 18, stiffness: 100 });
  const desk = spr(f, fps, start + 40, { damping: 20, stiffness: 90 });
  const hl = prog(f, front - 4, 16);
  const go = prog(f, sends, 26, EASE.inOut);
  const arrived = prog(f, sends + 24, 10);
  const wins = [
    { x: 620, y: 360, w: 560, h: 380, title: "Browser", col: C.blue },
    { x: 1180, y: 300, w: 520, h: 420, title: "Music", col: C.rose },
    { x: 840, y: 470, w: 620, h: 420, title: "Notes — untitled", col: C.amber, front: true },
  ];
  // packet path: WindowServer badge → front window
  const px = mix(960, 1150, go);
  const py = mix(250, 660, go);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 960, top: 120, transform: `translateX(-50%) scale(${mix(0.8, 1, ws)})`, opacity: clamp(ws * 1.3) }}>
        <Glass color={C.blue} style={{ padding: "18px 36px", textAlign: "center" }} glow={1}>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: C.blue }}>SYSTEM SERVICE</div>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 48, color: C.ink }}>WindowServer</div>
        </Glass>
      </div>
      {/* desktop */}
      <div style={{ position: "absolute", left: 520, top: 260, width: 1280, height: 720, borderRadius: 28, overflow: "hidden", opacity: clamp(desk * 1.3), transform: `translateY(${(1 - desk) * 40}px)`, background: "linear-gradient(135deg, #1a1446, #3b1d6e 45%, #0f4c6e 80%, #081a33)", border: `1px solid ${hexA(C.ink, 0.15)}` }}>
        {wins.map((w) => (
          <div
            key={w.title}
            style={{
              position: "absolute",
              left: w.x - 520,
              top: w.y - 260,
              width: w.w,
              height: w.h,
              borderRadius: 18,
              background: "rgba(18,20,32,0.94)",
              border: `2px solid ${w.front ? hexA(C.cyan, 0.25 + hl * 0.75) : hexA(C.ink, 0.12)}`,
              boxShadow: w.front ? `0 0 ${hl * 60}px ${hexA(C.cyan, 0.6)}, 0 30px 60px rgba(0,0,0,0.5)` : "0 30px 60px rgba(0,0,0,0.5)",
              opacity: w.front ? 1 : 1 - hl * 0.45,
            }}
          >
            <div style={{ display: "flex", gap: 8, padding: 16 }}>
              <span style={{ width: 13, height: 13, borderRadius: 7, background: "#ff5f57" }} />
              <span style={{ width: 13, height: 13, borderRadius: 7, background: "#febc2e" }} />
              <span style={{ width: 13, height: 13, borderRadius: 7, background: "#28c840" }} />
              <span style={{ marginLeft: 16, fontFamily: FONT.ui, fontSize: 17, color: C.ink2 }}>{w.title}</span>
            </div>
            {w.front && (
              <div style={{ padding: "10px 30px", fontFamily: FONT.ui, fontSize: 40, color: C.ink }}>
                Dear diary,{" "}
                <span style={{ display: "inline-block", width: 3, height: 42, marginLeft: 2, background: C.cyan, opacity: Math.floor(f / 15) % 2 ? 1 : 0.2, verticalAlign: "middle" }} />
              </div>
            )}
          </div>
        ))}
        {hl > 0.01 && (
          <div style={{ position: "absolute", left: 840 - 520 + 620, top: 470 - 260 - 48, opacity: hl, fontFamily: FONT.mono, fontSize: 20, color: C.cyan, transform: "translateX(-100%)", whiteSpace: "nowrap", background: "rgba(4,8,18,0.8)", padding: "6px 12px", borderRadius: 10 }}>
            frontmost window · keyboard focus
          </div>
        )}
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {go > 0 && go < 1 && <Spark x={px} y={py} color={C.cyan} r={13} />}
      </svg>
      {arrived > 0.01 && <Glow x={1150} y={660} size={500} color={C.cyan} a={0.4 * (1 - prog(f, sends + 30, 30))} />}
      {arrived > 0.01 && (
        <div style={{ position: "absolute", left: 1150, top: 900, transform: "translateX(-50%)", opacity: arrived, fontFamily: FONT.mono, fontSize: 22, color: C.cyan, background: "rgba(4,8,18,0.85)", padding: "8px 16px", borderRadius: 10, border: `1px solid ${hexA(C.cyan, 0.5)}` }}>
          event delivered → Notes
        </div>
      )}
      <div style={{ position: "absolute", left: 120, top: 330, width: 360, opacity: prog(f, start + 30, 20) }}>
        <Kicker color={C.blue}>Routing</Kicker>
        <div style={{ fontFamily: FONT.ui, fontSize: 30, color: C.ink, marginTop: 14, lineHeight: 1.35 }}>
          WindowServer tracks every window on screen — and which one has keyboard focus.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: 0, name: "typing", vol: 0.12 },
    { at: b.bang, name: "glitch", vol: 0.5 },
    { at: b.bang, name: "alarm", vol: 0.4 },
    { at: b.bang + 1, name: "impact", vol: 0.3 },
    { at: b.drops, name: "power_down", vol: 0.2 },
    { at: b.saves, name: "data", vol: 0.3 },
    { at: b.mode - 2, name: "sweep_up", vol: 0.35 },
    { at: b.mode, name: "pop_hi", vol: 0.3 },
    { at: b.jump, name: "whoosh", vol: 0.35 },
    { at: b.vector - 4, name: "blip_hi", vol: 0.35 },
    { at: b.control, name: "chime_lo", vol: 0.25 },
    { at: b.drivers - 8, name: "whoosh_soft", vol: 0.35 },
    { at: b.four - 6, name: "data", vol: 0.3 },
    { at: b.event, name: "pop", vol: 0.35 },
    { at: b.up + 4, name: "whoosh", vol: 0.4 },
    { at: b.up + 40, name: "swell", vol: 0.2 },
    { at: b.front - 4, name: "blip", vol: 0.3 },
    { at: b.sends, name: "whoosh_soft", vol: 0.35 },
    { at: b.sends + 24, name: "key_click", vol: 0.5 },
  ];
};

export const Interrupt: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.rose, hueB: C.cyan, hueC: C.blue, intensity: 0.7 },
};
