import React from "react";
import timelineJson from "./timeline.json";
import type { Timeline } from "../../lib/timeline";
import { C } from "../../theme";
import { Episode, type SceneModule } from "../../components/Episode";
import { Placeholder } from "../../scenes/Placeholder";
import { ColdOpen } from "../../scenes/ep02/ColdOpen";
import { Finale } from "../../scenes/ep02/Finale";
import { Eye } from "../../scenes/ep02/Eye";
import { Backlight } from "../../scenes/ep02/Backlight";
import { Crystals } from "../../scenes/ep02/Crystals";
import { Panel } from "../../scenes/ep02/Panel";
import { Scanout } from "../../scenes/ep02/Scanout";
import { Vsync } from "../../scenes/ep02/Vsync";
import { Compose } from "../../scenes/ep02/Compose";
import { Tiles } from "../../scenes/ep02/Tiles";
import { Raster } from "../../scenes/ep02/Raster";
import { Teapot } from "../../scenes/ep02/Teapot";
import { GpuCore } from "../../scenes/ep02/GpuCore";
import { GpuIntro } from "../../scenes/ep02/GpuIntro";
import { Framebuffer } from "../../scenes/ep02/Framebuffer";
import { Pixels } from "../../scenes/ep02/Pixels";
import { Title } from "../../scenes/ep02/Title";

export const timeline = timelineJson as Timeline;

export const SCENES: Record<string, SceneModule> = {
  coldOpen: ColdOpen,
  finale: Finale,
  eye: Eye,
  backlight: Backlight,
  crystals: Crystals,
  panel: Panel,
  scanout: Scanout,
  vsync: Vsync,
  compose: Compose,
  tiles: Tiles,
  raster: Raster,
  teapot: Teapot,
  gpuCore: GpuCore,
  gpuIntro: GpuIntro,
  framebuffer: Framebuffer,
  pixels: Pixels,
  title: Title,
};
for (const s of timeline.scenes) if (!SCENES[s.id]) SCENES[s.id] = Placeholder;

export const MUSIC = "audio/music/ep02-score.mp3";

export const CHAPTER_COLORS: Record<string, string> = {
  pixels: C.pink,
  painter: C.violet,
  pipeline: C.cyan,
  frame: C.blue,
  light: C.amber,
  eye: C.green,
};

const common = { timeline, scenes: SCENES, chapterColors: CHAPTER_COLORS, label: "EP 02" };
export const Ep02: React.FC = () => <Episode {...common} music={MUSIC} />;
export const Ep02Scene: React.FC<{ id: string }> = ({ id }) => <Episode {...common} only={id} />;
