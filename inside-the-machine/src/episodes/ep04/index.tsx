import React from "react";
import timelineJson from "./timeline.json";
import type { Timeline } from "../../lib/timeline";
import { C } from "../../theme";
import { Episode, type SceneModule } from "../../components/Episode";
import { Placeholder } from "../../scenes/Placeholder";
import { ColdOpen } from "../../scenes/ep04/ColdOpen";
import { Title } from "../../scenes/ep04/Title";
import { Wall } from "../../scenes/ep04/Wall";
import { Hierarchy } from "../../scenes/ep04/Hierarchy";
import { CacheLine } from "../../scenes/ep04/CacheLine";
import { Sets } from "../../scenes/ep04/Sets";
import { Prefetch } from "../../scenes/ep04/Prefetch";
import { Coherence } from "../../scenes/ep04/Coherence";
import { DramZoom } from "../../scenes/ep04/DramZoom";
import { SenseAmp } from "../../scenes/ep04/SenseAmp";
import { Refresh } from "../../scenes/ep04/Refresh";
import { Unified } from "../../scenes/ep04/Unified";
import { Virtual } from "../../scenes/ep04/Virtual";
import { Pressure } from "../../scenes/ep04/Pressure";
import { Finale } from "../../scenes/ep04/Finale";

export const timeline = timelineJson as Timeline;

export const SCENES: Record<string, SceneModule> = {
  coldOpen: ColdOpen,
  title: Title,
  wall: Wall,
  hierarchy: Hierarchy,
  cacheLine: CacheLine,
  sets: Sets,
  prefetch: Prefetch,
  coherence: Coherence,
  dramZoom: DramZoom,
  senseAmp: SenseAmp,
  refresh: Refresh,
  unified: Unified,
  virtual: Virtual,
  pressure: Pressure,
  finale: Finale,
};
for (const s of timeline.scenes) if (!SCENES[s.id]) SCENES[s.id] = Placeholder;

export const MUSIC = "audio/music/ep04-score.mp3";

export const CHAPTER_COLORS: Record<string, string> = {
  wall: C.orange,
  caches: C.violet,
  dram: C.teal,
  unified: C.blue,
  virtual: C.pink,
};

const common = { timeline, scenes: SCENES, chapterColors: CHAPTER_COLORS, label: "EP 04" };
export const Ep04: React.FC = () => <Episode {...common} music={MUSIC} />;
export const Ep04Scene: React.FC<{ id: string }> = ({ id }) => <Episode {...common} only={id} />;
