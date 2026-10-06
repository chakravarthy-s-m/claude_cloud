import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker, NeonPath, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { Check, Cross, KeyIcon, SealBadge, BAD, OK } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    r1: c.r1.from,
    rom: wordAt(c.r1, "Boot ROM"),
    etched: wordAt(c.r1, "etched"),
    made: wordAt(c.r1, "when it was made"),
    never: wordAt(c.r1, "It can never be changed"),
    strength: wordAt(c.r1b, "strength"),
    weakness: wordAt(c.r1b, "weakness"),
    flaw: wordAt(c.r1b, "if a flaw"),
    update: wordAt(c.r1b, "no software update"),
    newChip: wordAt(c.r1b, "only a new chip"),
    small: wordAt(c.r1b, "So it's kept"),
    simple: wordAt(c.r1b, "small and simple"),
    key: c.r2.from,
    publicKey: wordAt(c.r2, "public key"),
    anchored: wordAt(c.r2, "Everything that follows"),
    job: c.r3.from,
    next: wordAt(c.r3, "load the next stage"),
    llb: wordAt(c.r3, "Low-Level Bootloader"),
    flash: wordAt(c.r3, "small flash chip"),
    before: c.r4.from,
    single: wordAt(c.r4, "a single instruction"),
    checks: wordAt(c.r4, "checks its signature"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

// ---------------------------------------------------------------- the ROM bit array
const COLS = 28;
const ROWS = 16;
const BIT = (i: number, j: number) => rnd(`rom${i}-${j}`) > 0.48;

/** The mask ROM: a grid of etched bits, seen in perspective. */
const RomArray: React.FC<{ etch: number; glow: number; hit: number; tint?: string; w?: number; h?: number; flawAt?: number }> = ({
  etch,
  glow,
  hit,
  tint = C.gold,
  w = 1000,
  h = 560,
  flawAt = 0,
}) => {
  const f = useCurrentFrame();
  const cw = w / COLS;
  const ch = h / ROWS;
  const sweep = etch * (COLS + 4) - 2;
  return (
    <svg width={w + 40} height={h + 40} style={{ overflow: "visible" }}>
      <rect x={-10} y={-10} width={w + 20} height={h + 20} rx={14} fill="rgba(14,12,6,0.9)" stroke={hexA(tint, 0.6)} strokeWidth={2} />
      {new Array(ROWS).fill(0).map((_, j) => (
        <line key={`r${j}`} x1={0} y1={(j + 0.5) * ch} x2={w} y2={(j + 0.5) * ch} stroke={hexA(tint, 0.12)} strokeWidth={1.5} />
      ))}
      {new Array(COLS).fill(0).map((_, i) => (
        <line key={`c${i}`} x1={(i + 0.5) * cw} y1={0} x2={(i + 0.5) * cw} y2={h} stroke={hexA(tint, 0.08)} strokeWidth={1.5} />
      ))}
      {new Array(COLS).fill(0).map((_, i) =>
        new Array(ROWS).fill(0).map((__, j) => {
          if (!BIT(i, j)) return null;
          const e = clamp(sweep - i);
          if (e <= 0) return null;
          const tw = 0.6 + 0.4 * Math.sin(f * 0.15 + i * 0.7 + j * 1.3);
          const isFlaw = flawAt > 0 && i === 17 && j === 6;
          const col = isFlaw ? mixC(tint, BAD, flawAt) : tint;
          return (
            <g key={`${i}-${j}`}>
              <rect x={(i + 0.5) * cw - cw * 0.28} y={(j + 0.5) * ch - ch * 0.28} width={cw * 0.56} height={ch * 0.56} rx={3} fill={hexA(col, (0.35 + 0.5 * glow * tw) * e)} />
              <circle cx={(i + 0.5) * cw} cy={(j + 0.5) * ch} r={cw * 0.12} fill={hexA("#fff7e0", 0.8 * e * (0.4 + 0.6 * glow))} />
            </g>
          );
        }),
      )}
      {/* lithography light: a bright band sweeping across as the pattern is etched */}
      {etch > 0 && etch < 1 && (
        <rect x={((sweep + 0.5) / COLS) * w - 30} y={-30} width={60} height={h + 60} fill={hexA("#d9c4ff", 0.35)} style={{ filter: "blur(8px)" }} />
      )}
      {hit > 0.01 && <rect x={-10} y={-10} width={w + 20} height={h + 20} rx={14} fill="none" stroke={BAD} strokeWidth={6} opacity={hit} />}
    </svg>
  );
};

const mixC = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
};

// ---------------------------------------------------------------- act 1: etched, read-only
const Etched: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = prog(f, 40, 30);
  const etch = prog(f, b.etched - 4, b.made - b.etched + 30, EASE.inOut);
  const glow = prog(f, b.made + 20, 30);
  // the write attempt
  const W = b.never + 2;
  const fly = prog(f, W - 18, 18, EASE.in);
  const bounce = spr(f, fps, W, { damping: 9, stiffness: 120 });
  const hit = prog(f, W - 1, 3) * (1 - prog(f, W + 3, 26));
  const lockA = prog(f, W + 4, 14, EASE.outBack);
  const tilt = keyframes(f, [[0, 58], [b.made, 50], [b.never, 46]]);
  const penX = mix(1700, 1180, fly) + (f > W ? bounce * 260 : 0);
  const penY = mix(160, 430, fly) - (f > W ? bounce * 180 : 0);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110, opacity: prog(f, b.rom - 6, 14) }}>
        <Kicker color={C.gold}>The Boot ROM</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 64, letterSpacing: "-0.03em", color: C.ink, marginTop: 10 }}>Written once, at the factory</div>
      </div>
      <Glow x={960} y={600} size={1400} color={C.gold} a={0.08 + 0.12 * glow} />
      <AbsoluteFill style={{ perspective: 1600, perspectiveOrigin: "50% 40%" }}>
        <div
          style={{
            position: "absolute",
            left: 960 - 520,
            top: 600 - 300,
            transform: `rotateX(${tilt}deg) rotateZ(${-8 + 4 * etch}deg) translateZ(${(1 - appear) * -400}px)`,
            transformStyle: "preserve-3d",
            opacity: appear,
            filter: hit > 0.05 ? `drop-shadow(0 0 30px ${BAD})` : `drop-shadow(0 0 ${30 * glow}px ${hexA(C.gold, 0.5)})`,
          }}
        >
          <RomArray etch={etch} glow={glow} hit={hit} />
        </div>
      </AbsoluteFill>
      {/* photomask label during etching */}
      <div style={{ position: "absolute", right: 140, top: 160, opacity: inOut(f, b.etched - 4, 14, b.never - 10, 14), textAlign: "right" }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 18, letterSpacing: "0.35em", color: hexA("#d9c4ff", 0.95) }}>PATTERNED INTO SILICON</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 20, color: C.ink2, marginTop: 6 }}>every 1 and 0 is physical</div>
      </div>
      {/* the write attempt */}
      {f > W - 20 && f < b.strength + 10 && (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 1 - prog(f, b.strength - 10, 14) }}>
          <g transform={`translate(${penX} ${penY}) rotate(${f > W ? bounce * 40 : 0})`}>
            <rect x={-70} y={-28} width={140} height={56} rx={14} fill="rgba(30,10,16,0.92)" stroke={BAD} strokeWidth={2.5} />
            <text y={9} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={24} fill={BAD}>
              WRITE
            </text>
          </g>
          {hit > 0.01 &&
            new Array(14).fill(0).map((_, i) => {
              const ang = rnd(`sp${i}`, 0, Math.PI * 2);
              const r = (1 - hit) * rnd(`sr${i}`, 80, 220);
              return <Spark key={i} x={1180 + Math.cos(ang) * r} y={440 + Math.sin(ang) * r * 0.6} color={i % 2 ? BAD : C.amber} r={5} a={hit} />;
            })}
        </svg>
      )}
      {lockA > 0.01 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 120, display: "flex", justifyContent: "center", opacity: clamp(lockA) * (1 - prog(f, b.strength - 10, 14)) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "14px 28px", borderRadius: 18, background: "rgba(8,8,14,0.86)", border: `1.5px solid ${hexA(C.gold, 0.7)}`, transform: `scale(${mix(0.7, 1, clamp(lockA))})` }}>
            <svg width={40} height={46}>
              <rect x={4} y={18} width={32} height={26} rx={5} fill={C.gold} />
              <path d="M10,18 V12 a10,10 0 0 1 20,0 V18" fill="none" stroke={C.gold} strokeWidth={5} />
            </svg>
            <span style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 30, letterSpacing: "0.3em", color: C.ink }}>READ-ONLY · FOREVER</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 2: strength & weakness
const TwoSides: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const leftA = prog(f, b.strength - 6, 16);
  const rightA = prog(f, b.weakness - 6, 16);
  const splitOut = prog(f, b.small - 10, 16, EASE.in);
  // strength: tampering bounces
  const tamper = (f - b.strength - 6) / 26;
  const tp = tamper - Math.floor(tamper);
  const tamperOn = f > b.strength + 6 && f < b.weakness + 30;
  // weakness: a flaw glows red inside; an update bounces
  const flawA = prog(f, b.flaw + 6, 16);
  const upFly = prog(f, b.update - 4, 22, EASE.in);
  const upBounce = spr(f, fps, b.update + 18, { damping: 10, stiffness: 120 });
  const upHit = prog(f, b.update + 17, 3) * (1 - prog(f, b.update + 20, 24));
  const newChip = spr(f, fps, b.newChip, { damping: 18, stiffness: 90 });
  // small and simple: comparison
  const cmpA = prog(f, b.small - 4, 18);
  const shrink = prog(f, b.simple - 6, 30, EASE.inOut);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      {/* split view */}
      <AbsoluteFill style={{ opacity: 1 - splitOut }}>
        {/* left: strength */}
        <div style={{ position: "absolute", left: 120, top: 150, width: 780, opacity: leftA }}>
          <Kicker color={OK}>strength</Kicker>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 48, color: C.ink, marginTop: 10 }}>Nothing can change it</div>
          <div style={{ marginTop: 70, transform: "perspective(1200px) rotateX(40deg) scale(0.74)", transformOrigin: "0 0" }}>
            <RomArray etch={1} glow={0.8} hit={0} w={820} h={460} />
          </div>
          {tamperOn && (
            <svg width={780} height={600} style={{ position: "absolute", left: 0, top: 160, overflow: "visible" }}>
              {[0, 1, 2].map((k) => {
                const p = clamp(tp * 1.6 - k * 0.25);
                const x = mix(760, 300 + k * 60, Math.min(1, p * 1.8)) + (p > 0.55 ? (p - 0.55) * 900 : 0);
                const y = mix(-40, 170 + k * 30, Math.min(1, p * 1.8)) - (p > 0.55 ? (p - 0.55) * 500 : 0);
                return (
                  <g key={k} transform={`translate(${x} ${y})`} opacity={p > 0 && p < 1 ? 1 : 0}>
                    <BugGlyph col={BAD} s={1.5} />
                  </g>
                );
              })}
            </svg>
          )}
        </div>
        {/* divider */}
        <div style={{ position: "absolute", left: 958, top: 170, width: 2, height: 760, background: `linear-gradient(180deg, transparent, ${hexA(C.ink, 0.25)}, transparent)`, opacity: rightA }} />
        {/* right: weakness */}
        <div style={{ position: "absolute", left: 1020, top: 150, width: 780, opacity: rightA }}>
          <Kicker color={BAD}>weakness</Kicker>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 48, color: C.ink, marginTop: 10 }}>Nothing can fix it</div>
          <div style={{ marginTop: 70, transform: `perspective(1200px) rotateX(40deg) scale(0.74) translateY(${clamp(newChip) * 500}px)`, transformOrigin: "0 0", opacity: 1 - clamp(newChip * 1.4) }}>
            <RomArray etch={1} glow={0.8} hit={upHit} w={820} h={460} flawAt={flawA} />
          </div>
          {/* a brand-new chip slides in */}
          {newChip > 0.01 && (
            <div style={{ position: "absolute", left: 0, top: 184, transform: `perspective(1200px) rotateX(40deg) scale(0.74) translateY(${(1 - newChip) * -500}px)`, transformOrigin: "0 0", opacity: clamp(newChip * 1.5) }}>
              <RomArray etch={1} glow={1} hit={0} w={820} h={460} tint={C.green} />
            </div>
          )}
          {newChip > 0.3 && (
            <div style={{ position: "absolute", left: 120, top: 640, fontFamily: FONT.ui, fontWeight: 700, fontSize: 24, letterSpacing: "0.3em", color: OK, opacity: clamp(newChip) }}>THE ONLY FIX: NEW SILICON</div>
          )}
          {flawA > 0.01 && newChip < 0.5 && (
            <div style={{ position: "absolute", left: 470, top: 640, opacity: flawA * (1 - clamp(newChip * 2)), display: "flex", alignItems: "center", gap: 10 }}>
              <svg width={38} height={38}>
                <BugGlyph col={BAD} s={0.7} x={19} y={19} />
              </svg>
              <span style={{ fontFamily: FONT.mono, fontSize: 20, color: BAD }}>a flaw, etched in</span>
            </div>
          )}
          {/* the update that can't land */}
          {upFly > 0 && newChip < 0.2 && (
            <div
              style={{
                position: "absolute",
                left: mix(560, 260, upFly) + (f > b.update + 18 ? upBounce * 300 : 0),
                top: mix(-20, 300, upFly) - (f > b.update + 18 ? upBounce * 240 : 0),
                transform: `rotate(${f > b.update + 18 ? upBounce * 30 : 0}deg)`,
                padding: "12px 18px",
                borderRadius: 14,
                background: "rgba(12,16,32,0.94)",
                border: `1.5px solid ${hexA(C.blue, 0.8)}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <svg width={28} height={28}>
                <path d="M14,3 V19 M7,12 L14,19 L21,12" fill="none" stroke={C.blue} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                <rect x={4} y={22} width={20} height={3} rx={1.5} fill={C.blue} />
              </svg>
              <span style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 22, color: C.ink }}>software update</span>
              {f > b.update + 18 && (
                <svg width={30} height={30}>
                  <Cross x={15} y={15} r={13} />
                </svg>
              )}
            </div>
          )}
        </div>
      </AbsoluteFill>
      {/* small & simple */}
      {cmpA > 0.01 && (
        <AbsoluteFill style={{ opacity: cmpA }}>
          <div style={{ position: "absolute", left: 120, top: 110 }}>
            <Kicker color={C.gold}>so: keep it tiny</Kicker>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 56, color: C.ink, marginTop: 10 }}>Less code, fewer places for a flaw</div>
          </div>
          {/* the OS: a vast block of code */}
          <div style={{ position: "absolute", left: 980, top: 300, width: 760, height: 600, borderRadius: 24, border: `1.5px solid ${hexA(C.violet, 0.5)}`, background: hexA(C.violet, 0.06), overflow: "hidden", opacity: prog(f, b.small + 6, 18) }}>
            {new Array(46).fill(0).map((_, i) => (
              <div key={i} style={{ position: "absolute", left: 24 + ((i * 37) % 3) * 8, top: 22 + i * 12.6, height: 5, width: 200 + ((i * 97) % 480), borderRadius: 3, background: hexA(C.violet, 0.28) }} />
            ))}
            <div style={{ position: "absolute", right: 24, bottom: 18, fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: C.ink }}>an operating system</div>
          </div>
          {/* the ROM: tiny */}
          <div style={{ position: "absolute", left: mix(420, 600, shrink) - mix(220, 70, shrink), top: 600 - mix(160, 60, shrink), width: mix(440, 140, shrink), height: mix(320, 120, shrink), borderRadius: 16, border: `2px solid ${C.gold}`, background: hexA(C.gold, 0.12), boxShadow: `0 0 40px ${hexA(C.gold, 0.35)}`, overflow: "hidden" }}>
            {new Array(8).fill(0).map((_, i) => (
              <div key={i} style={{ position: "absolute", left: 14, top: 12 + i * mix(36, 13, shrink), height: mix(8, 3, shrink), width: `${50 + ((i * 29) % 40)}%`, borderRadius: 3, background: hexA(C.gold, 0.5) }} />
            ))}
          </div>
          <div style={{ position: "absolute", left: 600 - 160, top: 700, width: 320, textAlign: "center", opacity: prog(f, b.simple + 10, 16) }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: C.ink }}>the Boot ROM</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 18, color: C.gold }}>small · simple · auditable</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

const BugGlyph: React.FC<{ col: string; s?: number; x?: number; y?: number }> = ({ col, s = 1, x = 0, y = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx={0} cy={2} rx={11} ry={14} fill={hexA(col, 0.3)} stroke={col} strokeWidth={2.4} />
    <circle cx={0} cy={-14} r={6} fill={col} />
    {[-1, 1].map((sd) => (
      <g key={sd} stroke={col} strokeWidth={2.2} strokeLinecap="round">
        <line x1={sd * 10} y1={-4} x2={sd * 20} y2={-10} />
        <line x1={sd * 11} y1={4} x2={sd * 21} y2={4} />
        <line x1={sd * 10} y1={11} x2={sd * 19} y2={18} />
      </g>
    ))}
  </g>
);

// ---------------------------------------------------------------- act 3: the key in the ROM
const TheKey: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spr(f, fps, b.key + 4, { damping: 16, stiffness: 70 });
  const label = prog(f, b.publicKey - 6, 16);
  const chainA = prog(f, b.anchored - 4, 20);
  const linkLabels = ["LOW-LEVEL BOOTLOADER", "iBOOT", "KERNEL", "SYSTEM", "EVERYTHING ELSE"];
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Glow x={700} y={500} size={1100} color={C.gold} a={0.12 + 0.2 * clamp(rise)} />
      {/* the ROM below */}
      <div style={{ position: "absolute", left: 300, top: 640, transform: "perspective(1400px) rotateX(58deg) scale(0.8)", transformOrigin: "50% 0", opacity: 0.85 }}>
        <RomArray etch={1} glow={1} hit={0} w={900} h={420} />
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* light column from ROM to key */}
        <rect x={700 - 60} y={mix(700, 300, clamp(rise))} width={120} height={mix(0, 380, clamp(rise))} fill={hexA(C.gold, 0.08)} />
        <KeyIcon x={700} y={mix(720, 420, rise)} s={mix(1.2, 3.2, clamp(rise))} glow={1} rot={-12} />
        {/* the chain hanging from the key */}
        {linkLabels.map((t, i) => {
          const p = prog(f, b.anchored + i * 7, 16, EASE.outBack);
          const x = 1010 + i * 160;
          const y = 420 + i * 70;
          if (p <= 0) return null;
          return (
            <g key={t} opacity={clamp(p) * chainA}>
              <line x1={i === 0 ? 860 : x - 160 + 60} y1={i === 0 ? 420 : y - 70} x2={x - 60} y2={y} stroke={hexA(C.gold, 0.6)} strokeWidth={3} />
              <rect x={x - 66} y={y - 30} width={132} height={60} rx={30} fill={hexA(C.gold, 0.1)} stroke={C.gold} strokeWidth={4} transform={`rotate(${i % 2 ? 0 : 0} ${x} ${y})`} />
              <text x={x} y={y + 64} textAnchor="middle" fontFamily={FONT.mono} fontSize={15} fill={hexA(C.ink, 0.8)}>
                {t}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", left: 120, top: 110, opacity: label }}>
        <Kicker color={C.gold}>burned into the ROM</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 60, color: C.ink, marginTop: 10 }}>Apple’s public key</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 20, color: hexA(C.gold, 0.9), marginTop: 8 }}>the root of trust · can check, can’t sign</div>
      </div>
      <div style={{ position: "absolute", left: 1010 - 66, top: 330, opacity: chainA, fontFamily: FONT.ui, fontWeight: 700, fontSize: 18, letterSpacing: "0.3em", color: hexA(C.gold, 0.9) }}>
        ANCHORED TO IT
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 4: load the next stage
const SOCB = { x: 1040, y: 330, w: 560, h: 460 };
const FL = { x: 300, y: 500, w: 220, h: 150 };

const LoadNext: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const boardA = prog(f, b.job - 6, 18);
  const flashA = prog(f, b.job + 4, 16);
  const stream = prog(f, b.flash - 2, b.before - b.flash - 4, EASE.inOut);
  const gateA = prog(f, b.before - 6, 16);
  const stop = spr(f, fps, b.before + 2, { damping: 14, stiffness: 160 });
  const scan = prog(f, b.checks - 4, 40, EASE.inOut);
  const runLock = prog(f, b.single - 4, 14);
  // the package travels along the trace and stops at the gate
  const tx0 = FL.x + FL.w;
  const gateX = SOCB.x + 210;
  const pkgX = f < b.before ? mix(FL.x + FL.w / 2, SOCB.x - 40, stream) : mix(SOCB.x - 40, gateX - 120, clamp(stop));
  const pkgA = prog(f, b.llb - 4, 12);
  const pkgLift = 1 - prog(f, b.llb - 4, 16, EASE.out);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110, opacity: boardA }}>
        <Kicker color={C.gold}>job number one</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 56, color: C.ink, marginTop: 10 }}>Fetch the next stage</div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* board */}
        <rect x={180} y={260} width={1560} height={640} rx={36} fill={hexA("#0f2a20", 0.35 * boardA)} stroke={hexA(C.green, 0.25 * boardA)} strokeWidth={2} />
        {new Array(12).fill(0).map((_, i) => (
          <path key={i} d={`M${220 + i * 130},280 v${60 + (i % 3) * 30} h${40} v${500}`} fill="none" stroke={hexA(C.green, 0.08 * boardA)} strokeWidth={4} />
        ))}
        {/* trace flash → SoC */}
        <path d={`M${tx0},${FL.y + FL.h / 2} L${SOCB.x},${FL.y + FL.h / 2}`} stroke={hexA(C.ink, 0.2 * flashA)} strokeWidth={6} />
        <NeonPath d={`M${tx0},${FL.y + FL.h / 2} L${SOCB.x},${FL.y + FL.h / 2}`} color={C.cyan} width={3} progress={stream * 1.2} length={600} opacity={flashA} />
        {/* flash chip */}
        <g opacity={flashA}>
          <rect x={FL.x} y={FL.y} width={FL.w} height={FL.h} rx={12} fill="#161b28" stroke={hexA(C.cyan, 0.7)} strokeWidth={2} />
          {new Array(4).fill(0).map((_, i) => (
            <g key={i}>
              <rect x={FL.x + 30 + i * 48} y={FL.y - 12} width={16} height={12} fill="#3a4258" />
              <rect x={FL.x + 30 + i * 48} y={FL.y + FL.h} width={16} height={12} fill="#3a4258" />
            </g>
          ))}
          <text x={FL.x + FL.w / 2} y={FL.y + FL.h / 2 + 2} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={26} fill={C.ink}>
            FLASH
          </text>
          <text x={FL.x + FL.w / 2} y={FL.y + FL.h / 2 + 30} textAnchor="middle" fontFamily={FONT.mono} fontSize={15} fill={hexA(C.cyan, 0.9)}>
            on the logic board
          </text>
        </g>
        {/* SoC */}
        <g opacity={boardA}>
          <rect x={SOCB.x} y={SOCB.y} width={SOCB.w} height={SOCB.h} rx={22} fill="#121624" stroke={hexA(C.ink, 0.3)} strokeWidth={2.5} />
          <text x={SOCB.x + SOCB.w - 26} y={SOCB.y + 44} textAnchor="end" fontFamily={FONT.display} fontWeight={700} fontSize={30} fill={hexA(C.ink, 0.8)}>
            SoC
          </text>
          {/* boot ROM block inside */}
          <rect x={SOCB.x + 300} y={SOCB.y + 260} width={200} height={140} rx={12} fill={hexA(C.gold, 0.14)} stroke={C.gold} strokeWidth={2} />
          <text x={SOCB.x + 400} y={SOCB.y + 324} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={24} fill={C.ink}>
            BOOT ROM
          </text>
          <g transform={`translate(${SOCB.x + 400} ${SOCB.y + 362}) scale(0.5)`}>
            <KeyIcon x={0} y={0} s={1} glow={0.6} />
          </g>
          {/* the gate */}
          <g opacity={gateA}>
            <rect x={gateX - 14} y={FL.y + FL.h / 2 - 110} width={28} height={220} rx={8} fill={hexA(C.gold, 0.25)} stroke={C.gold} strokeWidth={3} />
            {[0, 1, 2, 3].map((i) => (
              <line key={i} x1={gateX - 14} y1={FL.y + FL.h / 2 - 80 + i * 54} x2={gateX + 14} y2={FL.y + FL.h / 2 - 60 + i * 54} stroke={C.gold} strokeWidth={3} />
            ))}
            <text x={gateX} y={FL.y + FL.h / 2 - 130} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={17} letterSpacing="0.2em" fill={C.gold}>
              VERIFY
            </text>
          </g>
        </g>
      </svg>
      {/* the LLB package */}
      {pkgA > 0.01 && (
        <div style={{ position: "absolute", left: pkgX - 100, top: FL.y + FL.h / 2 - 62 - (f < b.flash ? 150 * (1 - pkgLift) : 150 * (1 - prog(f, b.flash - 2, 14))), width: 200, opacity: pkgA, transform: `scale(${mix(0.6, 1, 1 - pkgLift)})` }}>
          <div style={{ padding: "14px 16px", borderRadius: 16, background: "rgba(10,16,30,0.95)", border: `2px solid ${C.cyan}`, boxShadow: `0 0 30px ${hexA(C.cyan, 0.35)}` }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: C.ink }}>LLB</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 14, color: hexA(C.cyan, 0.95) }}>low-level bootloader</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <svg width={34} height={34} style={{ overflow: "visible" }}>
                <SealBadge x={17} y={17} r={16} label="" col={scan > 0.2 ? C.gold : hexA(C.ink, 0.5)} />
              </svg>
              <span style={{ fontFamily: FONT.mono, fontSize: 14, color: scan > 0.2 ? C.gold : C.ink3 }}>signature</span>
            </div>
          </div>
          {/* scanning beam over the signature */}
          {scan > 0 && scan < 1 && <div style={{ position: "absolute", left: 0, right: 0, top: 6 + scan * 110, height: 3, background: C.gold, boxShadow: `0 0 16px ${C.gold}` }} />}
        </div>
      )}
      {/* "not yet": run is locked */}
      {runLock > 0.01 && (
        <div style={{ position: "absolute", left: gateX - 220, top: FL.y + FL.h / 2 + 90, opacity: runLock, display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 12, background: "rgba(30,12,18,0.9)", border: `1.5px solid ${hexA(BAD, 0.7)}` }}>
          <svg width={26} height={28}>
            <path d="M5,3 L22,14 L5,25 Z" fill={hexA(C.ink, 0.25)} />
          </svg>
          <span style={{ fontFamily: FONT.mono, fontSize: 18, color: BAD }}>run? not yet</span>
        </div>
      )}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 120, textAlign: "center", opacity: prog(f, b.checks - 2, 14) }}>
        <span style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 26, letterSpacing: "0.4em", color: C.gold }}>FIRST: CHECK THE SIGNATURE</span>
      </div>
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const a1 = 1 - prog(f, b.strength - 8, 14, EASE.in);
  const a2 = inOut(f, b.strength - 8, 14, b.key - 8, 14);
  const a3 = inOut(f, b.key - 8, 14, b.job - 8, 14);
  const a4 = prog(f, b.job - 8, 14);
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={12}>
      {a1 > 0.01 && <Etched b={b} a={a1} />}
      {a2 > 0.01 && <TwoSides b={b} a={a2} />}
      {a3 > 0.01 && <TheKey b={b} a={a3} />}
      {a4 > 0.01 && <LoadNext b={b} a={a4} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.etched - 4, name: "scan", vol: 0.35 },
    { at: b.made + 20, name: "shimmer", vol: 0.25 },
    { at: b.never - 16, name: "whoosh", vol: 0.3 },
    { at: b.never + 2, name: "impact", vol: 0.5 },
    { at: b.never + 3, name: "bounce", vol: 0.4 },
    { at: b.never + 8, name: "chime_lo", vol: 0.25 },
    { at: b.strength + 10, name: "bounce", vol: 0.25 },
    { at: b.flaw + 6, name: "glitch", vol: 0.3 },
    { at: b.update + 17, name: "thud", vol: 0.4 },
    { at: b.update + 18, name: "bounce", vol: 0.3 },
    { at: b.newChip, name: "whoosh_soft", vol: 0.35 },
    { at: b.simple - 6, name: "sweep_down", vol: 0.25 },
    { at: b.key + 4, name: "swell", vol: 0.35 },
    { at: b.publicKey - 4, name: "chime", vol: 0.3 },
    { at: b.anchored, name: "tick", vol: 0.3 },
    { at: b.anchored + 7, name: "tick", vol: 0.3 },
    { at: b.anchored + 14, name: "tick", vol: 0.3 },
    { at: b.anchored + 21, name: "tick", vol: 0.3 },
    { at: b.llb - 4, name: "data", vol: 0.35 },
    { at: b.before + 2, name: "thud", vol: 0.4 },
    { at: b.single - 4, name: "blip_lo", vol: 0.3 },
    { at: b.checks - 4, name: "scan", vol: 0.35 },
  ];
};

export const BootRom: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.gold, hueB: C.amber, hueC: C.violet, intensity: 0.55 },
};
