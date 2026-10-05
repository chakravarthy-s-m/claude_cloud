import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { cam, project } from "../../lib/proj3d";
import { MacBook3D, SOC_POS } from "../../components/macbook";
import { Chip3D, ChipLabel, kindAnchor, memAnchor, type ChipState } from "../../components/chip";
import { Glow, Kicker } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    appear: 66,
    open: wordAt(c.m2, "Open up"),
    chip: wordAt(c.m2, "one small chip"),
    soc: c.m3.from - 14,
    pcore: wordAt(c.m4, "Performance"),
    ecore: wordAt(c.m4, "efficiency"),
    gpu: wordAt(c.m4, "graphics"),
    npu: wordAt(c.m4, "Neural"),
    storage: wordAt(c.m4, "storage"),
    display: wordAt(c.m4, "displays"),
    secure: wordAt(c.m4, "security"),
    mem: wordAt(c.m4, "the memory"),
    count: c.m5.from + 6,
    nothing: wordAt(c.m6, "does nothing"),
    software: wordAt(c.m6, "It needs software"),
  };
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const b = beats(s);

  // ------------------------------------------------ MacBook phase
  const macIn = spr(f, fps, b.appear, { damping: 22, stiffness: 70 });
  const explode = prog(f, b.open, 46, EASE.inOut);
  const push = prog(f, b.chip - 10, b.soc - b.chip + 30, EASE.inOut);
  const macOut = prog(f, b.soc, 18, EASE.in);
  const mc = cam({
    yaw: keyframes(f, [[b.appear, -38], [b.open, -24], [b.chip, -14]]),
    pitch: mix(keyframes(f, [[b.appear, 20], [b.open, 30]]), 62, push),
    dist: 4200,
    scale: mix(mix(0.5, 0.6, macIn), 3.6, push * push) * (1 + macOut * 2),
    target: [mix(0, SOC_POS[0], push), mix(mix(140, 120, explode), SOC_POS[1], push), mix(mix(320, 60, explode), SOC_POS[2], push)],
    cy: mix(600, 540, push),
  });
  const socGlow = prog(f, b.chip - 6, 20);

  // ------------------------------------------------ chip phase
  const chipIn = prog(f, b.soc - 4, 26, EASE.out);
  const ccam = cam({
    yaw: keyframes(f, [[b.soc, -6], [b.pcore, -20], [b.mem, -34], [b.count, -30], [b.nothing, -36], [s.durationInFrames, -45]]),
    pitch: keyframes(f, [[b.soc, 58], [b.pcore, 47], [b.mem, 42], [b.count, 55], [b.nothing, 44], [s.durationInFrames, 33]]),
    dist: 5200,
    scale: keyframes(f, [[b.soc, 0.42], [b.soc + 40, 0.6], [b.pcore, 0.66], [b.mem, 0.7], [b.count, 0.78], [b.nothing, 0.7], [s.durationInFrames, 0.52]]),
    target: [keyframes(f, [[b.pcore, 60], [b.mem, 170]]), 0, 0],
    cy: 560,
  });

  const on = (at: number, d = 22) => spr(f, fps, at, { damping: 18, stiffness: 120 }) * (d > 0 ? 1 : 1);
  const powerOff = prog(f, b.nothing, 30, EASE.inOut);
  const st: ChipState = {
    rise: {
      pcore: on(b.pcore) * (1 - prog(f, b.count, 30) * 0.7),
      pl2: on(b.pcore + 6) * 0.6 * (1 - prog(f, b.count, 30) * 0.7),
      ecore: on(b.ecore) * 0.8 * (1 - prog(f, b.count, 30) * 0.7),
      el2: on(b.ecore + 6) * 0.5 * (1 - prog(f, b.count, 30) * 0.7),
      gpu: on(b.gpu) * 0.9 * (1 - prog(f, b.count, 30) * 0.7),
      npu: on(b.npu) * 0.85 * (1 - prog(f, b.count, 30) * 0.7),
      storage: on(b.storage) * 0.7 * (1 - prog(f, b.count, 30) * 0.7),
      display: on(b.display) * 0.7 * (1 - prog(f, b.count, 30) * 0.7),
      secure: on(b.secure) * 0.7 * (1 - prog(f, b.count, 30) * 0.7),
      slc: on(b.mem) * 0.3 * (1 - prog(f, b.count, 30) * 0.7),
    },
    lit: {
      pcore: prog(f, b.pcore - 4, 12),
      pl2: prog(f, b.pcore + 4, 12) * 0.7,
      ecore: prog(f, b.ecore - 4, 12),
      el2: prog(f, b.ecore + 4, 12) * 0.7,
      gpu: prog(f, b.gpu - 4, 12),
      npu: prog(f, b.npu - 4, 12),
      storage: prog(f, b.storage - 4, 12),
      display: prog(f, b.display - 4, 12),
      secure: prog(f, b.secure - 4, 12),
      media: prog(f, b.mem, 20) * 0.6,
      io: prog(f, b.mem, 20) * 0.6,
      slc: prog(f, b.mem, 20) * 0.7,
      phy: prog(f, b.mem, 20) * 0.9,
      fabric: prog(f, b.count, 20) * 0.35,
    },
    memRise: on(b.mem),
    memLit: prog(f, b.mem - 4, 14),
    power: 1 - powerOff * 0.85,
    sparkle: inOut(f, b.count - 4, 20, b.nothing, 20),
    frame: f,
  };

  const lab = (start: number, end: number) => inOut(f, start - 2, 12, end, 10);
  const nextAfter = (x: number) => x + 34;

  const P = kindAnchor(ccam, "pcore", st);
  const E = kindAnchor(ccam, "ecore", st);
  const G = kindAnchor(ccam, "gpu", st);
  const N = kindAnchor(ccam, "npu", st);
  const ST = kindAnchor(ccam, "storage", st);
  const DI = kindAnchor(ccam, "display", st);
  const SE = kindAnchor(ccam, "secure", st);
  const M = memAnchor(ccam, st);

  const count = mix(0, 28e9, prog(f, b.count, 66, EASE.out));
  const countA = inOut(f, b.count - 6, 14, b.nothing + 10, 16);
  const swText = spr(f, fps, b.software, { damping: 20, stiffness: 110 });

  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={14} zoomOut={1.0}>
      {/* MacBook */}
      {macOut < 1 && f >= b.appear - 2 && (
        <AbsoluteFill style={{ opacity: clamp(macIn * 1.5) * (1 - macOut), filter: macOut > 0.02 ? `blur(${macOut * 14}px)` : undefined }}>
          <Glow x={960} y={560} size={1700} color={C.indigo} a={0.2} />
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <MacBook3D cam={mc} frame={f} st={{ explode, lid: 1 - explode, socGlow, screen: 1 - explode * 0.6 }} />
          </svg>
          {socGlow > 0.01 &&
            (() => {
              const p = project(mc, SOC_POS);
              return <Glow x={p.x} y={p.y} size={380 * mc.scale} color={C.cyan} a={0.45 * socGlow} />;
            })()}
          <div style={{ position: "absolute", left: 110, top: 150, opacity: inOut(f, b.appear + 10, 20, b.open + 20, 20) }}>
            <Kicker color={C.green} at={b.appear + 10}>
              The machine
            </Kicker>
            <div style={{ fontFamily: FONT.display, fontSize: 64, fontWeight: 700, color: C.ink, marginTop: 14, letterSpacing: "-0.03em" }}>A modern Mac laptop</div>
          </div>
        </AbsoluteFill>
      )}

      {/* Chip */}
      {f >= b.soc - 6 && (
        <AbsoluteFill style={{ opacity: chipIn, transform: `scale(${mix(1.6, 1, chipIn)})`, filter: chipIn < 0.98 ? `blur(${(1 - chipIn) * 12}px)` : undefined }}>
          <Glow x={960} y={560} size={1800} color={C.cyan} a={0.12 * (1 - powerOff)} />
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <Chip3D cam={ccam} st={st} />
          </svg>
          <ChipLabel {...P} text="Performance cores" sub="4 × P-core · big & fast" color={C.pink} a={lab(b.pcore, nextAfter(b.ecore))} dx={-120} dy={-170} />
          <ChipLabel {...E} text="Efficiency cores" sub="6 × E-core · sip power" color={C.teal} a={lab(b.ecore, nextAfter(b.gpu))} dx={-200} dy={-120} />
          <ChipLabel {...G} text="GPU" sub="10 graphics cores" color={C.violet} a={lab(b.gpu, nextAfter(b.npu))} dx={60} dy={-190} />
          <ChipLabel {...N} text="Neural Engine" sub="16 cores · AI math" color={C.amber} a={lab(b.npu, nextAfter(b.storage))} dx={-160} dy={-160} />
          <ChipLabel {...ST} text="Storage" sub="SSD controller" color={C.orange} a={lab(b.storage, b.mem + 30)} dx={190} dy={-60} />
          <ChipLabel {...DI} text="Display" sub="display engines" color={C.cyan} a={lab(b.display, b.mem + 30)} dx={-60} dy={140} />
          <ChipLabel {...SE} text="Security" sub="Secure Enclave" color={C.lime} a={lab(b.secure, b.mem + 30)} dx={160} dy={-150} />
          <ChipLabel {...M} text="Unified memory" sub="on the same package" color={C.teal} a={lab(b.mem, b.count - 4)} dx={120} dy={-170} />
          {/* intro title */}
          <div style={{ position: "absolute", left: 110, top: 140, opacity: inOut(f, b.soc + 10, 20, b.pcore - 10, 16) }}>
            <Kicker color={C.green} at={b.soc + 10}>
              System on a chip
            </Kicker>
            <div style={{ fontFamily: FONT.display, fontSize: 72, fontWeight: 700, color: C.ink, marginTop: 14, letterSpacing: "-0.03em" }}>
              One slab of silicon.
              <br />
              <span style={{ color: C.green }}>A whole computer.</span>
            </div>
          </div>
          {/* transistor counter */}
          {countA > 0.01 && (
            <div style={{ position: "absolute", top: 110, width: "100%", textAlign: "center", opacity: countA }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 120, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", textShadow: `0 0 50px ${hexA(C.cyan, 0.55)}` }}>
                {Math.round(count).toLocaleString("en-US")}
              </div>
              <div style={{ fontFamily: FONT.ui, fontSize: 26, fontWeight: 600, letterSpacing: "0.5em", color: C.cyan, marginTop: 6 }}>TRANSISTORS · M4</div>
            </div>
          )}
          {/* "needs software" */}
          {swText > 0.01 && (
            <div style={{ position: "absolute", bottom: 120, width: "100%", textAlign: "center", opacity: clamp(swText * 1.3), transform: `translateY(${(1 - swText) * 30}px)` }}>
              <span style={{ fontFamily: FONT.display, fontSize: 70, fontWeight: 700, color: C.ink, letterSpacing: "-0.03em" }}>
                Hardware needs <span style={{ color: C.violet, textShadow: `0 0 40px ${hexA(C.violet, 0.8)}` }}>software.</span>
              </span>
            </div>
          )}
        </AbsoluteFill>
      )}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const ticks: SfxEvent[] = [];
  for (let i = 0; i < 22; i++) {
    const t = Math.pow(i / 22, 1.8) * 64;
    ticks.push({ at: b.count + t, name: "tick", vol: 0.35 });
  }
  return [
    { at: b.appear, name: "swell", vol: 0.25 },
    { at: b.open - 4, name: "whoosh", vol: 0.5 },
    { at: b.open + 10, name: "sweep_up", vol: 0.25 },
    { at: b.chip - 6, name: "shimmer", vol: 0.3 },
    { at: b.soc - 6, name: "whoosh_big", vol: 0.5 },
    { at: b.soc + 6, name: "boom_soft", vol: 0.35 },
    { at: b.pcore - 2, name: "pop", vol: 0.35 },
    { at: b.ecore - 2, name: "pop", vol: 0.32 },
    { at: b.gpu - 2, name: "pop_hi", vol: 0.32 },
    { at: b.npu - 2, name: "pop", vol: 0.32 },
    { at: b.storage - 2, name: "blip", vol: 0.25 },
    { at: b.display - 2, name: "blip", vol: 0.25 },
    { at: b.secure - 2, name: "blip_hi", vol: 0.25 },
    { at: b.mem - 2, name: "pop_hi", vol: 0.35 },
    { at: b.count - 4, name: "shimmer", vol: 0.3 },
    ...ticks,
    { at: b.count + 66, name: "chime", vol: 0.25 },
    { at: b.nothing - 2, name: "power_down", vol: 0.45 },
    { at: b.software - 2, name: "swell", vol: 0.3 },
  ];
};

export const Machine: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.green, hueB: C.cyan, hueC: C.violet, intensity: 0.8 },
};
