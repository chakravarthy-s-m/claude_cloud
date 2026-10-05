import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glass, Glow, Kicker, Spark } from "../../components/core";
import { GateShape } from "../../components/gates";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    built: wordAt(c.g1, "built from transistors"),
    four: wordAt(c.g2, "takes just four"),
    power: wordAt(c.g2, "output to power"),
    ground: wordAt(c.g2, "it to ground"),
    both: wordAt(c.g3, "both inputs turn on"),
    path: wordAt(c.g3, "the path to ground opens"),
    zero: wordAt(c.g3, "falls to zero"),
    what: c.g4.from,
    sw: wordAt(c.g4, "A switch"),
    gate: wordAt(c.g4, "A voltage on its gate"),
  };
};
type B = ReturnType<typeof beats>;

/** MOSFET as a stylized switch-symbol; `on` 0..1. */
const Fet: React.FC<{ x: number; y: number; p: boolean; on: number; label: string; hl?: number }> = ({ x, y, p, on, label, hl = 0 }) => {
  const col = p ? C.violet : C.green;
  const live = on > 0.5;
  return (
    <g transform={`translate(${x}, ${y})`}>
      {hl > 0.01 && <rect x={-90} y={-70} width={180} height={140} rx={24} fill={hexA(col, 0.12 * hl)} stroke={hexA(col, 0.6 * hl)} strokeWidth={2} />}
      {/* channel */}
      <line x1={0} y1={-60} x2={0} y2={-26} stroke={live ? col : hexA(C.ink, 0.5)} strokeWidth={4} />
      <line x1={0} y1={26} x2={0} y2={60} stroke={live ? col : hexA(C.ink, 0.5)} strokeWidth={4} />
      <line x1={0} y1={-26} x2={mix(26, 0, on)} y2={mix(26, 26, on)} stroke={live ? col : hexA(C.ink, 0.5)} strokeWidth={4} strokeLinecap="round" />
      {/* gate plate */}
      <line x1={-30} y1={-30} x2={-30} y2={30} stroke={col} strokeWidth={4} />
      <line x1={-70} y1={0} x2={p ? -44 : -30} y2={0} stroke={col} strokeWidth={3} />
      {p && <circle cx={-37} cy={0} r={7} fill={C.bg} stroke={col} strokeWidth={3} />}
      <text x={40} y={8} fontFamily={FONT.mono} fontSize={20} fill={live ? col : C.ink3}>
        {label} {live ? "ON" : "off"}
      </text>
    </g>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const b = beats(s);
  const gateA = inOut(f, 0, 12, b.built + 10, 18);
  const open = prog(f, b.built - 6, 24, EASE.in);
  const schA = inOut(f, b.built, 18, b.what - 4, 16);
  const draw = prog(f, b.built + 6, 40, EASE.inOut);
  const pu = inOut(f, b.power - 6, 12, b.both, 16);
  const pd = inOut(f, b.ground - 6, 12, b.both, 16);
  const inOn = prog(f, b.both - 4, 12);
  const flow = f >= b.path - 4;
  const outLow = prog(f, b.zero - 8, 14);
  const fetA = prog(f, b.what - 6, 18);

  // node positions
  const VDD = 210;
  const OUT = 500;
  const GND = 900;
  const PA = { x: 780, y: 340 };
  const PB = { x: 1120, y: 340 };
  const NA = { x: 950, y: 620 };
  const NB = { x: 950, y: 790 };
  const pOn = 1 - inOn; // PMOS conduct when inputs are 0
  const nOn = inOn;

  // electrons along output → ground path
  const pathPts: [number, number][] = [
    [950, OUT],
    [950, 560],
    [950, 680],
    [950, 730],
    [950, 850],
    [950, GND],
  ];
  const along = (t: number): [number, number] => {
    const i = Math.min(pathPts.length - 2, Math.floor(t * (pathPts.length - 1)));
    const k = t * (pathPts.length - 1) - i;
    return [mix(pathPts[i][0], pathPts[i + 1][0], k), mix(pathPts[i][1], pathPts[i + 1][1], k)];
  };

  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      {/* NAND symbol opening up */}
      {gateA > 0.01 && (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: gateA * (1 - open) }}>
          <g transform={`translate(960, 540) scale(${mix(3.2, 7, open)}) translate(-55, -40)`}>
            <GateShape kind="NAND" x={0} y={0} color={C.amber} lit={0.6} />
          </g>
        </svg>
      )}
      {gateA > 0.01 && (
        <div style={{ position: "absolute", left: 110, top: 130, opacity: gateA * (1 - open) }}>
          <Kicker color={C.amber}>Inside a NAND gate</Kicker>
        </div>
      )}
      {/* CMOS schematic */}
      {schA > 0.01 && (
        <AbsoluteFill style={{ opacity: schA }}>
          <div style={{ position: "absolute", left: 110, top: 120 }}>
            <Kicker color={C.green}>CMOS NAND · 4 transistors</Kicker>
          </div>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <g strokeDasharray="3000" strokeDashoffset={3000 * (1 - draw)}>
              {/* rails */}
              <line x1={600} y1={VDD} x2={1300} y2={VDD} stroke={C.rose} strokeWidth={5} />
              <line x1={600} y1={GND} x2={1300} y2={GND} stroke={C.blue} strokeWidth={5} />
              {/* pull-up parallel */}
              <path d={`M${PA.x},${VDD} L${PA.x},${PA.y - 60} M${PA.x},${PA.y + 60} L${PA.x},${OUT} L${PB.x},${OUT} L${PB.x},${PB.y + 60} M${PB.x},${PB.y - 60} L${PB.x},${VDD}`} fill="none" stroke={hexA(C.ink, 0.6)} strokeWidth={3} />
              {/* output node to pull-down */}
              <path d={`M950,${OUT} L950,${NA.y - 60} M950,${NA.y + 60} L950,${NB.y - 60} M950,${NB.y + 60} L950,${GND}`} fill="none" stroke={hexA(C.ink, 0.6)} strokeWidth={3} />
              {/* output wire */}
              <line x1={950} y1={OUT} x2={1460} y2={OUT} stroke={outLow > 0.5 ? hexA(C.ink, 0.4) : C.amber} strokeWidth={4} />
              {/* input wires */}
              <path d={`M520,${PA.y} L${PA.x - 70},${PA.y} M560,${PA.y} L560,${NA.y} L${NA.x - 70},${NA.y}`} fill="none" stroke={inOn > 0.5 ? C.amber : hexA(C.ink, 0.5)} strokeWidth={3} />
              <path d={`M520,${NB.y} L${NB.x - 70},${NB.y} M600,${NB.y} L600,440 L${PB.x - 160},440 L${PB.x - 160},${PB.y} L${PB.x - 70},${PB.y}`} fill="none" stroke={inOn > 0.5 ? C.amber : hexA(C.ink, 0.5)} strokeWidth={3} />
            </g>
            <text x={1310} y={VDD + 8} fontFamily={FONT.mono} fontSize={24} fill={C.rose}>
              power (V_DD)
            </text>
            <text x={1310} y={GND + 8} fontFamily={FONT.mono} fontSize={24} fill={C.blue}>
              ground
            </text>
            <Fet x={PA.x} y={PA.y} p on={pOn} label="P1" hl={pu} />
            <Fet x={PB.x} y={PB.y} p on={pOn} label="P2" hl={pu} />
            <Fet x={NA.x} y={NA.y} p={false} on={nOn} label="N1" hl={pd} />
            <Fet x={NB.x} y={NB.y} p={false} on={nOn} label="N2" hl={pd} />
            <circle cx={950} cy={OUT} r={9} fill={outLow > 0.5 ? C.ink3 : C.amber} />
            <text x={470} y={PA.y + 8} textAnchor="end" fontFamily={FONT.mono} fontWeight={700} fontSize={30} fill={C.ink}>
              A = <tspan fill={inOn > 0.5 ? C.amber : C.ink3}>{inOn > 0.5 ? 1 : 0}</tspan>
            </text>
            <text x={470} y={NB.y + 8} textAnchor="end" fontFamily={FONT.mono} fontWeight={700} fontSize={30} fill={C.ink}>
              B = <tspan fill={inOn > 0.5 ? C.amber : C.ink3}>{inOn > 0.5 ? 1 : 0}</tspan>
            </text>
            <text x={1480} y={OUT + 10} fontFamily={FONT.mono} fontWeight={700} fontSize={34} fill={C.ink}>
              OUT = <tspan fill={outLow > 0.5 ? C.ink3 : C.amber}>{outLow > 0.5 ? 0 : 1}</tspan>
            </text>
            {flow &&
              new Array(10).fill(0).map((_, i) => {
                const t = ((f - b.path) * 0.025 + i / 10) % 1;
                const [x, y] = along(Math.max(0, t));
                return <Spark key={i} x={x + Math.sin(i * 2) * 6} y={y} color={C.amber} r={6} a={0.9} />;
              })}
            {pu > 0.01 && (
              <text x={PA.x - 60} y={VDD + 60} fontFamily={FONT.ui} fontWeight={700} fontSize={22} fill={C.violet} opacity={pu} letterSpacing="0.15em">
                PULL-UP · to power
              </text>
            )}
            {pd > 0.01 && (
              <text x={1060} y={NA.y + 90} fontFamily={FONT.ui} fontWeight={700} fontSize={22} fill={C.green} opacity={pd} letterSpacing="0.15em">
                PULL-DOWN · to ground
              </text>
            )}
          </svg>
          {/* truth table */}
          <div style={{ position: "absolute", right: 110, top: 640, opacity: prog(f, b.both - 10, 16) }}>
            <Glass color={C.amber} style={{ padding: "16px 24px" }} glow={0.4}>
              {[
                [0, 0, 1],
                [0, 1, 1],
                [1, 0, 1],
                [1, 1, 0],
              ].map(([x1, x2, o], i) => (
                <div key={i} style={{ display: "flex", gap: 26, fontFamily: FONT.mono, fontSize: 24, padding: "3px 8px", borderRadius: 8, background: i === 3 && inOn > 0.5 ? hexA(C.amber, 0.25) : undefined, color: i === 3 && inOn > 0.5 ? C.ink : C.ink2 }}>
                  <span>{x1}</span>
                  <span>{x2}</span>
                  <span>→ {o}</span>
                </div>
              ))}
            </Glass>
          </div>
        </AbsoluteFill>
      )}
      {/* a single transistor = a switch */}
      {fetA > 0.01 && <SingleFet a={fetA} b={b} />}
    </SceneShell>
  );
};

const SingleFet: React.FC<{ a: number; b: B }> = ({ a, b }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f - b.gate;
  const on = t < 0 ? 0 : Math.floor(t / 34) % 2 === 0 ? 1 : 0;
  const vg = on ? 0.7 : 0;
  const swA = spr(f, fps, b.sw - 4, { damping: 18, stiffness: 120 });
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 110, top: 120 }}>
        <Kicker color={C.green}>A transistor</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 64, color: C.ink, marginTop: 8, letterSpacing: "-0.03em" }}>
          A switch with <span style={{ color: C.green }}>no moving parts</span>
        </div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g transform="translate(860, 600) scale(2.4)">
          <Fet x={0} y={0} p={false} on={on} label="" />
        </g>
        <text x={860} y={400} textAnchor="middle" fontFamily={FONT.mono} fontSize={24} fill={C.ink3}>
          drain
        </text>
        <text x={860} y={830} textAnchor="middle" fontFamily={FONT.mono} fontSize={24} fill={C.ink3}>
          source
        </text>
        <text x={640} y={590} textAnchor="end" fontFamily={FONT.mono} fontSize={24} fill={C.green}>
          gate
        </text>
        {on === 1 &&
          new Array(8).fill(0).map((_, i) => {
            const tt = ((f * 0.04 + i / 8) % 1);
            return <Spark key={i} x={860 + Math.sin(i) * 4} y={mix(430, 780, tt)} color={C.amber} r={7} />;
          })}
      </svg>
      {/* gate voltage meter */}
      <div style={{ position: "absolute", left: 1180, top: 420, opacity: clamp(swA * 1.3) }}>
        <Glass color={on ? C.green : C.ink3} style={{ width: 420, padding: "24px 28px" }} glow={on ? 0.9 : 0.2}>
          <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 18, letterSpacing: "0.25em", color: on ? C.green : C.ink3 }}>GATE VOLTAGE</div>
          <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 64, color: C.ink, marginTop: 6 }}>{vg.toFixed(1)} V</div>
          <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.08)", marginTop: 10 }}>
            <div style={{ width: `${(vg / 0.8) * 100}%`, height: 10, borderRadius: 5, background: C.green, boxShadow: `0 0 16px ${C.green}` }} />
          </div>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: on ? C.green : C.ink3, marginTop: 14 }}>{on ? "ON · current flows" : "OFF · blocked"}</div>
        </Glass>
      </div>
      {on === 1 && <Glow x={860} y={600} size={600} color={C.green} a={0.12} />}
      <div style={{ position: "absolute", left: 1180, top: 760, opacity: prog(f, b.sw, 16), fontFamily: FONT.mono, fontSize: 22, color: C.ink3, width: 420 }}>
        ≈ 28 billion of these in one chip
      </div>
      {rnd("x") < 0 && <span />}
    </AbsoluteFill>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const ev: SfxEvent[] = [
    { at: b.built - 6, name: "whoosh_big", vol: 0.4 },
    { at: b.built + 6, name: "sweep_up", vol: 0.25 },
    { at: b.power - 6, name: "pop", vol: 0.3 },
    { at: b.ground - 6, name: "pop", vol: 0.3 },
    { at: b.both - 4, name: "key_click", vol: 0.35 },
    { at: b.both, name: "blip_hi", vol: 0.3 },
    { at: b.path - 4, name: "electrons", vol: 0.4 },
    { at: b.zero - 8, name: "power_down", vol: 0.3 },
    { at: b.what - 6, name: "whoosh", vol: 0.35 },
  ];
  for (let k = 0; k < 6; k++) ev.push({ at: b.gate + k * 34, name: k % 2 === 0 ? "zap" : "tick", vol: k % 2 === 0 ? 0.25 : 0.3 });
  return ev;
};

export const Cmos: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.green, hueB: C.amber, hueC: C.violet, intensity: 0.7 },
};
