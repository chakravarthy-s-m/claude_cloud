// Production render: each scene is rendered as its own segment (resumable,
// re-render one scene after a fix), the soundtrack is rendered once, then
// everything is concatenated, loudness-normalized and muxed with ffmpeg.
//
// usage: node tools/render.mjs [--ep=ep01] [--only=sceneA,sceneB] [--scale=1] [--crf=18] [--force]
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, ensureBrowser } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SHELL = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const browserExecutable = fs.existsSync(SHELL) ? SHELL : null;
const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.split("=")[1] : d;
};
const ONLY = arg("only", "") ? arg("only", "").split(",") : null;
const SCALE = Number(arg("scale", "1"));
const CRF = Number(arg("crf", "18"));
const FORCE = process.argv.includes("--force");
const EP = arg("ep", "ep01");
const ID = arg("comp", EP.replace(/^ep/, "Ep"));
const SLUG = JSON.parse(fs.readFileSync(`episodes/${EP}/script.json`, "utf8")).slug ?? "episode";
const OUT = path.resolve("out");
const PARTS = path.join(OUT, `${EP}-parts${SCALE !== 1 ? `-${SCALE}` : ""}`);
fs.mkdirSync(PARTS, { recursive: true });

const timeline = JSON.parse(fs.readFileSync(`src/episodes/${EP}/timeline.json`, "utf8"));
const t0 = Date.now();
if (!browserExecutable) await ensureBrowser();
console.log("bundling…");
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: ID, browserExecutable, chromiumOptions: { gl: "angle" } });

const common = {
  composition,
  serveUrl,
  browserExecutable,
  chromiumOptions: { gl: "angle" },
  concurrency: Number(arg("concurrency", "4")),
  imageFormat: "jpeg",
  jpegQuality: 92,
  scale: SCALE,
  logLevel: "warn",
  timeoutInMilliseconds: 120000,
};

const parts = [];
for (const [i, s] of timeline.scenes.entries()) {
  const file = path.join(PARTS, `${String(i).padStart(2, "0")}-${s.id}.mp4`);
  parts.push(file);
  if (ONLY && !ONLY.includes(s.id)) continue;
  if (!ONLY && !FORCE && fs.existsSync(file)) {
    console.log(`skip ${s.id} (exists)`);
    continue;
  }
  const st = Date.now();
  let last = 0;
  await renderMedia({
    ...common,
    codec: "h264",
    crf: CRF,
    x264Preset: "medium",
    pixelFormat: "yuv420p",
    muted: true,
    outputLocation: file + ".tmp.mp4",
    frameRange: [s.from, s.from + s.durationInFrames - 1],
    onProgress: ({ progress }) => {
      if (progress - last >= 0.1) {
        last = progress;
        process.stdout.write(`  ${s.id} ${(progress * 100).toFixed(0)}%\n`);
      }
    },
  });
  fs.renameSync(file + ".tmp.mp4", file);
  const sec = (Date.now() - st) / 1000;
  console.log(`✓ ${s.id}: ${s.durationInFrames} frames in ${sec.toFixed(0)}s (${(s.durationInFrames / sec).toFixed(2)} fps)`);
}

// soundtrack (narration + music + sfx), rendered once
const audio = path.join(OUT, `${EP}-soundtrack.wav`);
if (ONLY === null || FORCE || !fs.existsSync(audio)) {
  if (!fs.existsSync(audio) || FORCE || process.argv.includes("--audio")) {
    console.log("rendering soundtrack…");
    await renderMedia({ ...common, codec: "wav", outputLocation: audio, inputProps: { audioOnly: true } });
  }
}

if (parts.every((p) => fs.existsSync(p)) && fs.existsSync(audio)) {
  const list = path.join(PARTS, "list.txt");
  fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n"));
  const video = path.join(OUT, `${EP}-video.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", video], { stdio: "inherit" });
  const final = path.join(OUT, `${EP}-${SLUG}${SCALE !== 1 ? `-${SCALE}` : ""}.mp4`);
  execFileSync(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-i", video, "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", "-shortest", final],
    { stdio: "inherit" },
  );
  console.log(`\nFINAL → ${final}`);
}
console.log(`total ${((Date.now() - t0) / 60000).toFixed(1)} min`);
