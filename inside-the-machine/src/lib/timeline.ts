export type Cue = {
  id: string;
  from: number;
  durationInFrames: number;
  seconds: number;
  text: string;
  /** spoken form (numbers spelled out etc.) — used for word timing */
  say?: string;
  audio: string;
};

export type SceneData = {
  id: string;
  chapter: string;
  from: number;
  durationInFrames: number;
  cues: Cue[];
};

export type Chapter = { id: string; num: string; title: string };

export type Timeline = {
  episode: string;
  fps: number;
  durationInFrames: number;
  scenes: SceneData[];
  chapters: Chapter[];
};

export type CueX = Cue & { end: number; mid: number };

/** Map of cue id → cue with handy `end` (frame narration ends). */
export const cueMap = (scene: SceneData): Record<string, CueX> => {
  const m: Record<string, CueX> = {};
  for (const c of scene.cues) {
    m[c.id] = { ...c, end: c.from + c.durationInFrames, mid: c.from + Math.round(c.durationInFrames / 2) };
  }
  return new Proxy(m, {
    get(target, key: string) {
      if (!(key in target)) throw new Error(`Unknown cue "${key}" in scene "${scene.id}"`);
      return target[key];
    },
  });
};

/**
 * Approximate frame at which a word inside a cue is spoken, by character
 * position (Kokoro gives no word timings; speech rate is very even).
 */
export const wordAt = (cue: Cue, needle: string, fps = 30) => {
  const src = cue.say ?? cue.text;
  let idx = src.toLowerCase().indexOf(needle.toLowerCase());
  let len = src.length;
  if (idx < 0) {
    idx = cue.text.toLowerCase().indexOf(needle.toLowerCase());
    len = cue.text.length;
  }
  if (idx < 0) throw new Error(`"${needle}" not in cue ${cue.id}`);
  const frac = idx / Math.max(1, len);
  return cue.from + Math.round(frac * cue.durationInFrames) - Math.round(fps * 0.05);
};

export type SfxEvent = { at: number; name: string; vol?: number; rate?: number };
