import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker, NeonPath, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { BAD, Check, Cross, OK, SealBadge } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    protects: c.s1.from,
    readOnly: wordAt(c.s1, "read-only volume"),
    every: wordAt(c.s1, "every file has its own hash"),
    again: c.s2.from,
    again2: wordAt(c.s2, "and again"),
    tree: wordAt(c.s2, "all the way up a tree"),
    single: wordAt(c.s2, "into a single value"),
    theSeal: wordAt(c.s2, "the seal"),
    change: c.s3.from,
    breaks: wordAt(c.s3, "the seal breaks"),
    once: c.s4.from,
    reads: wordAt(c.s4, "Every time the kernel reads"),
    hashes: wordAt(c.s4, "hashes the data again"),
    compares: wordAt(c.s4, "compares"),
    malware: c.s5.from,
    admin: wordAt(c.s5, "administrator rights"),
    rewrite: wordAt(c.s5, "quietly rewrite"),
    would: wordAt(c.s5, "It would break the seal"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

const FILES = ["kernel", "launchd", "libSystem", "drivers", "frameworks", "WindowServer", "Finder", "fonts"];
const hx = (seed: string, n = 6) =>
  new Array(n)
    .fill(0)
    .map((_, i) => Math.floor(rnd(`${seed}-${i}`) * 16).toString(16))
    .join("");

// tree geometry: 8 leaves → 4 → 2 → root
const LX = (i: number) => 330 + i * 180;
const LEVELS = [
  { y: 800, n: 8 },
  { y: 640, n: 4 },
  { y: 480, n: 2 },
  { y: 300, n: 1 },
];
const nodeX = (lv: number, i: number) => {
  const span = 2 ** lv;
  return (LX(i * span) + LX(i * span + span - 1)) / 2;
};
const TAMPER = 1; // "launchd"
const onPath = (lv: number, i: number) => Math.floor(TAMPER / 2 ** lv) === i;

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const b = beats(s);
  // build
  const volA = prog(f, b.protects - 4, 18);
  const lockA = prog(f, b.readOnly - 4, 14, EASE.outBack);
  const leafHash = (i: number) => prog(f, b.every + i * 3, 10);
  const lvAt = [b.every, b.again + 6, b.again2 + 4, b.tree + 10];
  const lvP = (lv: number) => (lv === 0 ? 1 : prog(f, lvAt[lv], 16, EASE.out));
  const sealOn = spr(f, fps, b.theSeal - 2, { damping: 12, stiffness: 140 });
  // tamper (and its undo for the next beat)
  const tamper = inOut(f, b.change + 4, 8, b.once + 10, 16);
  const redLv = (lv: number) => clamp((f - (b.change + 18) - lv * 9) / 6) * (1 - prog(f, b.once + 10, 16));
  const crack = prog(f, b.breaks - 2, 10) * (1 - prog(f, b.once + 10, 16));
  // runtime verification
  const readsA = inOut(f, b.reads - 10, 14, b.malware - 6, 12);
  const READS = [0, 4, 6, 2, 5, 7, 3];
  const readPeriod = 26;
  const rt = f - (b.reads + 4);
  const readIdx = rt >= 0 ? Math.floor(rt / readPeriod) : -1;
  const readPh = rt >= 0 ? (rt % readPeriod) / readPeriod : 0;
  const verifiedCount = Math.max(0, Math.min(99, readIdx));
  // malware
  const malA = prog(f, b.malware - 4, 14);
  const lunge = prog(f, b.rewrite - 6, 18, EASE.in);
  const block = prog(f, b.rewrite + 12, 8);
  const ghostCrack = prog(f, b.would - 2, 14);

  const nodeCol = (lv: number, i: number) => (tamper > 0 && onPath(lv, i) && redLv(lv) > 0.5 ? BAD : [C.cyan, C.violet, C.violet, C.gold][lv]);
  const nodeHex = (lv: number, i: number) => (tamper > 0 && onPath(lv, i) && redLv(lv) > 0.5 ? hx(`bad${lv}-${i}`) : hx(`n${lv}-${i}`));

  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={14}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={C.violet}>{f < b.once - 6 ? "the signed system volume" : f < b.malware - 6 ? "checked on every read" : "even with admin rights"}</Kicker>
      </div>
      <Glow x={960} y={560} size={1500} color={C.violet} a={0.08 + 0.06 * volA} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 330, textAlign: "center", opacity: inOut(f, b.protects + 6, 20, b.again + 2, 14) }}>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 84, letterSpacing: "-0.03em", color: C.ink }}>Where macOS itself lives</div>
        <div style={{ fontFamily: FONT.mono, fontSize: 24, color: hexA(C.violet, 0.95), marginTop: 14 }}>read-only · every file hashed · sealed</div>
      </div>
      {/* the volume */}
      <div style={{ position: "absolute", left: 220, top: 730, width: 1480, height: 220, borderRadius: 30, border: `1.5px solid ${hexA(C.ink, 0.25)}`, background: "rgba(12,12,26,0.6)", opacity: volA }}>
        <div style={{ position: "absolute", left: 24, bottom: 14, fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.3em", color: hexA(C.ink, 0.6) }}>SYSTEM VOLUME · macOS</div>
        <div style={{ position: "absolute", right: 24, bottom: 10, display: "flex", alignItems: "center", gap: 10, opacity: clamp(lockA) }}>
          <svg width={26} height={30}>
            <rect x={2} y={12} width={22} height={16} rx={4} fill={C.gold} />
            <path d="M7,12 V8 a6,6 0 0 1 12,0 V12" fill="none" stroke={C.gold} strokeWidth={3.5} />
          </svg>
          <span style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 18, letterSpacing: "0.25em", color: C.gold }}>READ-ONLY</span>
        </div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* edges */}
        {LEVELS.slice(1).map((L, lv1) => {
          const lv = lv1 + 1;
          return new Array(L.n).fill(0).map((_, i) => {
            const p = lvP(lv);
            if (p <= 0) return null;
            const x = nodeX(lv, i);
            return [0, 1].map((k) => {
              const ci = i * 2 + k;
              const cx = nodeX(lv - 1, ci);
              const cy = LEVELS[lv - 1].y - 28;
              const red = tamper > 0 && onPath(lv - 1, ci) && redLv(lv) > 0.5;
              return <NeonPath key={`${lv}-${i}-${k}`} d={`M${cx},${cy} C${cx},${cy - 60} ${x},${L.y + 90} ${x},${L.y + 28}`} color={red ? BAD : hexA(C.violet, 1)} width={2} progress={p} length={260} opacity={0.8} />;
            });
          });
        })}
        {/* leaves: files */}
        {FILES.map((name, i) => {
          const x = LX(i);
          const y = LEVELS[0].y;
          const isT = i === TAMPER && tamper > 0;
          const hA = leafHash(i);
          return (
            <g key={name} opacity={volA}>
              <rect x={x - 76} y={y - 30} width={152} height={60} rx={12} fill={isT ? hexA(BAD, 0.2) : "rgba(12,18,32,0.95)"} stroke={isT ? BAD : hexA(C.cyan, 0.6)} strokeWidth={1.8} />
              <text x={x} y={y - 2} textAnchor="middle" fontFamily={FONT.ui} fontWeight={600} fontSize={18} fill={C.ink}>
                {name}
              </text>
              <text x={x} y={y + 20} textAnchor="middle" fontFamily={FONT.mono} fontSize={14} fill={isT ? BAD : hexA(C.cyan, 0.9)} opacity={hA}>
                #{isT ? hx("tamper") : hx(`leaf${i}`)}
              </text>
              {isT && <text x={x} y={y - 42} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={16} fill={BAD}>1 byte changed</text>}
            </g>
          );
        })}
        {/* inner nodes */}
        {LEVELS.slice(1, 3).map((L, k) => {
          const lv = k + 1;
          return new Array(L.n).fill(0).map((_, i) => {
            const p = lvP(lv);
            if (p <= 0) return null;
            const x = nodeX(lv, i);
            const col = nodeCol(lv, i);
            return (
              <g key={`n${lv}-${i}`} opacity={p} transform={`translate(${x} ${L.y}) scale(${mix(0.6, 1, p)})`}>
                <rect x={-80} y={-26} width={160} height={52} rx={26} fill="rgba(16,12,32,0.95)" stroke={col} strokeWidth={2} />
                <text y={7} textAnchor="middle" fontFamily={FONT.mono} fontSize={18} fill={col === BAD ? BAD : C.ink}>
                  #{nodeHex(lv, i)}
                </text>
              </g>
            );
          });
        })}
        {/* the root: the seal */}
        {lvP(3) > 0.01 && (
          <g opacity={lvP(3)}>
            <g transform={`translate(${nodeX(3, 0)} ${LEVELS[3].y}) scale(${mix(0.4, 1, clamp(sealOn))}) translate(${-nodeX(3, 0)} ${-LEVELS[3].y})`}>
              <SealBadge x={nodeX(3, 0)} y={LEVELS[3].y} r={80} col={crack > 0.3 ? BAD : C.gold} label={crack > 0.3 ? "BROKEN" : "SEAL"} broken={crack} />
            </g>
            <text x={nodeX(3, 0) + 120} y={LEVELS[3].y + 8} fontFamily={FONT.mono} fontSize={22} fill={crack > 0.3 ? BAD : C.gold} opacity={clamp(sealOn)}>
              #{crack > 0.3 ? hx("rootbad", 12) : hx("root", 12)}
            </text>
          </g>
        )}
        {/* runtime: reads get re-hashed and compared */}
        {readsA > 0.01 && readIdx >= 0 && (
          <g opacity={readsA}>
            {(() => {
              const li = READS[readIdx % READS.length];
              const x = LX(li);
              const p = readPh;
              const y = mix(LEVELS[0].y - 40, 210, Math.min(1, p * 1.6));
              const ok = p > 0.62;
              return (
                <>
                  <rect x={x - 82} y={LEVELS[0].y - 36} width={164} height={72} rx={14} fill="none" stroke={C.green} strokeWidth={3} opacity={1 - p} />
                  {p < 0.62 && <Spark x={x} y={y} color={C.cyanHi} r={9} />}
                  {ok && <Check x={1800} y={150} r={26} a={prog(f, b.reads + 4 + readIdx * readPeriod + readPeriod * 0.62, 6)} />}
                </>
              );
            })()}
          </g>
        )}
        {/* malware: a privileged write that bounces */}
        {malA > 0.01 && (
          <g opacity={malA}>
            <g transform={`translate(${mix(1780, LX(5) + 40, lunge) + (block > 0 ? block * 120 : 0)} ${mix(520, LEVELS[0].y - 70, lunge) - (block > 0 ? block * 90 : 0)})`}>
              <ellipse cx={0} cy={4} rx={22} ry={28} fill={hexA(BAD, 0.3)} stroke={BAD} strokeWidth={3} />
              <circle cx={0} cy={-28} r={11} fill={BAD} />
              {[-1, 1].map((sd) => (
                <g key={sd} stroke={BAD} strokeWidth={3} strokeLinecap="round">
                  <line x1={sd * 20} y1={-6} x2={sd * 38} y2={-18} />
                  <line x1={sd * 22} y1={8} x2={sd * 40} y2={8} />
                  <line x1={sd * 20} y1={22} x2={sd * 36} y2={34} />
                </g>
              ))}
              <rect x={-44} y={42} width={88} height={26} rx={13} fill={BAD} />
              <text y={60} textAnchor="middle" fontFamily={FONT.mono} fontWeight={700} fontSize={15} fill="#16060a">
                admin
              </text>
            </g>
            {block > 0.01 && <Cross x={LX(5) + 40} y={LEVELS[0].y - 110} r={30} a={block} />}
          </g>
        )}
      </svg>
      {/* runtime verify panel */}
      {readsA > 0.01 && (
        <div style={{ position: "absolute", left: 1440, top: 150, width: 360, padding: "16px 20px", borderRadius: 18, background: "rgba(10,12,26,0.9)", border: `1.5px solid ${hexA(C.green, 0.6)}`, opacity: readsA }}>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 16, letterSpacing: "0.25em", color: hexA(C.green, 0.95) }}>KERNEL · ON EVERY READ</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 19, color: C.ink2, marginTop: 8 }}>hash the data → compare with the tree</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 40, color: C.ink, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>
            {verifiedCount} <span style={{ fontSize: 18, color: C.green }}>reads verified</span>
          </div>
        </div>
      )}
      {/* would break the seal */}
      {malA > 0.01 && (
        <div style={{ position: "absolute", left: 1300, top: 170, width: 520, opacity: ghostCrack, textAlign: "left" }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: C.ink }}>A rewrite breaks the seal</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 19, color: BAD, marginTop: 6 }}>so it’s refused, and can’t hide</div>
        </div>
      )}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.readOnly - 4, name: "thud", vol: 0.35 },
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ at: b.every + i * 3, name: "tick", vol: 0.18, rate: 1 + i * 0.04 })),
    { at: b.again + 6, name: "blip", vol: 0.3 },
    { at: b.again2 + 4, name: "blip", vol: 0.3, rate: 1.15 },
    { at: b.tree + 10, name: "blip_hi", vol: 0.3 },
    { at: b.theSeal - 2, name: "impact", vol: 0.45 },
    { at: b.theSeal, name: "chime", vol: 0.3 },
    { at: b.change + 4, name: "glitch", vol: 0.35 },
    { at: b.change + 18, name: "zap", vol: 0.25 },
    { at: b.breaks - 2, name: "thud", vol: 0.5 },
    { at: b.breaks, name: "alarm", vol: 0.15 },
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => ({ at: b.reads + 4 + i * 26 + 16, name: "tick_hi", vol: 0.22 })),
    { at: b.malware, name: "whoosh_soft", vol: 0.3 },
    { at: b.rewrite + 12, name: "bounce", vol: 0.4 },
    { at: b.rewrite + 12, name: "impact", vol: 0.35 },
    { at: b.would - 2, name: "blip_lo", vol: 0.3 },
  ];
};

export const Seal: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.violet, hueB: C.indigo, hueC: C.gold, intensity: 0.55 },
};
