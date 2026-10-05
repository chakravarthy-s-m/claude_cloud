import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  getInputProps,
  getStaticFiles,
  interpolateColors,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { C } from "../theme";
import { prog } from "../lib/anim";
import type { SceneData, SfxEvent, Timeline } from "../lib/timeline";
import { Backdrop, FontGate, Grain, Narration, Sfx } from "./core";
import { ChapterCard, Hud, LightSweep } from "./frame";

export type BackdropCfg = { hueA?: string; hueB?: string; hueC?: string; intensity?: number; dots?: boolean };

export type SceneModule = {
  Visual: React.FC<{ s: SceneData }>;
  sfx?: (s: SceneData) => SfxEvent[];
  backdrop?: BackdropCfg;
  hud?: boolean;
  /** draws its own background; hides the shared backdrop */
  opaque?: boolean;
};

const DEF: Required<BackdropCfg> = { hueA: C.cyan, hueB: C.violet, hueC: C.pink, intensity: 1, dots: true };

const CHAPTER_COLORS: Record<string, string> = {
  machine: C.green,
  keystroke: C.cyan,
  launch: C.violet,
  save: C.amber,
  rabbit: C.pink,
};

const CARD_DUR = 84;

export const Episode: React.FC<{
  timeline: Timeline;
  scenes: Record<string, SceneModule>;
  only?: string;
  music?: string;
}> = ({ timeline, scenes, only, music }) => {
  const f = useCurrentFrame();
  const list: SceneData[] = only
    ? timeline.scenes.filter((s) => s.id === only).map((s) => ({ ...s, from: 0 }))
    : timeline.scenes;
  const total = only ? list[0].durationInFrames : timeline.durationInFrames;

  // which scenes open a chapter (get a chapter card)
  const opensChapter = (s: SceneData) => {
    const i = timeline.scenes.findIndex((x) => x.id === s.id);
    return (i === 0 || timeline.scenes[i - 1].chapter !== s.chapter) && CHAPTER_COLORS[s.chapter] !== undefined;
  };

  // current + previous scene for backdrop blending / HUD
  let idx = list.findIndex((s) => f >= s.from && f < s.from + s.durationInFrames);
  if (idx < 0) idx = list.length - 1;
  const cur = list[idx];
  const prev = idx > 0 ? list[idx - 1] : cur;
  const lf = f - cur.from;
  const cfg = (s: SceneData) => ({ ...DEF, ...(scenes[s.id]?.backdrop ?? {}), ...(scenes[s.id]?.opaque ? { intensity: 0 } : {}) });
  const a = cfg(prev);
  const b = cfg(cur);
  const t = prog(lf, 0, 24);
  const col = (k: "hueA" | "hueB" | "hueC") => interpolateColors(t, [0, 1], [a[k], b[k]]);
  const intensity = a.intensity + (b.intensity - a.intensity) * t;

  // HUD visibility
  const hudOn = (s: SceneData) => scenes[s.id]?.hud !== false;
  let hudOpacity = hudOn(cur) ? 1 : 0;
  if (hudOn(cur) && opensChapter(cur)) hudOpacity = prog(lf, CARD_DUR - 10, 20);
  if (hudOn(cur) && !hudOn(prev)) hudOpacity = Math.min(hudOpacity, prog(lf, 0, 20));
  const chapterStarts = timeline.scenes
    .filter((s, i) => i === 0 || timeline.scenes[i - 1].chapter !== s.chapter)
    .map((s) => ({ id: s.id, at: s.from / timeline.durationInFrames }));

  const hasMusic = music !== undefined && getStaticFiles().some((x) => x.name === music);

  // episode-level transition sounds
  const transitions: SfxEvent[] = [];
  list.forEach((s, i) => {
    if (i === 0) return;
    if (opensChapter(s)) {
      transitions.push({ at: s.from - 18, name: "whoosh_big", vol: 0.55 });
      transitions.push({ at: s.from + 6, name: "boom_soft", vol: 0.5 });
      transitions.push({ at: s.from + 10, name: "shimmer", vol: 0.18 });
    } else if (s.id !== "title") {
      transitions.push({ at: s.from - 10, name: "whoosh_soft", vol: 0.35 });
    }
  });

  // soundtrack-only pass: skip every visual (renders in minutes instead of a full frame pass)
  const audioOnly = Boolean((getInputProps() as { audioOnly?: boolean }).audioOnly);
  const audioTracks = (
    <>
      {hasMusic && <Audio src={staticFile(music!)} volume={0.9} />}
      {list.map((s) => {
        const M = scenes[s.id];
        return (
          <Sequence key={`a-${s.id}`} from={s.from} layout="none" name={`audio-${s.id}`}>
            <Narration cues={s.cues} />
            {M?.sfx && <Sfx events={M.sfx(s)} />}
          </Sequence>
        );
      })}
      <Sfx events={transitions} />
    </>
  );
  if (audioOnly) return <AbsoluteFill style={{ background: C.void }}>{audioTracks}</AbsoluteFill>;

  return (
    <FontGate>
      <AbsoluteFill style={{ background: C.void }}>
        <Backdrop hueA={col("hueA")} hueB={col("hueB")} hueC={col("hueC")} intensity={intensity} dots={b.dots} />
        {list.map((s) => {
          const M = scenes[s.id];
          if (!M) return null;
          return (
            <Sequence key={s.id} from={s.from} durationInFrames={s.durationInFrames} name={s.id}>
              <M.Visual s={s} />
              {opensChapter(s) && (
                <ChapterCard chapter={timeline.chapters.find((c) => c.id === s.chapter)!} dur={CARD_DUR} color={CHAPTER_COLORS[s.chapter]} />
              )}
            </Sequence>
          );
        })}
        {list.filter(opensChapter).map((s) => (
          <LightSweep key={`sw-${s.id}`} at={s.from - 8} color={CHAPTER_COLORS[s.chapter]} />
        ))}
        <Hud
          chapters={timeline.chapters}
          chapterId={cur.chapter}
          progress={only ? (f - cur.from) / cur.durationInFrames : f / total}
          marks={only ? [] : chapterStarts}
          opacity={hudOpacity}
        />
        <Grain />

        {/* ---------------- audio ---------------- */}
        {audioTracks}
      </AbsoluteFill>
    </FontGate>
  );
};
