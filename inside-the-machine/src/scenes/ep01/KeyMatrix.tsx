import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { cam } from "../../lib/proj3d";
import { KEYS, Keyboard3D } from "../../components/keyboard";
import { Glass, Glow, Kicker, NeonPath, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";

const ROWS = 6;
const COLS = 12;
const CELL = 78;
const X0 = 230;
const Y0 = 230;
const AROW = 3;
const ACOL = 1;
const CTRL = { x: 70, y: 800, w: 300, h: 130 };
const SOC = { x: 1560, y: 790, w: 270, h: 150 };

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    grid: wordAt(c.k2, "grid of wires"),
    rows: wordAt(c.k2, "rows"),
    cols: wordAt(c.k2, "columns"),
    sw: wordAt(c.k2, "switch"),
    scan: wordAt(c.k3, "scans"),
    press: wordAt(c.k4, "Press a key") + 4,
    spot: wordAt(c.k4, "spots it"),
    bounce: c.k5.from,
    report: wordAt(c.k6, "tiny report"),
    hid: wordAt(c.k6, "HID"),
    four: wordAt(c.k6, "number four"),
    race: c.k7.from,
    irq: wordAt(c.k7, "interrupt"),
  };
};

const rowY = (r: number) => Y0 + (r + 0.5) * CELL;
const colX = (c: number) => X0 + (c + 0.5) * CELL;
const keyLabel = (r: number, c: number) => KEYS.find((k) => k.row === r && k.col === c)?.label ?? "";

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const b = beats(s);
  const end = s.durationInFrames;

  // keyboard → matrix crossfade
  const kbA = inOut(f, 70, 24, b.grid, 30);
  const gridA = prog(f, b.grid - 6, 30, EASE.inOut);
  const rowsDraw = prog(f, b.rows - 4, 24, EASE.inOut);
  const colsDraw = prog(f, b.cols - 4, 24, EASE.inOut);
  const swA = prog(f, b.sw - 4, 20);

  // scanning
  const scanning = f >= b.scan;
  const scanRate = 5; // frames per row (visual slow-motion)
  const activeRow = scanning ? Math.floor((f - b.scan) / scanRate) % ROWS : -1;
  const pressed = f >= b.press;
  const closeP = spr(f, fps, b.press, { damping: 14, stiffness: 300 });
  const aColHot = pressed && activeRow === AROW;
  const spotted = f >= b.spot;

  // panels
  const bounceA = inOut(f, b.bounce - 8, 16, b.report - 4, 14);
  const reportA = inOut(f, b.report - 4, 18, b.race + 8, 12);
  const raceP = prog(f, b.race + 4, b.irq - b.race - 2, EASE.inOut);
  const irqFlash = prog(f, b.irq, 4) * (1 - prog(f, b.irq + 4, 30));
  const socA = prog(f, b.race - 6, 16);

  const kc = cam({ yaw: 0, pitch: 64, dist: 3000, scale: 0.62, target: [0, 40, 0], cx: 690, cy: 470 });

  const bus = `M${CTRL.x + CTRL.w},${CTRL.y + 50} L${1360},${CTRL.y + 50} Q${1420},${CTRL.y + 50} ${1440},${SOC.y + 40} L${SOC.x},${SOC.y + 70}`;

  return (
    <SceneShell dur={end} enter={0} exit={12}>
      {/* keyboard, seen from above */}
      {kbA > 0.01 && (
        <AbsoluteFill style={{ opacity: kbA }}>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            <Keyboard3D cam={kc} glow={{ A: 0.8 }} ghost={prog(f, b.grid - 20, 30)} backlight={0.2} />
          </svg>
        </AbsoluteFill>
      )}

      {/* the matrix */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: gridA }}>
        {/* row wires */}
        {new Array(ROWS).fill(0).map((_, r) => {
          const hot = r === activeRow;
          const d = `M${CTRL.x + 40 + r * 22},${CTRL.y} L${CTRL.x + 40 + r * 22},${rowY(r)} L${X0 + COLS * CELL},${rowY(r)}`;
          return (
            <g key={`r${r}`}>
              <NeonPath d={d} color={C.cyan} width={hot ? 3 : 1.6} progress={rowsDraw} length={1800} opacity={hot ? 1 : 0.45} core={hot} />
            </g>
          );
        })}
        {/* column wires */}
        {new Array(COLS).fill(0).map((_, c) => {
          const hot = c === ACOL && aColHot;
          const d = `M${colX(c)},${Y0} L${colX(c)},${Y0 + ROWS * CELL + 40} L${colX(c)},${CTRL.y - 40 + (c % 2) * 6} L${CTRL.x + CTRL.w - 20},${CTRL.y - 40 + (c % 2) * 6}`;
          return <NeonPath key={`c${c}`} d={d} color={C.violet} width={hot ? 3.2 : 1.5} progress={colsDraw} length={2200} opacity={hot ? 1 : 0.4} core={hot} />;
        })}
        {/* switches */}
        {new Array(ROWS).fill(0).map((_, r) =>
          new Array(COLS).fill(0).map((__, c) => {
            const isA = r === AROW && c === ACOL;
            const closed = isA && pressed;
            const x = colX(c);
            const y = rowY(r);
            const a = swA * prog(f, b.sw + (r + c) * 0.6, 10);
            return (
              <g key={`s${r}-${c}`} opacity={a}>
                <rect x={x - 13} y={y - 13} width={26} height={26} rx={7} fill={closed ? hexA(C.cyan, 0.9) : C.bg2} stroke={isA ? C.cyan : hexA(C.ink, 0.35)} strokeWidth={isA ? 2.5 : 1.2} />
                {/* switch blade */}
                <line x1={x - 8} y1={y + 6} x2={x + 8} y2={y + 6 - mix(12, 0, closed ? closeP : 0)} stroke={closed ? "#04131a" : hexA(C.ink, 0.6)} strokeWidth={2} strokeLinecap="round" />
                <text x={x + 18} y={y - 16} fontFamily={FONT.ui} fontSize={isA ? 24 : 15} fontWeight={isA ? 700 : 500} fill={isA ? C.cyanHi : hexA(C.ink, 0.35)}>
                  {keyLabel(r, c)}
                </text>
              </g>
            );
          }),
        )}
        {/* current through the A switch when its row is powered */}
        {aColHot && (
          <>
            <Spark x={colX(ACOL)} y={rowY(AROW)} color={C.cyan} r={10} />
            <Spark x={colX(ACOL)} y={mix(rowY(AROW), CTRL.y - 40, ((f - b.scan) % scanRate) / scanRate)} color={C.violet} r={7} />
          </>
        )}
        {pressed && <circle cx={colX(ACOL)} cy={rowY(AROW)} r={30 + 40 * prog(f, b.press, 20)} fill="none" stroke={C.cyan} strokeWidth={2} opacity={1 - prog(f, b.press, 20)} />}
        {/* labels */}
        <text x={X0 + COLS * CELL + 24} y={Y0 + 30} fontFamily={FONT.ui} fontWeight={700} fontSize={26} letterSpacing="0.25em" fill={C.cyan} opacity={rowsDraw}>
          ROWS
        </text>
        <text x={X0 + COLS * CELL + 24} y={Y0 + 62} fontFamily={FONT.mono} fontSize={18} fill={hexA(C.cyan, 0.75)} opacity={rowsDraw}>
          driven one at a time
        </text>
        <text x={colX(COLS - 1)} y={Y0 + ROWS * CELL + 80} textAnchor="end" fontFamily={FONT.ui} fontWeight={700} fontSize={26} letterSpacing="0.25em" fill={C.violet} opacity={colsDraw}>
          COLUMNS
        </text>
        <text x={colX(COLS - 1)} y={Y0 + ROWS * CELL + 108} textAnchor="end" fontFamily={FONT.mono} fontSize={18} fill={hexA(C.violet, 0.8)} opacity={colsDraw}>
          listened to all at once
        </text>
        {/* controller chip */}
        <g opacity={rowsDraw}>
          <rect x={CTRL.x} y={CTRL.y} width={CTRL.w} height={CTRL.h} rx={18} fill="#0e1424" stroke={spotted ? C.cyan : hexA(C.cyan, 0.5)} strokeWidth={2} />
          {new Array(9).fill(0).map((_, i) => (
            <rect key={i} x={CTRL.x + 20 + i * 30} y={CTRL.y + CTRL.h} width={10} height={14} fill={hexA(C.ink, 0.25)} />
          ))}
          <text x={CTRL.x + 20} y={CTRL.y + 38} fontFamily={FONT.ui} fontWeight={700} fontSize={17} letterSpacing="0.18em" fill={hexA(C.ink, 0.75)}>
            KEYBOARD CONTROLLER
          </text>
          <text x={CTRL.x + 20} y={CTRL.y + 86} fontFamily={FONT.mono} fontWeight={600} fontSize={26} fill={spotted ? C.cyanHi : hexA(C.ink, 0.35)}>
            {spotted ? "ROW 3 · COL 1 → A" : scanning ? `scan row ${activeRow}…` : "idle"}
          </text>
        </g>
        {/* bus to the SoC */}
        {socA > 0.01 && (
          <g opacity={socA}>
            <NeonPath d={bus} color={C.amber} width={2.4} progress={prog(f, b.race - 6, 20, EASE.inOut)} length={1600} />
            <rect x={SOC.x} y={SOC.y} width={SOC.w} height={SOC.h} rx={20} fill={irqFlash > 0.02 ? hexA(C.rose, 0.25 + irqFlash * 0.4) : "#0f1626"} stroke={irqFlash > 0.02 ? C.rose : C.green} strokeWidth={2.5} />
            <text x={SOC.x + 22} y={SOC.y + 44} fontFamily={FONT.ui} fontWeight={700} fontSize={18} letterSpacing="0.18em" fill={hexA(C.ink, 0.8)}>
              APPLE SILICON
            </text>
            <text x={SOC.x + 22} y={SOC.y + 82} fontFamily={FONT.mono} fontSize={20} fill={hexA(C.green, 0.95)}>
              interrupt controller
            </text>
            {f >= b.irq && (
              <text x={SOC.x + 22} y={SOC.y + 126} fontFamily={FONT.mono} fontWeight={700} fontSize={30} fill={C.rose}>
                IRQ!
              </text>
            )}
          </g>
        )}
        {raceP > 0 && raceP < 1 && <PathSpark d={bus} p={raceP} />}
      </svg>
      {irqFlash > 0.01 && <Glow x={SOC.x + SOC.w / 2} y={SOC.y + SOC.h / 2} size={700} color={C.rose} a={irqFlash * 0.6} />}

      {/* scan-rate tag */}
      {scanning && (
        <div style={{ position: "absolute", left: X0, top: Y0 - 92, opacity: inOut(f, b.scan, 14, b.bounce, 14) }}>
          <Kicker color={C.cyan}>Scanning · hundreds of times per second</Kicker>
        </div>
      )}

      {/* debounce scope */}
      {bounceA > 0.01 && <BounceScope a={bounceA} start={b.bounce} />}

      {/* HID report */}
      {reportA > 0.01 && <HidReport a={reportA} start={b.report} four={b.four} race={b.race} />}
    </SceneShell>
  );
};

const PathSpark: React.FC<{ d: string; p: number }> = ({ d, p }) => {
  // sample the path in the DOM-free way: approximate with the known polyline
  const pts: [number, number][] = [
    [CTRL.x + CTRL.w, CTRL.y + 50],
    [1360, CTRL.y + 50],
    [1440, SOC.y + 40],
    [SOC.x, SOC.y + 70],
  ];
  const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  let t = p * lens.reduce((a, c) => a + c, 0);
  let x = pts[0][0];
  let y = pts[0][1];
  for (let i = 0; i < lens.length; i++) {
    if (t <= lens[i]) {
      x = pts[i][0] + ((pts[i + 1][0] - pts[i][0]) * t) / lens[i];
      y = pts[i][1] + ((pts[i + 1][1] - pts[i][1]) * t) / lens[i];
      break;
    }
    t -= lens[i];
  }
  return (
    <g>
      <Spark x={x} y={y} color={C.amber} r={14} />
      <text x={x} y={y - 30} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} fill={C.amber}>
        00 00 04 00 …
      </text>
      <path d={d} fill="none" stroke="transparent" />
    </g>
  );
};

const BounceScope: React.FC<{ a: number; start: number }> = ({ a, start }) => {
  const f = useCurrentFrame();
  const x0 = 1210;
  const x1 = 1800;
  const yH = 470;
  const yL = 610;
  const tx = (ms: number) => x0 + 30 + (ms / 20) * (x1 - x0 - 60);
  const steps: [number, number][] = [
    [0, 0], [3, 1], [3.4, 0], [3.9, 1], [4.5, 0], [4.8, 1], [5.6, 0], [5.8, 1], [20, 1],
  ];
  let d = `M${tx(0)},${yL}`;
  for (let i = 1; i < steps.length; i++) {
    const [ms, v] = steps[i];
    const prevV = steps[i - 1][1];
    d += ` L${tx(ms)},${prevV ? yH : yL} L${tx(ms)},${v ? yH : yL}`;
  }
  const draw = prog(f, start, 70, EASE.inOut);
  const bracket = prog(f, start + 40, 16);
  return (
    <div style={{ position: "absolute", left: x0, top: 340, width: x1 - x0, opacity: a, transform: `translateY(${(1 - a) * 20}px)` }}>
      <Glass color={C.cyan} style={{ width: x1 - x0, height: 360 }}>
        <div style={{ position: "absolute", left: 28, top: 22, fontFamily: FONT.ui, fontWeight: 700, fontSize: 20, letterSpacing: "0.22em", color: hexA(C.cyan, 0.9) }}>CONTACT BOUNCE</div>
        <div style={{ position: "absolute", right: 28, top: 22, fontFamily: FONT.mono, fontSize: 18, color: C.ink3 }}>voltage vs. time</div>
      </Glass>
      <svg width={1920} height={1080} style={{ position: "absolute", left: -x0, top: -340, overflow: "visible" }}>
        <line x1={x0 + 30} y1={yL + 20} x2={x1 - 30} y2={yL + 20} stroke={hexA(C.ink, 0.2)} />
        <NeonPath d={d} color={C.cyan} width={3} progress={draw} length={2200} />
        <g opacity={bracket}>
          <path d={`M${tx(3)},${yH - 40} L${tx(3)},${yH - 52} L${tx(5.8)},${yH - 52} L${tx(5.8)},${yH - 40}`} fill="none" stroke={C.amber} strokeWidth={2} />
          <text x={(tx(3) + tx(5.8)) / 2} y={yH - 64} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} fill={C.amber}>
            bouncing
          </text>
          <text x={tx(12)} y={yH - 26} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} fill={C.green}>
            stable ✓ — press confirmed
          </text>
        </g>
        <text x={x0 + 30} y={yL + 50} fontFamily={FONT.mono} fontSize={16} fill={C.ink3}>
          0 ms
        </text>
        <text x={x1 - 30} y={yL + 50} textAnchor="end" fontFamily={FONT.mono} fontSize={16} fill={C.ink3}>
          20 ms
        </text>
      </svg>
    </div>
  );
};

const HidReport: React.FC<{ a: number; start: number; four: number; race: number }> = ({ a, start, four, race }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bytes = ["00", "00", "04", "00", "00", "00", "00", "00"];
  const names = ["mods", "rsvd", "key 1", "key 2", "key 3", "key 4", "key 5", "key 6"];
  const hl = prog(f, four - 4, 14);
  const collapse = prog(f, race - 8, 16, EASE.in);
  return (
    <div style={{ position: "absolute", left: 1170, top: 350, width: 640, opacity: a }}>
      <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 20, letterSpacing: "0.22em", color: hexA(C.amber, 0.95) }}>HID KEYBOARD REPORT · 8 BYTES</div>
      <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
        {bytes.map((v, i) => {
          const p = spr(f, fps, start + i * 3, { damping: 16, stiffness: 160 });
          const isKey = i === 2;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transform: `translateY(${(1 - p) * 30 + collapse * (300 - i * 10)}px) translateX(${collapse * -(i * 60 + 600)}px) scale(${1 - collapse * 0.7})`, opacity: clamp(p * 1.3) * (1 - collapse) }}>
              <div
                style={{
                  width: 70,
                  height: 82,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONT.mono,
                  fontWeight: 700,
                  fontSize: 34,
                  color: isKey ? "#170f02" : C.ink2,
                  background: isKey ? `rgba(251,191,36,${0.15 + hl * 0.85})` : "rgba(20,26,46,0.9)",
                  border: `1.5px solid ${isKey ? C.amber : hexA(C.ink, 0.18)}`,
                  boxShadow: isKey ? `0 0 ${20 + hl * 40}px ${hexA(C.amber, 0.5 * hl)}` : undefined,
                }}
              >
                {v}
              </div>
              <div style={{ fontFamily: FONT.mono, fontSize: 14, color: isKey ? C.amber : C.ink3 }}>{names[i]}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 40, opacity: hl, transform: `translateY(${(1 - hl) * 20}px)`, display: "flex", alignItems: "baseline", gap: 22 }}>
        <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 92, color: C.amber, textShadow: `0 0 40px ${hexA(C.amber, 0.6)}` }}>0x04</span>
        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 64, color: C.ink }}>= A</span>
      </div>
      <div style={{ fontFamily: FONT.ui, fontSize: 22, color: C.ink2, marginTop: 6, opacity: hl }}>USB HID usage ID for the letter A</div>
    </div>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  const ev: SfxEvent[] = [
    { at: b.grid - 6, name: "sweep_up", vol: 0.25 },
    { at: b.rows - 2, name: "whoosh_soft", vol: 0.3 },
    { at: b.cols - 2, name: "whoosh_soft", vol: 0.3 },
    { at: b.sw, name: "data", vol: 0.2 },
    { at: b.scan, name: "scan", vol: 0.35 },
    { at: b.press - 4, name: "key_click", vol: 0.9 },
    { at: b.spot - 2, name: "blip_hi", vol: 0.35 },
    { at: b.bounce + 20, name: "bounce", vol: 0.5 },
    { at: b.bounce + 64, name: "blip", vol: 0.3 },
    { at: b.report - 2, name: "data", vol: 0.35 },
    { at: b.four - 4, name: "pop_hi", vol: 0.4 },
    { at: b.race - 8, name: "sweep_down", vol: 0.25 },
    { at: b.race + 2, name: "whoosh", vol: 0.45 },
    { at: b.irq - 1, name: "zap", vol: 0.5 },
    { at: b.irq, name: "alarm", vol: 0.35 },
  ];
  for (let i = 0; i < 6; i++) ev.push({ at: b.scan + 20 + i * 30, name: "tick", vol: 0.2 });
  return ev;
};

export const KeyMatrix: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.cyan, hueB: C.indigo, hueC: C.amber, intensity: 0.7 },
};
