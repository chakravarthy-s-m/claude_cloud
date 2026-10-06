import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker, NeonPath, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { BAD, ChainRow, Check, Cross, HASH_A, HASH_B, KeyIcon, OK, PAYLOAD, PAYLOAD_FLIP_AT, SealBadge, type LinkItem } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    how: c.g1.from,
    run: wordAt(c.g1, "run through"),
    hashFn: wordAt(c.g1, "hash function"),
    boils: wordAt(c.g1, "boils it down"),
    finger: wordAt(c.g1, "short fingerprint"),
    change: c.g2.from,
    bit: wordAt(c.g2, "single bit"),
    completely: wordAt(c.g2, "changes completely"),
    signs: c.g3.from,
    privateKey: wordAt(c.g3, "private key"),
    never: wordAt(c.g3, "never leaves"),
    publicKey: wordAt(c.g3, "The public key"),
    check: wordAt(c.g3, "can check"),
    forge: wordAt(c.g3, "can't forge"),
    fails: c.g4.from,
    refuses: wordAt(c.g4, "refuses to start"),
    waits: wordAt(c.g4, "waits for another"),
    restore: wordAt(c.g4, "restore it"),
    passes: c.g5.from,
    moves: wordAt(c.g5, "control moves on"),
    every: wordAt(c.g5, "every stage"),
    chain: wordAt(c.g5, "A chain of trust"),
    silicon: wordAt(c.g5, "anchored in silicon"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

const DIFF = HASH_A.split("").map((ch, i) => ch !== HASH_B[i]);
const DIFF_N = DIFF.filter(Boolean).length; // 57 of 64 hex digits
const BITS_DIFF = 126; // of 256 (computed offline: popcount(A xor B))

// ---------------------------------------------------------------- fingerprint glyph from a hash
const coeffs = (h: string) => new Array(12).fill(0).map((_, k) => ({ a: parseInt(h[k * 2], 16) / 15, p: (parseInt(h[k * 2 + 1], 16) / 16) * Math.PI * 2 }));

const Fingerprint: React.FC<{ hashA: string; hashB: string; t: number; r?: number; col?: string; reveal?: number }> = ({ hashA, hashB, t, r = 150, col = C.cyan, reveal = 1 }) => {
  const ca = coeffs(hashA);
  const cb = coeffs(hashB);
  const cx = r + 10;
  const cy = r + 10;
  const ridges = 15;
  const paths: React.ReactNode[] = [];
  for (let k = 0; k < ridges; k++) {
    const base = (r * (k + 1.4)) / (ridges + 1.4);
    let d = "";
    const N = 90;
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * Math.PI * 2;
      let off = 0;
      for (let j = 1; j < 6; j++) {
        const A = mix(ca[j].a, cb[j].a, t);
        const P = mix(ca[j].p, cb[j].p, t);
        off += Math.sin(j * th + P + k * 0.35 * mix(ca[0].a, cb[0].a, t)) * A * (4 + k * 0.9);
      }
      const rr = base + off;
      const x = cx + Math.cos(th) * rr;
      const y = cy + Math.sin(th) * rr * 1.18;
      d += `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    }
    // ridge breaks, chosen by the hash
    const gapA = mix(ca[6 + (k % 6)].p, cb[6 + (k % 6)].p, t);
    const len = 2 * Math.PI * base;
    const dash = `${(len * 0.72).toFixed(0)} ${(len * 0.06).toFixed(0)} ${(len * 0.16).toFixed(0)} ${(len * 0.06).toFixed(0)}`;
    paths.push(
      <path key={k} d={d} fill="none" stroke={col} strokeWidth={3.2} strokeLinecap="round" strokeDasharray={dash} strokeDashoffset={(gapA / (Math.PI * 2)) * len} opacity={clamp(reveal * ridges - k)} />,
    );
  }
  return (
    <svg width={2 * r + 20} height={2 * r * 1.18 + 20} style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="fp-fade">
          <stop offset="70%" stopColor="#fff" stopOpacity={1} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
      </defs>
      <g style={{ filter: `drop-shadow(0 0 6px ${hexA(col, 0.6)})` }}>{paths}</g>
    </svg>
  );
};

const HexDigest: React.FC<{ hash: string; prev?: string; show: number; flash?: number; size?: number }> = ({ hash, prev, show, flash = 0, size = 26 }) => {
  const rows = [0, 1, 2, 3].map((r) => hash.slice(r * 16, r * 16 + 16));
  const n = Math.round(show * 64);
  return (
    <div style={{ fontFamily: FONT.mono, fontSize: size, lineHeight: 1.35, letterSpacing: "0.12em" }}>
      {rows.map((row, ri) => (
        <div key={ri}>
          {row.split("").map((ch, ci) => {
            const i = ri * 16 + ci;
            const changed = prev !== undefined && prev[i] !== ch;
            return (
              <span key={ci} style={{ color: i < n ? (changed && flash > 0 ? BAD : C.ink) : hexA(C.ink, 0.12), textShadow: changed && flash > 0 ? `0 0 ${12 * flash}px ${BAD}` : undefined }}>
                {i < n ? ch : "·"}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- act 1+2: hashing & the avalanche
const Hashing: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const codeA = prog(f, b.how - 4, 16);
  const machineA = prog(f, b.run - 10, 16);
  const run1 = prog(f, b.run + 4, b.finger - b.run, EASE.inOut);
  const out1 = prog(f, b.finger - 6, 26, EASE.linear);
  const flip = prog(f, b.bit - 2, 10, EASE.inOut);
  const run2 = prog(f, b.bit + 10, 30, EASE.inOut);
  const morph = prog(f, b.completely - 8, 30, EASE.inOut);
  const diffA = prog(f, b.completely + 4, 16);
  const flipped = flip > 0.5;
  const text = flipped ? PAYLOAD.slice(0, PAYLOAD_FLIP_AT) + "d" + PAYLOAD.slice(PAYLOAD_FLIP_AT + 1) : PAYLOAD;
  const bytes = text.slice(0, 24).split("").map((ch) => ch.charCodeAt(0).toString(16).padStart(2, "0"));
  const rounds = Math.min(64, Math.floor(f >= b.bit + 10 ? run2 * 64 : run1 * 64));
  const spinning = (run1 > 0 && run1 < 1) || (run2 > 0 && run2 < 1);
  const regs = "abcdefgh".split("").map((r, i) => (spinning ? Math.floor(rnd(`rg${i}-${Math.floor(f / 2)}`) * 0xffffffff) : Math.floor(rnd(`rgs${i}-${f >= b.bit + 10 ? 2 : 1}`) * 0xffffffff)).toString(16).padStart(8, "0"));
  // flowing bits
  const flowIn = (run1 > 0 && run1 < 0.9) || (run2 > 0 && run2 < 0.8);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110, opacity: codeA }}>
        <Kicker color={C.cyan}>the fingerprint</Kicker>
      </div>
      {/* code card */}
      <div style={{ position: "absolute", left: 100, top: 330, width: 610, opacity: codeA, transform: `translateY(${(1 - codeA) * 30}px)` }}>
        <div style={{ padding: "22px 26px", borderRadius: 20, background: "rgba(10,14,28,0.9)", border: `1.5px solid ${hexA(C.cyan, 0.5)}` }}>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: hexA(C.cyan, 0.9) }}>THE CODE</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 24, color: C.ink, marginTop: 12, lineHeight: 1.5 }}>
            {text.split("").map((ch, i) => (
              <span key={i} style={i === PAYLOAD_FLIP_AT && flip > 0 ? { color: BAD, background: hexA(BAD, 0.2 * flip), borderRadius: 4, boxShadow: `0 0 12px ${hexA(BAD, flip)}` } : undefined}>
                {ch}
              </span>
            ))}
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 18, color: C.ink3, marginTop: 14, lineHeight: 1.5, wordBreak: "break-all" }}>
            {bytes.map((bt, i) => (
              <span key={i} style={{ color: i === PAYLOAD_FLIP_AT && flip > 0 ? BAD : undefined, marginRight: 8 }}>
                {bt}
              </span>
            ))}
            …
          </div>
        </div>
        {/* the single bit */}
        {flip > 0.01 && (
          <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 16, opacity: inOut(f, b.bit - 6, 10, b.signs - 16, 12) }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 30, color: C.ink }}>{flipped ? "d" : "e"} =</span>
            <span style={{ fontFamily: FONT.mono, fontSize: 34, letterSpacing: "0.15em", color: C.ink }}>
              0110010<span style={{ color: BAD, textShadow: `0 0 14px ${BAD}` }}>{flipped ? "0" : "1"}</span>
            </span>
            <span style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 18, letterSpacing: "0.2em", color: BAD }}>1 BIT</span>
          </div>
        )}
      </div>
      {/* SHA-256 machine */}
      <div style={{ position: "absolute", left: 770, top: 360, width: 420, height: 340, opacity: machineA, transform: `scale(${mix(0.9, 1, machineA)})` }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 28, background: "linear-gradient(160deg, rgba(26,22,48,0.95), rgba(10,10,24,0.95))", border: `1.5px solid ${hexA(C.violet, 0.7)}`, boxShadow: `0 0 ${spinning ? 60 : 20}px ${hexA(C.violet, 0.35)}` }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 22, textAlign: "center", fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: C.ink }}>SHA-256</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 72, textAlign: "center", fontFamily: FONT.mono, fontSize: 16, color: hexA(C.violet, 0.95) }}>hash function</div>
        <div style={{ position: "absolute", left: 34, right: 34, top: 112, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {regs.map((r, i) => (
            <div key={i} style={{ fontFamily: FONT.mono, fontSize: 15, padding: "6px 0", textAlign: "center", borderRadius: 8, background: hexA(C.violet, spinning ? 0.2 : 0.08), color: spinning ? C.ink : C.ink3 }}>
              {r}
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: 34, right: 34, bottom: 30, height: 8, borderRadius: 4, background: hexA(C.ink, 0.08) }}>
          <div style={{ width: `${(rounds / 64) * 100}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${C.violet}, ${C.pink})` }} />
        </div>
        <div style={{ position: "absolute", left: 34, bottom: 46, fontFamily: FONT.mono, fontSize: 15, color: C.ink2 }}>round {rounds} / 64</div>
      </div>
      {/* flows */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {flowIn &&
          new Array(16).fill(0).map((_, i) => {
            const p = ((f * 0.04 + i / 16) % 1 + 1) % 1;
            return <circle key={i} cx={mix(710, 770, p)} cy={530 + Math.sin(i * 1.7) * 60 * (1 - p)} r={4} fill={C.cyanHi} opacity={Math.sin(p * Math.PI)} />;
          })}
        {(out1 > 0 && out1 < 1) || (morph > 0 && morph < 1)
          ? new Array(10).fill(0).map((_, i) => {
              const p = ((f * 0.05 + i / 10) % 1 + 1) % 1;
              return <circle key={i} cx={mix(1190, 1270, p)} cy={530 + Math.sin(i * 2.3) * 30 * p} r={4} fill={C.pink} opacity={Math.sin(p * Math.PI)} />;
            })
          : null}
      </svg>
      {/* fingerprint */}
      <div style={{ position: "absolute", left: 1260, top: 200, width: 580, opacity: prog(f, b.finger - 10, 14), display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: hexA(C.pink, 0.9) }}>FINGERPRINT · 256 BITS</div>
        <div style={{ marginTop: 10 }}>
          <Fingerprint hashA={HASH_A} hashB={HASH_B} t={morph} r={150} col={morph > 0.5 ? C.rose : C.pink} reveal={out1} />
        </div>
        <div style={{ marginTop: 10 }}>
          <HexDigest hash={morph > 0.5 ? HASH_B : HASH_A} prev={morph > 0.5 ? HASH_A : undefined} show={morph > 0.5 ? 1 : out1} flash={diffA} size={27} />
        </div>
        {diffA > 0.01 && (
          <div style={{ marginTop: 14, fontFamily: FONT.ui, fontWeight: 700, fontSize: 22, color: BAD, opacity: diffA, letterSpacing: "0.05em" }}>
            1 bit in → {DIFF_N} of 64 digits changed · {BITS_DIFF} of 256 bits
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 3: sign & verify
const Vault: React.FC<{ x: number; y: number; lockA: number; glow: number }> = ({ x, y, lockA, glow }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-170} y={-150} width={340} height={300} rx={26} fill="rgba(24,14,34,0.95)" stroke={hexA(C.violet, 0.8)} strokeWidth={3} />
    <circle cx={0} cy={0} r={92} fill="none" stroke={hexA(C.violet, 0.5)} strokeWidth={10} />
    {new Array(8).fill(0).map((_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return <line key={i} x1={Math.cos(a) * 62} y1={Math.sin(a) * 62} x2={Math.cos(a) * 92} y2={Math.sin(a) * 92} stroke={hexA(C.violet, 0.5)} strokeWidth={6} />;
    })}
    <KeyIcon x={4} y={0} s={1.1} col={C.pink} glow={glow} rot={-20} />
    <g opacity={lockA} transform="translate(130 -120)">
      <rect x={-18} y={-4} width={36} height={30} rx={6} fill={C.violet} />
      <path d="M-11,-4 V-12 a11,11 0 0 1 22,0 V-4" fill="none" stroke={C.violet} strokeWidth={5} />
    </g>
  </g>
);

const SignVerify: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vaultA = prog(f, b.signs - 8, 16);
  const toVault = prog(f, b.signs, 26, EASE.inOut);
  const stamp = spr(f, fps, b.privateKey - 2, { damping: 11, stiffness: 220 });
  const sigA = prog(f, b.privateKey + 4, 12, EASE.outBack);
  const neverA = prog(f, b.never - 4, 14);
  const travel = prog(f, b.publicKey - 10, 34, EASE.inOut);
  const romA = prog(f, b.publicKey - 14, 16);
  const verify = prog(f, b.check - 4, 22, EASE.inOut);
  const ok = prog(f, b.check + 16, 10, EASE.outBack);
  const forgeT = spr(f, fps, b.forge, { damping: 10, stiffness: 200 });
  const forgeFail = prog(f, b.forge + 6, 10);
  const card = (() => {
    const x = f < b.publicKey - 10 ? mix(820, 560, toVault) : mix(560, 1180, travel);
    const y = f < b.publicKey - 10 ? mix(260, 560, toVault) : 560;
    return { x, y };
  })();
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.violet}>sign · then verify</Kicker>
      </div>
      <Glow x={380} y={560} size={700} color={C.violet} a={0.14 * vaultA} />
      <Glow x={1540} y={560} size={700} color={C.gold} a={0.14 * romA} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <g opacity={vaultA} transform="translate(380 560) scale(1.2) translate(-380 -560)">
          <Vault x={380} y={560} lockA={neverA} glow={0.4 + 0.6 * clamp(stamp)} />
          <text x={380} y={760} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={30} fill={C.ink}>
            Apple’s signing vault
          </text>
          <text x={380} y={792} textAnchor="middle" fontFamily={FONT.mono} fontSize={17} fill={hexA(C.pink, 0.95)}>
            private key · never leaves
          </text>
        </g>
        {/* the Boot ROM verifier */}
        <g opacity={romA} transform="translate(1540 560) scale(1.2) translate(-1540 -560)">
          <rect x={1540 - 170} y={560 - 150} width={340} height={300} rx={26} fill="rgba(26,22,10,0.95)" stroke={hexA(C.gold, 0.8)} strokeWidth={3} />
          <KeyIcon x={1540} y={520} s={1.1} col={C.gold} glow={0.5 + 0.5 * verify} rot={-20} />
          <text x={1540} y={640} textAnchor="middle" fontFamily={FONT.mono} fontSize={17} fill={hexA(C.gold, 0.95)}>
            public key
          </text>
          <text x={1540} y={760} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={30} fill={C.ink}>
            the Boot ROM, in your Mac
          </text>
          <text x={1540} y={792} textAnchor="middle" fontFamily={FONT.mono} fontSize={17} fill={hexA(C.gold, 0.95)}>
            can check · can’t sign
          </text>
        </g>
        {/* verify beam */}
        {verify > 0.01 && verify < 1 && <NeonPath d={`M1336,560 L1250,560`} color={C.gold} width={4} progress={verify} length={90} />}
        {ok > 0.01 && f < b.forge + 30 && <Check x={1540} y={350} r={38} a={clamp(ok)} />}
        {/* the forge attempt */}
        {f > b.forge - 4 && (
          <g opacity={1 - prog(f, b.fails - 10, 10)}>
            <g transform={`translate(${1540 - forgeT * 210} ${520 + Math.sin(forgeT * Math.PI) * -40})`}>
              <rect x={-80} y={-34} width={160} height={68} rx={14} fill="none" stroke={hexA(BAD, 0.8 * forgeFail)} strokeWidth={3} strokeDasharray="8 6" />
            </g>
            {forgeFail > 0.01 && <Cross x={1330} y={430} r={30} a={forgeFail} />}
            {forgeFail > 0.01 && (
              <text x={1330} y={380} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={20} letterSpacing="0.2em" fill={BAD} opacity={forgeFail}>
                CAN’T FORGE
              </text>
            )}
          </g>
        )}
      </svg>
      {/* the fingerprint card traveling, with its signature */}
      <div style={{ position: "absolute", left: card.x - 120, top: card.y - 60, width: 240, opacity: prog(f, b.signs - 6, 12), transform: "scale(1.15)" }}>
        <div style={{ padding: "12px 14px", borderRadius: 16, background: "rgba(10,14,28,0.95)", border: `1.5px solid ${hexA(C.pink, 0.7)}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ transform: "scale(0.24)", transformOrigin: "0 0", width: 70, height: 80 }}>
            <Fingerprint hashA={HASH_A} hashB={HASH_A} t={0} r={130} col={C.pink} />
          </div>
          <div>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 22, color: C.ink }}>LLB</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 13, color: C.pink }}>{HASH_A.slice(0, 10)}…</div>
          </div>
        </div>
        {sigA > 0.01 && (
          <svg width={90} height={90} style={{ position: "absolute", right: -44, top: -54, overflow: "visible" }}>
            <g transform={`translate(45 45) scale(${clamp(sigA)}) translate(-45 -45)`}>
              <SealBadge x={45} y={45} r={46} col={verify > 0.9 ? C.gold : C.violet} label="SIGNED" />
            </g>
          </svg>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 4: the failure path
const Laptop: React.FC<{ x: number; y: number; s?: number; screen: string; dark?: boolean; children?: React.ReactNode }> = ({ x, y, s = 1, screen, children }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-150} y={-110} width={300} height={190} rx={14} fill="#1a1f2e" stroke={hexA(C.ink, 0.3)} strokeWidth={2} />
    <rect x={-136} y={-96} width={272} height={162} rx={6} fill={screen} />
    {children}
    <path d="M-190,84 L190,84 L172,104 L-172,104 Z" fill="#232a3c" stroke={hexA(C.ink, 0.25)} strokeWidth={2} />
  </g>
);

const Fails: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const xA = prog(f, b.fails - 4, 14, EASE.outBack);
  const halt = prog(f, b.refuses - 4, 14);
  const host = prog(f, b.waits - 6, 18);
  const cable = prog(f, b.waits + 4, 26, EASE.inOut);
  const bar = prog(f, b.restore, 70, EASE.inOut);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={BAD}>if the check fails</Kicker>
      </div>
      <Glow x={700} y={520} size={900} color={BAD} a={0.16 * halt} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <Laptop x={700} y={520} s={1.5} screen={"#030407"}>
          <g opacity={halt}>
            <text x={0} y={-10} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={22} letterSpacing="0.25em" fill={hexA(BAD, 0.9)}>
              WON’T START
            </text>
            <text x={0} y={22} textAnchor="middle" fontFamily={FONT.mono} fontSize={14} fill={hexA(C.ink, 0.6)}>
              waiting for restore…
            </text>
          </g>
        </Laptop>
        {xA > 0.01 && <Cross x={700} y={270} r={44} a={clamp(xA)} />}
        {/* the rescuing computer */}
        <g opacity={host}>
          <Laptop x={1420} y={540} s={1.1} screen={"#0b1530"}>
            <text x={0} y={-30} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={18} letterSpacing="0.2em" fill={hexA(C.cyan, 0.9)}>
              RESTORE
            </text>
            <rect x={-100} y={0} width={200} height={10} rx={5} fill={hexA(C.ink, 0.12)} />
            <rect x={-100} y={0} width={200 * bar} height={10} rx={5} fill={C.cyan} />
          </Laptop>
          <path d={`M${700 + 285},${640} C${1100},${760} ${1180},${760} ${1420 - 210},${650}`} fill="none" stroke={hexA(C.ink, 0.25)} strokeWidth={8} strokeLinecap="round" />
          <NeonPath d={`M${700 + 285},${640} C${1100},${760} ${1180},${760} ${1420 - 210},${650}`} color={C.cyan} width={3} progress={cable} length={560} />
          {bar > 0 &&
            new Array(6).fill(0).map((_, i) => {
              const p = ((f * 0.03 + i / 6) % 1 + 1) % 1;
              const t = 1 - p;
              const x = mix(1420 - 210, 985, t);
              const y = 650 + Math.sin(t * Math.PI) * 95;
              return <Spark key={i} x={x} y={y} color={C.cyan} r={5} a={Math.sin(p * Math.PI)} />;
            })}
          <text x={1200} y={810} textAnchor="middle" fontFamily={FONT.mono} fontSize={18} fill={hexA(C.ink, 0.6)}>
            USB-C · restore mode
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 5: the chain of trust
const Passes: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const okA = prog(f, b.passes - 4, 14, EASE.outBack);
  const runA = prog(f, b.moves - 4, 16);
  const rowA = prog(f, b.every - 10, 16);
  const items: LinkItem[] = [
    { label: "BOOT ROM", sub: "in silicon", at: b.every - 6, col: C.gold },
    { label: "LLB", sub: "checked by ROM", at: b.every + 10, col: C.gold },
    { label: "iBOOT", sub: "checked by LLB", at: b.every + 26, col: C.gold },
    { label: "KERNEL", sub: "checked by iBoot", at: b.every + 42, col: C.gold },
    { label: "SYSTEM", sub: "checked by kernel", at: b.every + 58, col: C.gold },
  ];
  const anchorA = prog(f, b.silicon - 6, 20);
  const chainGlow = prog(f, b.chain - 4, 20);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110, display: "flex", alignItems: "center", gap: 18, opacity: clamp(okA) * (1 - prog(f, b.every - 8, 12)) }}>
        <svg width={56} height={56}>
          <Check x={28} y={28} r={24} />
        </svg>
        <span style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 30, letterSpacing: "0.3em", color: OK }}>SIGNATURE VALID</span>
      </div>
      {/* control moves on */}
      <AbsoluteFill style={{ opacity: inOut(f, b.passes - 4, 14, b.every - 8, 12) }}>
        <div style={{ position: "absolute", left: 960 - 160, top: 440, width: 320, padding: "20px 24px", borderRadius: 20, background: "rgba(8,22,18,0.92)", border: `2px solid ${OK}`, boxShadow: `0 0 50px ${hexA(OK, 0.3)}`, transform: `scale(${mix(0.9, 1, clamp(okA))})` }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: C.ink }}>LLB</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 18, color: OK, marginTop: 4 }}>{runA > 0.5 ? "▶ running" : "verified"}</div>
          <div style={{ marginTop: 14, height: 8, borderRadius: 4, background: hexA(C.ink, 0.1) }}>
            <div style={{ height: "100%", width: `${runA * 100}%`, borderRadius: 4, background: OK }} />
          </div>
        </div>
      </AbsoluteFill>
      {/* the chain */}
      <AbsoluteFill style={{ opacity: rowA }}>
        <div style={{ position: "absolute", left: 120, top: 110 }}>
          <Kicker color={C.gold}>the chain of trust</Kicker>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 56, color: C.ink, marginTop: 10 }}>Each stage checks the next</div>
        </div>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {/* silicon anchor block beneath the first link */}
          <g opacity={anchorA}>
            <rect x={300 - 150} y={640} width={300} height={170} rx={16} fill="#121624" stroke={hexA(C.gold, 0.6)} strokeWidth={2} />
            {new Array(10).fill(0).map((_, i) => (
              <rect key={i} x={300 - 130 + (i % 5) * 54} y={662 + Math.floor(i / 5) * 60} width={44} height={46} rx={4} fill={hexA(C.gold, 0.08 + 0.12 * ((i * 7) % 3))} />
            ))}
            <line x1={300} y1={590} x2={300} y2={640} stroke={C.gold} strokeWidth={6} />
            <text x={300} y={850} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={18} letterSpacing="0.3em" fill={C.gold}>
              ANCHORED IN SILICON
            </text>
          </g>
          <g style={{ filter: chainGlow > 0.01 ? `drop-shadow(0 0 ${14 * chainGlow}px ${hexA(C.gold, 0.6)})` : undefined }}>
            <ChainRow items={items} x0={300} x1={1620} y={540} size={1.2} />
          </g>
          {/* handover arrows: each link inspects the next */}
          {items.slice(1).map((it, i) => {
            const x0 = 300 + i * 330;
            const p = prog(f, it.at - 14, 14, EASE.inOut);
            if (p <= 0) return null;
            return <NeonPath key={i} d={`M${x0 + 95},${470} Q${x0 + 165},${410} ${x0 + 235},${470}`} color={C.gold} width={2.4} progress={p} length={200} />;
          })}
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const a1 = 1 - prog(f, b.signs - 10, 14, EASE.in);
  const a2 = inOut(f, b.signs - 10, 14, b.fails - 8, 12);
  const a3 = inOut(f, b.fails - 8, 12, b.passes - 8, 12);
  const a4 = prog(f, b.passes - 8, 12);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      {a1 > 0.01 && <Hashing b={b} a={a1} />}
      {a2 > 0.01 && <SignVerify b={b} a={a2} />}
      {a3 > 0.01 && <Fails b={b} a={a3} />}
      {a4 > 0.01 && <Passes b={b} a={a4} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.run + 4, name: "data_long", vol: 0.3 },
    { at: b.finger - 6, name: "typing", vol: 0.25 },
    { at: b.bit - 2, name: "blip_hi", vol: 0.4 },
    { at: b.bit + 10, name: "data", vol: 0.3 },
    { at: b.completely - 8, name: "glitch", vol: 0.3 },
    { at: b.completely + 4, name: "alarm", vol: 0.1 },
    { at: b.signs, name: "whoosh_soft", vol: 0.3 },
    { at: b.privateKey - 2, name: "impact", vol: 0.45 },
    { at: b.never - 4, name: "tick_hi", vol: 0.35 },
    { at: b.publicKey - 10, name: "whoosh", vol: 0.3 },
    { at: b.check - 4, name: "scan", vol: 0.3 },
    { at: b.check + 16, name: "chime", vol: 0.35 },
    { at: b.forge, name: "bounce", vol: 0.35 },
    { at: b.forge + 6, name: "blip_lo", vol: 0.35 },
    { at: b.fails - 4, name: "thud", vol: 0.45 },
    { at: b.refuses - 4, name: "power_down", vol: 0.45 },
    { at: b.waits + 4, name: "sweep_up", vol: 0.25 },
    { at: b.restore, name: "data_long", vol: 0.25 },
    { at: b.passes - 4, name: "chime", vol: 0.35 },
    { at: b.moves - 4, name: "power_up", vol: 0.3 },
    ...[0, 1, 2, 3, 4].map((i) => ({ at: b.every - 6 + i * 16, name: "tick_hi", vol: 0.3 })),
    { at: b.chain - 4, name: "shimmer", vol: 0.35 },
    { at: b.silicon - 4, name: "boom_soft", vol: 0.35 },
  ];
};

export const Signature: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.violet, hueB: C.gold, hueC: C.pink, intensity: 0.55 },
};
