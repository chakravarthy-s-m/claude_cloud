import { Config } from "@remotion/cli/config";
import fs from "node:fs";

// Use the container's pre-installed Chromium headless shell when present
// (Remotion would otherwise download its own copy).
const LOCAL_SHELL = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
if (fs.existsSync(LOCAL_SHELL)) {
  Config.setBrowserExecutable(LOCAL_SHELL);
}
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setChromiumOpenGlRenderer("angle");
Config.setConcurrency(4);
