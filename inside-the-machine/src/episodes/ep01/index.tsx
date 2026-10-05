import React from "react";
import timelineJson from "./timeline.json";
import type { Timeline } from "../../lib/timeline";
import { Episode, type SceneModule } from "../../components/Episode";
import { Placeholder } from "../../scenes/Placeholder";
import { ColdOpen } from "../../scenes/ep01/ColdOpen";
import { Title } from "../../scenes/ep01/Title";
import { Machine } from "../../scenes/ep01/Machine";
import { Stack } from "../../scenes/ep01/Stack";
import { KeyMatrix } from "../../scenes/ep01/KeyMatrix";
import { Interrupt } from "../../scenes/ep01/Interrupt";
import { AppDraw } from "../../scenes/ep01/AppDraw";
import { Launch } from "../../scenes/ep01/Launch";
import { Save } from "../../scenes/ep01/Save";
import { Code } from "../../scenes/ep01/Code";
import { Core } from "../../scenes/ep01/Core";
import { Adder } from "../../scenes/ep01/Adder";
import { Cmos } from "../../scenes/ep01/Cmos";
import { FinFet } from "../../scenes/ep01/FinFet";
import { Clock } from "../../scenes/ep01/Clock";
import { Finale } from "../../scenes/ep01/Finale";

export const timeline = timelineJson as Timeline;

export const SCENES: Record<string, SceneModule> = {
  coldOpen: ColdOpen,
  title: Title,
  machine: Machine,
  stack: Stack,
  keyMatrix: KeyMatrix,
  interrupt: Interrupt,
  appDraw: AppDraw,
  launch: Launch,
  save: Save,
  code: Code,
  core: Core,
  adder: Adder,
  cmos: Cmos,
  finfet: FinFet,
  clock: Clock,
  finale: Finale,
};
for (const s of timeline.scenes) if (!SCENES[s.id]) SCENES[s.id] = Placeholder;

export const MUSIC = "audio/music/ep01-score.mp3";

export const Ep01: React.FC = () => <Episode timeline={timeline} scenes={SCENES} music={MUSIC} />;
export const Ep01Scene: React.FC<{ id: string }> = ({ id }) => <Episode timeline={timeline} scenes={SCENES} only={id} />;
