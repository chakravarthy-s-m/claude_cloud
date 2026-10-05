import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT } from "../theme";
import type { SceneData } from "../lib/timeline";
import type { SceneModule } from "../components/Episode";

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const cue = [...s.cues].reverse().find((c) => f >= c.from);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 200 }}>
      <div style={{ fontFamily: FONT.mono, color: C.cyan, fontSize: 28 }}>{s.id}</div>
      <div style={{ fontFamily: FONT.display, color: C.ink, fontSize: 44, textAlign: "center", marginTop: 20 }}>{cue?.text}</div>
    </AbsoluteFill>
  );
};

export const Placeholder: SceneModule = { Visual };
