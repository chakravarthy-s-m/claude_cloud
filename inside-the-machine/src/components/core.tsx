import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  continueRender,
  delayRender,
  getInputProps,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import { C, FONT, hexA } from "../theme";
import { EASE, clamp, keyframes, mix, prog, rnd, spr } from "../lib/anim";
import type { Cue, SfxEvent } from "../lib/timeline";

// ------------------------------------------------------------------ perf flags
type PerfFlags = { noGrain?: boolean; noDots?: boolean; noDust?: boolean; noBlur?: boolean; noBackdrop?: boolean; grainBlend?: boolean };
export const perf = (): PerfFlags => {
  try {
    return (getInputProps() as { perf?: PerfFlags }).perf ?? {};
  } catch {
    return {};
  }
};

// ------------------------------------------------------------------ fonts
export const FontGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all(
      [
        `400 32px "Inter Variable"`,
        `700 32px "Inter Variable"`,
        `500 32px "Space Grotesk Variable"`,
        `700 32px "Space Grotesk Variable"`,
        `500 32px "JetBrains Mono Variable"`,
      ].map((f) => document.fonts.load(f)),
    )
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);
  return <>{children}</>;
};

// ------------------------------------------------------------------ audio
/** Global SFX bus trim (≈ −2 dB) so effects sit under the narration. */
export const SFX_GAIN = 0.8;

export const Sfx: React.FC<{ events: SfxEvent[] }> = ({ events }) => (
  <>
    {events
      .filter((e) => (e.vol ?? 0.6) > 0)
      .map((e, i) => (
        <Sequence key={`${e.name}-${e.at}-${i}`} from={Math.max(0, Math.round(e.at))} layout="none">
          <Audio src={staticFile(`audio/sfx/${e.name}.wav`)} volume={(e.vol ?? 0.6) * SFX_GAIN} playbackRate={e.rate ?? 1} />
        </Sequence>
      ))}
  </>
);

export const Narration: React.FC<{ cues: Cue[]; volume?: number }> = ({ cues, volume = 1 }) => (
  <>
    {cues.map((c) => (
      <Sequence key={c.id} from={c.from} durationInFrames={c.durationInFrames + 15} layout="none">
        <Audio src={staticFile(c.audio)} volume={volume} />
      </Sequence>
    ))}
  </>
);

// ------------------------------------------------------------------ backdrop
type BackdropProps = {
  hueA?: string;
  hueB?: string;
  hueC?: string;
  intensity?: number;
  dots?: boolean;
  dust?: boolean;
};

/** Living background: deep gradient, drifting aurora light, dot grid, dust, vignette, grain. */
export const Backdrop: React.FC<BackdropProps> = ({
  hueA = C.cyan,
  hueB = C.violet,
  hueC = C.pink,
  intensity = 1,
  dots = true,
  dust = true,
}) => {
  const f = useCurrentFrame();
  const t = f / 30;
  const pf = perf();
  if (pf.noBackdrop) return <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 38%, #0b1022 0%, ${C.bg} 52%, ${C.void} 100%)` }} />;
  const blob = (color: string, x: number, y: number, size: number, a: number) => (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${hexA(color, a * intensity)} 0%, ${hexA(color, a * 0.35 * intensity)} 32%, transparent 68%)`,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 38%, #0b1022 0%, ${C.bg} 52%, ${C.void} 100%)`, overflow: "hidden" }}>
      {blob(hueA, 420 + Math.sin(t * 0.13) * 160, 260 + Math.cos(t * 0.11) * 90, 1500, 0.16)}
      {blob(hueB, 1500 + Math.cos(t * 0.09) * 180, 820 + Math.sin(t * 0.12) * 80, 1600, 0.15)}
      {blob(hueC, 1100 + Math.sin(t * 0.07 + 2) * 260, 120 + Math.cos(t * 0.1) * 60, 1100, 0.08)}
      {dots && !pf.noDots && (
        <AbsoluteFill
          style={{
            backgroundImage: `radial-gradient(${hexA("#b9c6ff", 0.13)} 1.1px, transparent 1.6px)`,
            backgroundSize: "36px 36px",
            backgroundPosition: `${(t * 4) % 36}px ${(t * 2) % 36}px`,
            WebkitMaskImage: "radial-gradient(75% 70% at 50% 50%, black 0%, transparent 100%)",
            maskImage: "radial-gradient(75% 70% at 50% 50%, black 0%, transparent 100%)",
          }}
        />
      )}
      {dust && !pf.noDust && <Dust />}
      <AbsoluteFill style={{ background: "radial-gradient(130% 100% at 50% 50%, transparent 55%, rgba(0,0,0,0.65) 100%)" }} />
    </AbsoluteFill>
  );
};

export const Dust: React.FC<{ count?: number; color?: string }> = ({ count = 70, color = "#c7d2fe" }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      {new Array(count).fill(0).map((_, i) => {
        const z = rnd(`dz${i}`, 0.2, 1);
        const x = (rnd(`dx${i}`, 0, 1920) + f * 0.25 * z * (rnd(`dv${i}`) > 0.5 ? 1 : -1) + 1920 * 4) % 1920;
        const y = (rnd(`dy${i}`, 0, 1080) - f * 0.18 * z + 1080 * 8) % 1080;
        const s = 1.5 + z * 3.5;
        const tw = 0.5 + 0.5 * Math.sin(f * 0.05 + i);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: s * 3,
              height: s * 3,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${hexA(color, 0.55 * z * (0.6 + 0.4 * tw))} 0%, transparent 60%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Film grain. Refreshed every 3rd frame (film-like flicker; far kinder to the video encoder). */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.045 }) => {
  const f = useCurrentFrame();
  if (perf().noGrain) return null;
  const g = Math.floor(f / 3);
  const ox = Math.floor(rnd(`gx${g}`, 0, 384));
  const oy = Math.floor(rnd(`gy${g}`, 0, 384));
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${staticFile("img/noise.png")})`,
        backgroundPosition: `${ox}px ${oy}px`,
        opacity,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
};

// ------------------------------------------------------------------ camera
export type CamKey = { f: number; x?: number; y?: number; s?: number; r?: number; rx?: number; ry?: number };

/** Virtual camera: interpolates pan/zoom/rotate keyframes over its children. */
export const Camera: React.FC<{ keys: CamKey[]; children: React.ReactNode; origin?: string; perspective?: number; style?: React.CSSProperties }> = ({
  keys,
  children,
  origin = "50% 50%",
  perspective,
  style,
}) => {
  const f = useCurrentFrame();
  const track = (k: keyof CamKey, d: number) => {
    const pts = keys.filter((x) => x[k] !== undefined).map((x) => [x.f, x[k] as number] as [number, number]);
    return pts.length ? keyframes(f, pts) : d;
  };
  const x = track("x", 0);
  const y = track("y", 0);
  const s = track("s", 1);
  const r = track("r", 0);
  const rx = track("rx", 0);
  const ry = track("ry", 0);
  return (
    <AbsoluteFill style={{ perspective, ...style }}>
      <AbsoluteFill
        style={{
          transformOrigin: origin,
          transform: `translate(${-x * s}px, ${-y * s}px) scale(${s}) rotate(${r}deg) rotateX(${rx}deg) rotateY(${ry}deg)`,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ text
export const Kicker: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties; at?: number }> = ({
  children,
  color = C.cyan,
  style,
  at = 0,
}) => {
  const f = useCurrentFrame();
  const p = prog(f, at, 18);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontFamily: FONT.ui,
        fontWeight: 600,
        fontSize: 22,
        letterSpacing: "0.32em",
        textTransform: "uppercase",
        color: hexA(color, 0.95),
        opacity: p,
        transform: `translateX(${(1 - p) * -20}px)`,
        ...style,
      }}
    >
      <span style={{ width: 28 * p + 6, height: 2, background: color, boxShadow: `0 0 12px ${color}` }} />
      {children}
    </div>
  );
};

/** Word-by-word cinematic reveal (rise + unblur). */
export const Reveal: React.FC<{
  text: string;
  at: number;
  stagger?: number;
  style?: React.CSSProperties;
  wordStyle?: (i: number, w: string) => React.CSSProperties | undefined;
  out?: number;
  blur?: boolean;
}> = ({ text, at, stagger = 3, style, wordStyle, out, blur = true }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  const o = out !== undefined ? 1 - prog(f, out, 12, EASE.in) : 1;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", columnGap: "0.28em", ...style, opacity: o }}>
      {words.map((w, i) => {
        const s = spr(f, fps, at + i * stagger, { damping: 20, stiffness: 140 });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: clamp(s * 1.4),
              transform: `translateY(${(1 - s) * 0.55}em)`,
              filter: blur ? `blur(${(1 - clamp(s * 1.2)) * 10}px)` : undefined,
              ...wordStyle?.(i, w),
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const gradText = (a: string, b: string, angle = 90): React.CSSProperties => ({
  background: `linear-gradient(${angle}deg, ${a}, ${b})`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
});

export const Title: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 96, style }) => (
  <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: size, letterSpacing: "-0.035em", lineHeight: 1.0, color: C.ink, ...style }}>
    {children}
  </div>
);

// ------------------------------------------------------------------ surfaces
export const Glass: React.FC<{
  children?: React.ReactNode;
  color?: string;
  style?: React.CSSProperties;
  radius?: number;
  glow?: number;
}> = ({ children, color = C.cyan, style, radius = 22, glow = 0.35 }) => (
  <div
    style={{
      position: "relative",
      borderRadius: radius,
      background: `linear-gradient(160deg, ${hexA("#1b2240", 0.78)} 0%, ${hexA("#0b0f1f", 0.82)} 100%)`,
      border: `1px solid ${hexA(color, 0.28)}`,
      boxShadow: `inset 0 1px 0 ${hexA("#ffffff", 0.08)}, 0 24px 70px rgba(0,0,0,0.55), 0 0 ${60 * glow}px ${hexA(color, 0.22 * glow)}`,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Tag: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties; solid?: boolean }> = ({
  children,
  color = C.cyan,
  style,
  solid,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 16px",
      borderRadius: 999,
      fontFamily: FONT.ui,
      fontWeight: 600,
      fontSize: 22,
      letterSpacing: "0.02em",
      color: solid ? "#04060c" : color,
      background: solid ? color : hexA(color, 0.1),
      border: `1px solid ${hexA(color, 0.5)}`,
      boxShadow: `0 0 24px ${hexA(color, 0.25)}`,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {!solid && <span style={{ width: 8, height: 8, borderRadius: 4, background: color, boxShadow: `0 0 10px ${color}` }} />}
    {children}
  </div>
);

/** Soft radial light. */
export const Glow: React.FC<{ x: number; y: number; size: number; color: string; a?: number }> = ({ x, y, size, color, a = 0.5 }) => (
  <div
    style={{
      position: "absolute",
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      borderRadius: "50%",
      background: `radial-gradient(circle, ${hexA(color, a)} 0%, ${hexA(color, a * 0.3)} 30%, transparent 66%)`,
      pointerEvents: "none",
    }}
  />
);

// ------------------------------------------------------------------ svg glow lines
/** Multi-stroke neon line (cheap glow without SVG filters). */
export const NeonPath: React.FC<{
  d: string;
  color: string;
  width?: number;
  progress?: number;
  length?: number;
  opacity?: number;
  core?: boolean;
  dash?: string;
}> = ({ d, color, width = 3, progress = 1, length = 4000, opacity = 1, core = true, dash }) => {
  const dashProps = dash
    ? { strokeDasharray: dash }
    : { strokeDasharray: `${length} ${length}`, strokeDashoffset: length * (1 - clamp(progress)) };
  return (
    <g opacity={opacity} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={color} strokeOpacity={0.12} strokeWidth={width * 7} {...dashProps} />
      <path d={d} stroke={color} strokeOpacity={0.35} strokeWidth={width * 2.6} {...dashProps} />
      <path d={d} stroke={core ? mixWhite(color) : color} strokeWidth={width} {...dashProps} />
    </g>
  );
};

export const mixWhite = (hex: string, t = 0.45) => {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const m = (v: number) => Math.round(v + (255 - v) * t);
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`;
};

/** A bright travelling spark rendered in SVG coordinates. */
export const Spark: React.FC<{ x: number; y: number; color: string; r?: number; a?: number }> = ({ x, y, color, r = 9, a = 1 }) => (
  <g opacity={a}>
    <circle cx={x} cy={y} r={r * 3.2} fill={color} opacity={0.12} />
    <circle cx={x} cy={y} r={r * 1.7} fill={color} opacity={0.35} />
    <circle cx={x} cy={y} r={r} fill={mixWhite(color, 0.6)} />
  </g>
);

// ------------------------------------------------------------------ misc
export const Counter: React.FC<{ from?: number; to: number; at: number; dur: number; format?: (n: number) => string; style?: React.CSSProperties }> = ({
  from = 0,
  to,
  at,
  dur,
  format = (n) => Math.round(n).toLocaleString("en-US"),
  style,
}) => {
  const f = useCurrentFrame();
  const p = prog(f, at, dur, EASE.out);
  return <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>{format(mix(from, to, p))}</span>;
};

export const ImgFill: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style }} />
);
