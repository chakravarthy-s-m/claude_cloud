// Render preview stills quickly: one bundle, many frames.
// usage: node tools/stills.mjs ep01-coldOpen:60,140,300 ep01-title:40 [--scale=0.5]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const SHELL = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const browserExecutable = fs.existsSync(SHELL) ? SHELL : null;
const args = process.argv.slice(2);
const scaleArg = args.find((a) => a.startsWith("--scale="));
const scale = scaleArg ? Number(scaleArg.split("=")[1]) : 0.5;
const jobs = args.filter((a) => !a.startsWith("--")).map((a) => {
  const [id, frames] = a.split(":");
  return { id, frames: frames.split(",").map(Number) };
});
const outDir = process.env.STILLS_DIR || "out/stills";
fs.mkdirSync(outDir, { recursive: true });
const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { browserExecutable, chromiumOptions: { gl: process.env.GL === "null" ? null : (process.env.GL || "angle") } });
for (const job of jobs) {
  const composition = await selectComposition({ serveUrl, id: job.id, puppeteerInstance: browser, browserExecutable });
  for (const frame of job.frames) {
    const out = path.join(outDir, `${job.id}-${String(frame).padStart(5, "0")}.png`);
    const t = Date.now();
    await renderStill({ composition, serveUrl, output: out, frame, scale, puppeteerInstance: browser, browserExecutable, chromiumOptions: { gl: process.env.GL === "null" ? null : (process.env.GL || "angle") } });
    console.log(`${out}  (${Date.now() - t} ms)`);
  }
}
await browser.close({ silent: true });
// each bundle is ~400 MB in the temp dir; don't let them pile up
if (serveUrl.includes("remotion-webpack-bundle-")) fs.rmSync(serveUrl, { recursive: true, force: true });
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
