import React from "react";
import timelineJson from "./timeline.json";
import type { Timeline } from "../../lib/timeline";
import { C } from "../../theme";
import { Episode, type SceneModule } from "../../components/Episode";
import { Placeholder } from "../../scenes/Placeholder";
import { ColdOpen } from "../../scenes/ep03/ColdOpen";
import { Title } from "../../scenes/ep03/Title";
import { Power } from "../../scenes/ep03/Power";

export const timeline = timelineJson as Timeline;

export const SCENES: Record<string, SceneModule> = {
  coldOpen: ColdOpen,
  title: Title,
  power: Power,
};
for (const s of timeline.scenes) if (!SCENES[s.id]) SCENES[s.id] = Placeholder;

export const MUSIC = "audio/music/ep03-score.mp3";

export const CHAPTER_COLORS: Record<string, string> = {
  waking: C.orange,
  trust: C.gold,
  loaders: C.cyan,
  kernel: C.violet,
  hello: C.green,
};

const common = { timeline, scenes: SCENES, chapterColors: CHAPTER_COLORS, label: "EP 03" };
export const Ep03: React.FC = () => <Episode {...common} music={MUSIC} />;
export const Ep03Scene: React.FC<{ id: string }> = ({ id }) => <Episode {...common} only={id} />;
