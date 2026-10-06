import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, hexA } from "../theme";
import { EASE, clamp, mix, prog, spr } from "../lib/anim";
import { perf } from "./core";
import type { Chapter } from "../lib/timeline";

/** Scene wrapper: cinematic enter/exit (scale + unblur + fade). */
export const SceneShell: React.FC<{
  dur: number;
  children: React.ReactNode;
  enter?: number;
  exit?: number;
  zoomIn?: number;
  zoomOut?: number;
  blur?: boolean;
}> = ({ dur, children, enter = 14, exit = 12, zoomIn = 1.035, zoomOut = 1.06, blur = true }) => {
  const f = useCurrentFrame();
  const a = enter > 0 ? prog(f, 0, enter, EASE.out) : 1;
  const b = exit > 0 ? prog(f, dur - exit, exit, EASE.in) : 0;
  const scale = mix(zoomIn, 1, a) * mix(1, zoomOut, b);
  const bl = blur && !perf().noBlur ? (1 - a) * 10 + b * 14 : 0;
  return (
    <AbsoluteFill
      style={{
        opacity: a * (1 - b),
        transform: `scale(${scale})`,
        filter: bl > 0.3 ? `blur(${bl}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Full-screen chapter title moment (≈ 2.8 s). */
export const ChapterCard: React.FC<{ chapter: Chapter; at?: number; dur?: number; color?: string }> = ({
  chapter,
  at = 0,
  dur = 84,
  color = C.cyan,
}) => {
  const f = useCurrentFrame() - at;
  const { fps } = useVideoConfig();
  if (f < -1 || f > dur + 2) return null;
  const inP = spr(f, fps, 0, { damping: 22, stiffness: 90 });
  const out = prog(f, dur - 16, 16, EASE.in);
  const line = prog(f, 4, 26, EASE.inOut);
  const words = chapter.title.split(" ");
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - out, transform: `scale(${1 + out * 0.12})`, filter: out > 0.02 ? `blur(${out * 12}px)` : undefined }}>
      <AbsoluteFill style={{ background: `radial-gradient(60% 50% at 50% 50%, ${hexA(color, 0.10 * inP)}, transparent 70%)` }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            fontFamily: FONT.display,
            fontWeight: 700,
            fontSize: 300,
            lineHeight: 0.8,
            letterSpacing: "-0.06em",
            color: "transparent",
            WebkitTextStroke: `2px ${hexA(color, 0.55 * inP)}`,
            transform: `translateY(${(1 - inP) * 40}px)`,
            opacity: inP,
          }}
        >
          {chapter.num}
        </div>
        <div style={{ height: 2, width: 760 * line, marginTop: 34, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, boxShadow: `0 0 18px ${color}` }} />
        <div style={{ display: "flex", gap: 22, marginTop: 34 }}>
          {words.map((w, i) => {
            const s = spr(f, fps, 8 + i * 4, { damping: 20, stiffness: 140 });
            return (
              <span
                key={i}
                style={{
                  fontFamily: FONT.display,
                  fontWeight: 700,
                  fontSize: 92,
                  letterSpacing: "-0.03em",
                  color: C.ink,
                  opacity: clamp(s * 1.3),
                  transform: `translateY(${(1 - s) * 40}px)`,
                  filter: `blur(${(1 - clamp(s * 1.2)) * 12}px)`,
                  textShadow: `0 0 40px ${hexA(color, 0.35)}`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
        <div style={{ marginTop: 26, fontFamily: FONT.ui, fontWeight: 600, fontSize: 22, letterSpacing: "0.5em", color: hexA(color, 0.85 * prog(f, 18, 20)) }}>
          CHAPTER {chapter.num}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Minimal heads-up display: chapter tag, series tag, progress rail. */
export const Hud: React.FC<{
  chapters: Chapter[];
  chapterId: string;
  progress: number;
  marks: { at: number; id: string }[];
  opacity: number;
  label: string;
}> = ({ chapters, chapterId, progress, marks, opacity, label }) => {
  const ch = chapters.find((c) => c.id === chapterId);
  if (!ch || opacity <= 0.001) return null;
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 64, top: 48, display: "flex", alignItems: "center", gap: 16, fontFamily: FONT.ui }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 18, color: C.cyan, letterSpacing: "0.1em" }}>{ch.num}</span>
        <span style={{ width: 26, height: 1, background: hexA(C.ink, 0.35) }} />
        <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "0.28em", textTransform: "uppercase", color: hexA(C.ink, 0.7) }}>{ch.title}</span>
      </div>
      <div style={{ position: "absolute", right: 64, top: 48, fontFamily: FONT.ui, fontSize: 18, fontWeight: 600, letterSpacing: "0.28em", color: hexA(C.ink, 0.45) }}>
        INSIDE THE MACHINE <span style={{ color: hexA(C.cyan, 0.8), marginLeft: 10 }}>{label}</span>
      </div>
      <div style={{ position: "absolute", left: 64, right: 64, bottom: 40, height: 2, background: hexA(C.ink, 0.08) }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, background: `linear-gradient(90deg, ${C.cyan}, ${C.violet})`, boxShadow: `0 0 12px ${hexA(C.cyan, 0.7)}` }} />
        {marks.map((m) => (
          <div key={m.id} style={{ position: "absolute", left: `${m.at * 100}%`, top: -3, width: 2, height: 8, background: hexA(C.ink, 0.35) }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Bright light sweep used at chapter boundaries. */
export const LightSweep: React.FC<{ at: number; color?: string; dur?: number }> = ({ at, color = C.cyan, dur = 22 }) => {
  const f = useCurrentFrame();
  const p = prog(f, at, dur, EASE.inOut);
  if (p <= 0 || p >= 1) return null;
  const a = Math.sin(p * Math.PI);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      <div
        style={{
          position: "absolute",
          top: -200,
          bottom: -200,
          left: mix(-900, 2300, p),
          width: 700,
          transform: "skewX(-18deg)",
          background: `linear-gradient(90deg, transparent, ${hexA(color, 0.22 * a)}, ${hexA("#ffffff", 0.18 * a)}, ${hexA(color, 0.22 * a)}, transparent)`,
        }}
      />
      <AbsoluteFill style={{ background: hexA(color, 0.05 * a) }} />
    </AbsoluteFill>
  );
};
