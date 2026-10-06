import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, mix, prog, rnd, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glow, Kicker, NeonPath, Spark } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { useCanvas } from "../../components/fx";
import { wallpaper } from "../ep02/shared";
import { Check, Desktop, KeyIcon, OK } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    type: c.n1.from,
    never: wordAt(c.n1, "never stores"),
    fv: c.n2.from,
    sep: wordAt(c.n2, "the Secure Enclave combines"),
    secret: wordAt(c.n2, "a secret key"),
    fused: wordAt(c.n2, "fused into this one chip"),
    unlock: wordAt(c.n2, "to unlock the keys"),
    protect: wordAt(c.n2, "protect your data"),
    files: c.n3.from,
    now: wordAt(c.n3, "Now they can be read"),
    session: c.n4.from,
    menu: wordAt(c.n4, "the menu bar"),
    dock: wordAt(c.n4, "the Dock"),
    finder: wordAt(c.n4, "the Finder"),
    desktop: wordAt(c.n4, "and your desktop"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

const Blurred: React.FC<{ a: number }> = ({ a }) => {
  const ref = useCanvas((ctx) => ctx.drawImage(wallpaper(), 0, 0, 1920, 1080), []);
  return <canvas ref={ref} width={1920} height={1080} style={{ position: "absolute", inset: 0, filter: "blur(26px) brightness(0.75)", transform: "scale(1.06)", opacity: a }} />;
};

// ---------------------------------------------------------------- act 1: the login window
const LoginWindow: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const typed = Math.floor(clamp((f - b.type - 10) / 34) * 9);
  const neverA = prog(f, b.never - 4, 16);
  const shrink = prog(f, b.fv - 10, 24, EASE.inOut);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <Blurred a={1 - shrink * 0.7} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translateY(${-shrink * 160}px) scale(${mix(1, 0.7, shrink)})` }}>
        <div style={{ width: 150, height: 150, borderRadius: 75, background: `linear-gradient(160deg, ${C.pink}, ${C.violet})`, border: "3px solid rgba(255,255,255,0.7)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }} />
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 40, color: "#fff", marginTop: 22 }}>You</div>
        <div style={{ marginTop: 20, width: 360, height: 56, borderRadius: 28, background: "rgba(255,255,255,0.18)", border: "1.5px solid rgba(255,255,255,0.45)", display: "flex", alignItems: "center", padding: "0 24px", fontFamily: FONT.mono, fontSize: 28, letterSpacing: "0.3em", color: "#fff" }}>
          {"●".repeat(typed)}
          <span style={{ opacity: f % 30 < 15 ? 0.9 : 0, marginLeft: 2 }}>|</span>
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 820, display: "flex", justifyContent: "center", opacity: neverA * (1 - shrink) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 24px", borderRadius: 16, background: "rgba(8,10,20,0.75)", border: `1px solid ${hexA(C.ink, 0.3)}` }}>
          <svg width={40} height={40}>
            <rect x={6} y={8} width={28} height={26} rx={4} fill="none" stroke={C.ink2} strokeWidth={2.5} />
            <line x1={4} y1={36} x2={36} y2={4} stroke={C.rose} strokeWidth={3} />
          </svg>
          <span style={{ fontFamily: FONT.ui, fontSize: 24, color: C.ink }}>the password itself is never stored</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 2: the enclave unlocks the keys
const Unlock: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fvA = prog(f, b.fv - 4, 14);
  const pwFly = prog(f, b.sep - 6, 26, EASE.inOut);
  const uidA = prog(f, b.secret - 4, 16);
  const fusedA = prog(f, b.fused - 4, 16);
  const mixP = prog(f, b.fused + 20, 24, EASE.inOut);
  const kek = spr(f, fps, b.unlock - 4, { damping: 14, stiffness: 140 });
  const vk = spr(f, fps, b.unlock + 14, { damping: 14, stiffness: 140 });
  const openP = prog(f, b.protect - 2, 16, EASE.outBack);
  const cx = 960;
  const cy = 540;
  const pwX = mix(960, cx - 150, pwFly);
  const pwY = mix(250, cy - 10, pwFly);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110, display: "flex", alignItems: "center", gap: 20 }}>
        <Kicker color={C.lime}>FileVault: on</Kicker>
      </div>
      <Glow x={cx} y={cy} size={1000} color={C.lime} a={0.14 * fvA} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {/* the enclave chamber */}
        <g opacity={fvA}>
          <rect x={cx - 380} y={cy - 220} width={760} height={440} rx={40} fill="rgba(10,22,8,0.85)" stroke={hexA(C.lime, 0.7)} strokeWidth={3} />
          {new Array(26).fill(0).map((_, i) => (
            <rect key={i} x={cx - 380 + i * 29.2} y={cy - 232} width={20} height={10} rx={3} fill={hexA(C.lime, 0.4)} />
          ))}
          <text x={cx} y={cy - 180} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={18} letterSpacing="0.3em" fill={C.lime}>
            SECURE ENCLAVE
          </text>
        </g>
        {/* the fused secret */}
        <g opacity={uidA}>
          <rect x={cx + 60} y={cy - 70} width={240} height={120} rx={18} fill={hexA(C.gold, 0.12)} stroke={C.gold} strokeWidth={2} />
          {new Array(8).fill(0).map((_, i) => (
            <rect key={i} x={cx + 80 + i * 26} y={cy - 50} width={16} height={16} rx={3} fill={rnd(`uid${i}`) > 0.5 ? C.gold : hexA(C.gold, 0.25)} />
          ))}
          <text x={cx + 180} y={cy + 6} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={26} fill={C.ink}>
            device secret
          </text>
          <text x={cx + 180} y={cy + 34} textAnchor="middle" fontFamily={FONT.mono} fontSize={15} fill={hexA(C.gold, 0.95)} opacity={fusedA}>
            fused into this chip
          </text>
        </g>
        {/* mixing */}
        {mixP > 0 && mixP < 1 && (
          <>
            <Spark x={mix(cx - 150, cx, mixP)} y={cy - 10} color={C.pink} r={9} />
            <Spark x={mix(cx + 60, cx, mixP)} y={cy - 10} color={C.gold} r={9} />
          </>
        )}
        <text x={cx - 45} y={cy + 4} textAnchor="middle" fontFamily={FONT.mono} fontSize={40} fill={hexA(C.ink, 0.6 * uidA)}>
          +
        </text>
        {/* derived key → volume key */}
        <g opacity={clamp(kek)} transform={`translate(${cx - 120} ${cy + 140}) scale(${clamp(kek)})`}>
          <KeyIcon x={0} y={0} s={0.8} col={C.lime} glow={0.8} />
          <text x={70} y={8} fontFamily={FONT.mono} fontSize={21} fill={C.lime}>
            key
          </text>
        </g>
        <NeonPath d={`M${cx - 30},${cy + 140} L${cx + 120},${cy + 140}`} color={C.lime} width={2.5} progress={prog(f, b.unlock + 6, 12)} length={150} />
        <g opacity={clamp(vk)} transform={`translate(${cx + 190} ${cy + 140}) scale(${clamp(vk)})`}>
          <KeyIcon x={0} y={0} s={0.8} col={C.cyan} glow={0.8} />
          <text x={70} y={8} fontFamily={FONT.mono} fontSize={21} fill={C.cyan}>
            data key
          </text>
        </g>
      </svg>
      {/* password token */}
      {pwFly < 1 && (
        <div style={{ position: "absolute", left: pwX - 110, top: pwY - 26, width: 220, height: 52, borderRadius: 26, background: "rgba(255,255,255,0.14)", border: `1.5px solid ${hexA(C.pink, 0.8)}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.mono, fontSize: 24, letterSpacing: "0.3em", color: C.ink, opacity: fvA * (1 - prog(f, b.fused + 20, 20)) }}>
          ●●●●●●●●●
        </div>
      )}
      {pwFly >= 1 && mixP < 1 && (
        <div style={{ position: "absolute", left: cx - 150 - 110, top: cy - 36, width: 220, height: 52, borderRadius: 26, background: "rgba(255,255,255,0.14)", border: `1.5px solid ${hexA(C.pink, 0.8)}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.mono, fontSize: 24, letterSpacing: "0.3em", color: C.ink, transform: `scale(${1 - mixP * 0.6})`, opacity: 1 - mixP }}>
          ●●●●●●●●●
        </div>
      )}
      {/* lock opens */}
      <div style={{ position: "absolute", left: cx - 240, top: cy + 250, width: 480, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, opacity: clamp(openP) }}>
        <svg width={40} height={46}>
          <rect x={4} y={18} width={32} height={26} rx={5} fill={OK} />
          <path d="M10,18 V10 a10,10 0 0 1 20,0" fill="none" stroke={OK} strokeWidth={5} />
        </svg>
        <span style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 26, letterSpacing: "0.2em", color: OK }}>YOUR DATA, UNLOCKED</span>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 3: encrypted → readable
const GW = 26;
const GH = 11;
const Decrypt: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const wave = prog(f, b.now - 6, 40, EASE.inOut);
  const cols = [C.pink, C.cyan, C.amber, C.violet, C.green, C.blue, C.rose, C.teal];
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <Kicker color={wave > 0.5 ? OK : C.rose}>{wave > 0.5 ? "decrypted on the fly" : "encrypted, the whole time"}</Kicker>
      </div>
      <div style={{ position: "absolute", left: 160, top: 220, width: 1600, height: 720, display: "grid", gridTemplateColumns: `repeat(${GW}, 1fr)`, gap: 8 }}>
        {new Array(GW * GH).fill(0).map((_, i) => {
          const x = i % GW;
          const y = Math.floor(i / GW);
          const d = (x + y * 0.6) / (GW + GH * 0.6);
          const on = clamp((wave * 1.3 - d) * 8);
          const flick = Math.floor(f / 3);
          const hex = Math.floor(rnd(`hx${i}-${flick}`) * 256).toString(16).padStart(2, "0");
          const col = cols[Math.floor(rnd(`fc${i}`) * cols.length)];
          return (
            <div key={i} style={{ position: "relative", height: 56, borderRadius: 8, overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.mono, fontSize: 18, color: hexA(C.rose, 0.6), opacity: 1 - on }}>{hex}</div>
              <div style={{ position: "absolute", inset: 3, borderRadius: 7, background: `linear-gradient(160deg, ${col}, ${hexA(col, 0.45)})`, opacity: on, transform: `scale(${mix(0.6, 1, on)})` }} />
            </div>
          );
        })}
      </div>
      {wave > 0 && wave < 1 && (
        <div style={{ position: "absolute", top: 180, bottom: 100, left: mix(0, 2100, wave) - 140, width: 140, background: `linear-gradient(90deg, transparent, ${hexA(OK, 0.3)}, transparent)`, transform: "skewX(-12deg)", mixBlendMode: "screen" }} />
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- act 4: your desktop
const Session: React.FC<{ b: B; a: number }> = ({ b, a }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wall = prog(f, b.session - 8, 20);
  const menuA = spr(f, fps, b.menu - 2, { damping: 18, stiffness: 140 });
  const dockA = spr(f, fps, b.dock - 2, { damping: 16, stiffness: 120 });
  const winA = spr(f, fps, b.finder - 2, { damping: 16, stiffness: 120 });
  const full = prog(f, b.desktop - 4, 30, EASE.inOut);
  const scale = mix(0.74, 0.86, full);
  return (
    <AbsoluteFill style={{ opacity: a }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, borderRadius: 26, overflow: "hidden", boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 ${80 * full}px ${hexA(C.violet, 0.35 * full)}` }}>
        <Desktop w={1920} h={1080} reveal={wall} menuA={clamp(menuA)} dockA={clamp(dockA)} winA={clamp(winA)} />
      </AbsoluteFill>
      {/* labels while it assembles */}
      {[
        { t: "menu bar", at: b.menu, x: 360, y: 150 },
        { t: "Dock", at: b.dock, x: 960, y: 820 },
        { t: "Finder", at: b.finder, x: 560, y: 600 },
      ].map((l) => (
        <div key={l.t} style={{ position: "absolute", left: l.x, top: l.y, transform: "translateX(-50%)", opacity: inOut(f, l.at - 2, 10, b.desktop, 14), padding: "8px 16px", borderRadius: 12, background: "rgba(6,10,20,0.85)", border: `1.5px solid ${hexA(C.green, 0.7)}`, fontFamily: FONT.mono, fontSize: 20, color: C.ink }}>
          {l.t}
        </div>
      ))}
      <AbsoluteFill style={{ background: "#fff", opacity: prog(f, b.desktop + 4, 6) * (1 - prog(f, b.desktop + 10, 30)) * 0.25, mixBlendMode: "screen" }} />
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const b = beats(s);
  const a1 = 1 - prog(f, b.fv - 4, 14, EASE.in);
  const a2 = inOut(f, b.fv - 8, 12, b.files - 6, 12);
  const a3 = inOut(f, b.files - 6, 12, b.session - 8, 12);
  const a4 = prog(f, b.session - 8, 12);
  return (
    <SceneShell dur={s.durationInFrames} enter={10} exit={14}>
      {a1 > 0.01 && <LoginWindow b={b} a={a1} />}
      {a2 > 0.01 && <Unlock b={b} a={a2} />}
      {a3 > 0.01 && <Decrypt b={b} a={a3} />}
      {a4 > 0.01 && <Session b={b} a={a4} />}
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: b.type + 10, name: "typing", vol: 0.45 },
    { at: b.never - 4, name: "blip_lo", vol: 0.25 },
    { at: b.sep - 6, name: "whoosh_soft", vol: 0.3 },
    { at: b.secret - 4, name: "shimmer", vol: 0.3 },
    { at: b.fused + 20, name: "electrons", vol: 0.3 },
    { at: b.unlock - 4, name: "pop", vol: 0.35 },
    { at: b.unlock + 14, name: "pop_hi", vol: 0.35 },
    { at: b.protect - 2, name: "chime", vol: 0.35 },
    { at: b.now - 6, name: "sweep_up", vol: 0.35 },
    { at: b.menu - 2, name: "whoosh_soft", vol: 0.25 },
    { at: b.dock - 2, name: "whoosh_soft", vol: 0.25 },
    { at: b.finder - 2, name: "pop", vol: 0.3 },
    { at: b.desktop - 4, name: "swell", vol: 0.45 },
    { at: b.desktop + 4, name: "chime", vol: 0.35 },
  ];
};

export const Login: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.green, hueB: C.pink, hueC: C.lime, intensity: 0.5 },
};
