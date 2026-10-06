import React from "react";
import timelineJson from "./timeline.json";
import type { Timeline } from "../../lib/timeline";
import { C } from "../../theme";
import { Episode, type SceneModule } from "../../components/Episode";
import { Placeholder } from "../../scenes/Placeholder";
import { ColdOpen } from "../../scenes/ep03/ColdOpen";
import { Title } from "../../scenes/ep03/Title";
import { Power } from "../../scenes/ep03/Power";
import { BootRom } from "../../scenes/ep03/BootRom";
import { Signature } from "../../scenes/ep03/Signature";
import { Llb } from "../../scenes/ep03/Llb";
import { Iboot } from "../../scenes/ep03/Iboot";
import { Seal } from "../../scenes/ep03/Seal";
import { Kernel } from "../../scenes/ep03/Kernel";
import { Launchd } from "../../scenes/ep03/Launchd";
import { Login } from "../../scenes/ep03/Login";
import { Finale } from "../../scenes/ep03/Finale";

export const timeline = timelineJson as Timeline;

export const SCENES: Record<string, SceneModule> = {
  coldOpen: ColdOpen,
  title: Title,
  power: Power,
  bootrom: BootRom,
  signature: Signature,
  llb: Llb,
  iboot: Iboot,
  seal: Seal,
  kernel: Kernel,
  launchd: Launchd,
  login: Login,
  finale: Finale,
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
