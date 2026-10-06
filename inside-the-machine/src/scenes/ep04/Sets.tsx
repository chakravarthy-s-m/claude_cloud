import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { AddressBits, BAD, Check, OK, TIER, addressWidth, type Field } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    small: c.s1.from,
    where: wordAt(c.s1, "where does"),
    picks: c.s2.from,
    set: wordAt(c.s2, "picks a set"),
    tag: wordAt(c.s2, "the tag"),
    once: c.s3.from,
    hit: wordAt(c.s3, "A match is a hit"),
    full: c.s4.from,
    longest: wordAt(c.s4, "used for the longest"),
    thrown: wordAt(c.s4, "thrown out"),
    end: s.durationInFrames,
  };
};

const SETS = 8;
const WAYS = 4;
const GX = 520;
const GY = 470;
const SW = 230;
const SH = 54;
const tagOf = (set: number, way: number) => Math.floor(rnd(`tag${set}-${way}`) * 0x3fff);
const hex = (n: number, w = 4) => n.toString(16).padStart(w, "0");

// two lookups: one hit in set 5, then a miss in set 2 that evicts the least recently used way
const A1 = { set: 5, way: 2 };
const A2set = 2;
const LRU_WAY = 1;
const NEW_TAG = 0x2b7d;
const addr1 = tagOf(A1.set, A1.way) * 2 ** 10 + A1.set * 2 ** 7 + 0x2c;
const addr2 = NEW_TAG * 2 ** 10 + A2set * 2 ** 7 + 0x10;
const FIELDS: Field[] = [
  { label: "TAG", bits: 14, col: C.pink },
  { label: "SET", bits: 3, col: C.amber },
  { label: "OFFSET IN LINE", bits: 7, col: C.cyan },
];

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const b = beats(s);
  const gridA = prog(f, b.small - 4, 20);
  const split = prog(f, b.picks - 4, 20, EASE.inOut);
  const second = f > b.full - 6;
  const addr = second ? addr2 : addr1;
  const selSet = second ? A2set : A1.set;
  const setHi = second ? prog(f, b.full + 4, 12) : prog(f, b.set - 4, 14);
  const tagHi = second ? prog(f, b.full + 16, 12) : prog(f, b.tag - 4, 14);
  const cmp = second ? prog(f, b.full + 24, 10) : prog(f, b.once - 2, 12);
  const hitA = prog(f, b.hit - 4, 10, EASE.outBack);
  const evict = prog(f, b.thrown - 8, 22, EASE.in);
  const insert = spr(f, fps, b.thrown + 10, { damping: 16, stiffness: 140 });
  const ageA = prog(f, b.longest - 10, 14);
  const addrA = prog(f, b.picks - 10, 14) * (second ? prog(f, b.full - 6, 10) : 1 - prog(f, b.full - 14, 8));
  const aw = addressWidth(FIELDS, 30, split);
  const ax = 960 - aw / 2;
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={TIER.l1}>{second ? "a full set: evict the oldest" : "sets, ways and tags"}</Kicker>
      </div>
      <Glow x={960} y={600} size={1200} color={TIER.l1} a={0.1} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* the address */}
        <g opacity={addrA}>
          <text x={960} y={190} textAnchor="middle" fontFamily={FONT.mono} fontSize={22} fill={C.ink2}>
            address 0x{hex(addr, 6)}
          </text>
          <AddressBits x={ax} y={220} value={addr} fields={FIELDS} cell={30} split={split} />
        </g>
        {/* set field → selects a row */}
        {setHi > 0.01 && (
          <path
            d={`M${ax + 14 * 30 + 12 * split + 45},${310} C${ax + 14 * 30 + 45},${400} ${GX - 120},${GY + selSet * (SH + 10) - 40} ${GX - 70},${GY + selSet * (SH + 10) + SH / 2}`}
            fill="none"
            stroke={C.amber}
            strokeWidth={3}
            strokeDasharray={`${setHi * 900} 900`}
            opacity={0.85}
          />
        )}
        {/* the cache: 8 sets × 4 ways */}
        <g opacity={gridA}>
          {new Array(SETS).fill(0).map((_, si) => {
            const y = GY + si * (SH + 10);
            const sel = si === selSet ? setHi : 0;
            return (
              <g key={si}>
                <text x={GX - 30} y={y + SH / 2 + 7} textAnchor="end" fontFamily={FONT.mono} fontSize={18} fill={sel > 0.5 ? C.amber : C.ink3}>
                  set {si.toString(2).padStart(3, "0")}
                </text>
                {sel > 0.01 && <rect x={GX - 12} y={y - 6} width={WAYS * (SW + 12) + 12} height={SH + 12} rx={12} fill={hexA(C.amber, 0.08 * sel)} stroke={C.amber} strokeWidth={2} opacity={sel} />}
                {new Array(WAYS).fill(0).map((__, wi) => {
                  const x = GX + wi * (SW + 12);
                  const isEvict = second && si === A2set && wi === LRU_WAY;
                  const isHit = !second && si === A1.set && wi === A1.way && hitA > 0.5;
                  const t = isEvict && insert > 0.05 ? NEW_TAG : tagOf(si, wi);
                  const ex = isEvict ? evict : 0;
                  const comparing = si === selSet && cmp > 0 && cmp < 1;
                  const age = Math.floor(rnd(`age${si}-${wi}`) * 40 + 5) + (wi === LRU_WAY ? 60 : 0);
                  return (
                    <g key={wi} transform={`translate(${x + ex * (1920 - x)} ${y - ex * 40})`} opacity={isEvict ? (insert > 0.05 ? clamp(insert) : 1 - ex) : 1}>
                      <rect width={SW} height={SH} rx={10} fill={isHit ? hexA(OK, 0.25) : hexA(TIER.l1, 0.12)} stroke={isHit ? OK : isEvict && ex > 0 ? BAD : hexA(TIER.l1, 0.6)} strokeWidth={isHit ? 3 : 1.5} />
                      <text x={16} y={SH / 2 + 7} fontFamily={FONT.mono} fontSize={19} fill={si === selSet && tagHi > 0.5 ? C.pink : C.ink2}>
                        tag {hex(t)}
                      </text>
                      {new Array(8).fill(0).map((___, k) => (
                        <rect key={k} x={130 + k * 11} y={SH / 2 - 9} width={8} height={18} rx={2} fill={hexA(TIER.l1, 0.4)} />
                      ))}
                      {comparing && <rect width={SW} height={SH} rx={10} fill="none" stroke={C.pink} strokeWidth={3} opacity={Math.sin(cmp * Math.PI)} />}
                      {/* age (time since last use) */}
                      {second && si === A2set && ageA > 0.01 && !(isEvict && insert > 0.05) && (
                        <g opacity={ageA}>
                          <rect x={0} y={SH + 4} width={Math.min(SW, age * 2.4)} height={5} rx={2} fill={wi === LRU_WAY ? BAD : hexA(C.ink, 0.4)} />
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
          <text x={GX} y={GY - 22} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={hexA(C.ink, 0.6)}>
            {"WAY 0".padEnd(12)}
          </text>
          {[1, 2, 3].map((w) => (
            <text key={w} x={GX + w * (SW + 12)} y={GY - 22} fontFamily={FONT.ui} fontWeight={700} fontSize={16} letterSpacing="0.25em" fill={hexA(C.ink, 0.6)}>
              WAY {w}
            </text>
          ))}
        </g>
        {/* the verdicts */}
        {!second && hitA > 0.01 && <Check x={GX + A1.way * (SW + 12) + SW - 10} y={GY + A1.set * (SH + 10) - 2} r={22} a={clamp(hitA)} />}
        {!second && hitA > 0.01 && (
          <text x={GX + WAYS * (SW + 12) + 30} y={GY + A1.set * (SH + 10) + SH / 2 + 10} fontFamily={FONT.display} fontWeight={700} fontSize={36} fill={OK} opacity={clamp(hitA)}>
            HIT
          </text>
        )}
        {second && ageA > 0.01 && (
          <text x={GX + WAYS * (SW + 12) + 30} y={GY + A2set * (SH + 10) + SH / 2 + 10} fontFamily={FONT.mono} fontSize={20} fill={BAD} opacity={ageA * (1 - evict)}>
            ← least recently used
          </text>
        )}
      </svg>
      <div style={{ position: "absolute", right: 120, bottom: 70, fontFamily: FONT.mono, fontSize: 16, color: C.ink3 }}>illustrative: a real L1 has hundreds of sets</div>
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.small - 4, name: "whoosh_soft", vol: 0.25 },
    { at: b.picks - 4, name: "data", vol: 0.25 },
    { at: b.set - 4, name: "blip", vol: 0.3 },
    { at: b.tag - 4, name: "blip_hi", vol: 0.3 },
    { at: b.once - 2, name: "scan", vol: 0.3 },
    { at: b.hit - 4, name: "chime", vol: 0.3 },
    { at: b.full + 4, name: "blip", vol: 0.3 },
    { at: b.full + 24, name: "scan", vol: 0.25 },
    { at: b.longest - 10, name: "tick", vol: 0.25 },
    { at: b.thrown - 8, name: "whoosh", vol: 0.35 },
    { at: b.thrown + 10, name: "pop", vol: 0.35 },
  ];
};

export const Sets: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.violet, hueB: C.pink, hueC: C.amber, intensity: 0.5 },
};
