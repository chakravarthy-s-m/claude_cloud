import React from "react";
import { Composition, Folder, Still } from "remotion";
import { Ep01, Ep01Scene, timeline as tl01 } from "./episodes/ep01";
import { Ep01Thumbnail } from "./episodes/ep01/Thumbnail";
import { Ep02, Ep02Scene, timeline as tl02 } from "./episodes/ep02";
import { Ep02Thumbnail } from "./episodes/ep02/Thumbnail";
import { Ep03, Ep03Scene, timeline as tl03 } from "./episodes/ep03";
import { Ep03Thumbnail } from "./episodes/ep03/Thumbnail";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Ep01" component={Ep01} durationInFrames={tl01.durationInFrames} fps={tl01.fps} width={1920} height={1080} />
    <Still id="Ep01Thumbnail" component={Ep01Thumbnail} width={1920} height={1080} />
    <Composition id="Ep02" component={Ep02} durationInFrames={tl02.durationInFrames} fps={tl02.fps} width={1920} height={1080} />
    <Still id="Ep02Thumbnail" component={Ep02Thumbnail} width={1920} height={1080} />
    <Composition id="Ep03" component={Ep03} durationInFrames={tl03.durationInFrames} fps={tl03.fps} width={1920} height={1080} />
    <Still id="Ep03Thumbnail" component={Ep03Thumbnail} width={1920} height={1080} />
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
    <Folder name="Ep02-Scenes">
      {tl02.scenes.map((s) => (
        <Composition
          key={s.id}
          id={`ep02-${s.id}`}
          component={Ep02Scene}
          defaultProps={{ id: s.id }}
          durationInFrames={s.durationInFrames}
          fps={tl02.fps}
          width={1920}
          height={1080}
        />
      ))}
    </Folder>
    <Folder name="Ep03-Scenes">
      {tl03.scenes.map((s) => (
        <Composition
          key={s.id}
          id={`ep03-${s.id}`}
          component={Ep03Scene}
          defaultProps={{ id: s.id }}
          durationInFrames={s.durationInFrames}
          fps={tl03.fps}
          width={1920}
          height={1080}
        />
      ))}
    </Folder>
  </>
);
