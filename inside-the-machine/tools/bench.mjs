// Benchmark render speed of a frame range under different perf flags.
// usage: node tools/bench.mjs <from> <count> '<json flags>' ['<json flags>' ...]
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
const SHELL = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const [from, count, ...variants] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
for (const v of variants) {
  const inputProps = { perf: JSON.parse(v) };
  const composition = await selectComposition({ serveUrl, id: "Ep01", inputProps, browserExecutable: SHELL, chromiumOptions: { gl: "swangle" } });
  const t = Date.now();
  await renderMedia({
    composition, serveUrl, inputProps, browserExecutable: SHELL, chromiumOptions: { gl: process.env.GL === "null" ? null : (process.env.GL || "swangle") },
    codec: "h264", muted: true, imageFormat: "jpeg", jpegQuality: 92, concurrency: Number(process.env.CONC || 4),
    outputLocation: "out/bench.mp4", frameRange: [Number(from), Number(from) + Number(count) - 1], logLevel: "error",
  });
  const s = (Date.now() - t) / 1000;
  console.log(`${v.padEnd(60)} ${count} frames in ${s.toFixed(1)}s → ${(count / s).toFixed(2)} fps`);
}
