import React from "react";
import { Composition, Folder, Still } from "remotion";
import { Ep01, Ep01Scene, timeline as tl01 } from "./episodes/ep01";
import { Ep01Thumbnail } from "./episodes/ep01/Thumbnail";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Ep01" component={Ep01} durationInFrames={tl01.durationInFrames} fps={tl01.fps} width={1920} height={1080} />
    <Still id="Ep01Thumbnail" component={Ep01Thumbnail} width={1920} height={1080} />
    <Folder name="Ep01-Scenes">
      {tl01.scenes.map((s) => (
        <Composition
          key={s.id}
          id={`ep01-${s.id}`}
          component={Ep01Scene}
          defaultProps={{ id: s.id }}
          durationInFrames={s.durationInFrames}
          fps={tl01.fps}
          width={1920}
          height={1080}
        />
      ))}
    </Folder>
  </>
);
